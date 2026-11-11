# opencode-auto-upgrades

[![npm version](https://img.shields.io/npm/v/opencode-auto-upgrades?color=cb3837&label=npm)](https://www.npmjs.com/package/opencode-auto-upgrades) [![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?logo=bun&logoColor=black)](https://bun.sh) [![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE.md) [![Platforms](https://img.shields.io/badge/Platforms-Linux%20%7C%20macOS%20%7C%20Windows-6366f1)](#install-) [![OpenCode plugin](https://img.shields.io/badge/opencode-plugin-blueviolet)](https://opencode.ai/v2/docs/plugins) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Expert-Vision-Software/opencode-auto-upgrades)

Safe, sensible, and aggressive dependency upgrades for TypeScript/JavaScript codebases (npm, pnpm, Bun workspaces) — run as baseline-gated rounds by an OpenCode agent. 🚦

## Why this exists ✨

Autonomous dependency upgrades usually mean either timid patch-only bumps or blind jumps to `latest`. **opencode-auto-upgrades** runs upgrade rounds instead: every outdated package is categorized by risk, the risky ones are researched *before* they are touched, changes land in revertable batches, and each round is proven against your project's frozen test baseline before it counts as done.

## What you get 🧰

- **`dependency-upgrade` skill, `/upgrade-deps` command, `upgrade-deps` agent** — `/upgrade-deps [tier] [--yolo] [--report]` is the entry point (tier: `safe` | `sensible` | `aggressive`, default `sensible`); the skill carries the full round workflow below
- **Three upgrade tiers, selected per run**
  - **safe** — in-range updates only (patch + minor within declared ranges)
  - **sensible** — out-of-range minors pinned up within the same major; lands only with high confidence of zero functional changes
  - **aggressive** — majors/latest stable; research-gated, ≥50% confidence, mechanical source adaptation allowed
- **Baseline-gated rounds** — a round does not start without a valid baseline at the current HEAD; verification results feed the PROCEED / STOP / REVIEW decision layer
- **Research before risk** — every major (and any minor spanning ≥3 upstream versions) gets a research pass with `SAFE` / `ADAPT` / `BLOCKED` verdicts before bumping
- **Atomic coupled bumps** — exact-pinned scope families (e.g. `@mastra/*`) move together in one commit, never partially
- **Deferral ledger** — every "not now" carries a written re-check trigger; hard "never again" opt-outs persist to a per-project config file
- **Git discipline** — branch per round, one commit per batch, nothing pushed and no PRs opened unless asked
- **Works under any dot-agents-compatible host** — OpenCode, Claude Code, and friends. Skill bodies are agent-agnostic; host bindings live in a dedicated section.

## Dependencies (required) 🔗

This package **hard-depends on the quality-gate skills `test-baselining` and `regression-checking`** — a round refuses to start without a valid, recent baseline. They are not part of this package; they are delivered by the **opencode-auto-qcgates** plugin:

```bash
bunx opencode-auto-qcgates@latest install --scope global
```

Install both packages in either order: the upgrade round checks for the two skills at start and prints exactly this remediation command if they are missing. The copies under `.opencode/skills/` in this repo are that dependency's vendored install for this dev checkout, not part of this package's payload.

## Install 🔌

The payload is Markdown only — a skill, a command, and an agent — installed into an OpenCode scope by the package's CLI (requires [Bun](https://bun.sh)):

```bash
# all projects (~/.config/opencode)
bunx opencode-auto-upgrades@latest install --scope global

# this project only (./.opencode)
bunx opencode-auto-upgrades@latest install --scope local
```

`install` copies `skills/dependency-upgrade/` (including its `refs/`), `commands/upgrade-deps.md`, and `agents/upgrade-deps.md` into the chosen scope and records every file's SHA-256 in `opencode-auto-upgrades.manifest.json` beside the config. Re-running the same version is a zero-write no-op; when the payload changes with a new package version, `install` refreshes the copies.

### Managing the install

```bash
bunx opencode-auto-upgrades@latest status              # what each scope holds, and which files you edited
bunx opencode-auto-upgrades@latest status --online     # also check the latest published version
bunx opencode-auto-upgrades@latest uninstall --scope local
bunx opencode-auto-upgrades@latest clear-cache         # drop this package's copies from OpenCode's npm cache
```

Files you edit in place are skipped with a warning so your changes survive an upgrade — pass `--force` to take the packaged version back. `uninstall` removes only the paths this package's manifest lists, plus the manifest itself.

## Best time to use it ✅

- When `bun outdated` / `npm outdated` shows a backlog and you want it worked in safe batches
- After a major framework release — research first, adapt mechanically, verify against the baseline
- Before a long-lived branch merge — prove the upgraded tree matches the old tree's behavior

## Contributing 🤝

See [CONTRIBUTING.md](CONTRIBUTING.md). The payload is Markdown; the installer is a small TypeScript CLI verified with `bun test` and `bun run check`.

## License 📄

[MIT](LICENSE.md)
