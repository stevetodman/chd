import postcss from "postcss";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import tailwindcss from "tailwindcss";

const compileAst = typeof tailwindcss?.compileAst === "function" ? tailwindcss.compileAst : null;

const CONFIG_FILES = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs"
];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveConfigPath(configOption, cwd) {
  if (typeof configOption === "string" && configOption.length > 0) {
    return path.resolve(cwd, configOption);
  }

  for (const candidate of CONFIG_FILES) {
    const fullPath = path.resolve(cwd, candidate);
    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }

  return undefined;
}

async function loadConfig(configOption, cwd) {
  if (configOption && typeof configOption === "object") {
    return { config: configOption };
  }

  const resolvedPath = await resolveConfigPath(configOption, cwd);
  if (!resolvedPath) {
    return undefined;
  }

  const moduleUrl = pathToFileURL(resolvedPath).href;
  const loaded = await import(moduleUrl);
  const config = loaded?.default ?? loaded?.config ?? loaded;
  return { config, resolvedPath };
}

function toPostCssRoot(css, from) {
  const parsed = postcss.parse(css, { from });
  return parsed;
}

export default function tailwindcssPostcssPlugin(options = {}) {
  const { config: configOption, cwd = process.cwd(), ...compileOptions } = options;

  if (!compileAst) {
    if (configOption && typeof configOption === "object") {
      return tailwindcss(configOption);
    }
    return tailwindcss();
  }

  return {
    postcssPlugin: "tailwindcss",
    async Once(root, { result }) {
      const from = root.source?.input?.file ?? root.source?.input?.from;
      const { config, resolvedPath } = (await loadConfig(configOption, cwd)) ?? {};

      const compiled = await compileAst(root.toString(), {
        ...compileOptions,
        ...(config ? { config } : {}),
        ...(from ? { from } : {}),
      });

      const css = await compiled.build();
      const nextRoot = toPostCssRoot(css, from);

      root.removeAll();
      nextRoot.each((node) => {
        root.append(node);
      });

      if (resolvedPath) {
        result.messages.push({
          type: "dependency",
          plugin: "tailwindcss",
          file: resolvedPath,
        });
      }

      for (const source of compiled.sources ?? []) {
        if (source?.file) {
          result.messages.push({
            type: "dependency",
            plugin: "tailwindcss",
            file: source.file,
          });
        }
      }
    },
  };
}

tailwindcssPostcssPlugin.postcss = true;
