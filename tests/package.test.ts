import { describe, expect, test } from "bun:test";
import { exists, readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const PACKAGE_ROOT = join(import.meta.dirname, "..");
const PAYLOAD_DIRS = ["skills", "commands", "agents"];

interface PackageManifest {
  name: string;
  version: string;
  content: string;
  bin: Record<string, string>;
  exports: Record<string, string>;
  files: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
}

async function manifest(): Promise<PackageManifest> {
  return JSON.parse(await readFile(join(PACKAGE_ROOT, "package.json"), "utf-8"));
}

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

function frontmatterValues(text: string): Array<{ key: string; value: string }> {
  const lines = text.split("\n");
  if (lines[0] !== "---") return [];
  const values: Array<{ key: string; value: string }> = [];
  for (const line of lines.slice(1)) {
    if (line === "---") break;
    const match = line.match(/^([A-Za-z][\w-]*):(\s*)(.*)$/);
    if (match === null) continue;
    values.push({ key: match[1], value: match[3] });
  }
  return values;
}

describe("package manifest", () => {
  test("names the package and its bin entry the same", async () => {
    const parsed = await manifest();
    expect(parsed.name).toBe("opencode-auto-upgrades");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.bin).toEqual({ "opencode-auto-upgrades": "src/cli.ts" });
  });

  test("declares assets content and ships the root content directories", async () => {
    const parsed = await manifest();
    expect(parsed.content).toBe("assets");
    expect(parsed.files).toContain("index.ts");
    expect(parsed.files).toContain("src");
    for (const directory of PAYLOAD_DIRS) expect(parsed.files).toContain(directory);
    expect(parsed.files).not.toContain("assets");
  });

  test("exposes the root entry and the check and test scripts", async () => {
    const parsed = await manifest();
    expect(parsed.exports["."]).toBe("./index.ts");
    expect(parsed.scripts["check"]).toBe("tsc --noEmit");
    expect(parsed.scripts["test"]).toBe("bun test");
  });

  test("depends on the core module, through a local file spec or the registry", async () => {
    const parsed = await manifest();
    expect(parsed.dependencies["opencode-architect"]).toMatch(
      /^(file:(\.\/|\.\.\/)\S+|latest|[\^~]?\d+\.\d+\.\d+)$/
    );
  });

  test("ships no plugin entrypoint", async () => {
    expect(await exists(join(PACKAGE_ROOT, "src", "plugin.ts"))).toBe(false);
    const entry = await readFile(join(PACKAGE_ROOT, "index.ts"), "utf-8");
    expect(entry).not.toContain("plugin.ts");
  });
});

describe("payload", () => {
  test("ships exactly the dependency-upgrade skill", async () => {
    const skillDirs = (await readdir(join(PACKAGE_ROOT, "skills"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(skillDirs).toEqual(["dependency-upgrade"]);
  });

  test("does not vendor the external quality-gate skills", async () => {
    for (const external of ["test-baselining", "regression-checking"]) {
      expect(await exists(join(PACKAGE_ROOT, "skills", external))).toBe(false);
      expect(await exists(join(PACKAGE_ROOT, "commands", `${external}.md`))).toBe(false);
    }
  });

  test("ships one command and one agent", async () => {
    const commands = (await readdir(join(PACKAGE_ROOT, "commands"))).sort();
    const agents = (await readdir(join(PACKAGE_ROOT, "agents"))).sort();
    expect(commands).toEqual(["upgrade-deps.md"]);
    expect(agents).toEqual(["upgrade-deps.md"]);
  });

  test("quotes every frontmatter property value", async () => {
    for (const directory of PAYLOAD_DIRS) {
      for (const file of await markdownFiles(join(PACKAGE_ROOT, directory))) {
        const text = await readFile(file, "utf-8");
        const values = frontmatterValues(text);
        const requiresFrontmatter = relative(PACKAGE_ROOT, file).startsWith("skills/")
          ? file.endsWith("SKILL.md")
          : true;
        if (requiresFrontmatter) {
          expect(values.length, `${relative(PACKAGE_ROOT, file)} has no frontmatter`).toBeGreaterThan(0);
        }
        for (const { key, value } of values) {
          if (value === "") continue;
          expect(value.startsWith('"') && value.endsWith('"'), `${relative(PACKAGE_ROOT, file)}: ${key} is unquoted`).toBe(
            true
          );
        }
      }
    }
  });
});
