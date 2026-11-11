---
name: "dependency-upgrade"
description: "Runs baseline-gated dependency-upgrade rounds in three tiers (safe, sensible, aggressive) for TypeScript/JavaScript repositories on npm, pnpm, or Bun, including workspaces and monorepos. Use when the user asks to upgrade, update, or bump dependencies, work through outdated packages, clear dependency debt, run an upgrade-deps round, or take a major version. Refuses yarn repositories (out of scope) and refuses to start without a valid testing baseline."
---

# Dependency upgrade rounds

Upgrade dependencies in tiered, baseline-gated rounds. One round = one branch, small verified commits per batch, one full evaluation, one baseline decision, one ledger update. Research is parallel; integration (installs, edits, commits) is serial and done inline by the driving agent.

## Tiers

| Tier | Scope | Adaptation allowed | Confidence gate | Research pass |
| --- | --- | --- | --- | --- |
| safe | In-range updates only: patch + minor within declared semver ranges | None — `package.json` + lockfile only | Default | No |
| sensible | Out-of-range minors pinned up within the same major | Mechanical, provably behavior-preserving | HIGH: zero functional changes, evidenced only from inside the repo | Minors spanning >= 3 upstream versions |
| aggressive | Majors to latest stable; never prereleases, never dist-tags | Mechanical | >= 50% | Every bump |

Every tier, always:

- Sub-threshold or un-automatable changes are reported as blockers. Never silently dropped.
- Adaptation is mechanical only: capability-gated forwarding methods, renamed API calls, config key renames. No speculative refactors.
- Branch `upgrade-deps-<n>` per round (increment `<n>` on collision), cut from the repo's default branch after fetching. One commit per batch; the message lists each `pkg old -> new`.
- Never push; never open a PR unless explicitly asked in that round.
- `--yolo` (explicit user request for the round) skips tier approval; STOP-on-FAIL and the no-push rule still apply.

## Round artifacts

| Artifact | Location | Touched in |
| --- | --- | --- |
| Branch | `upgrade-deps-<n>` | Phase 0 |
| Testing baseline | Consumer's baseline artifact, via `test-baselining` | Phases 0, 6 |
| Deferral ledger | `docs/dependency-upgrade-ledger.md` | Phases 0, 5, 7 |
| Per-project config | `.opencode/upgrade-deps.json` (opt-in) | Phases 0, 5 |
| Round report | `docs/upgrade-deps-report-<n>.md`, else chat summary | Phase 7 |

## Workflow

### Phase 0 — Preconditions and dependency check

1. Hard skill dependencies: `test-baselining` and `regression-checking` (delivered by the `opencode-auto-qcgates` plugin). If either is missing, print exactly the following remediation and stop:

   ```sh
   bunx opencode-auto-qcgates@latest install --scope global
   ```

2. Detect the manager by lockfile: `package-lock.json` = npm, `pnpm-lock.yaml` = pnpm, `bun.lock`/`bun.lockb` = bun. A `yarn.lock` repository is out of scope: refuse with a clear message and stop.
3. Baseline at the current HEAD via `test-baselining`: initialize if missing; re-evaluate/update if HEAD moved since the baseline. If the untouched tree fails any verification layer, stop and report the pre-existing breakage. Never bump on red.
4. Create the round branch.
5. Derive project-invariant candidates from repo docs (`AGENTS.md`, `docs/`), critical test scripts, and config. Present them for user confirmation; persist confirmed invariants to `.opencode/upgrade-deps.json` (`refs/config-schema.md`).
6. Read the deferral ledger and the config `never` list; surface every ledger entry whose re-check trigger appears satisfied.

### Phase 1 — Categorize

1. Run the manager's outdated listing (`refs/manager-matrix.md`). Capture the full table now — it is the round's work order. Re-run before a batch if much time has passed.
2. Classify each delta into exactly one tier per the table above.
3. Check `@types/*` companions alongside their runtime packages: bump together, and plan to drop the stub when the runtime package now ships its own types.
4. Group exact-pinned packages sharing a scope (for example an exact-pinned `@mastra/*` family) into coupled families. Families bump atomically — never partially; transitive floor-raising lands in the same commit.
5. Monorepos: operate at the repo root as one plan. `workspace:`/`catalog:` protocols and `overrides`/`resolutions` are constraints to respect, not independently upgradeable units (`refs/manager-matrix.md`).
6. Apply the `never` list and the ledger during classification. Deferred items return to the ledger with a trigger, never into a batch.
7. Present the plan: batches grouped by risk and tier. The user approves tier(s); batches then run autonomously within an approved tier.

