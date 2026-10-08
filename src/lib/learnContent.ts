import type { z } from "astro/zod";
import { formatDay, publishablePeople } from "./achievementsContent";
import { NEEDED_MARKER } from "./needed";
import { isHttpsUrl } from "./projectsContent";
import type { schemas } from "./schemas";

/*
  Resource & Learning Hub content selection (Master Brief P5, §8.4, §13).

  Pure functions over already-loaded collection entries. Every selector returns an empty list
  when nothing qualifies, and the page then omits that section entirely. Nothing here supplies
  titles, steps, reasons, links, names or wording: it only validates, joins and orders verified
  records.

  Rules applied here:
  - only `verified` records are published; a [[NEEDED: …]] value counts as missing;
  - a roadmap is published only if it has a valid track, a `lastReviewed` date and at least one
    step, and EVERY step is well formed (a title, a reason, and only valid `https` links). A
    malformed step fails the whole roadmap closed, because skipping a step would corrupt the
    sequence. Validity is decided first; among valid roadmaps for one track the newest
    `lastReviewed` wins, then the lowest record id;
  - step numbers are the position in the record's `steps` list, never stored;
  - the reviewer is an optional `people` id and is named only through `publishablePeople()`
    (verified, consent recorded). An id that does not resolve, and a plain written name, are
    dropped. The club has not decided whether a reviewer may be a team or role, so none is
    represented;
  - a download is published only with a real title, a valid `https` link and a licence. Format
    and size are shown only when the record provides them, exactly as written; nothing is
    guessed. Files are linked externally; none is hosted here.
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;
export interface Entry<T> {
  id: string;
  data: T;
}

/** Official Study Roadmap tracks (Master Brief §3, P5.1), in the brief's order. */
export const TRACKS = [
  { id: "data-science", label: "Data Science" },
  { id: "machine-learning", label: "Machine Learning" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

const isVerified = (entry: { data: { status: string } }) => entry.data.status === "verified";

const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

const realDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

// ---- Roadmaps ------------------------------------------------------------------------------

export interface StepLink {
  title: string;
  url: string;
}

export interface RoadmapStep {
  /** 1-based position in the record's `steps` list. */
  number: number;
  /** What to learn. */
  title: string;
  why: string;
  /** Linked resources; may be empty. */
  resources: StepLink[];
}

export interface Roadmap {
  /** The record id. */
  id: string;
  track: TrackId;
  trackLabel: string;
  title: string;
  steps: RoadmapStep[];
  lastReviewed: Date;
  /** The reviewer's name, only when they are a publishable person. */
  reviewer?: string;
}

export interface LearnSource {
  resources: Entry<Data<"resources">>[];
  people: Entry<Data<"people">>[];
}

/** All steps valid, or null. One malformed step (or unsafe link) fails the whole list. */
function validSteps(raw: Data<"resources">["steps"]): RoadmapStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const steps: RoadmapStep[] = [];
  for (const [index, step] of raw.entries()) {
    if (!real(step.title) || !real(step.why)) return null;
    const resources: StepLink[] = [];
    for (const link of step.resources ?? []) {
      if (!real(link.title) || !isHttpsUrl(link.url)) return null;
      resources.push({ title: link.title, url: link.url });
    }
    steps.push({ number: index + 1, title: step.title, why: step.why, resources });
  }
  return steps;
}

/** At most one roadmap per official track, in the brief's track order. */
export function selectRoadmaps(source: LearnSource): Roadmap[] {
  const names = publishablePeople(source.people);
  const best = new Map<TrackId, Roadmap>();

  for (const entry of source.resources.filter(isVerified)) {
    const { kind, track, title, lastReviewed, reviewer } = entry.data;
    if (kind !== "roadmap" || !real(title) || !realDate(lastReviewed)) continue;
    const official = TRACKS.find((t) => t.id === track);
    if (!official) continue;
    const steps = validSteps(entry.data.steps);
    if (!steps) continue;

    const candidate: Roadmap = {
      id: entry.id,
      track: official.id,
      trackLabel: official.label,
      title,
      steps,
      lastReviewed,
      reviewer: real(reviewer) ? names.get(reviewer) : undefined,
    };
    const current = best.get(official.id);
    const newer =
      !current ||
      candidate.lastReviewed.getTime() > current.lastReviewed.getTime() ||
      (candidate.lastReviewed.getTime() === current.lastReviewed.getTime() &&
        candidate.id.localeCompare(current.id) < 0);
    if (newer) best.set(official.id, candidate);
  }

  return TRACKS.flatMap((t) => {
    const roadmap = best.get(t.id);
    return roadmap ? [roadmap] : [];
  });
}

export function selectRoadmap(source: LearnSource, track: string): Roadmap | undefined {
  return selectRoadmaps(source).find((r) => r.track === track);
}

/** The static paths to pre-render: only tracks with a verified, valid roadmap. */
export function roadmapPaths(roadmaps: Roadmap[]) {
  return roadmaps.map((roadmap) => ({ params: { track: roadmap.track }, props: { roadmap } }));
}

/** "Last reviewed 1 March 2030", with " by Name" only for a publishable reviewer. */
export function describeReview(roadmap: Pick<Roadmap, "lastReviewed" | "reviewer">): string {
  const base = `Last reviewed ${formatDay(roadmap.lastReviewed)}`;
  return roadmap.reviewer ? `${base} by ${roadmap.reviewer}` : base;
}

// ---- Downloads -----------------------------------------------------------------------------

/** Downloadable kinds, in display order, with their headings. */
export const DOWNLOAD_KINDS = [
  { id: "cheat-sheet", label: "Cheat sheets" },
  { id: "code-template", label: "Code templates" },
  { id: "dataset", label: "Datasets" },
] as const;

export type DownloadKind = (typeof DOWNLOAD_KINDS)[number]["id"];

export interface Download {
  id: string;
  kind: DownloadKind;
  title: string;
  /** An external `https` URL. */
  link: string;
  /** Only when the record states them, exactly as written. */
  format?: string;
  size?: string;
  licence: string;
}

export interface DownloadGroup {
  kind: DownloadKind;
  label: string;
  /** Alphabetical by title; the order carries no meaning. */
  items: Download[];
}

export function selectDownloads(resources: Entry<Data<"resources">>[]): DownloadGroup[] {
  const found: Download[] = [];
  for (const entry of resources.filter(isVerified)) {
    const { kind, title, link, format, size, licence } = entry.data;
    const known = DOWNLOAD_KINDS.find((k) => k.id === kind);
    if (!known || !real(title) || !isHttpsUrl(link) || !real(licence)) continue;
    found.push({
      id: entry.id,
      kind: known.id,
      title,
      link,
      format: real(format) ? format : undefined,
      size: real(size) ? size : undefined,
      licence,
    });
  }
  return DOWNLOAD_KINDS.flatMap(({ id, label }) => {
    const items = found
      .filter((d) => d.kind === id)
      .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    return items.length > 0 ? [{ kind: id, label, items }] : [];
  });
}

// ---- Whole hub -----------------------------------------------------------------------------

export interface LearnContent {
  /** Empty = hide the roadmap list and generate no roadmap page. */
  roadmaps: Roadmap[];
  /** Empty = /learn/downloads shows only its introduction. */
  downloads: DownloadGroup[];
}

export function selectLearnContent(source: LearnSource): LearnContent {
  return { roadmaps: selectRoadmaps(source), downloads: selectDownloads(source.resources) };
}
