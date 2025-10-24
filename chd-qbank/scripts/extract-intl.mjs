#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");
const outputPath = path.join(srcRoot, "i18n", "locales", "en.json");

function collectSourceFiles(directory) {
  const results = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") {
        continue;
      }
      results.push(...collectSourceFiles(resolved));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".d.ts")) continue;
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(resolved);
    }
  }
  return results;
}

const files = collectSourceFiles(srcRoot);

const messages = new Map();

function extractObjectContent(text, startIndex) {
  let cursor = startIndex;
  while (cursor < text.length && text[cursor] !== "{" && text[cursor] !== "(") {
    cursor += 1;
  }
  while (cursor < text.length && text[cursor] !== "{") {
    cursor += 1;
  }
  if (cursor >= text.length) return null;
  let depth = 0;
  let inString = null;
  let previousChar = "";
  let content = "";
  for (let index = cursor; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\" && inString !== "`") {
        content += char;
        index += 1;
        if (index < text.length) {
          content += text[index];
        }
        previousChar = "";
        continue;
      }
      content += char;
      if (char === inString && previousChar !== "\\") {
        inString = null;
      }
      previousChar = char;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      inString = char;
      content += char;
      previousChar = char;
      continue;
    }
    if (char === "{") {
      depth += 1;
      if (depth > 1) {
        content += char;
      }
      previousChar = char;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return { content, endIndex: index + 1 };
      }
      content += char;
      previousChar = char;
      continue;
    }
    if (depth > 0) {
      content += char;
    }
    previousChar = char;
  }
  return null;
}

const formatMessagePattern = /formatMessage\s*\(/g;

for (const filePath of files) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  let match;
  while ((match = formatMessagePattern.exec(sourceText))) {
    const result = extractObjectContent(sourceText, match.index + match[0].length);
    if (!result) continue;
    const { content, endIndex } = result;
    formatMessagePattern.lastIndex = endIndex;
    const idMatch = content.match(/id\s*:\s*(["'`])([^"'`]+)\1/);
    const defaultMessageMatch = content.match(/defaultMessage\s*:\s*(`([\s\S]*?)`|(["'])([\s\S]*?)\3)/);
    if (!idMatch || !defaultMessageMatch) {
      continue;
    }
    const id = idMatch[2];
    const defaultMessage = defaultMessageMatch[2] ?? defaultMessageMatch[4];
    if (id && defaultMessage && !messages.has(id)) {
      messages.set(id, { defaultMessage });
    }
  }
}

const sorted = Array.from(messages.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .reduce((acc, [id, value]) => {
    acc[id] = value.defaultMessage;
    return acc;
  }, {});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

// eslint-disable-next-line no-console
console.log(`Extracted ${messages.size} messages to ${path.relative(projectRoot, outputPath)}`);
