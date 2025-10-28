import { beforeAll, describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasServiceCredentials,
  supabaseTestEnv,
} from "./supabase-env";

type RunCommandResult = {
  stdout: string;
  stderr: string;
};

type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../../");

function runCommand(command: string, args: string[], options: RunCommandOptions = {}): Promise<RunCommandResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      const message = signal
        ? `Command ${command} ${args.join(" ")} terminated with signal ${signal}`
        : `Command ${command} ${args.join(" ")} exited with code ${code}`;
      const error = new Error(`${message}\n${stderr}`);
      // Attach output for easier debugging when the test fails.
      (error as Error & RunCommandResult & { exitCode?: number | null; signal?: NodeJS.Signals | null }).stdout = stdout;
      (error as Error & RunCommandResult & { exitCode?: number | null; signal?: NodeJS.Signals | null }).stderr = stderr;
      (error as Error & RunCommandResult & { exitCode?: number | null; signal?: NodeJS.Signals | null }).exitCode = code;
      (error as Error & RunCommandResult & { exitCode?: number | null; signal?: NodeJS.Signals | null }).signal = signal;
      rejectPromise(error);
    });
  });
}

const { url: supabaseUrl, serviceRoleKey: supabaseServiceRoleKey } =
  supabaseTestEnv;

const describeSeedIntegrity = hasServiceCredentials
  ? describe.sequential
  : describe.skip;

describeSeedIntegrity("database seed integrity", () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service credentials are required to run this test.");
  }

  beforeAll(async () => {
    await runCommand("npm", ["run", "seed:full"]);
  }, 600_000);

  test(
    "seeded content matches expectations",
    async () => {
      const result = await runCommand("npm", ["run", "verify:seed"]);
      expect(result.stdout).toContain("Seed verification passed");
    },
    300_000,
  );

  test(
    "analytics heatmap materialization stays consistent",
    async () => {
      const result = await runCommand("npm", ["run", "verify:analytics:heatmap"]);
      expect(result.stdout).toContain("Verification complete.");
    },
    600_000,
  );
});

if (!hasServiceCredentials) {
  test.skip(
    "database seed integrity",
    () => {},
  );
}
