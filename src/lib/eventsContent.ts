import type { z } from "astro/zod";
import { findUnsafe } from "../../scripts/check-posts.mjs";
import { publishedPosts, type PostEntry } from "./blogContent";
import { lifecycleOf } from "./eventLifecycle";
import { NEEDED_MARKER } from "./needed";
import type { schemas } from "./schemas";

/*
  Events & Initiatives Archive content selection (Master Brief P2, §8.4, §13).

  Pure functions over already-loaded collection entries. Every selector returns an empty list
  when nothing qualifies, and the page then omits that section entirely. Nothing here supplies
  titles, dates, venues or wording: it only filters, validates, classifies and orders verified
  records.

  Rules applied here:
  - only `verified` records are published; a [[NEEDED: …]] value counts as missing;
  - an event with a missing or unusable required value (title, type, start, timezone, venue), an
    unrecognised timezone, or an end before its start is not published at all, because its
    time cannot be shown correctly. The record's timezone is never reinterpreted;
  - a Markdown/MDX body (the recap) must pass the same safety check as a blog post
    (scripts/check-posts.mjs, `findUnsafe`). An event whose body fails is not published at all,
    even when a published article replaces its recap, so an unsafe body is never rendered or
    reachable from any event page, list, calendar file or the homepage;
  - optional details (description, end, recap, photos, slides, repositories, related article)
    appear only when present, verified and well-formed;
  - ordering is deterministic; ties are broken by id.

  Time: `start` and `end` are absolute instants. Whether an event is upcoming or past is decided
  from those instants alone, so it does not depend on the timezone. The recorded timezone only
  controls how the date and time are written. In content files, write `start` and `end` with an
  explicit UTC offset (for example 2030-07-01T15:30:00+05:30) so the instant is unambiguous.

  Calendar: each public event also has a static calendar file at /events/<id>.ics (see
  eventsCalendar.ts), linked from the page of an upcoming event. A live calendar view or feed is
  not built: what "live" means is an open club decision (Master Brief P2.2, §15 E3).
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;
export interface Entry<T> {
  id: string;
  data: T;
  /** Markdown body, when the record is a Markdown/MDX file. It holds the event's recap. */
  body?: string;
}

const isVerified = (entry: { data: { status: string } }) => entry.data.status === "verified";

const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

/** A body with any text in it (a marker counts: it is not shown, but it is still checked). */
const hasBody = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const realDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

/** Media and slide links are site paths ("/events/x.jpg") or https URLs. Anything else is dropped. */
const ASSET = /^(\/(?!\/)|https:\/\/)\S+$/;
const HTTPS_URL = /^https:\/\/\S+$/;

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// ---- Types ---------------------------------------------------------------------------------

export interface RelatedPost {
  id: string;
  title: string;
}

export interface PublicEvent {
  /** The record id; it is the event's stable URL slug (/events/<id>). */
  id: string;
  title: string;
  type: string;
  start: Date;
  end?: Date;
  /** IANA timezone recorded for the event. */
  timezone: string;
  venue: string;
  description?: string;
  photos: string[];
  slides: string[];
  repositories: string[];
  /** True when the record has a verified Markdown body (the recap) and no published related article. */
  hasRecap: boolean;
  /** The published article that is this event's recap; omitted if missing or not published. */
  relatedPost?: RelatedPost;
}

export type EventState = "upcoming" | "past";

// ---- Selection -----------------------------------------------------------------------------

/**
 * Every publishable event, regardless of time. Detail pages are generated from this list, so
 * only verified, valid events ever get a page.
 */
