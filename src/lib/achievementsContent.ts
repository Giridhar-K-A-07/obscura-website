import type { z } from "astro/zod";
import { NEEDED_MARKER } from "./needed";
import type { schemas } from "./schemas";

/*
  Hall of Achievements & Wall of Fame content selection (Master Brief P3, §8.4, §13).

  Pure functions over already-loaded collection entries. Every selector returns an empty list
  when nothing qualifies, and the page then omits that section entirely. Nothing here supplies
  titles, results, names or wording: it only filters, joins and orders verified records.

  Rules applied here:
  - only `verified` records are published; a [[NEEDED: …]] value counts as missing;
  - people are always references: the `people` of an achievement and the `person` of a spotlight
    are ids of records in the `people` collection. A person's name is published only when that
    record is verified with consent recorded (Master Brief §13.4). An id that does not resolve is
    dropped, and a plain name written in its place is never published;
  - a spotlight is published only when its own consent is recorded AND its person resolves, since
    it publishes a personal accomplishment (Master Brief P3 note on consent);
  - a related project is used only when it resolves to a verified project;
  - only the fields this page shows are returned: no photo, LinkedIn link or bio is ever exposed;
  - ordering is deterministic; ties are broken by id.

  Not built: leaderboards. Master Brief §15 H1 leaves open what a leaderboard is (the club's own
  competitions, or external ones its members entered) and so what data it needs. No ranking,
  position, score or total is computed or shown anywhere.
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;
export interface Entry<T> {
  id: string;
  data: T;
}

const isVerified = (entry: { data: { status: string } }) => entry.data.status === "verified";

const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

const realDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const HTTPS_URL = /^https:\/\/\S+$/;

// ---- People --------------------------------------------------------------------------------

/** Names of people who may be published: verified, consent recorded, with a real name. */
export function publishablePeople(people: Entry<Data<"people">>[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const person of people.filter(isVerified)) {
    const { name, consent } = person.data;
    if (consent === "recorded" && real(name)) names.set(person.id, name);
  }
  return names;
}

// ---- Competition winners -------------------------------------------------------------------

export interface Winner {
  id: string;
  title: string;
  competition: string;
  date: Date;
  result: string;
  /** Names of people who resolve to a publishable person, alphabetical. */
  people: string[];
  /** A verified project this achievement points to; omitted if missing or unverified. */
  project?: { id: string; name: string };
  evidenceLink?: string;
}

export interface WinnersSource {
  achievements: Entry<Data<"achievements">>[];
  people: Entry<Data<"people">>[];
  projects: Entry<Data<"projects">>[];
}

export function selectWinners(source: WinnersSource): Winner[] {
  const names = publishablePeople(source.people);
  const projects = new Map<string, { id: string; name: string }>();
  for (const project of source.projects.filter(isVerified)) {
    if (real(project.data.name))
      projects.set(project.id, { id: project.id, name: project.data.name });
  }

  const found: Winner[] = [];
  for (const entry of source.achievements.filter(isVerified)) {
    const { title, competition, date, result, people, project, evidenceLink } = entry.data;
    if (!real(title) || !real(competition) || !realDate(date) || !real(result)) continue;
    const resolved = [
      ...new Set(
        people
          .filter(real)
          .map((id) => names.get(id))
          .filter((name): name is string => name !== undefined),
      ),
    ].sort((a, b) => a.localeCompare(b));
    found.push({
      id: entry.id,
      title,
      competition,
      date,
      result,
      people: resolved,
      project: real(project) ? projects.get(project) : undefined,
      evidenceLink: real(evidenceLink) && HTTPS_URL.test(evidenceLink) ? evidenceLink : undefined,
    });
  }
  // Newest first; id breaks ties.
  return found.sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
}

// ---- Member spotlights ---------------------------------------------------------------------

/** Spotlight categories in the schema, in display order, with their headings. */
export const SPOTLIGHT_CATEGORIES = [
  { id: "research", label: "Research" },
  { id: "certification", label: "Certification" },
  { id: "internship", label: "Internship" },
] as const;

export type SpotlightCategory = (typeof SPOTLIGHT_CATEGORIES)[number]["id"];

export interface Spotlight {
  id: string;
  category: SpotlightCategory;
  title: string;
  date: Date;
  /** The person's name, taken from their own publishable record. */
  person: string;
  link?: string;
}

export interface SpotlightGroup {
  category: SpotlightCategory;
  label: string;
  /** Newest first. */
  items: Spotlight[];
}

export interface SpotlightsSource {
  spotlights: Entry<Data<"spotlights">>[];
  people: Entry<Data<"people">>[];
}

export function selectSpotlights(source: SpotlightsSource): SpotlightGroup[] {
  const names = publishablePeople(source.people);
  const known = new Set<string>(SPOTLIGHT_CATEGORIES.map((c) => c.id));

  const found: Spotlight[] = [];
  for (const entry of source.spotlights.filter(isVerified)) {
    const { person, category, title, date, link, consent } = entry.data;
    if (consent !== "recorded") continue;
    if (!real(category) || !known.has(category)) continue;
    if (!real(title) || !realDate(date) || !real(person)) continue;
    const name = names.get(person);
    if (name === undefined) continue;
    found.push({
      id: entry.id,
      category: category as SpotlightCategory,
      title,
      date,
      person: name,
      link: real(link) && HTTPS_URL.test(link) ? link : undefined,
    });
  }

  return SPOTLIGHT_CATEGORIES.flatMap(({ id, label }) => {
    const items = found
      .filter((s) => s.category === id)
      .sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
    return items.length > 0 ? [{ category: id, label, items }] : [];
  });
}

// ---- Whole page ----------------------------------------------------------------------------

export interface AchievementsSource extends WinnersSource, SpotlightsSource {}

export interface AchievementsContent {
  /** Empty = hide Competition Winners. */
  winners: Winner[];
  /** Empty = hide Member Spotlights. */
  spotlights: SpotlightGroup[];
}

export function selectAchievementsContent(source: AchievementsSource): AchievementsContent {
  return { winners: selectWinners(source), spotlights: selectSpotlights(source) };
}

/** Calendar date for records that carry a date but no time. Date-only values are read as UTC. */
export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(date);
}
