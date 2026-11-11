import { join } from "node:path";
import {
  NpmCache,
  removeCacheTargets,
  scopeBase,
  type CacheOutcome,
  type InstallMode,
  type Scope,
} from "opencode-architect/core";
import { CopyInstallStatus, type CopyStatusReport } from "./copy-install-status.ts";
import { PayloadModeUnsupportedError } from "./payload-mode-unsupported-error.ts";
import { PayloadSynchronizer } from "./payload-synchronizer.ts";
import type { PayloadSpec } from "./payload-spec.ts";

export type { CopyScopeStatus, CopyStatusReport } from "./copy-install-status.ts";
export type { InstallMode, Scope };

export interface InstallOptions {
  mode: InstallMode | null;
  force: boolean;
}

export interface InstallResult {
  scope: Scope;
  mode: InstallMode;
  skillPaths: string[];
  commandPaths: string[];
  agentPaths: string[];
  skippedModified: string[];
  writtenFiles: string[];
  upToDate: boolean;
  clearedCache: string[];
}

export interface UninstallResult {
  scope: Scope;
  removed: string[];
}

const PACKAGE_NAME = "opencode-auto-upgrades";
const ASSET_LAYOUT_DIR = ".";

const PAYLOAD: PayloadSpec = {
  skills: ["dependency-upgrade"],
  commands: ["upgrade-deps.md"],
  agents: ["upgrade-deps.md"],
};

const cache = new NpmCache();

export async function install(
  scope: Scope,
  projectDir: string | null,
  options: InstallOptions
): Promise<InstallResult> {
  const cacheOutcome = await prunePackageCache();
  for (const warning of cacheOutcome.warnings) {
    console.warn(`Warning: ${warning}`);
  }
  const mode = await resolveMode(options.mode);
  const version = await getPackageVersion();
  const synchronizer = createSynchronizer(scopeBase(scope, resolveProjectDir(projectDir)));
  const outcome = await synchronizer.ensure(version, options.force);
  return {
    scope,
    mode,
    skillPaths: synchronizer.skillPaths(),
    commandPaths: synchronizer.commandPaths(),
    agentPaths: synchronizer.agentPaths(),
    skippedModified: outcome.skippedModified,
    writtenFiles: outcome.writtenFiles,
    upToDate: outcome.upToDate,
    clearedCache: cacheOutcome.removed,
  };
}

export async function uninstall(scope: Scope, projectDir: string | null): Promise<UninstallResult> {
  const synchronizer = createSynchronizer(scopeBase(scope, resolveProjectDir(projectDir)));
  return { scope, removed: await synchronizer.remove() };
}

export async function status(projectDir: string | null, online: boolean): Promise<CopyStatusReport> {
  const runningVersion = await getPackageVersion();
  return new CopyInstallStatus(PACKAGE_NAME, runningVersion).report(resolveProjectDir(projectDir), online);
}

export async function resolveMode(requested: InstallMode | null): Promise<InstallMode> {
  if (requested === "plugin") throw new PayloadModeUnsupportedError(PACKAGE_NAME);
  return "copy";
}

export async function getPackageVersion(): Promise<string> {
  const content = await Bun.file(`${import.meta.dirname}/../package.json`).text();
  return JSON.parse(content).version;
}

export async function getPackageName(): Promise<string> {
  const content = await Bun.file(`${import.meta.dirname}/../package.json`).text();
  return JSON.parse(content).name;
}

export async function getContentDeclaration(): Promise<"assets" | "code"> {
  const content = await Bun.file(`${import.meta.dirname}/../package.json`).text();
  return JSON.parse(content).content === "code" ? "code" : "assets";
}

export function packageCacheRoot(): string {
  return cache.root();
}

export async function prunePackageCache(): Promise<CacheOutcome> {
  const version = await getPackageVersion();
  const wanted = [PACKAGE_NAME, `${PACKAGE_NAME}@latest`, `${PACKAGE_NAME}@${version}`];
  return removeCacheTargets(cache.root(), (name) => wanted.includes(name));
}

export async function clearPackageCache(): Promise<CacheOutcome> {
  const prefix = `${PACKAGE_NAME}@`;
  return removeCacheTargets(cache.root(), (name) => name === PACKAGE_NAME || name.startsWith(prefix));
}

function createSynchronizer(configBase: string): PayloadSynchronizer {
  return new PayloadSynchronizer(join(getPackageDir(), ASSET_LAYOUT_DIR), configBase, PACKAGE_NAME, PAYLOAD);
}

function getPackageDir(): string {
  return join(import.meta.dirname, "..");
}

function resolveProjectDir(projectDir: string | null): string {
  return projectDir === null ? process.cwd() : projectDir;
}
