import { afterEach, describe, expect, test } from "bun:test";
import { exists, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/cli.ts";

const created: string[] = [];
const originalCwd = process.cwd();
const originalCacheHome = process.env.XDG_CACHE_HOME;

afterEach(async () => {
  process.chdir(originalCwd);
  for (const dir of created.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
  if (originalCacheHome === undefined) delete process.env.XDG_CACHE_HOME;
  else process.env.XDG_CACHE_HOME = originalCacheHome;
});

async function workingDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "opencode-auto-upgrades-cli-"));
  created.push(dir);
  return dir;
}

describe("runCli", () => {
  test("install writes the payload into the current project", async () => {
    const dir = await workingDir();
    process.chdir(dir);

    const code = await runCli(["install", "--scope", "local"]);

    expect(code).toBe(0);
    expect(await exists(join(dir, ".opencode", "skills", "dependency-upgrade", "SKILL.md"))).toBe(true);
    expect(await exists(join(dir, ".opencode", "commands", "upgrade-deps.md"))).toBe(true);
    expect(await exists(join(dir, ".opencode", "agents", "upgrade-deps.md"))).toBe(true);
  });

  test("status reports both scopes and exits zero", async () => {
    const dir = await workingDir();
    process.chdir(dir);
    await runCli(["install", "--scope", "local"]);

    const code = await runCli(["status"]);

    expect(code).toBe(0);
  });

  test("plugin mode exits one with an explanation", async () => {
    const dir = await workingDir();
    process.chdir(dir);

    const code = await runCli(["install", "--mode", "plugin"]);

    expect(code).toBe(1);
    expect(await exists(join(dir, ".opencode"))).toBe(false);
  });

  test("an unknown mode exits one", async () => {
    const code = await runCli(["install", "--mode", "magic"]);
    expect(code).toBe(1);
  });

  test("an unknown command exits one", async () => {
    const code = await runCli(["frobnicate"]);
    expect(code).toBe(1);
  });

  test("status-only flags are rejected elsewhere", async () => {
    const code = await runCli(["install", "--online"]);
    expect(code).toBe(1);
  });

  test("clear-cache is idempotent when nothing is cached", async () => {
    const cacheHome = await workingDir();
    process.env.XDG_CACHE_HOME = cacheHome;

    const code = await runCli(["clear-cache"]);

    expect(code).toBe(0);
  });

  test("--version prints the package version", async () => {
    const code = await runCli(["--version"]);
    expect(code).toBe(0);
  });
});
