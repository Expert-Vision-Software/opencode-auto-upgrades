# Deferral ledger

`docs/dependency-upgrade-ledger.md` in the consumer repo. Carries deliberate non-decisions between rounds. Consulted at kickoff and at categorization (phases 0 and 1); updated in phases 5 and 7.

## Format

One markdown table:

```markdown
| Deferral | Re-check trigger |
| --- | --- |
| Next major of X until its compiler-style API stabilizes | X ships the stable API AND a transitive peer permits resolution |
| Drop the pre-transform plugin for native lowering | Upstream issue closes; build verified without the plugin |
| Retire `concurrently` for the package manager's native runner | Next dev-script touchpoint |
```

## Rules

- A deferral exists only with a written re-check trigger. A trigger is an observable condition: a release, an issue closing, a usage touchpoint. "Not now", "later", and "maybe" are rejected — write a trigger or do not defer.
- Worked every round: act on entries whose trigger is satisfied, or re-defer with an updated trigger.
- Entries are removed once satisfied and acted on, not when they merely look stale.
- Blockers vs deferrals: blockers (sub-threshold, un-automatable) are reported every round regardless. Only an explicit user decision turns a blocker into a ledger entry.
- Coupled families defer atomically: a deferral covering a family names the family, never one member.

## Research verdicts feeding the ledger

| Verdict | Ledger action |
| --- | --- |
| `SAFE` | None — proceed to batch |
| `ADAPT (what)` | None when the adaptation is mechanical and within tier; otherwise blocker, deferral only on user decision |
| `BLOCKED (why)` | Blocker in the report; deferral with trigger only on user decision |
