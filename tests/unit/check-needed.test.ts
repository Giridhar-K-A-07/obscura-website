import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findViolations } from "../../scripts/check-needed.mjs";

const folders: string[] = [];

function contentRoot(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "obscura-content-"));
  folders.push(root);
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe("check:needed", () => {
  it("passes when only draft records contain markers", () => {
    const root = contentRoot({ "teams/a.yaml": "status: draft\nname: '[[NEEDED: name]]'\n" });
    expect(findViolations(root)).toEqual([]);
  });

  it("fails when a verified record contains a marker", () => {
    const root = contentRoot({ "teams/a.yaml": "status: verified\nname: '[[NEEDED: name]]'\n" });
    expect(findViolations(root)).toHaveLength(1);
  });

  it("fails when a verified MDX body contains a marker", () => {
    const root = contentRoot({
      "posts/a.mdx": "---\nstatus: verified\n---\nText [[NEEDED: more]]\n",
    });
    expect(findViolations(root)).toHaveLength(1);
  });

  it("fails when a content file has no status", () => {
    const root = contentRoot({ "teams/a.yaml": "name: x\n" });
    expect(findViolations(root)).toHaveLength(1);
  });

  it("ignores documentation in the content root and non-content files", () => {
    const root = contentRoot({ "README.md": "[[NEEDED: x]]", "teams/.gitkeep": "" });
    expect(findViolations(root)).toEqual([]);
  });
});
