# Contributing

Thanks for your interest in improving **opencode-auto-upgrades**! This repo ships agent skills — *test-baselining* and *regression-checking* — as an installable OpenCode plugin. It's all Markdown and configuration, so you can contribute meaningfully without a compiler.

## Getting set up

Clone the repo and open it in OpenCode (or any dot-agents-compatible assistant). There are no dependencies to install and no build step.

## What to work on

Check the issue tracker for labels:

- `ready-for-agent` — fully specified, safe to pick up AFK
- `ready-for-human` — needs a human implementer
- `needs-info` — waiting on more details; help clarify!

Browse: `gh issue list --label ready-for-agent --state open` in the `Expert-Vision-Software/opencode-auto-upgrades` repo.

## Rules of the road

- **Update the manifest.** Any change under `.opencode/skills/` or `.opencode/commands/` must be reflected in `.opencode/opencode-auto-qcgates.manifest.json`: regenerate the file's SHA-256 hash (`sha256sum <file>`) and bump the manifest `version`. Stale hashes break plugin installs.
- **Keep skill bodies agent-agnostic.** Host-specific bindings (OpenCode `loadSkill`, Claude Code specifics) belong only in the designated section at the end of a SKILL.md, or in `.opencode/commands/`.
- **Mind the frontmatter.** A skill's `name` and `description` control when agents activate it — make descriptions concrete and trigger-oriented.
- **Use triage labels.** Vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
- **Respect domain docs.** If `GLOSSARY.md` or `docs/adr/` exist, use their vocabulary; they're created lazily, so don't add boilerplate ones preemptively.

## Verification

There is no CI yet. Before opening a PR, verify manually:

1. The changed Markdown renders correctly (tables, frontmatter, code fences).
2. `sha256sum` output for every touched file matches the manifest.
3. Skill frontmatter is valid YAML and `description` still matches the skill's actual behavior.

## Submitting

Open a pull request against `main` with a clear title (e.g. `feat: add tier-detection to test-baselining init`) and link the issue it resolves (`Closes #N`). For anything ambiguous, start a discussion in an issue first — we'd rather align on the design than reject a big diff.

## License

[MIT](LICENSE.md)
