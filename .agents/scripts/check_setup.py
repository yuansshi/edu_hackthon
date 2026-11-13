#!/usr/bin/env python3
"""Validate the local agent scaffold using Python 3.11+ and no services."""

import json
from pathlib import Path
import re
import sys
import tomllib
from urllib.parse import unquote, urlsplit


REQUIRED = (
    "AGENTS.md",
    "README.md",
    "Makefile",
    ".gitignore",
    ".editorconfig",
    ".agents/README.md",
    ".agents/rules/project.md",
    ".agents/rules/verification.md",
    ".agents/rules/collaboration.md",
    ".agents/skills/edu-hackathon-workflow/SKILL.md",
    ".agents/skills/edu-hackathon-workflow/agents/openai.yaml",
    ".agents/scripts/check_setup.py",
    ".codex/config.toml",
    ".codex/hooks.json",
)
SKILL = ".agents/skills/edu-hackathon-workflow/SKILL.md"


def check(root: Path) -> list[str]:
    errors: list[str] = []
    contents: dict[str, str] = {}
    for name in REQUIRED:
        path = root / name
        if not path.is_file():
            errors.append(f"{name}: missing required setup file")
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"{name}: cannot read UTF-8 text: {exc}")
            continue
        contents[name] = content
        if not content.endswith("\n"):
            errors.append(f"{name}: add a final newline")
        for number, line in enumerate(content.splitlines(), start=1):
            if line != line.rstrip(" \t"):
                errors.append(f"{name}:{number}: remove trailing whitespace")

    for name, loader in (
        (".codex/config.toml", tomllib.loads),
        (".codex/hooks.json", json.loads),
    ):
        if name not in contents:
            continue
        try:
            data = loader(contents[name])
        except ValueError as exc:
            errors.append(f"{name}: invalid syntax: {exc}")
            continue
        if name.endswith("hooks.json"):
            hooks = data.get("hooks") if isinstance(data, dict) else None
            if not isinstance(hooks, dict):
                errors.append(f"{name}: expected a top-level 'hooks' object")
            else:
                for event, handlers in hooks.items():
                    if not isinstance(handlers, list):
                        errors.append(f"{name}: hooks.{event} must be an array")

    if SKILL in contents:
        lines = contents[SKILL].splitlines()
        if not lines or lines[0] != "---" or "---" not in lines[1:]:
            errors.append(f"{SKILL}: add YAML frontmatter delimited by '---'")
        else:
            frontmatter = "\n".join(lines[1 : lines.index("---", 1)])
            for field in ("name", "description"):
                match = re.search(rf"^{field}:[ \t]*(.*)$", frontmatter, re.MULTILINE)
                if not match or not match.group(1).strip(" \t\"'"):
                    errors.append(f"{SKILL}: add a nonempty '{field}' frontmatter field")

    for name, content in contents.items():
        if not name.endswith(".md"):
            continue
        for target in re.findall(r"\[[^\]]*\]\((<[^>]+>|[^)\s]+)\)", content):
            try:
                link = urlsplit(target.strip("<>"))
            except ValueError as exc:
                errors.append(f"{name}: invalid link {target}: {exc}")
                continue
            if link.scheme or link.netloc or not link.path:
                continue
            destination = (root / name).parent / unquote(link.path)
            if not destination.exists():
                errors.append(f"{name}: local link does not exist: {target}")

    return errors


if __name__ == "__main__":
    problems = check(Path(__file__).resolve().parents[2])
    for problem in problems:
        print(problem, file=sys.stderr)
    if problems:
        sys.exit(1)
    print("Agent setup files, config syntax, local links, and whitespace passed.")
