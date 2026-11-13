# Agent setup

```text
AGENTS.md
.agents/
  README.md
  rules/
    project.md
    collaboration.md
    verification.md
  skills/edu-hackathon-workflow/
    SKILL.md
    agents/openai.yaml
  scripts/check_setup.py
.codex/
  config.toml
  hooks.json
Makefile
```

## What loads where

- [AGENTS.md](../AGENTS.md) is the project instruction entry point. It explicitly
  requires the Markdown files in [rules/](rules/); those files are ordinary
  guidance, not an automatically loaded rules engine.
- Codex discovers repository skills under [.agents/skills/](skills/). The
  [project skill](skills/edu-hackathon-workflow/SKILL.md) includes
  [UI metadata](skills/edu-hackathon-workflow/agents/openai.yaml). Start a new
  session here to refresh discovery.
- [.codex/config.toml](../.codex/config.toml) holds project overrides for trusted
  projects. It currently inherits existing user and account defaults. Add
  selected plugin settings there when needed; none are configured by this setup.
- [.codex/hooks.json](../.codex/hooks.json) provides empty `PreToolUse`,
  `PostToolUse`, and `Stop` arrays. It runs no commands. Future hook definitions
  use Codex's normal review and trust flow; project hooks also require a trusted
  project. Avoid duplicating hooks inline in the TOML file.

There is no `.agents/skills.json`, `.agents/plugins.json`, or
`.agents/hooks.json` registry in this setup. For shared skills, symlink a skill
directory into `.agents/skills/` when there is a real shared skill to use.

## Validation

Run `make check` from the project root, or invoke the
[checker](scripts/check_setup.py) with Python 3.11+ from any directory.
It checks required files, TOML and JSON syntax, hook event/list structure,
basic skill frontmatter, simple local Markdown file links, and whitespace.
It does not validate link anchors, the full skill/UI YAML schema, hook handler
semantics, runtime discovery, or application behavior.

## Official references

- [Project instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Skill discovery and shared skills](https://learn.chatgpt.com/docs/build-skills)
- [Project configuration](https://learn.chatgpt.com/docs/config-file/config-advanced)
- [Lifecycle hooks and trust](https://learn.chatgpt.com/docs/hooks)
