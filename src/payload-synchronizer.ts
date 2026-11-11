import { exists, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { InstallManifest, listFilesRecursive, sha256 } from "opencode-architect/core";
import { BundledAssetsMissingError } from "./bundled-assets-missing-error.ts";
import type { PayloadSpec } from "./payload-spec.ts";

export interface PayloadOutcome {
  upToDate: boolean;
  skippedModified: string[];
  writtenFiles: string[];
}

interface PayloadEntry {
  source: string;
  destination: string;
  directory: boolean;
}

export class PayloadSynchronizer {
  private readonly packageDir: string;
  private readonly configBase: string;
  private readonly packageName: string;
  private readonly spec: PayloadSpec;
  private readonly manifest: InstallManifest;

  constructor(packageDir: string, configBase: string, packageName: string, spec: PayloadSpec) {
    this.packageDir = packageDir;
    this.configBase = configBase;
    this.packageName = packageName;
    this.spec = spec;
    this.manifest = new InstallManifest(configBase, packageName);
  }

  public skillPaths(): string[] {
    return this.spec.skills.map((name) => join(this.configBase, "skills", name));
  }

  public commandPaths(): string[] {
    return this.spec.commands.map((name) => join(this.configBase, "commands", name));
  }

  public agentPaths(): string[] {
    return this.spec.agents.map((name) => join(this.configBase, "agents", name));
  }

  public payloadPaths(): string[] {
    return [...this.skillPaths(), ...this.commandPaths(), ...this.agentPaths()];
  }

  public async ensure(version: string, force: boolean): Promise<PayloadOutcome> {
    const recorded = await this.manifest.read();
    const payloadRecorded = recorded !== null && Object.keys(recorded.files).length > 0;
    if (payloadRecorded && (await this.manifest.isUpToDate(version, this.configBase))) {
      return { upToDate: true, skippedModified: [], writtenFiles: [] };
    }
    const modified = await this.modifiedFiles();
    const skippedModified = force ? [] : modified;
    const skipped = new Set(skippedModified);
    for (const file of skipped) {
      console.warn(`Warning: skipping consumer-modified file ${file} (use --force to overwrite).`);
    }
    const entries = await this.resolveEntries();
    const writtenFiles: string[] = [];
    for (const entry of entries) {
      writtenFiles.push(...(await this.copyEntry(entry, skipped)));
    }
    if (writtenFiles.length === 0 && skipped.size === 0) {
      throw new BundledAssetsMissingError(join(this.packageDir, "skills"), this.packageDir);
    }
    if (writtenFiles.length > 0) {
      await this.manifest.write({
        version,
        mode: "copy",
        entry: null,
        entryConfigPath: null,
        rootDir: null,
        files: null,
        hashes: await this.hashEntries(entries, skipped),
      });
    }
    return { upToDate: false, skippedModified, writtenFiles };
  }

  public async modifiedFiles(): Promise<string[]> {
    return this.manifest.findConsumerModified(this.configBase);
  }

  public async remove(): Promise<string[]> {
    const removed: string[] = [];
    for (const path of this.payloadPaths()) {
      if (!(await exists(path))) continue;
      await rm(path, { recursive: true, force: true });
      removed.push(path);
    }
    const manifestFile = join(this.configBase, `${this.packageName}.manifest.json`);
    if (await exists(manifestFile)) {
      await rm(manifestFile);
      removed.push(manifestFile);
    }
    await this.removeEmptyDirectories();
    return removed;
  }

  private async resolveEntries(): Promise<PayloadEntry[]> {
    const entries: PayloadEntry[] = [];
    for (const name of this.spec.skills) {
      const source = join(this.packageDir, "skills", name);
      await this.requireDirectory(source);
      entries.push({ source, destination: join(this.configBase, "skills", name), directory: true });
    }
    for (const name of this.spec.commands) {
      const source = join(this.packageDir, "commands", name);
      await this.requireFile(source);
      entries.push({ source, destination: join(this.configBase, "commands", name), directory: false });
    }
    for (const name of this.spec.agents) {
      const source = join(this.packageDir, "agents", name);
      await this.requireFile(source);
      entries.push({ source, destination: join(this.configBase, "agents", name), directory: false });
    }
    return entries;
  }

  private async copyEntry(entry: PayloadEntry, skipped: Set<string>): Promise<string[]> {
    if (skipped.has(entry.destination)) return [];
    if (!entry.directory) {
      await mkdir(join(entry.destination, ".."), { recursive: true });
      await Bun.write(entry.destination, Bun.file(entry.source));
      return [entry.destination];
    }
    return this.copyDirectory(entry.source, entry.destination, skipped);
  }

  private async copyDirectory(source: string, destination: string, skipped: Set<string>): Promise<string[]> {
    await mkdir(destination, { recursive: true });
    if (skipped.has(destination)) return [];
    const written: string[] = [];
    for (const entry of await readdir(source, { withFileTypes: true })) {
      const from = join(source, entry.name);
      const to = join(destination, entry.name);
      if (skipped.has(to)) continue;
      if (entry.isDirectory()) {
        written.push(...(await this.copyDirectory(from, to, skipped)));
      } else {
        await Bun.write(to, Bun.file(from));
        written.push(to);
      }
    }
    return written;
  }

  private async hashEntries(entries: PayloadEntry[], skipped: Set<string>): Promise<Record<string, string>> {
    const hashes: Record<string, string> = {};
    for (const entry of entries) {
      const files = entry.directory ? await listFilesRecursive(entry.destination) : [entry.destination];
      for (const file of files) {
        const packaged = entry.directory ? join(entry.source, relative(entry.destination, file)) : entry.source;
        hashes[this.relativeToBase(file)] = await sha256(skipped.has(file) ? packaged : file);
      }
    }
    return hashes;
  }

  private relativeToBase(file: string): string {
    return relative(this.configBase, file).replaceAll("\\", "/");
  }

  private async removeEmptyDirectories(): Promise<void> {
    for (const name of ["skills", "commands", "agents"]) {
      const directory = join(this.configBase, name);
      if (!(await exists(directory))) continue;
      const contents = await readdir(directory);
      if (contents.length === 0) await rm(directory, { recursive: true, force: true });
    }
  }

  private async requireDirectory(path: string): Promise<void> {
    const info = await stat(path).catch(() => null);
    if (info === null || !info.isDirectory()) throw new BundledAssetsMissingError(path, this.packageDir);
    if ((await readdir(path)).length === 0) throw new BundledAssetsMissingError(path, this.packageDir);
  }

  private async requireFile(path: string): Promise<void> {
    const info = await stat(path).catch(() => null);
    if (info === null || !info.isFile()) throw new BundledAssetsMissingError(path, this.packageDir);
  }
}
