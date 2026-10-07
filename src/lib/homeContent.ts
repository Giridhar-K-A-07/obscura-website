import type { z } from "astro/zod";
import { NEEDED_MARKER } from "./needed";
import type { schemas } from "./schemas";

/*
  Homepage content selection (Master Brief §8.3).

  Pure functions: they take already-loaded collection entries and return the minimum the
  homepage needs. Every selector returns `null` (or an empty list) when nothing qualifies,
  and the homepage hides that section entirely. Nothing here supplies fallback or example data.

  Only `verified` records are used. A value that is still a [[NEEDED: …]] marker is treated as
  missing, so a marker can never reach the page even if a record were mis-marked.
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;
export interface Entry<T> {
  id: string;
  data: T;
}

/** Official Study Roadmap tracks (Master Brief §3, P5.1). Names are fixed; roadmaps are not assumed. */
export const TRACKS = [
  { id: "data-science", label: "Data Science" },
  { id: "machine-learning", label: "Machine Learning" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
] as const;

/** Number of projects shown on the homepage. */
export const HOME_PROJECT_LIMIT = 3;

const isVerified = (entry: Entry<{ status: string }>) => entry.data.status === "verified";

/** A real, non-empty string: not undefined, not blank, not a [[NEEDED]] marker. */
const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

/** A real date: a valid Date, not a marker string. */
const realDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

// ---- Introduction --------------------------------------------------------------------------

export function selectIntro(site: Entry<Data<"site">>[]): { description: string } | null {
  for (const entry of site.filter(isVerified)) {
    const { description } = entry.data;
    if (real(description)) return { description };
  }
  return null;
}

// ---- Events --------------------------------------------------------------------------------

export interface HomeEvent {
  id: string;
  title: string;
  type: string;
  start: Date;
  end?: Date;
  timezone: string;
  venue: string;
}

function toHomeEvent(entry: Entry<Data<"events">>): HomeEvent | null {
  const { title, type, start, end, timezone, venue } = entry.data;
  if (!real(title) || !real(type) || !realDate(start) || !real(timezone) || !real(venue)) {
    return null;
  }
  return {
    id: entry.id,
    title,
    type,
    start,
    end: realDate(end) ? end : undefined,
    timezone,
    venue,
  };
}

const endOf = (event: HomeEvent) => event.end ?? event.start;

function verifiedEvents(events: Entry<Data<"events">>[]): HomeEvent[] {
  return events
    .filter(isVerified)
    .map(toHomeEvent)
    .filter((event): event is HomeEvent => event !== null);
}

/** The soonest verified event that has not ended yet, or null. */
export function selectNextEvent(events: Entry<Data<"events">>[], now: Date): HomeEvent | null {
  const upcoming = verifiedEvents(events)
    .filter((event) => endOf(event) >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id));
  return upcoming[0] ?? null;
}

/** The most recent verified event that has ended, or null. */
export function selectLatestPastEvent(
  events: Entry<Data<"events">>[],
  now: Date,
): HomeEvent | null {
  const past = verifiedEvents(events)
    .filter((event) => endOf(event) < now)
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id));
  return past[0] ?? null;
}

// ---- Posts ---------------------------------------------------------------------------------

export interface HomePost {
  id: string;
  title: string;
  date: Date;
}

/** The newest verified article already published (not dated in the future), or null. */
export function selectLatestPost(posts: Entry<Data<"posts">>[], now: Date): HomePost | null {
  const published: HomePost[] = [];
  for (const post of posts.filter(isVerified)) {
    const { title, date } = post.data;
    if (real(title) && realDate(date) && date <= now) published.push({ id: post.id, title, date });
  }
  published.sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
  return published[0] ?? null;
}

export interface HomeRecent {
  event: HomeEvent | null;
  post: HomePost | null;
}

/** Latest past event and latest article. Null when there is neither. */
export function selectRecent(
  events: Entry<Data<"events">>[],
  posts: Entry<Data<"posts">>[],
  now: Date,
): HomeRecent | null {
  const event = selectLatestPastEvent(events, now);
  const post = selectLatestPost(posts, now);
  return event || post ? { event, post } : null;
}

// ---- Terms ---------------------------------------------------------------------------------

export interface HomeTerm {
  id: string;
  name: string;
  academicYear: string;
  summary?: string;
}

export interface HomeLegacy {
  latest: HomeTerm;
  /** The founding term, when a verified record marks one and it is not the latest term. */
  founding: HomeTerm | null;
}

