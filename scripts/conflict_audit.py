"""Utility to scan the repository for merge conflicts and unresolved follow-ups.

This script walks all tracked files in the current Git checkout and looks for
merge conflict markers (e.g. ``<<<<<<<``) as well as common unresolved issue
markers (TODO, FIXME, XXX). When markers are found the script prints a
natural-language summary that can be copied into a pull request description.

The script is intentionally dependency-free so that it can run in CI or a local
checkout without extra setup.
"""
from __future__ import annotations

import argparse
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Iterable

# Merge conflict markers that indicate Git stopped mid-merge.
CONFLICT_TOKENS = ("<<<<<<<", "=======", ">>>>>>>")

# Common strings that highlight unfinished work that should be tracked.
# "XXX" is intentionally excluded because it frequently appears inside hashed
# values (for example inside npm lockfiles) and would create false positives.
UNRESOLVED_TOKENS = ("TODO", "FIXME", "TBD")


def iter_tracked_files() -> Iterable[Path]:
    """Return every file tracked by Git in the current repository."""
    result = subprocess.run(
        ["git", "ls-files"], check=True, text=True, capture_output=True
    )
    root = Path.cwd()
    for line in result.stdout.splitlines():
        if not line:
            continue
        yield root / line


def scan_file(path: Path) -> tuple[list[str], list[str]]:
    """Return conflict and unresolved issue descriptions for ``path``.

    The function reads the file defensively: any decoding errors are ignored so
    that binary assets do not crash the script.
    """
    conflicts: list[str] = []
    unresolved: list[str] = []
    try:
        contents = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError as exc:  # pragma: no cover - very rare but keeps script robust
        unresolved.append(f"Unable to read file because of: {exc}")
        return conflicts, unresolved

    for idx, line in enumerate(contents, start=1):
        if any(token in line for token in CONFLICT_TOKENS):
            conflicts.append(
                f"Line {idx} contains a merge conflict marker: `{line.strip()}`."
            )
        if any(token in line for token in UNRESOLVED_TOKENS):
            unresolved.append(
                f"Line {idx} flags follow-up work: `{line.strip()}`."
            )
    return conflicts, unresolved


def build_report() -> dict[str, dict[str, list[str]]]:
    """Scan the repository and build a report bucketed by file."""
    report: dict[str, dict[str, list[str]]] = defaultdict(lambda: {"conflicts": [], "unresolved": []})
    for file_path in iter_tracked_files():
        conflicts, unresolved = scan_file(file_path)
        if conflicts or unresolved:
            relative = file_path.relative_to(Path.cwd())
            report[str(relative)]["conflicts"].extend(conflicts)
            report[str(relative)]["unresolved"].extend(unresolved)
    return report


def format_pr_summaries(report: dict[str, dict[str, list[str]]]) -> str:
    """Return a markdown document that reads like PR descriptions."""
    if not report:
        return (
            "# Repository Audit\n\n"
            "No merge conflicts or unresolved issue markers were detected."
        )

    sections: list[str] = ["# Repository Audit"]
    for file, details in sorted(report.items()):
        sections.append(f"\n## Proposed PR: Address outstanding items in `{file}`")
        if details["conflicts"]:
            sections.append("### Merge Conflicts")
            for entry in details["conflicts"]:
                sections.append(f"- {entry}")
        if details["unresolved"]:
            sections.append("### Follow-up Tasks")
            for entry in details["unresolved"]:
                sections.append(f"- {entry}")
        sections.append(
            "### Suggested Next Steps\n"
            "1. Review the highlighted lines.\n"
            "2. Resolve the conflicts or schedule the follow-up work.\n"
            "3. Update the PR description with the decisions taken."
        )
    return "\n".join(sections)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan tracked files for merge conflicts and unresolved comments."
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional path to write the markdown report. If omitted the report is printed.",
    )
    args = parser.parse_args()

    report = build_report()
    markdown = format_pr_summaries(report)
    if args.output:
        args.output.write_text(markdown, encoding="utf-8")
    else:
        print(markdown)


if __name__ == "__main__":
    main()
