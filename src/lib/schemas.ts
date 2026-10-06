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

export const schemas = {
  site: record({
    description: text,
    foundingDate: text,
    affiliation: text,
    contactEmail: text,
    githubOrganisation: text.optional(),
    productionUrl: url,
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
  resources: record({
    kind: orNeeded(z.enum(["roadmap", "cheat-sheet", "code-template", "dataset"])),
    title: text,
    track: orNeeded(z.enum(["data-science", "machine-learning", "python", "sql"])).optional(),
    link: url.optional(),
    format: text.optional(),
    size: text.optional(),
    licence: text,
    lastReviewed: date,
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
