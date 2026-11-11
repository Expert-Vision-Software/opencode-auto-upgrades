import { InstallManifest, RegistryVersionChecker, scopeBase, type Scope } from "opencode-architect/core";

export interface CopyScopeStatus {
  scope: Scope;
  configBase: string;
  installedVersion: string | null;
  fileCount: number;
  modified: string[];
  current: boolean;
}

export interface CopyStatusReport {
  packageName: string;
  runningVersion: string;
  scopes: CopyScopeStatus[];
  publishedVersion: string | null;
  warnings: string[];
}

export class CopyInstallStatus {
  private readonly packageName: string;
  private readonly runningVersion: string;
  private readonly checker: RegistryVersionChecker;

  constructor(packageName: string, runningVersion: string, checker: RegistryVersionChecker = new RegistryVersionChecker()) {
    this.packageName = packageName;
    this.runningVersion = runningVersion;
    this.checker = checker;
  }

  public async report(projectDir: string, online: boolean): Promise<CopyStatusReport> {
    const warnings: string[] = [];
    const scopes: CopyScopeStatus[] = [];
    for (const scope of ["local", "global"] as const) {
      scopes.push(await this.scopeStatus(scope, projectDir));
    }
    let publishedVersion: string | null = null;
    if (online) {
      const lookup = await this.checker.latest(this.packageName);
      publishedVersion = lookup.version;
      if (lookup.warning !== null) {
        warnings.push(lookup.warning);
      } else {
        for (const scope of scopes) {
          if (scope.installedVersion === null || publishedVersion === null) continue;
          if (scope.installedVersion === publishedVersion) continue;
          warnings.push(`${scope.scope}: installed ${scope.installedVersion} but npm publishes ${publishedVersion} (stale)`);
        }
      }
    }
    return { packageName: this.packageName, runningVersion: this.runningVersion, scopes, publishedVersion, warnings };
  }

  private async scopeStatus(scope: Scope, projectDir: string): Promise<CopyScopeStatus> {
    const configBase = scopeBase(scope, projectDir);
    const manifest = new InstallManifest(configBase, this.packageName);
    const data = await manifest.read();
    if (data === null) {
      return { scope, configBase, installedVersion: null, fileCount: 0, modified: [], current: false };
    }
    const modified = await manifest.findConsumerModified(configBase);
    return {
      scope,
      configBase,
      installedVersion: data.version,
      fileCount: Object.keys(data.files).length,
      modified,
      current: data.version === this.runningVersion && modified.length === 0,
    };
  }
}