export function selectPublicEvents(
  events: Entry<Data<"events">>[],
  posts: PostEntry[],
  now: Date,
): PublicEvent[] {
  // Only PUBLISHED posts (the one rule in blogContent.ts), so an event never links to an article
  // page that is not generated.
  const articles = new Map<string, RelatedPost>(
    publishedPosts(posts, now).map((post) => [post.id, { id: post.id, title: post.title }]),
  );

  const found: PublicEvent[] = [];
  for (const entry of events.filter(isVerified)) {
    const { title, type, start, end, timezone, venue, description } = entry.data;
    if (!real(title) || !real(type) || !realDate(start) || !real(venue)) continue;
    if (!real(timezone) || !isValidTimezone(timezone)) continue;
    // An end that is not a real date is simply absent; an end before the start is a data error.
    const validEnd = realDate(end) ? end : undefined;
    if (validEnd && validEnd < start) continue;

    // Fail closed: a body that is not blank must be safe, whether or not it would be shown.
    if (hasBody(entry.body) && findUnsafe(entry.body).length > 0) continue;

    const related = entry.data.relatedPost;
    const relatedPost = real(related) ? articles.get(related) : undefined;
    found.push({
      id: entry.id,
      title,
      type,
      start,
      end: validEnd,
      timezone,
      venue,
      description: real(description) ? description : undefined,
      photos: entry.data.photos.filter((p) => real(p) && ASSET.test(p)),
      slides: entry.data.slides.filter((s) => real(s) && ASSET.test(s)),
      repositories: entry.data.repositories.filter((r) => real(r) && HTTPS_URL.test(r)),
      // A published related article IS the recap, so the event's own recap body is suppressed:
      // the recap exists once, never two versions (Master Brief P2).
      hasRecap: real(entry.body) && relatedPost === undefined,
      relatedPost,
    });
  }
  return found.sort(byStartThenId);
}

const byStartThenId = (a: PublicEvent, b: PublicEvent) =>
  a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id);

/** The event's own page. Pages are generated for exactly the events `selectPublicEvents` returns. */
export const eventPath = (id: string) => `/events/${id}`;

/** The event's calendar file (see eventsCalendar.ts). One exists for every public event. */
export const calendarPath = (id: string) => `/events/${id}.ics`;

/** The instant an event is over: its end, or its start when it has no end. */
export const endOf = (event: PublicEvent): Date => event.end ?? event.start;

/**
 * Upcoming means it has not ended yet (so an event in progress is still upcoming). The time rule
 * is the one in eventLifecycle.ts, which the event page's status and countdown also use.
 */
export function classify(event: PublicEvent, now: Date): EventState {
  const state = lifecycleOf(event.start.getTime(), event.end?.getTime(), now.getTime());
  return state === "ended" ? "past" : "upcoming";
}

export interface SplitEvents {
  /** Soonest first. */
  upcoming: PublicEvent[];
  /** Newest first. */
  past: PublicEvent[];
}

export function splitEvents(events: PublicEvent[], now: Date): SplitEvents {
  const upcoming = events.filter((e) => classify(e, now) === "upcoming").sort(byStartThenId);
  const past = events
    .filter((e) => classify(e, now) === "past")
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id));
  return { upcoming, past };
}

// ---- Filters -------------------------------------------------------------------------------

export interface EventFilter {
  /** Slug of an event type. */
  type?: string;
  year?: number;
}

export interface TypeOption {
  slug: string;
  label: string;
}

/** URL-safe form of an event type. Types with no usable characters have no filter. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The calendar year of the event's start, in the event's own recorded timezone. */
export function yearOf(event: PublicEvent): number {
  const year = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    timeZone: event.timezone,
  }).format(event.start);
  return Number(year);
}

export function applyFilter(events: PublicEvent[], filter: EventFilter): PublicEvent[] {
  return events.filter(
    (e) =>
      (filter.type === undefined || slugify(e.type) === filter.type) &&
      (filter.year === undefined || yearOf(e) === filter.year),
  );
}

export interface FilterOptions {
  /** Alphabetical by label. */
  types: TypeOption[];
  /** Newest first. */
  years: number[];
}

/**
 * The filter values that exist in `events`, and so can be linked. Options come only from the
 * data. When a type is selected, years offered are those with a matching event, and the reverse.
 */