### Phase 2 — Research

1. Gate: every aggressive-tier bump, plus any minor spanning >= 3 upstream versions, gets a research pass before the bump.
2. Dispatch 2–4 parallel read-only research subagents, grouped by ecosystem. Each prompt states the repo's actual usage surface for the package (paste the imports/APIs used) and returns: breaking changes relevant to that surface, peer/engine constraints, a verdict `SAFE` / `ADAPT (what)` / `BLOCKED (why)`, and a confidence estimate.
3. No researched bump lands without its report. Record every verdict in the round report.

### Phase 3 — Safe batches

1. Batch safe runtime bumps first, then dev bumps.
2. In-range bumps via the manager's update command; pins via direct manifest edits (`refs/manager-matrix.md`).
3. The safe tier touches only `package.json` and the lockfile.
4. Verify each batch with the repo's declared scripts: install + typecheck + affected test layers. Fix before committing.
5. After every batch run `git diff` on the manifests and confirm every intended range actually changed — update commands silently rewrite ranges, which silently no-ops later text-based replaces. Fix drift before committing.
6. One commit per batch; the message lists each `pkg old -> new`.

### Phase 4 — Sensible and aggressive batches

1. One batch per coupled family or major. Bump, adapt, typecheck, test, commit.
2. Adaptation per the tier table: sensible edits must be provably behavior-preserving (typecheck + existing tests + API-surface comparison); aggressive proceeds at >= 50% confidence.
3. Anything below the tier's confidence threshold or not mechanically automatable becomes a blocker (reported in phase 7), never a silent skip.
4. Any verification failure: STOP -> report -> plan -> user approval -> fix -> re-run.

### Phase 5 — Ledger and config

1. A deferral exists only with a written re-check trigger in `docs/dependency-upgrade-ledger.md`, as a `| Deferral | Re-check trigger |` table. A deferral without a trigger is rejected — write a trigger or do not defer. Format and examples: `refs/ledger-format.md`.
2. When the user opts out of a specific update (never-list) or confirms derived invariants, offer to create/update `.opencode/upgrade-deps.json` (`refs/config-schema.md`). Zero-config is the default.

### Phase 6 — Full eval and baseline

1. Run the consumer's full evaluation per its testing protocol as surfaced by `test-baselining`: clean install + typecheck + build + tests, whatever scripts exist. Clear stale build output first so artifact metrics measure this round.
2. Run any config `verifyCommands` and re-check config `invariants`.
3. E2E: use the repo's detached harness convention when declared (for example `test:e2e:agent` plus a status-poll script); run e2e synchronously only when the protocol defines it.
4. Evaluate against the baseline with `regression-checking`; it emits PROCEED / STOP / REVIEW. On any threshold breach or FAIL: STOP, report, plan, get approval, fix, re-run.
5. Update the baseline only via `test-baselining`, only on PASS + threshold exceeded.

### Phase 7 — Report and sync

1. Write `docs/upgrade-deps-report-<n>.md` when a `docs/` round-report convention exists or the user asks; otherwise output a structured chat summary: batches landed (`pkg old -> new`), research verdicts, blockers, baseline delta.
2. Always update the deferral ledger afterward: satisfied-and-handled entries removed; re-deferrals get updated triggers; new deferrals get triggers.
3. Sync repo docs that pin the stack (for example an approved-package-stack section) wherever pins moved.

## References

- `refs/manager-matrix.md` — per-manager command matrix (npm/pnpm/bun), monorepo constraints, silent-edit and recurring-breakage pitfalls.
- `refs/config-schema.md` — full `.opencode/upgrade-deps.json` schema plus a worked example.
- `refs/ledger-format.md` — deferral-ledger format, rules, worked examples.

## Host bindings (OpenCode)

- Load `test-baselining` and `regression-checking` through the `skill` tool. Absence at phase 0 is fatal: print the remediation, stop.
- Dispatch research subagents with the `subagent` tool: read-only agents, 2–4 in parallel, grouped by ecosystem.
- Read thresholds and verification layers from the consumer's testing protocol as surfaced by `test-baselining`; never invent thresholds when `thresholdOverrides` are absent.
