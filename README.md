# opencode-auto-upgrades

[![OpenCode plugin](https://img.shields.io/badge/opencode-plugin-blueviolet)](https://opencode.ai/v2/docs/plugins) [![npm version](https://img.shields.io/npm/v/opencode-auto-upgrades?color=cb3837&label=npm)](https://www.npmjs.com/package/opencode-auto-upgrades) [![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE.md) [![Runtime](https://img.shields.io/badge/Runtime-Markdown--only-lightgrey)](#what-you-get-) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Expert-Vision-Software/opencode-auto-upgrades)

Quality gates for AI coding agents. 🚦

**opencode-auto-upgrades** ships two OpenCode agent skills — *test-baselining* and *regression-checking* — packaged as an installable OpenCode plugin (`opencode-auto-qcgates`). It closes the gap between "the model said it's done" and "the tests prove it's done."

## Why this exists ✨

Autonomous agents declare tasks complete without evidence. This plugin gives them a standard framework to:

- **Run tests and freeze baselines** of key metrics — counts, pass rates, coverage, build time, artifact size
- **Gate changes against thresholds** so regressions are caught before they land
- **Answer quality questions in plain language**: "Did we break anything?", "Is it safe to commit?", "Should I proceed?" — with structured `PROCEED` / `STOP` / `REVIEW` decision signals

## What you get 🧰

- **`test-baselining` skill** — test execution, metric capture, threshold evaluation, baseline updates. Reads `testing-protocol.md` and `testing-baseline.xml` from your project root; the single source of truth, re-read every run.
- **`regression-checking` skill** — decision layer on top: translates metric deltas into risk assessments humans can scan and signals agents can act on.
- **Slash commands** — `/test-baseline` (`init|eval|update`, default `eval`) and `/regression-check` (`status` for a quick cached check).
- **Works under any dot-agents-compatible host** — OpenCode, Claude Code, and friends. Skill bodies are agent-agnostic; host bindings live in a dedicated section.

## Install 🔌

Add the plugin to your project's `.opencode/opencode.json`:

```json
{
  "plugins": ["opencode-auto-qcgates@latest"]
}
```

Then run `/test-baseline init` to build your project's protocol and first baseline.

## Best time to use it ✅

- Before commit or push — verify quality before proposing changes
- After an agent task completes — run the regression check before reporting done
- On large change surfaces — when the diff exceeds your protocol's threshold
- During agent oversight — decide whether to let the agent continue or fix regressions first

## Contributing 🤝

See [CONTRIBUTING.md](CONTRIBUTING.md). No build, no dependencies — the whole repo is Markdown and configuration, so meaningful contributions are one good edit away.

## License 📄

[MIT](LICENSE.md)
