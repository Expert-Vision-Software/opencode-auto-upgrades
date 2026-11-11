import { afterEach, describe, expect, test } from "bun:test";
import { exists, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256 } from "opencode-architect/core";
import { getContentDeclaration, install, uninstall } from "../src/installer.ts";

const PACKAGE_ROOT = join(import.meta.dirname, "..");
const MANIFEST_NAME = "opencode-auto-upgrades.manifest.json";
const SKILL_DIR = join("skills", "dependency-upgrade");
const REFERENCE_FILES = ["config-schema.md", "ledger-format.md", "manager-matrix.md"];

const createdProjects: string[] = [];

afterEach(async () => {
  for (const projectDir of createdProjects.splice(0)) {
    await rm(projectDir, { recursive: true, force: true });
  }
});

async function createProject(): Promise<string> {
  const projectDir = await mkdtemp(join(tmpdir(), "opencode-auto-upgrades-"));
  createdProjects.push(projectDir);
  return projectDir;
}

async function packageVersion(): Promise<string> {
  const content = await readFile(join(PACKAGE_ROOT, "package.json"), "utf-8");
  return (JSON.parse(content) as { version: string }).version;
}

async function readManifest(scopeBase: string): Promise<{
  version: string;
  mode: string;
  entry: string | null;
  files: Record<string, string>;
}> {
  return JSON.parse(await readFile(join(scopeBase, MANIFEST_NAME), "utf-8"));
}

