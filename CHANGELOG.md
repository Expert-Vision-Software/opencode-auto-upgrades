# Changelog

All notable changes to this project are documented here. Release notes are extracted from the matching version section by `.github/workflows/release.yml`, so every release needs an entry in the `## [version] - YYYY-MM-DD` format.

## [0.1.0] - 2026-11-11

### Added

- Dependency-upgrade skill with safe, sensible, and aggressive tiers, plus `refs/` guidance for manager selection, ledger format, and config schema.
- `/upgrade-deps` command and `upgrade-deps` agent for baseline-gated upgrade rounds.
- `opencode-auto-upgrades` installer CLI (`install`, `uninstall`, `status`, `clear-cache`) with manifest-tracked, copy-only payload installs and consumer-modification protection.
- Package contract, installer, CLI, and idempotency tests.
