# Manager command matrix

Per-manager commands for npm, pnpm, and Bun, plus the pitfalls that silently corrupt upgrade rounds. Yarn is out of scope: refuse with a clear message.

## Commands

| Task | npm | pnpm | Bun |
| --- | --- | --- | --- |
| Outdated listing | `npm outdated --json` | `pnpm outdated --json` | `bun outdated` |
| In-range update | `npm update <pkgs>` | `pnpm update <pkgs>` | `bun update <pkgs>` |
| Install after manifest edit | `npm install` | `pnpm install` | `bun install` |
| Clean install (full eval) | `npm ci` | `pnpm install --frozen-lockfile` | `bun install --frozen-lockfile` |
| Resolved-version check | `npm ls <pkg>` | `pnpm ls <pkg>` | `bun pm ls` |

## Update semantics

- Update commands move within declared ranges only; they never cross a major.
- Pins (exact versions, or targets outside the declared range) are changed by editing `package.json` directly, then running install to reconcile the lockfile.
- After any install, verify what actually resolved with the resolved-version check. Peer resolution can land below the requested floor: the manager picks the version satisfying all transitive peers.

## Monorepo constraints

- Workspaces are detected via `workspaces` in the root `package.json` or `pnpm-workspace.yaml`. One plan, run at the repo root; a batch spans workspaces when a coupled family does.
- `workspace:` protocol links local packages: never rewritten by upgrades. Bump the source package; dependents follow.
- `catalog:` protocol (pnpm workspaces, Bun): versions live in the catalog block (`pnpm-workspace.yaml` or the root manifest). Update the catalog entry, not per-workspace manifests.
- `overrides` (npm, pnpm, Bun) and `resolutions` (legacy) pin transitive versions. A bump is incomplete while an override holds the old version — raise the override deliberately in the same commit, or record in the report why it stays.

## Silent-edit pitfalls

1. **Range rewrites.** `bun update <pkg>` rewrites the `package.json` range; npm's update leaves declared ranges alone. A scripted text replace written against the old range then silently no-ops, so a bump can be absent while its commit message claims it landed. After every batch: `git diff` the manifests and confirm each intended range actually changed. Prefer direct edits over scripted replaces.
2. **Peer floors below request.** The resolved version satisfies all transitive peers and can sit below the requested floor. Check post-install, reconcile, and note the reconciliation in the commit or report.
3. **Types stubs left behind.** When a bumped package now bundles its own types, dropping the `@types/*` stub is part of the same batch.
4. **Browser-driver revisions.** Playwright-family minors bump the browser build; run the browser install step again after the bump, or the e2e layer fails at launch.
5. **Build-tool option removals in minors.** A minor can remove preset/plugin options and even turn them into hard errors. When a build or test runner suddenly fails across every file, suspect option removals first.
6. **Capability advertising outruns wrappers.** A storage/adapter minor can advertise a gated capability that a consumer asserts on while the wrapping layer's inherited implementation still fails. Audit capability listings whenever an adapter moves.
