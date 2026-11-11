# Contributing

Thanks for your interest in improving **opencode-auto-upgrades**! This repo ships dependency-upgrade skills — *safe*, *sensible*, and *aggressive* tiers — as an OpenCode package: Markdown assets plus a small TypeScript installer CLI.

> The quality-gate skills it depends on — *test-baselining* and *regression-checking* — are **dependencies**, delivered by the [opencode-auto-qcgates](https://github.com/Expert-Vision-Software/opencode-auto-qcgates) plugin. The copies under `.opencode/skills/` are that dependency's vendored install for this dev checkout; fix dependency-side problems upstream, not here.

## Repository layout

| Path | Role |
| --- | --- |
| `skills/dependency-upgrade/` | Payload — the skill, with `refs/` reference docs |
| `commands/upgrade-deps.md` | Payload — the `/upgrade-deps` command |
| `agents/upgrade-deps.md` | Payload — the `upgrade-deps` agent |
| `src/installer.ts` | Policy adapter: payload spec, copy/refuse-mode behaviour, status, cache hygiene |
| `src/payload-synchronizer.ts` | Copy, skip-modified, hash, manifest, and removal mechanics |
| `src/cli.ts`, `index.ts` | `install` / `uninstall` / `status` / `clear-cache` entry points |
| `tests/` | Install, idempotency, modified-file, uninstall, CLI, and package-contract tests |
| `.opencode/` | The dev checkout's **own** extensions (the vendored opencode-auto-qcgates install and its config). Never edit these as part of a payload change. |

Payload lives at the package root because the installer copies repo-root `skills/`, `commands/`, and `agents/` straight into a consumer scope. `.opencode/` is a consumer of packages, not a source of them — putting payload there hides it from the installer and ships it to nobody.

## Getting set up

```bash
bun install          # links the local opencode-architect core dependency
```

`package.json` depends on `opencode-architect` through a local `file:` spec — the installer's manifest and cache machinery comes from its `opencode-architect/core` subpath. That spec is for local development; publishing swaps it for the registry version.

## Editing the payload

- **Bump `version` in `package.json` whenever a payload file changes.** The install manifest is keyed on that version: a consumer re-running `install` refreshes the copies only when the version moves or a recorded hash stops matching.
- **Never hand-edit `opencode-auto-upgrades.manifest.json`.** The installer writes it (version, mode, and one SHA-256 per installed file, relative to the scope base). A manifest that disagrees with the files on disk makes the next install look consumer-modified.
- **Add a payload file in exactly one place** — the root directories — and register it in the `PAYLOAD` spec in `src/installer.ts`. Skills are copied as whole directories; commands and agents are copied as single files.
- **Deletions need `uninstall`, not manual removal.** Removing a file from the package does not remove a consumer's copy; `uninstall` removes only the paths listed in the manifest.

### Manifest, scope, and mode rules

- Scopes differ only in base path: `local` is `<project>/.opencode`, `global` is `$XDG_CONFIG_HOME/opencode` (else `~/.config/opencode`). Behaviour is identical.
- The package is **copy-only**. It ships no runtime plugin, registers nothing in a consumer's `opencode.json`, and `install --mode plugin` exits with an explanation rather than writing a registration.
- An install is idempotent: same version plus matching hashes writes nothing and leaves the manifest untouched.
- Consumer-modified files are skipped with a warning and recorded against the packaged hash, so a later `--force` takes ownership of them.
- A missing or empty payload directory is a hard error naming the path; no manifest is written when no file was written.
- `clear-cache` is self-scoped: it removes only this package's own copies under OpenCode's npm cache.

## What to work on

Check the issue tracker for labels:

- `ready-for-agent` — fully specified, safe to pick up AFK
- `ready-for-human` — needs a human implementer
- `needs-info` — waiting on more details; help clarify!

Browse: `gh issue list --label ready-for-agent --state open` in the `Expert-Vision-Software/opencode-auto-upgrades` repo.

## Rules of the road

- **Keep skill bodies agent-agnostic.** Host-specific bindings (OpenCode `loadSkill`, Claude Code specifics) belong only in the designated section at the end of a SKILL.md, or in `commands/`.
- **Mind the frontmatter.** A skill's `name` and `description` control when agents activate it — make descriptions concrete and trigger-oriented, and quote every frontmatter value.
- **Use triage labels.** Vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
- **Respect domain docs.** If `GLOSSARY.md` or `docs/adr/` exist, use their vocabulary; they're created lazily, so don't add boilerplate ones preemptively.

## Verification

Before opening a PR, both gates must be green:

```bash
bun test        # bun test — install, idempotency, modified-file, uninstall, CLI, package contract
bun run check   # tsc --noEmit
```

The Markdown checks that matter are covered by the tests too: frontmatter quoting, the exact payload inventory (one skill, one command, one agent — the quality-gate skills stay out), and the manifest's per-file hashes.

## Submitting

Open a pull request against `main` with a clear title (e.g. `feat: add tier detection to upgrade planning`) and link the issue it resolves (`Closes #N`). For anything ambiguous, start a discussion in an issue first — we'd rather align on the design than reject a big diff.

## License

[MIT](LICENSE.md)
