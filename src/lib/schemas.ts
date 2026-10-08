import { z } from "astro/zod";
import { NEEDED_ONLY, findNeeded } from "./needed";

/*
  Content schemas for the entities in Master Brief §9.
  The field lists are INDICATIVE: the brief calls them indicative, and they will be
  refined when the pages that use them are built.

  Rules enforced here (Master Brief §9, §13):
  - every record has a `source` and a `status` ("draft" or "verified");
  - a "verified" record must not contain a [[NEEDED: ...]] marker;
  - a record about a person must have recorded consent before it can be "verified".
*/

export const status = z.enum(["draft", "verified"]);
export const consent = z.enum(["not-recorded", "recorded"]);

const neededMarker = z.string().regex(NEEDED_ONLY, "expected a [[NEEDED: …]] marker");

/** A field that holds its real value, or a [[NEEDED: …]] marker while the record is a draft. */
export const orNeeded = <T extends z.ZodType>(schema: T) => z.union([neededMarker, schema]);

const text = orNeeded(z.string().min(1));
const textList = z.array(z.string().min(1)).default([]);
const url = orNeeded(z.url());
const date = orNeeded(z.coerce.date());

/** Wraps a record shape with the shared `status` / `source` fields and the publishing rules. */
export function record<Shape extends z.ZodRawShape>(shape: Shape) {
  return z
    .strictObject({
      status,
      source: z.string().min(1, "every record needs a source"),
      ...shape,
    })
    .superRefine((data, ctx) => {
      const { status: recordStatus, consent: recordConsent } = data as {
        status: string;
        consent?: unknown;
      };
      if (recordStatus !== "verified") return;
      for (const path of findNeeded(data)) {
        ctx.addIssue({
          code: "custom",
          path,
          message: "a verified record must not contain a [[NEEDED: …]] marker",
        });
      }
      if ("consent" in data && recordConsent !== "recorded") {
        ctx.addIssue({
          code: "custom",
          path: ["consent"],
          message: "consent must be recorded before a record about a person is verified",
        });
      }
    });
}

/** The five official aim categories, in the order the club presents them (Master Brief §4.2). */
export const AIM_CATEGORIES = [
  "Skill Development",
  "Career Exposure",
  "Innovation & Research",
  "Interdepartmental Collaboration",
  "Community Building",
] as const;

const aim = z.strictObject({ category: orNeeded(z.enum(AIM_CATEGORIES)), text });

/** One roadmap step: what to learn, why, and optional linked resources (Master Brief §8.4). */
const roadmapStep = z.strictObject({
  title: text,
  why: text,
  resources: z.array(z.strictObject({ title: text, url })).default([]),
});

const DOWNLOAD_KINDS = ["cheat-sheet", "code-template", "dataset"];

export const schemas = {
  /*
    Club-level facts. Every field is optional, and an omitted field is hidden on the site.
    This lets the club verify facts one at a time (for example the description before the
    contact email): a verified record may omit what is not yet confirmed, but may never hold a
    [[NEEDED]] marker. Vision, mission and aims are the club's official text (Master Brief §4.1,
    §4.2), used exactly as supplied.
  */
  site: record({
    description: text.optional(),
    vision: text.optional(),
    mission: text.optional(),
    aims: z.array(aim).default([]),
    foundingDate: text.optional(),
    affiliation: text.optional(),
    contactEmail: text.optional(),
    githubOrganisation: text.optional(),
    productionUrl: url.optional(),
  }),
  terms: record({
    name: text,
    academicYear: text,
    summary: text.optional(),
    milestones: textList,
    isFoundingTerm: orNeeded(z.boolean()).optional(),
  }),
  teams: record({
    name: text,
    order: orNeeded(z.number().int().nonnegative()),
  }),
  people: record({
    name: text,
    photo: text.optional(),
    linkedin: url.optional(),
    bio: text.optional(),
    consent: consent.default("not-recorded"),
  }),
  memberships: record({
    person: text,
    term: text,
    team: text,
    role: text,
    contributions: textList,
  }),
  events: record({
    title: text,
    type: text,
    start: date,
    end: date.optional(),
    timezone: text,
    venue: text,
    description: text.optional(),
    speakers: textList,
    photos: textList,
    slides: textList,
    repositories: z.array(url).default([]),
    relatedPost: text.optional(),
  }),
  achievements: record({
    title: text,
    competition: text,
    date,
    result: text,
    people: textList,
    project: text.optional(),
    evidenceLink: url.optional(),
  }),
  spotlights: record({
    person: text,
    category: orNeeded(z.enum(["research", "certification", "internship"])),
    title: text,
    date,
    link: url.optional(),
    consent: consent.default("not-recorded"),
  }),
  projects: record({
    name: text,
    description: text,
    repository: url,
    liveDemo: url.optional(),
    datasets: z.array(url).default([]),
    topics: textList,
    contributors: textList,
  }),
  /*
    Learning resources. `licence` and `lastReviewed` are optional on the field, because which of
    them a record needs depends on its kind; the kind-aware check below enforces that for a
    verified record. A roadmap carries ordered `steps` and an optional `reviewer`, the id of a
    `people` record (named only with recorded consent). The club has not decided whether a
    reviewer may be a team or role, so none is modelled. Files are linked, never hosted here.
  */
  resources: record({
    kind: orNeeded(z.enum(["roadmap", "cheat-sheet", "code-template", "dataset"])),
    title: text,
    track: orNeeded(z.enum(["data-science", "machine-learning", "python", "sql"])).optional(),
    link: url.optional(),
    format: text.optional(),
    size: text.optional(),
    licence: text.optional(),
    lastReviewed: date.optional(),
    reviewer: text.optional(),
    steps: z.array(roadmapStep).default([]),
  }).superRefine((data, ctx) => {
    if (data.status !== "verified") return; // drafts may be incomplete
    const missing = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (data.kind === "roadmap") {
      if (!data.track) missing("track", "a verified roadmap needs a track");
      if (data.steps.length === 0) missing("steps", "a verified roadmap needs at least one step");
      if (!data.lastReviewed)
        missing("lastReviewed", "a verified roadmap needs a lastReviewed date");
    } else if (DOWNLOAD_KINDS.includes(data.kind as string)) {
      if (typeof data.link !== "string" || !/^https:\/\/\S+$/.test(data.link)) {
        missing("link", "a verified download needs an https link");
      }
      if (!data.licence) missing("licence", "a verified download needs a licence");
    }
  }),
  posts: record({
    title: text,
    authors: textList,
    date,
    tags: textList,
    relatedEvent: text.optional(),
    relatedProject: text.optional(),
  }),
};
