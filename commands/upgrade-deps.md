---
description: "Run one dependency-upgrade round at tier safe|sensible|aggressive (default sensible) behind QC gates (baseline at HEAD, test-baselining, regression-checking); never pushes. Flags: --yolo fully autonomous, --report write docs/upgrade-deps-report-<n>.md. Use when asked to upgrade or bump dependencies."
---

Upgrade dependencies: one round, one tier.

Arguments (`$ARGUMENTS`):
- Tier: first positional (`$1`) — `safe` | `sensible` | `aggressive`; default `sensible` when omitted. Unknown tier: print the three valid tiers and stop.
- `--yolo`: skip tier approval gates; run fully autonomously.
- `--report`: write `docs/upgrade-deps-report-<n>.md` even when no report convention exists.

Steps:
1. Load the `dependency-upgrade` skill (Skill tool) and follow it for one upgrade round at the tier above. The skill's SKILL.md is the source of truth for the workflow; this command is only the entry point and argument parser.
2. Preconditions (hard stops, before any change):
   - Skills `test-baselining` and `regression-checking` must be installed. If either is missing, print exactly `bunx opencode-auto-qcgates@latest install --scope global` and stop.
   - A valid baseline at the current HEAD is required before any bump. If absent, create one per the skill first; never bump on a missing or stale baseline.
3. Tier semantics:
   - `safe` — in-range bumps only.
   - `sensible` — out-of-range minors, high confidence of zero functional change.
   - `aggressive` — majors/latest, >=50% confidence; never prereleases.
4. Without `--yolo`, present the tier and the proposed batch for approval before applying anything. With `--yolo`, proceed autonomously.

Safety rails — every tier, `--yolo` included:
- Never push. Never open PRs.
- One commit per batch.
- Blockers are reported, never dropped.
