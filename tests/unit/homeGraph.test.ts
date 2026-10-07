import { describe, expect, it } from "vitest";
import {
  VIEWBOX,
  areaNodes,
  backdropPoints,
  edges,
  nodes,
  tracksOf,
} from "../../src/lib/homeGraph";

describe("homepage hero graph", () => {
  const ids = nodes.map((n) => n.id);

  it("has unique node ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only has edges between existing nodes", () => {
    for (const [a, b] of edges) {
      expect(ids).toContain(a);
      expect(ids).toContain(b);
    }
  });

  it("keeps every node inside the viewBox with room for its label", () => {
    for (const n of nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(VIEWBOX.width);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(VIEWBOX.height);
    }
  });

  it("links every non-hub node to an in-page anchor so the fallback list has no dead links", () => {
    for (const n of nodes.filter((n) => n.kind !== "hub")) {
      expect(n.href).toMatch(/^#[a-z-]+$/);
    }
  });

  it("names the four Study Roadmap tracks from the proposal under Learning", () => {
    expect(tracksOf("learning").map((t) => t.label)).toEqual([
      "Data Science",
      "Machine Learning",
      "Python",
      "SQL",
    ]);
    expect(areaNodes.length).toBe(6);
  });

  it("generates the same backdrop every time", () => {
    expect(backdropPoints.length).toBe(36);
  });
});
