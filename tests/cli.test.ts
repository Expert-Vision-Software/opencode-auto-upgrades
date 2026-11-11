import { afterEach, describe, expect, spyOn, test } from "bun:test";
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

interface CliRun {
  code: number;
  stdout: string;
  stderr: string;
}

// The CLI reports on stdout/stderr, and several tests deliberately exercise
// error paths. Capture both so expected messages stay assertions instead of
// leaking into the test runner's output.
async function runCliCaptured(args: string[]): Promise<CliRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const capture = (target: string[]) => (...parts: unknown[]) => {
    target.push(parts.map(String).join(" "));
  };
  const log = spyOn(console, "log").mockImplementation(capture(stdout));
  const error = spyOn(console, "error").mockImplementation(capture(stderr));
  const warn = spyOn(console, "warn").mockImplementation(capture(stderr));
  try {
    const code = await runCli(args);
    return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
  } finally {
    log.mockRestore();
    error.mockRestore();
    warn.mockRestore();
  }
}

describe("runCli", () => {
  test("install writes the payload into the current project", async () => {
    const dir = await workingDir();
    process.chdir(dir);

    const { code, stdout } = await runCliCaptured(["install", "--scope", "local"]);

    expect(code).toBe(0);
    expect(stdout).toContain("Installed local (mode: copy)");
    expect(await exists(join(dir, ".opencode", "skills", "dependency-upgrade", "SKILL.md"))).toBe(true);
    expect(await exists(join(dir, ".opencode", "commands", "upgrade-deps.md"))).toBe(true);
    expect(await exists(join(dir, ".opencode", "agents", "upgrade-deps.md"))).toBe(true);
  });

  test("status reports both scopes and exits zero", async () => {
    const dir = await workingDir();
    process.chdir(dir);
    await runCliCaptured(["install", "--scope", "local"]);

    const { code, stdout } = await runCliCaptured(["status"]);

    expect(code).toBe(0);
    expect(stdout).toContain("Status:");
  });

  test("plugin mode exits one with an explanation", async () => {
    const dir = await workingDir();
    process.chdir(dir);

    const { code, stderr } = await runCliCaptured(["install", "--mode", "plugin"]);

    expect(code).toBe(1);
    expect(stderr).toContain("cannot be installed in plugin mode");
    expect(await exists(join(dir, ".opencode"))).toBe(false);
  });

  test("an unknown mode exits one", async () => {
    const { code, stderr } = await runCliCaptured(["install", "--mode", "magic"]);
    expect(code).toBe(1);
    expect(stderr).toContain('Invalid mode: magic. Must be "copy".');
  });

  test("an unknown command exits one", async () => {
    const { code, stderr } = await runCliCaptured(["frobnicate"]);
    expect(code).toBe(1);
    expect(stderr).toContain("Unknown command: frobnicate");
  });

  test("status-only flags are rejected elsewhere", async () => {
    const { code, stderr } = await runCliCaptured(["install", "--online"]);
    expect(code).toBe(1);
    expect(stderr).toContain("--path and --online only apply to the status command.");
  });

  test("clear-cache is idempotent when nothing is cached", async () => {
    const cacheHome = await workingDir();
    process.env.XDG_CACHE_HOME = cacheHome;

    const { code, stdout } = await runCliCaptured(["clear-cache"]);

    expect(code).toBe(0);
    expect(stdout).toContain("No cached copies found; nothing to remove.");
  });

  test("--version prints the package version", async () => {
    const { code, stdout } = await runCliCaptured(["--version"]);
    expect(code).toBe(0);
    expect(stdout).toContain("opencode-auto-upgrades v");
  });
});
