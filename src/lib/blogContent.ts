import type { z } from "astro/zod";
import { findUnsafe } from "../../scripts/check-posts.mjs";
import { formatDay, publishablePeople } from "./achievementsContent";
import { NEEDED_MARKER } from "./needed";
import { selectProjects, type ProjectsSource } from "./projectsContent";
import type { schemas } from "./schemas";

/*
  Tech Blog & Insights content selection (Master Brief P6, §8.4, §13).

  Pure functions over already-loaded collection entries. This module owns the one rule for when a
  post is PUBLISHED. The blog index, the article pages, the homepage "Recent" section and the
  event pages' article links all use it, so nothing can link to a post that has no page.

  A post is published when it is verified, has a real title, a valid date that is not in the
  future (as of the build), and a real body: not blank, no [[NEEDED: …]] marker, and nothing
  that scripts/check-posts.mjs rejects (scripts, event handlers, unsafe links, images without
  alt text, MDX imports, client directives). A post that fails any of these is not published.

  Everything else about a post is optional and is shown only when it is valid:
  - authors are `people` record ids, named only through `publishablePeople()` (verified, consent
    recorded). An id that does not resolve, a draft or unconsented person, and a plain written
    name are omitted. A post with no nameable author still publishes, with no byline and no
    generic credit. Only the name is returned: never an id, photo, LinkedIn link or bio;
  - tags are trimmed, de-duplicated and stripped of blanks and markers;
  - `relatedEvent` is kept only if it is a public event, `relatedProject` only if it is a
    published project; nothing else is linked;
  - reading time is computed from the body here, never stored.

  Order is newest first, with the record id as the tie-breaker. No tag pages, feed or pagination.
  Not decided by the club (Master Brief W1, W2): who writes, reviews and approves posts, and the
  authoring tool. None of that is modelled here.
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;

export interface PostEntry {
  id: string;
  data: Data<"posts">;
  /** The Markdown or MDX body, without front matter. */
  body?: string;
}

const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

const realDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

// ---- Publication ---------------------------------------------------------------------------

export interface PublishedPost {
  id: string;
  title: string;
  date: Date;
  body: string;
}

/** Whether a body may be published: real text, no marker, nothing unsafe. */
export function isPublishableBody(body: unknown): body is string {
  return real(body) && findUnsafe(body).length === 0;
}

/**
 * The posts that are published as of `now`, newest first. This is the single publication rule:
 * use it, do not re-implement it.
 */
export function publishedPosts(posts: PostEntry[], now: Date): PublishedPost[] {
  const found: PublishedPost[] = [];
  for (const entry of posts) {
    if (entry.data.status !== "verified") continue;
    const { title, date } = entry.data;
    if (!real(title) || !realDate(date) || date.getTime() > now.getTime()) continue;
    if (!isPublishableBody(entry.body)) continue;
    found.push({ id: entry.id, title, date, body: entry.body });
  }
  return found.sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
}

// ---- Reading time and tags -----------------------------------------------------------------

/** Words per minute used for reading time. An editorial convention, not a measurement. */
export const WORDS_PER_MINUTE = 200;

/** Counts words in a Markdown/MDX body, ignoring link addresses and HTML tags. */
export function countWords(body: string): number {
  const text = body
    .replace(/<[^>]*>/g, " ")
    .replace(/\]\([^)]*\)/g, "] ")
    .replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, " ");
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

/** Whole minutes to read, rounded up, never less than 1. */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.ceil(countWords(body) / WORDS_PER_MINUTE));
}

/** Trimmed, de-duplicated (ignoring case) tags without blanks or markers, in the record's order. */
export function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const tag of tags) {
    if (!real(tag)) continue;
    const trimmed = tag.trim();
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(trimmed);
  }
  return clean;
}

// ---- Public posts --------------------------------------------------------------------------

export interface PublicPost {
  id: string;
  title: string;
  date: Date;
  /** Names of authors who may be named, in the record's order. Often empty. */
  authors: string[];
  tags: string[];
  readingMinutes: number;
  relatedEvent?: { id: string; title: string };
  relatedProject?: { id: string; name: string };
}

export interface BlogSource {
  posts: PostEntry[];
  people: ProjectsSource["people"];
  projects: ProjectsSource["projects"];
  /** The public events (see `selectPublicEvents`), as far as a post needs them. */
  events: { id: string; title: string }[];
}

export function selectPublicPosts(source: BlogSource, now: Date): PublicPost[] {
  const names = publishablePeople(source.people);
  const events = new Map(source.events.map((e) => [e.id, { id: e.id, title: e.title }]));
  const projects = new Map(
    selectProjects({ projects: source.projects, people: source.people }).map((p) => [
      p.id,
      { id: p.id, name: p.name },
    ]),
  );
  const entries = new Map(source.posts.map((p) => [p.id, p]));

  return publishedPosts(source.posts, now).map((post) => {
    const { authors, tags, relatedEvent, relatedProject } = (entries.get(post.id) as PostEntry)
      .data;
    const named = (Array.isArray(authors) ? authors : [])
      .filter(real)
      .map((id) => names.get(id))
      .filter((name): name is string => name !== undefined);
    return {
      id: post.id,
      title: post.title,
      date: post.date,
      authors: [...new Set(named)],
      tags: cleanTags(tags),
      readingMinutes: readingMinutes(post.body),
      relatedEvent: real(relatedEvent) ? events.get(relatedEvent) : undefined,
      relatedProject: real(relatedProject) ? projects.get(relatedProject) : undefined,
    };
  });
}

/** The static paths to pre-render: only published posts. */
export function postPaths(posts: PublicPost[]) {
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export { formatDay };
