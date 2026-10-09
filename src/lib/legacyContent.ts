import type { z } from "astro/zod";
import { isFacultyTeamName } from "./aboutContent";
import { NEEDED_MARKER } from "./needed";
import type { schemas } from "./schemas";

/*
  Legacy page content selection (Master Brief §3 P1, §8.4, §13).

  Pure functions over already-loaded collection entries. Every selector returns an empty list
  when nothing qualifies, and the page then omits that section entirely. Nothing here supplies
  names, dates, roles or wording: it only filters, joins and orders verified records.

  Rules applied here:
  - only `verified` records are used; a [[NEEDED: …]] value counts as missing;
  - a person appears only if verified with consent recorded (Master Brief §13.4);
  - optional personal details (photo, LinkedIn, contributions) appear only when present, verified
    and well-formed; a field existing in the schema is never enough on its own;
  - the faculty team is never part of the Executive Committee, so it is left out here (faculty are
    shown on About);
  - a term has its own page (/legacy/<id>) only when at least one member qualifies. That one fact
    (`hasPage`) decides the generated routes, the timeline's page links, and which "Also served"
    links may point at a page; any other link falls back to the timeline anchor;
  - ordering is deterministic: ties are broken by id.
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;
export interface Entry<T> {
  id: string;
  data: T;
}

const isVerified = (entry: Entry<{ status: string }>) => entry.data.status === "verified";

const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

/** A photo is a site path ("/people/x.jpg") or an https URL. Anything else is not rendered. */
const PHOTO = /^(\/(?!\/)|https:\/\/)\S+$/;
/** A LinkedIn link must be an https URL on linkedin.com. */
const LINKEDIN = /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\/\S*$/i;

// ---- Types ---------------------------------------------------------------------------------

export interface TermRef {
  id: string;
  name: string;
  academicYear: string;
}

/** A term another page links to. `href` is its own page when it has one, else its timeline anchor. */
export interface TermLink extends TermRef {
  href: string;
}

export interface LegacyMember {
  /** Person id. */
  id: string;
  name: string;
  role: string;
  photo?: string;
  linkedin?: string;
  contributions: string[];
  /** The person's memberships in other verified terms, newest first. */
  alsoServed: TermLink[];
}

export interface LegacyTeam {
  id: string;
  name: string;
  members: LegacyMember[];
}

export interface LegacyTerm extends TermRef {
  summary?: string;
  /** True when a verified record marks this as the founding term. */
  isFounding: boolean;
  /** True when at least one member qualifies, so `/legacy/<id>` is generated. */
  hasPage: boolean;
  teams: LegacyTeam[];
}

export interface MilestoneGroup extends TermRef {
  items: string[];
}

export interface LegacyContent {
  /** Newest first. Empty = hide the timeline. */
  terms: LegacyTerm[];
  /** Empty = hide the Milestones section. */
  milestones: MilestoneGroup[];
}

export interface LegacySource {
  terms: Entry<Data<"terms">>[];
  teams: Entry<Data<"teams">>[];
  people: Entry<Data<"people">>[];
  memberships: Entry<Data<"memberships">>[];
}

/** The term's own page, which exists only when `LegacyTerm.hasPage`. */
export const termPagePath = (id: string) => `/legacy/${id}`;
/** The term's entry on the timeline, which exists for every published term. */
export const termAnchorPath = (id: string) => `/legacy#term-${id}`;

// ---- Selection -----------------------------------------------------------------------------

/** Newest academic year first; id breaks ties. Academic years sort as text. */
const newestFirst = (a: TermRef, b: TermRef) =>
  b.academicYear.localeCompare(a.academicYear) || a.id.localeCompare(b.id);

function verifiedTerms(terms: Entry<Data<"terms">>[]) {
  return terms
    .filter(isVerified)
    .filter((t) => real(t.data.name) && real(t.data.academicYear))
    .map((t) => ({
      ref: { id: t.id, name: t.data.name as string, academicYear: t.data.academicYear as string },
      data: t.data,
    }))
    .sort((a, b) => newestFirst(a.ref, b.ref));
}

