/*
  Design lab: the homepage design exploration (PR #31, docs/design-direction.md section 12).

  Three complete homepage concepts are built at /design-lab/a/, /b/ and /c/, with an index at
  /design-lab/. They exist ONLY in a demo build (`npm run demo`, `npm run demo:build`), because the
  homepage sections need the synthetic fixtures to be populated (src/lib/demoMode.ts). A normal
  build emits none of these routes, so nothing here can reach the deployed site.

  No concept is selected or approved. Every colour and font is provisional.
*/
import { DEMO } from "../lib/demoMode";

export const LAB_BASE = "/design-lab";

export type ConceptId = "a" | "b" | "c";

export interface Concept {
  id: ConceptId;
  /** Short name shown in the switcher and the page title. */
  name: string;
  /** One line on what it is. */
  summary: string;
  /** Foundation, type pairing and accent, as named in docs/design-direction.md. */
  recipe: string;
}

export const CONCEPTS: readonly Concept[] = [
  {
    id: "a",
    name: "Editorial chamber",
    summary:
      "A publication read in a dark room: large serif type, hairline rules and slow, quiet sections.",
    recipe: "F1 navy-black, T1 serif display, accent A1",
  },
  {
    id: "b",
    name: "Instrument",
    summary:
      "A creative-technology laboratory: a visible grid, a viewfinder hero and structured, panel-based information.",
    recipe: "F2 neutral charcoal, T2 sans display, accent A1",
  },
  {
    id: "c",
    name: "Projection",
    summary:
      "The camera obscura itself: a pinhole of light projects the network, with editorial headings and a few precise details.",
    recipe: "F1 navy-black, T3 mixed serif and sans, accent A1",
  },
];

export const conceptPath = (id: ConceptId): string => `${LAB_BASE}/${id}/`;

export const conceptById = (id: string | undefined): Concept | undefined =>
  CONCEPTS.find((concept) => concept.id === id);

/**
 * The routes of /design-lab/ for Astro's getStaticPaths: the index (no `concept`) and one page per
 * concept in a demo build, and nothing at all otherwise.
 */
export function labStaticPaths(demo: boolean = DEMO) {
  if (!demo) return [];
  return [
    { params: { concept: undefined } },
    ...CONCEPTS.map((concept) => ({ params: { concept: concept.id } })),
  ];
}

/** The day, month and year of an event in its own timezone, for a large date display. */
export function eventDateParts(date: Date, timezone: string) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone, ...options }).format(date);
  return {
    day: part({ day: "numeric" }),
    month: part({ month: "long" }),
    year: part({ year: "numeric" }),
  };
}
