/* eslint-disable no-console */
import fg from "fast-glob";
import fs from "fs";
import path from "path";
import pc from "picocolors";
import { timestamp, ensureDir, readJson, writeJsonPretty } from "./lib/fs-utils";
import { Question as QuestionSchema } from "../src/schema/question.schema";
import { normalizeItem } from "./lib/normalizers";

const ROOT = process.cwd();
const ITEMS_DIR = path.join(ROOT, "chd-qbank", "content", "questions");
const REPORT_DIR = path.join(ROOT, "chd-qbank", "content", "_reports");
const BACKUP_DIR = path.join(ROOT, "chd-qbank", "content", `_backup_${timestamp()}`);
const DRY_RUN = !!process.env.DRY_RUN;

type Row = {
  file: string;
  status: "ok" | "warn" | "error" | "skipped";
  addedKeys: string;
  changedKeys: string;
  warnings: string;
  errors: string;
};

async function main() {
  if (!fs.existsSync(ITEMS_DIR)) {
    console.error(pc.red(`Items directory not found: ${ITEMS_DIR}`));
    process.exit(1);
  }

  ensureDir(REPORT_DIR);
  ensureDir(BACKUP_DIR);

  const files = await fg(["**/*.json"], { cwd: ITEMS_DIR, absolute: true });
  if (files.length === 0) console.log(pc.yellow("No JSON items found under content/questions."));

  const rows: Row[] = [];
  let ok = 0, warn = 0, err = 0, skipped = 0;

  for (const file of files) {
    try {
      const rel = path.relative(ROOT, file);
      const data = readJson(file);
      const result = normalizeItem(data, file, QuestionSchema);

      if (result.errors.length > 0 || !result.normalized) {
        rows.push({ file: rel, status: "error", addedKeys: result.addedKeys.join(";"),
          changedKeys: result.changedKeys.join(";"), warnings: result.warnings.join(" | "), errors: result.errors.join(" | ") });
        console.log(pc.red(`✖ ${rel} — schema validation failed`));
        err++;
        continue;
      }

      const out = result.normalized;

      // backup original
      const backupPath = path.join(BACKUP_DIR, path.relative(ITEMS_DIR, file));
      if (!DRY_RUN) { ensureDir(path.dirname(backupPath)); fs.copyFileSync(file, backupPath); }

      // write normalized
      if (!DRY_RUN) writeJsonPretty(file, out);

      const hasWarn = result.warnings.length > 0;
      rows.push({ file: rel, status: hasWarn ? "warn" : "ok",
        addedKeys: result.addedKeys.join(";"), changedKeys: result.changedKeys.join(";"),
        warnings: result.warnings.join(" | "), errors: "" });
      console.log((hasWarn ? pc.yellow : pc.green)(`${hasWarn ? "▲" : "✔"} ${rel}`));
      hasWarn ? warn++ : ok++;
    } catch (e: any) {
      const rel = path.relative(ROOT, file);
      rows.push({ file: rel, status: "error", addedKeys: "", changedKeys: "", warnings: "", errors: String(e?.message ?? e) });
      console.log(pc.red(`✖ ${rel} — ${String(e?.message ?? e)}`));
      err++;
    }
  }

  // CSV report
  const csvPath = path.join(REPORT_DIR, `migration_${timestamp()}.csv`);
  const header = "file,status,addedKeys,changedKeys,warnings,errors\n";
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const body = rows.map(r => [r.file, r.status, r.addedKeys, r.changedKeys, r.warnings, r.errors].map(escape).join(",")).join("\n");
  if (!DRY_RUN) fs.writeFileSync(csvPath, header + body + "\n", "utf8");

  console.log(pc.bold(`\nSummary:`));
  console.log(pc.green(`  OK:      ${ok}`));
  console.log(pc.yellow(`  WARN:    ${warn}`));
  console.log(pc.red(`  ERROR:   ${err}`));
  console.log(pc.dim(`  SKIPPED: ${skipped}`));
  console.log(pc.cyan(`\nReport: ${DRY_RUN ? "(dry-run; not written)" : csvPath}`));
  console.log(pc.cyan(`Backups: ${DRY_RUN ? "(dry-run; not written)" : BACKUP_DIR}`));

  if (err > 0) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exit(1); });
