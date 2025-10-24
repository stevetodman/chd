import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const contents = readFileSync(envPath, "utf8");
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith("#")) return;
      const eq = line.indexOf("=");
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
}

function assertEnv(name, message) {
  const value = process.env[name];
  if (!value) {
    throw new Error(message ?? `Missing required environment variable: ${name}`);
  }
  return value;
}

function spawnAsync(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, options);

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function ensureSupabaseCliAvailable() {
  try {
    await spawnAsync("supabase", ["--version"], {
      stdio: "ignore"
    });
  } catch (error) {
    throw new Error(
      "Supabase CLI is required but was not found on PATH. Install it from https://supabase.com/docs/guides/cli/installation."
    );
  }
}

function createSupabaseRunner({ projectRef, accessToken, cwd }) {
  return async function runSupabase(args, { input } = {}) {
    const finalArgs = [...args, "--project-ref", projectRef, "--access-token", accessToken];
    const stdio = input ? ["pipe", "inherit", "inherit"] : "inherit";

    const child = spawn("supabase", finalArgs, {
      cwd,
      stdio,
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: accessToken,
        SUPABASE_PROJECT_REF: projectRef
      }
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    await new Promise((resolvePromise, rejectPromise) => {
      child.on("error", rejectPromise);
      child.on("close", (code) => {
        if (code === 0) {
          resolvePromise();
        } else {
          rejectPromise(new Error(`supabase ${args.join(" ")} exited with code ${code}`));
        }
      });
    });
  };
}

async function createStorageBuckets({ supabaseUrl, serviceRoleKey, bucketConfig }) {
  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data: buckets, error } = await client.storage.listBuckets();

  if (error) {
    throw new Error(`Failed to list storage buckets: ${error.message}`);
  }

  const existing = new Set((buckets ?? []).map((bucket) => bucket.name));

  for (const bucket of bucketConfig) {
    if (existing.has(bucket.name)) {
      console.log(`✔ Storage bucket \"${bucket.name}\" already exists.`);
      continue;
    }

    console.log(`• Creating storage bucket \"${bucket.name}\"...`);
    const { error: createError } = await client.storage.createBucket(bucket.name, {
      public: bucket.public
    });

    if (createError) {
      throw new Error(`Failed to create bucket ${bucket.name}: ${createError.message}`);
    }

    console.log(`✔ Storage bucket \"${bucket.name}\" created.`);
  }
}

async function applySqlFiles(runSupabase, sqlFiles) {
  for (const filePath of sqlFiles) {
    const sql = await readFile(filePath, "utf8");
    console.log(`• Applying SQL from ${filePath}...`);
    await runSupabase(["db", "query"], { input: sql });
    console.log(`✔ Applied ${filePath}.`);
  }
}

async function deploySignupFunction(runSupabase, { supabaseUrl, serviceRoleKey }) {
  console.log("• Syncing Edge Function secrets...");
  const secretsPayload = `SUPABASE_URL=${supabaseUrl}\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\n`;
  await runSupabase(["functions", "secrets", "set"], { input: secretsPayload });
  console.log("✔ Function secrets updated.");

  console.log("• Deploying signup-with-code Edge Function...");
  await runSupabase(["functions", "deploy", "signup-with-code"]);
  console.log("✔ signup-with-code function deployed.");
}

async function main() {
  loadEnvFile();

  const projectRef = assertEnv(
    "SUPABASE_PROJECT_REF",
    "Set SUPABASE_PROJECT_REF to the target project reference (e.g. abcdefghijklmnopqrst)."
  );
  const accessToken = assertEnv(
    "SUPABASE_ACCESS_TOKEN",
    "Set SUPABASE_ACCESS_TOKEN to a personal access token with access to the project."
  );
  const supabaseUrl = assertEnv("SUPABASE_URL", "Set SUPABASE_URL to your Supabase project's API URL.");
  const serviceRoleKey = assertEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "Set SUPABASE_SERVICE_ROLE_KEY to the service role key used by automation scripts."
  );

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(__dirname, "..", "");

  const sqlFiles = [
    resolve(projectRoot, "schema.sql"),
    resolve(projectRoot, "storage-policies.sql"),
    resolve(projectRoot, "cron.sql")
  ];

  for (const filePath of sqlFiles) {
    if (!existsSync(filePath)) {
      throw new Error(`Required SQL file not found: ${filePath}`);
    }
  }

  await ensureSupabaseCliAvailable();

  console.log("Starting Supabase provisioning...");

  const bucketConfigPath = resolve(projectRoot, "src", "config", "storageBuckets.json");
  if (!existsSync(bucketConfigPath)) {
    throw new Error(`Storage bucket configuration not found: ${bucketConfigPath}`);
  }

  const rawBucketConfig = JSON.parse(await readFile(bucketConfigPath, "utf8"));

  if (!Array.isArray(rawBucketConfig)) {
    throw new Error(`Storage bucket configuration must be an array: ${bucketConfigPath}`);
  }

  const bucketConfig = rawBucketConfig.map((bucket, index) => {
    if (!bucket?.name) {
      throw new Error(`Bucket definition at index ${index} is missing a "name" property.`);
    }
    return {
      name: String(bucket.name),
      public: Boolean(bucket.public)
    };
  });

  await createStorageBuckets({ supabaseUrl, serviceRoleKey, bucketConfig });

  const runSupabase = createSupabaseRunner({ projectRef, accessToken, cwd: projectRoot });

  await applySqlFiles(runSupabase, sqlFiles);

  await deploySignupFunction(runSupabase, { supabaseUrl, serviceRoleKey });

  console.log("Supabase provisioning complete.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