export function filterOptions(events: PublicEvent[], selected: EventFilter = {}): FilterOptions {
  const typeSource = applyFilter(events, { year: selected.year });
  const yearSource = applyFilter(events, { type: selected.type });

  const labels = new Map<string, string>();
  for (const e of typeSource) {
    const slug = slugify(e.type);
    const current = labels.get(slug);
    if (slug && (current === undefined || e.type.localeCompare(current) < 0)) {
      labels.set(slug, e.type);
    }
  }
  const types = [...labels].map(([slug, label]) => ({ slug, label }));
  types.sort((a, b) => a.label.localeCompare(b.label) || a.slug.localeCompare(b.slug));

  const years = [...new Set(yearSource.map(yearOf))].sort((a, b) => b - a);
  return { types, years };
}

/** Every filter combination that has at least one event; used to generate the static pages. */
export function filterCombinations(events: PublicEvent[]): EventFilter[] {
  const seen = new Set<string>();
  const out: EventFilter[] = [];
  const add = (filter: EventFilter) => {
    const key = filterPath(filter);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(filter);
    }
  };
  for (const e of events) {
    const type = slugify(e.type) || undefined;
    const year = yearOf(e);
    add({ year });
    if (type) {
      add({ type });
      add({ type, year });
    }
  }
  return out.sort((a, b) => filterPath(a).localeCompare(filterPath(b)));
}

/** Path of a filtered archive page, after /events/archive/. Empty string for no filter. */
export function filterPath(filter: EventFilter): string {
  const parts: string[] = [];
  if (filter.type !== undefined) parts.push("type", filter.type);
  if (filter.year !== undefined) parts.push("year", String(filter.year));
  return parts.join("/");
}

export function filterHref(filter: EventFilter): string {
  const path = filterPath(filter);
  return path ? `/events/archive/${path}` : "/events";
}

/** Inverse of `filterPath`. Returns null for anything that is not a well-formed filter path. */
export function parseFilterPath(path: string): EventFilter | null {
  const parts = path.split("/").filter(Boolean);
  const filter: EventFilter = {};
  let i = 0;
  if (parts[i] === "type") {
    const slug = parts[i + 1];
    if (!slug || slug !== slugify(slug)) return null;
    filter.type = slug;
    i += 2;
  }
  if (parts[i] === "year") {
    const year = parts[i + 1];
    if (!year || !/^\d{4}$/.test(year)) return null;
    filter.year = Number(year);
    i += 2;
  }
  return i === parts.length && i > 0 ? filter : null;
}

// ---- Writing dates -------------------------------------------------------------------------

export interface EventWhen {
  startDate: string;
  startTime: string;
  /** Present only when the event has a verified end. */
  endDate?: string;
  endTime?: string;
  /** True when the end falls on the same calendar day as the start, in the event's timezone. */
  sameDay: boolean;
  /** The recorded IANA timezone. */
  timezone: string;
  /** Its offset from UTC at the start, for example "GMT+5:30". */
  offset: string;
}

/** Written date and time in the event's own recorded timezone. */
export function describeWhen(event: PublicEvent): EventWhen {
  const zone = { timeZone: event.timezone };
  const date = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      ...zone,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  const time = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      ...zone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
  const offset =
    new Intl.DateTimeFormat("en-GB", { ...zone, timeZoneName: "shortOffset" })
      .formatToParts(event.start)
      .find((part) => part.type === "timeZoneName")?.value ?? "";

  const startDate = date(event.start);
  const end = event.end;
  return {
    startDate,
    startTime: time(event.start),
    endDate: end ? date(end) : undefined,
    endTime: end ? time(end) : undefined,
    sameDay: end ? date(end) === startDate : true,
    timezone: event.timezone,
    offset,
  };
}

// ---- Whole page ----------------------------------------------------------------------------

export interface EventsSource {
  events: Entry<Data<"events">>[];
  posts: PostEntry[];
}

export interface EventsContent {
  /** Every publishable event (one detail page each). */
  all: PublicEvent[];
  upcoming: PublicEvent[];
  past: PublicEvent[];
}

export function selectEventsContent(source: EventsSource, now: Date): EventsContent {
  const all = selectPublicEvents(source.events, source.posts, now);
  return { all, ...splitEvents(all, now) };
}