describe("install", () => {
  test("copies the skill, command, and agent into the local scope", async () => {
    const projectDir = await createProject();
    const base = join(projectDir, ".opencode");

    const result = await install("local", projectDir, { mode: null, force: false });

    expect(result.mode).toBe("copy");
    expect(result.upToDate).toBe(false);
    expect(result.skillPaths).toEqual([join(base, SKILL_DIR)]);
    expect(result.commandPaths).toEqual([join(base, "commands", "upgrade-deps.md")]);
    expect(result.agentPaths).toEqual([join(base, "agents", "upgrade-deps.md")]);

    const installedSkill = await readFile(join(base, SKILL_DIR, "SKILL.md"), "utf-8");
    const packagedSkill = await readFile(join(PACKAGE_ROOT, SKILL_DIR, "SKILL.md"), "utf-8");
    expect(installedSkill).toBe(packagedSkill);

    for (const reference of REFERENCE_FILES) {
      expect(await exists(join(base, SKILL_DIR, "refs", reference))).toBe(true);
    }
    expect(await readFile(join(base, "commands", "upgrade-deps.md"), "utf-8")).toBe(
      await readFile(join(PACKAGE_ROOT, "commands", "upgrade-deps.md"), "utf-8")
    );
    expect(await readFile(join(base, "agents", "upgrade-deps.md"), "utf-8")).toBe(
      await readFile(join(PACKAGE_ROOT, "agents", "upgrade-deps.md"), "utf-8")
    );
  });

  test("records a copy-mode manifest with a sha256 per payload file", async () => {
    const projectDir = await createProject();
    const base = join(projectDir, ".opencode");

    await install("local", projectDir, { mode: null, force: false });
    const manifest = await readManifest(base);

    expect(manifest.mode).toBe("copy");
    expect(manifest.version).toBe(await packageVersion());
    expect(manifest.entry).toBeNull();
    expect(Object.keys(manifest.files).sort()).toEqual([
      "agents/upgrade-deps.md",
      "commands/upgrade-deps.md",
      "skills/dependency-upgrade/SKILL.md",
      "skills/dependency-upgrade/refs/config-schema.md",
      "skills/dependency-upgrade/refs/ledger-format.md",
      "skills/dependency-upgrade/refs/manager-matrix.md",
    ]);
    expect(manifest.files["skills/dependency-upgrade/SKILL.md"]).toBe(
      await sha256(join(PACKAGE_ROOT, SKILL_DIR, "SKILL.md"))
    );
    expect(manifest.files["commands/upgrade-deps.md"]).toBe(
      await sha256(join(PACKAGE_ROOT, "commands", "upgrade-deps.md"))
    );
  });

  test("reinstalling the same version is a zero-write no-op", async () => {
    const projectDir = await createProject();
    const base = join(projectDir, ".opencode");

    await install("local", projectDir, { mode: null, force: false });
    const manifestBefore = await readFile(join(base, MANIFEST_NAME), "utf-8");
    const result = await install("local", projectDir, { mode: null, force: false });

    expect(result.upToDate).toBe(true);
    expect(result.writtenFiles).toEqual([]);
    expect(await readFile(join(base, MANIFEST_NAME), "utf-8")).toBe(manifestBefore);
  });

  test("skips a consumer-modified file unless forced, then takes it over", async () => {
    const projectDir = await createProject();
    const base = join(projectDir, ".opencode");
    const skillFile = join(base, SKILL_DIR, "SKILL.md");

    await install("local", projectDir, { mode: null, force: false });
    await writeFile(skillFile, "locally edited\n");

    const skipped = await install("local", projectDir, { mode: null, force: false });
    expect(skipped.skippedModified).toEqual([skillFile]);
    expect(await readFile(skillFile, "utf-8")).toBe("locally edited\n");

    const forced = await install("local", projectDir, { mode: null, force: true });
    expect(forced.skippedModified).toEqual([]);
    expect(await readFile(skillFile, "utf-8")).toBe(
      await readFile(join(PACKAGE_ROOT, SKILL_DIR, "SKILL.md"), "utf-8")
    );
    const manifest = await readManifest(base);
    expect(manifest.files["skills/dependency-upgrade/SKILL.md"]).toBe(
      await sha256(join(PACKAGE_ROOT, SKILL_DIR, "SKILL.md"))
    );
  });

  test("a version change rewrites the payload and stamps the new version", async () => {
    const projectDir = await createProject();
    const base = join(projectDir, ".opencode");

    await install("local", projectDir, { mode: null, force: false });
    const manifest = await readManifest(base);
    await writeFile(join(base, MANIFEST_NAME), JSON.stringify({ ...manifest, version: "0.0.0" }, null, 2));

    const result = await install("local", projectDir, { mode: null, force: false });

    expect(result.upToDate).toBe(false);
    expect((await readManifest(base)).version).toBe(await packageVersion());
  });

  test("the global scope installs into the XDG config home", async () => {
    const projectDir = await createProject();
    const xdgConfigHome = await createProject();
    const previous = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdgConfigHome;
    try {
      const result = await install("global", projectDir, { mode: null, force: false });
      expect(result.skillPaths).toEqual([join(xdgConfigHome, "opencode", SKILL_DIR)]);
      expect(await exists(join(xdgConfigHome, "opencode", SKILL_DIR, "SKILL.md"))).toBe(true);
      expect(await exists(join(projectDir, ".opencode"))).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = previous;
    }
  });

  test("plugin mode is refused because the payload is markdown only", async () => {
    const projectDir = await createProject();

    await expect(install("local", projectDir, { mode: "plugin", force: false })).rejects.toThrow(
      /cannot be installed in plugin mode/
    );
    expect(await exists(join(projectDir, ".opencode", SKILL_DIR))).toBe(false);
  });

  test("the package declares its content as assets", async () => {
    expect(await getContentDeclaration()).toBe("assets");
  });
});

describe("uninstall", () => {
  test("removes the payload and the manifest, leaving other extensions in place", async () => {
    const projectDir = await createProject();
    const base = join(projectDir, ".opencode");
    const otherSkill = join(base, "skills", "other-extension", "SKILL.md");

    await install("local", projectDir, { mode: null, force: false });
    await mkdir(join(base, "skills", "other-extension"), { recursive: true });
    await writeFile(otherSkill, "---\nname: \"other-extension\"\n---\n");

    const result = await uninstall("local", projectDir);

    expect(result.removed).toContain(join(base, SKILL_DIR));
    expect(result.removed).toContain(join(base, "commands", "upgrade-deps.md"));
    expect(result.removed).toContain(join(base, "agents", "upgrade-deps.md"));
    expect(result.removed).toContain(join(base, MANIFEST_NAME));
    expect(await exists(otherSkill)).toBe(true);
    expect(await exists(join(base, SKILL_DIR))).toBe(false);
  });

  test("uninstalling an absent install removes nothing", async () => {
    const projectDir = await createProject();

    const result = await uninstall("local", projectDir);

    expect(result.removed).toEqual([]);
  });
});