export function selectLegacy(source: LegacySource): LegacyContent {
  const terms = verifiedTerms(source.terms);
  const termRefs = new Map(terms.map((t) => [t.ref.id, t.ref]));

  const teams = new Map(
    source.teams
      .filter(isVerified)
      .filter((t) => real(t.data.name) && !isFacultyTeamName(t.data.name))
      .filter((t) => typeof t.data.order === "number")
      .map((t) => [t.id, { id: t.id, name: t.data.name as string, order: t.data.order as number }]),
  );

  const people = new Map(
    source.people
      .filter(isVerified)
      .filter((p) => p.data.consent === "recorded" && real(p.data.name))
      .map((p) => [p.id, p.data]),
  );

  // Qualifying memberships: verified, in a verified term, team and person, with a stated role.
  const memberships = source.memberships
    .filter(isVerified)
    .map((m) => ({ id: m.id, ...m.data }))
    .filter(
      (m) =>
        real(m.person) &&
        real(m.term) &&
        real(m.team) &&
        real(m.role) &&
        termRefs.has(m.term) &&
        teams.has(m.team) &&
        people.has(m.person),
    );

  // A term has a page exactly when a qualifying membership (so a visible member) points at it.
  const pageTerms = new Set(memberships.map((m) => m.term));
  const linkTo = (t: TermRef): TermLink => ({
    ...t,
    href: pageTerms.has(t.id) ? termPagePath(t.id) : termAnchorPath(t.id),
  });

  const termsServed = (personId: string) =>
    memberships.filter((m) => m.person === personId).map((m) => termRefs.get(m.term) as TermRef);

  const legacyTerms: LegacyTerm[] = terms.map(({ ref, data }) => {
    const inTerm = memberships.filter((m) => m.term === ref.id);
    const teamIds = [...new Set(inTerm.map((m) => m.team))]
      .map((id) => teams.get(id) as { id: string; name: string; order: number })
      .sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      );

    return {
      ...ref,
      summary: real(data.summary) ? data.summary : undefined,
      isFounding: data.isFoundingTerm === true,
      hasPage: pageTerms.has(ref.id),
      teams: teamIds.map((team) => ({
        id: team.id,
        name: team.name,
        members: inTerm
          .filter((m) => m.team === team.id)
          .map((m): LegacyMember => {
            const person = people.get(m.person) as Data<"people">;
            const others = new Map(
              termsServed(m.person)
                .filter((t) => t.id !== ref.id)
                .map((t) => [t.id, t]),
            );
            return {
              id: m.person,
              name: person.name as string,
              role: m.role,
              photo: real(person.photo) && PHOTO.test(person.photo) ? person.photo : undefined,
              linkedin:
                real(person.linkedin) && LINKEDIN.test(person.linkedin)
                  ? person.linkedin
                  : undefined,
              contributions: m.contributions.filter(real),
              alsoServed: [...others.values()].sort(newestFirst).map(linkTo),
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
      })),
    };
  });

  const milestones: MilestoneGroup[] = [];
  for (const { ref, data } of terms) {
    const items = data.milestones.filter(real);
    if (items.length > 0) milestones.push({ ...ref, items });
  }

  return { terms: legacyTerms, milestones };
}

/** The terms that have their own page, newest first. */
export function termsWithPages(content: LegacyContent): LegacyTerm[] {
  return content.terms.filter((term) => term.hasPage);
}

/** The static paths to pre-render for /legacy/[term]: only terms that have a page. */
export function legacyTermPaths(content: LegacyContent) {
  return termsWithPages(content).map((term) => ({ params: { term: term.id }, props: { term } }));
}

/** One term that has a page, or undefined. */
export function selectLegacyTerm(content: LegacyContent, id: string): LegacyTerm | undefined {
  return termsWithPages(content).find((term) => term.id === id);
}

/** True when the page has nothing verified to show beyond its introduction. */
export function isLegacyEmpty(content: LegacyContent): boolean {
  return content.terms.length === 0 && content.milestones.length === 0;
}