export function selectLegacy(terms: Entry<Data<"terms">>[]): HomeLegacy | null {
  const found: { term: HomeTerm; founding: boolean }[] = [];
  for (const entry of terms.filter(isVerified)) {
    const { name, academicYear, summary, isFoundingTerm } = entry.data;
    if (!real(name) || !real(academicYear)) continue;
    found.push({
      term: { id: entry.id, name, academicYear, summary: real(summary) ? summary : undefined },
      founding: isFoundingTerm === true,
    });
  }
  // Academic years sort as text, newest first; id breaks ties so the order is stable.
  found.sort(
    (a, b) =>
      b.term.academicYear.localeCompare(a.term.academicYear) || a.term.id.localeCompare(b.term.id),
  );
  const latest = found[0];
  if (!latest) return null;
  const founding = found.find((t) => t.founding && t.term.id !== latest.term.id);
  return { latest: latest.term, founding: founding?.term ?? null };
}

// ---- Projects ------------------------------------------------------------------------------

export interface HomeProject {
  id: string;
  name: string;
  description: string;
  topics: string[];
  contributors: string[];
  repository: string;
  liveDemo?: string;
}

/** A small, stable selection of verified projects (alphabetical by name), or an empty list. */
export function selectProjects(
  projects: Entry<Data<"projects">>[],
  limit = HOME_PROJECT_LIMIT,
): HomeProject[] {
  const found: HomeProject[] = [];
  for (const entry of projects.filter(isVerified)) {
    const { name, description, repository, liveDemo, topics, contributors } = entry.data;
    if (!real(name) || !real(description) || !real(repository)) continue;
    found.push({
      id: entry.id,
      name,
      description,
      topics: topics.filter(real),
      contributors: contributors.filter(real),
      repository,
      liveDemo: real(liveDemo) ? liveDemo : undefined,
    });
  }
  return found
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

// ---- Learning ------------------------------------------------------------------------------

export interface HomeTrack {
  id: (typeof TRACKS)[number]["id"];
  label: string;
  roadmap: { title: string; link?: string };
}

export interface HomeLearning {
  /** Official tracks that have a verified roadmap. A track without one is not listed. */
  tracks: HomeTrack[];
}

/** Non-null when any verified learning resource exists. */
export function selectLearning(resources: Entry<Data<"resources">>[]): HomeLearning | null {
  const verified = resources.filter(isVerified).filter((r) => real(r.data.title));
  if (verified.length === 0) return null;
  const tracks: HomeTrack[] = [];
  for (const track of TRACKS) {
    const roadmap = verified
      .filter((r) => r.data.kind === "roadmap" && r.data.track === track.id)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!roadmap) continue;
    const { title, link } = roadmap.data;
    tracks.push({
      id: track.id,
      label: track.label,
      roadmap: { title: title as string, link: real(link) ? link : undefined },
    });
  }
  return { tracks };
}

// ---- Whole homepage ------------------------------------------------------------------------

export interface HomeSource {
  site: Entry<Data<"site">>[];
  events: Entry<Data<"events">>[];
  posts: Entry<Data<"posts">>[];
  terms: Entry<Data<"terms">>[];
  projects: Entry<Data<"projects">>[];
  resources: Entry<Data<"resources">>[];
}

export interface HomeContent {
  nextEvent: HomeEvent | null;
  intro: { description: string } | null;
  legacy: HomeLegacy | null;
  recent: HomeRecent | null;
  /** Empty list = hide the section. */
  projects: HomeProject[];
  learning: HomeLearning | null;
}

export function selectHomeContent(source: HomeSource, now: Date): HomeContent {
  return {
    nextEvent: selectNextEvent(source.events, now),
    intro: selectIntro(source.site),
    legacy: selectLegacy(source.terms),
    recent: selectRecent(source.events, source.posts, now),
    projects: selectProjects(source.projects),
    learning: selectLearning(source.resources),
  };
}

// ---- Formatting ----------------------------------------------------------------------------

/**
 * Written date and time with its timezone (Master Brief §8.4). Uses the record's timezone when
 * it is a valid IANA name; otherwise falls back to UTC, which the output states. Never guesses.
 */
export function formatEventDate(date: Date, timezone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: timezone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
  }
}

/** Calendar date for records that carry a date but no time (articles, past-event teasers). */
export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(date);
}
