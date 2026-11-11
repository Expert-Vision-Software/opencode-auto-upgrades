#!/usr/bin/env bun
import type { Stats } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  clearPackageCache,
  getPackageVersion,
  install,
  status,
  uninstall,
  type InstallMode,
  type Scope,
} from "./installer.ts";
import { PayloadModeUnsupportedError } from "./payload-mode-unsupported-error.ts";

const VERSION = await getPackageVersion();

function printHelp(): void {
  console.log(`
opencode-auto-upgrades v${VERSION}

Commands:
  install     Copy the dependency-upgrade skill, the /upgrade-deps command, and the
              upgrade-deps agent into the selected scope
  uninstall   Remove the copied payload and this package's manifest from the selected scope
  status      Report what each scope holds, which files were edited locally, and the
              package version this copy came from
  clear-cache Remove cached copies of this package from OpenCode's package cache

Options:
  -s, --scope <scope>    Installation scope: "local" (.opencode) or "global"
                         (~/.config/opencode) (default: local)
  -m, --mode <mode>      Install mode: "copy" only (default and only supported mode)
  -f, --force           Overwrite files you edited locally
      --online          status: also query the npm registry for the latest published
                        version and flag staleness; network failures warn and continue
      --path <dir>      status: resolve against another project directory instead of
                        the current working directory; the directory must exist
  -h, --help            Show this help message
  -v, --version         Show version

Examples:
  opencode-auto-upgrades install
  opencode-auto-upgrades install --scope global
  opencode-auto-upgrades uninstall --scope local
  opencode-auto-upgrades status
  opencode-auto-upgrades status --online
  opencode-auto-upgrades status --path ../other-project
  opencode-auto-upgrades clear-cache
`);
}

function isInstallMode(value: string): value is InstallMode {
  return value === "copy" || value === "plugin";
}

interface CliValues {
  scope?: string;
  mode?: string;
  force: boolean;
  online: boolean;
  path?: string;
  help: boolean;
  version: boolean;
}

export async function runCli(argv: string[]): Promise<number> {
  let positionals: string[] = [];
  let values: CliValues = { force: false, online: false, help: false, version: false };
  try {
    const parsed = parseArgs({
      args: argv,
      options: {
        scope: { type: "string", short: "s" },
        mode: { type: "string", short: "m" },
        force: { type: "boolean", short: "f", default: false },
        online: { type: "boolean", default: false },
        path: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
      allowPositionals: true,
      strict: true,
    });
    positionals = parsed.positionals;
    values = parsed.values;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }

  if (values.version) {
    console.log(`opencode-auto-upgrades v${VERSION}`);
    return 0;
  }
  if (values.help || positionals.length === 0) {
    printHelp();
    return 0;
  }

  const command = positionals[0];
  if (command !== "status" && (values.path !== undefined || values.online)) {
    console.error("--path and --online only apply to the status command.");
    return 1;
  }
  if (values.scope !== undefined && values.scope !== "" && !isScope(values.scope)) {
    console.error(`Invalid scope: ${values.scope}. Must be "local" or "global".`);
    return 1;
  }
  const scope: Scope = resolveScope(values.scope);
  if (values.mode !== undefined && values.mode !== "" && !isInstallMode(values.mode)) {
    console.error(`Invalid mode: ${values.mode}. Must be "copy".`);
    return 1;
  }
  const mode: InstallMode | null = values.mode === undefined || values.mode === "" ? null : values.mode;
  const force: boolean = values.force;
  const online: boolean = values.online;

  try {
    switch (command) {
      case "install": {
        const result = await install(scope, null, { mode, force });
        console.log(`Installed ${scope} (mode: ${result.mode})${result.upToDate ? " (already up to date)" : ""}:`);
        for (const path of result.skillPaths) console.log(`  Skill: ${path}`);
        for (const path of result.commandPaths) console.log(`  Command: ${path}`);
        for (const path of result.agentPaths) console.log(`  Agent: ${path}`);
        for (const skipped of result.skippedModified) {
          console.log(`  Skipped consumer-modified: ${skipped} (use --force to overwrite)`);
        }
        for (const cleared of result.clearedCache) console.log(`  Cleared cache: ${cleared}`);
        break;
      }
      case "uninstall": {
        const result = await uninstall(scope, null);
        console.log(`Uninstalled ${scope}:`);
        if (result.removed.length > 0) console.log(`  Removed: ${result.removed.join(", ")}`);
        else console.log("  Nothing to remove");
        break;
      }
      case "status": {
        const projectDir = await resolveProjectDir(values.path);
        const report = await status(projectDir, online);
        console.log("Status:");
        for (const scopeStatus of report.scopes) {
          const label = scopeStatus.scope === "local" ? "Local  " : "Global ";
          if (scopeStatus.installedVersion === null) {
            console.log(`  ${label}: not installed (${scopeStatus.configBase})`);
            continue;
          }
          const state = scopeStatus.current ? "current" : "stale or edited";
          console.log(
            `  ${label}: ${scopeStatus.installedVersion} (${scopeStatus.fileCount} files, ${state}) at ${scopeStatus.configBase}`
          );
          for (const file of scopeStatus.modified) console.log(`            edited: ${file}`);
        }
        if (report.publishedVersion !== null) console.log(`  npm latest: ${report.publishedVersion}`);
        for (const warning of report.warnings) console.warn(`Warning: ${warning}`);
        break;
      }
      case "clear-cache": {
        if (positionals.length > 1) {
          console.error(`Unexpected arguments for clear-cache: ${positionals.slice(1).join(" ")}`);
          return 1;
        }
        const outcome = await clearPackageCache();
        if (outcome.removed.length === 0) {
          console.log("No cached copies found; nothing to remove.");
        } else {
          console.log("Removed cached copies:");
          for (const target of outcome.removed) console.log(`  Removed: ${target}`);
        }
        for (const warning of outcome.warnings) console.warn(`  Warning: ${warning}`);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        return 1;
    }
    return 0;
  } catch (error) {
    if (error instanceof PayloadModeUnsupportedError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}

function isScope(value: string): value is Scope {
  return value === "local" || value === "global";
}

function resolveScope(value: string | undefined): Scope {
  return value === undefined || value === "" ? "local" : (value as Scope);
}

async function resolveProjectDir(input: string | undefined): Promise<string> {
  if (input === undefined) return process.cwd();
  const cleaned = stripQuotes(input.trim());
  const resolved = resolve(cleaned);
  let info: Stats | null = null;
  try {
    info = await stat(resolved);
  } catch {
    throw new Error(`--path does not exist: ${input}`);
  }
  if (!info.isDirectory()) throw new Error(`--path is not a directory: ${input}`);
  return resolved;
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

if (import.meta.main) {
  process.exitCode = await runCli(process.argv.slice(2));
}
