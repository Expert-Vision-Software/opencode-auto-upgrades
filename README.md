# opencode-auto-upgrades

[![OpenCode plugin](https://img.shields.io/badge/opencode-plugin-blueviolet)](https://opencode.ai/v2/docs/plugins) [![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE.md) [![Runtime](https://img.shields.io/badge/Runtime-Markdown--only-lightgrey)](#what-you-get-) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Expert-Vision-Software/opencode-auto-upgrades)

Safe, sensible, and aggressive dependency upgrades for TypeScript/JavaScript codebases (npm, pnpm, Bun workspaces) — run as baseline-gated rounds by an OpenCode agent. 🚦

## Why this exists ✨

Autonomous dependency upgrades usually mean either timid patch-only bumps or blind jumps to `latest`. **opencode-auto-upgrades** runs upgrade rounds instead: every outdated package is categorized by risk, the risky ones are researched *before* they are touched, changes land in revertable batches, and each round is proven against your project's frozen test baseline before it counts as done.

## What you get 🧰

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

The copies under `.opencode/skills/` in this repo are that dependency's vendored install for this dev checkout, not part of the deliverable.

## Install 🔌

This is a Markdown-first package. Copy the dependency-upgrade skill, command, and agent definitions from `.opencode/` into your global `~/.config/opencode/` (or a project's `.opencode/`), then install the required quality-gate skills as shown above.

## Best time to use it ✅

- When `bun outdated` / `npm outdated` shows a backlog and you want it worked in safe batches
- After a major framework release — research first, adapt mechanically, verify against the baseline
- Before a long-lived branch merge — prove the upgraded tree matches the old tree's behavior

## Contributing 🤝

See [CONTRIBUTING.md](CONTRIBUTING.md). No build, no dependencies — the whole repo is Markdown and configuration, so meaningful contributions are one good edit away.

## License 📄

[MIT](LICENSE.md)
