# Per-project config schema

`.opencode/upgrade-deps.json` in the consumer repo. Opt-in: an absent file means zero-config defaults. Created only when the user opts out of a specific update (never-list) or confirms derived invariants. Read in phases 0, 1, and 6.

## Schema

```json
{
  "defaultTier": "safe",
  "never": ["legacy-logger", "@scope/*"],
  "verifyCommands": ["node scripts/check-invariant.mjs"],
  "invariants": [
    {
      "name": "tool-call-envelope",
      "check": "package-manager test tests/unit/envelope.test.ts",
      "note": "asserts the executeTool() response envelope; fails first if the framework reshapes it"
    }
  ],
  "thresholdOverrides": {
    "testDuration": 0.3
  }
}
```

## Fields

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `defaultTier` | `"safe" \| "sensible" \| "aggressive"` | `"safe"` | Tier used when the user states none. Never widens what the user explicitly approved in a round. |
| `never` | `string[]` | `[]` | Package names never bumped in any tier. Exact names; `@scope/*` excludes a whole scope family. |
| `verifyCommands` | `string[]` | `[]` | Extra commands appended to every full evaluation (phase 6), after the protocol's own steps. |
| `invariants` | `Invariant[]` | `[]` | Repo-specific properties that must hold after upgrades; re-checked in phase 6. |
| `thresholdOverrides` | `object` | `{}` | Replacement values for thresholds the consumer's protocol defines. Keys mirror the protocol's threshold names; values use the protocol's unit (a fraction for percentage deltas, seconds for durations). |

`Invariant`:

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | Short stable identifier, referenced in reports. |
| `check` | `string` | Command that exits non-zero when the invariant is violated. |
| `note` | `string` | Why it must hold; shown when asking the user to confirm candidates. |

## Rules

- Config never widens a round: it can narrow tiers, forbid packages, add verification, and tighten thresholds — it cannot loosen the user's explicit per-round approval.
- Invariant candidates presented at phase 0 come from repo docs (`AGENTS.md`, `docs/`), critical test scripts, and config. Only user-confirmed entries are persisted here.
- Malformed values (unknown tier, non-array `never`) are reported and the round proceeds with defaults for the malformed field only.
