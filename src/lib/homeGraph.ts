/*
  Structure of the homepage hero graph (Master Brief §7.5, option A).

  Nodes are the site's own areas (Master Brief §8.1) and the four Study Roadmap tracks
  named in the proposal (P5.1-b). Edges are conceptual relationships between those areas
  (e.g. an event has a recap article). Nothing here is club data: no people, dates, events
  or counts. When verified content exists, real entities replace or extend these nodes.

  Coordinates are in a 800 x 680 viewBox and were placed by hand for the layout.
*/

export type NodeKind = "hub" | "area" | "track";

export interface GraphNode {
  id: string;
  label: string;
  /** Site route; the fallback list and the graph both use it. */
  href?: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Area a track belongs to (used to nest the accessible list). */
  parent?: string;
}

export const VIEWBOX = { width: 800, height: 680 } as const;

export const nodes: GraphNode[] = [
  { id: "hub", label: "OBSCURA", kind: "hub", x: 450, y: 310 },
  { id: "legacy", label: "The Legacy Line", href: "/legacy", kind: "area", x: 235, y: 175 },
  { id: "events", label: "Events", href: "/events", kind: "area", x: 500, y: 95 },
  {
    id: "achievements",
    label: "Achievements",
    href: "/achievements",
    kind: "area",
    x: 690,
    y: 215,
  },
  { id: "projects", label: "Projects", href: "/projects", kind: "area", x: 665, y: 400 },
  { id: "learning", label: "Learning", href: "/learn", kind: "area", x: 455, y: 505 },
  { id: "insights", label: "Insights", href: "/blog", kind: "area", x: 205, y: 400 },
  {
    id: "data-science",
    label: "Data Science",
    href: "/learn",
    kind: "track",
    x: 275,
    y: 600,
    parent: "learning",
  },
  {
    id: "machine-learning",
    label: "Machine Learning",
    href: "/learn",
    kind: "track",
    x: 430,
    y: 640,
    parent: "learning",
  },
  {
    id: "python",
    label: "Python",
    href: "/learn",
    kind: "track",
    x: 585,
    y: 615,
    parent: "learning",
  },
  { id: "sql", label: "SQL", href: "/learn", kind: "track", x: 480, y: 580, parent: "learning" },
];

export const edges: ReadonlyArray<readonly [string, string]> = [
  ["hub", "legacy"],
  ["hub", "events"],
  ["hub", "achievements"],
  ["hub", "projects"],
  ["hub", "learning"],
  ["hub", "insights"],
  ["learning", "data-science"],
  ["learning", "machine-learning"],
  ["learning", "python"],
  ["learning", "sql"],
  ["legacy", "events"], // terms run events
  ["events", "insights"], // recaps are articles
  ["events", "projects"], // events lead to projects
  ["projects", "achievements"], // projects win competitions
];

/** Faint background points: decoration only, generated deterministically. */
export const backdropPoints: ReadonlyArray<readonly [number, number]> = (() => {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from(
    { length: 36 },
    () => [Math.round(next() * 800), Math.round(next() * 680)] as const,
  );
})();

export const DEFAULT_LENS = { x: 360, y: 250 } as const;
export const LENS_RADIUS = 240;

export function isLit(node: GraphNode, lens: { x: number; y: number }): boolean {
  return Math.hypot(node.x - lens.x, node.y - lens.y) < LENS_RADIUS;
}

export const areaNodes = nodes.filter((n) => n.kind === "area");
export const tracksOf = (areaId: string) => nodes.filter((n) => n.parent === areaId);
