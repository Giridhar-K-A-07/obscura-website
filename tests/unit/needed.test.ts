import { describe, expect, it } from "vitest";
import { NEEDED_MARKER, NEEDED_ONLY, findNeeded } from "../../src/lib/needed";

describe("[[NEEDED: …]] markers", () => {
  it("recognises a marker", () => {
    expect(NEEDED_MARKER.test("[[NEEDED: founding year]]")).toBe(true);
    expect(NEEDED_ONLY.test("[[NEEDED: founding year]]")).toBe(true);
  });

  it("does not treat ordinary text as a marker", () => {
    expect(NEEDED_MARKER.test("Needed: something")).toBe(false);
    expect(NEEDED_ONLY.test("see [[NEEDED: x]] later")).toBe(false);
  });

  it("finds markers anywhere inside nested data", () => {
    const paths = findNeeded({ a: "fine", b: ["ok", "[[NEEDED: b1]]"], c: { d: "[[NEEDED: d]]" } });
    expect(paths).toEqual([
      ["b", 1],
      ["c", "d"],
    ]);
  });

  it("finds nothing in data without markers", () => {
    expect(findNeeded({ a: 1, b: [true, null, "text"] })).toEqual([]);
  });
});
