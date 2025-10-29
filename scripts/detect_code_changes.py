#!/usr/bin/env python3
"""Determine whether a commit introduces code changes beyond docs/comments."""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

# Heuristic comment patterns covering common languages used in the repo.
COMMENT_PATTERNS = [
    re.compile(r"^//"),
    re.compile(r"^/\*"),
    re.compile(r"^\*/"),
    re.compile(r"^\*(\s|$)"),
    re.compile(r"^#(?![!])(?!\s*(?:include|ifdef|ifndef|endif|elif|else|define|pragma)\b)"),
    re.compile(r"^--"),
    re.compile(r"^<!--"),
    re.compile(r"^-->"),
    re.compile(r"^;"),
]

DOC_EXTENSIONS = {
    ".md",
    ".mdx",
    ".rst",
    ".txt",
    ".adoc",
    ".asciidoc",
}

DOC_DIRECTORIES = (
    "docs/",
    "prompts/",
)

ZERO_SHA = re.compile(r"^0+$")


def _determine_base_sha(head_sha: str) -> str | None:
    base_sha = os.environ.get("GITHUB_BASE_SHA") or os.environ.get("GITHUB_BEFORE_SHA")
    if not base_sha or ZERO_SHA.match(base_sha):
        return None
    return base_sha


def _run_git_diff(base_sha: str, head_sha: str) -> str:
    try:
        return subprocess.check_output(
            ["git", "diff", base_sha, head_sha, "--unified=0"],
            text=True,
            stderr=subprocess.STDOUT,
        )
    except subprocess.CalledProcessError as exc:
        # Surface diff output for debugging and treat as code change to be safe.
        print(exc.output, file=sys.stderr)
        print("true")
        sys.exit(0)


def _is_doc_file(path: str) -> bool:
    if any(path.startswith(prefix) for prefix in DOC_DIRECTORIES):
        return True
    suffix = Path(path).suffix.lower()
    return suffix in DOC_EXTENSIONS


def _is_comment_line(content: str) -> bool:
    stripped = content.strip()
    if not stripped:
        return True
    for pattern in COMMENT_PATTERNS:
        if pattern.match(stripped):
            return True
    return False


def detect_code_changes() -> bool:
    head_sha = os.environ.get("GITHUB_SHA")
    if not head_sha:
        return True

    base_sha = _determine_base_sha(head_sha)
    if not base_sha:
        # Without a base SHA we conservatively assume code changes exist.
        return True

    diff_output = _run_git_diff(base_sha, head_sha)

    current_file: str | None = None
    current_is_doc = False

    for line in diff_output.splitlines():
        if line.startswith("diff --git "):
            parts = line.split()
            if len(parts) >= 4:
                current_file = parts[3][2:]
                current_is_doc = _is_doc_file(current_file)
            else:
                current_file = None
                current_is_doc = False
            continue

        if line.startswith("Binary files "):
            return not current_is_doc

        if line.startswith("@@") or line.startswith("index "):
            continue

        if line.startswith("+++") or line.startswith("---"):
            continue

        if not current_file or current_is_doc:
            continue

        if line.startswith("+") or line.startswith("-"):
            if line.startswith("+++") or line.startswith("---"):
                continue
            content = line[1:]
            if _is_comment_line(content):
                continue
            return True

    return False


def main() -> None:
    has_changes = detect_code_changes()
    print("true" if has_changes else "false")


if __name__ == "__main__":
    main()
