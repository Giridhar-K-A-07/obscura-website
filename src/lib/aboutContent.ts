import type { z } from "astro/zod";
import { NEEDED_MARKER } from "./needed";
import { AIM_CATEGORIES, type schemas } from "./schemas";

/*
  About page content selection (Master Brief §8.1, §4).

  Pure functions over already-loaded collection entries. Every selector returns `null` or an
  empty list when nothing qualifies, and the page then omits that section entirely. Nothing here
  supplies wording: vision, mission and aims are the club's own verified text, passed through
  exactly as supplied. Only `verified` records are used, and a [[NEEDED: …]] value is treated as
  missing even on a record marked verified.
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;
export interface Entry<T> {
  id: string;
  data: T;
}

/**
 * Team name that marks faculty in the content model (the deck labels them "Faculty", Master Brief
 * §4.3). Faculty are ordinary people with a membership in a team of this name. The club still has
 * to confirm their role (Master Brief §15 L4).
 */
export const FACULTY_TEAM_NAME = "Faculty";

/** True when a team name is the faculty team. The Legacy page uses this to keep faculty out. */
export function isFacultyTeamName(name: string): boolean {
  return name.trim().toLowerCase() === FACULTY_TEAM_NAME.toLowerCase();
}

const isVerified = (entry: Entry<{ status: string }>) => entry.data.status === "verified";

const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

// ---- Site-level text -----------------------------------------------------------------------

export interface Aim {
  category: (typeof AIM_CATEGORIES)[number];
  text: string;
}

export interface AboutIdentity {
  description: string | null;
  vision: string | null;
  mission: string | null;
  /** One aim per official category, in the club's order. Empty = hide the section. */
  aims: Aim[];
}

export interface AboutContact {
  contactEmail?: string;
  githubOrganisation?: string;
  affiliation?: string;
  foundingDate?: string;
}

/** The first verified site record is the club's record; the collection holds a single one. */
function verifiedSite(site: Entry<Data<"site">>[]): Data<"site"> | null {
  return site.find(isVerified)?.data ?? null;
}

export function selectIdentity(site: Entry<Data<"site">>[]): AboutIdentity {
  const data = verifiedSite(site);
  const aims: Aim[] = [];
  if (data) {
    for (const category of AIM_CATEGORIES) {
      const found = data.aims.find((aim) => aim.category === category && real(aim.text));
      if (found) aims.push({ category, text: found.text });
    }
  }
  return {
    description: data && real(data.description) ? data.description : null,
    vision: data && real(data.vision) ? data.vision : null,
    mission: data && real(data.mission) ? data.mission : null,
    aims,
  };
}

/** Verified site-level values for the contact and affiliation section. Null when there are none. */
export function selectContact(site: Entry<Data<"site">>[]): AboutContact | null {
  const data = verifiedSite(site);
  if (!data) return null;
  const contact: AboutContact = {};
  if (real(data.contactEmail)) contact.contactEmail = data.contactEmail;
  if (real(data.githubOrganisation)) contact.githubOrganisation = data.githubOrganisation;
  if (real(data.affiliation)) contact.affiliation = data.affiliation;
  if (real(data.foundingDate)) contact.foundingDate = data.foundingDate;
  return Object.keys(contact).length > 0 ? contact : null;
}

// ---- Faculty -------------------------------------------------------------------------------

export interface FacultyMember {
  id: string;
  name: string;
  role: string;
}

export interface FacultySource {
  people: Entry<Data<"people">>[];
  memberships: Entry<Data<"memberships">>[];
  teams: Entry<Data<"teams">>[];
  terms: Entry<Data<"terms">>[];
}

/**
 * Verified people who hold a verified membership, with a stated role, in the faculty team.
 * A person must be verified with consent recorded. A person with memberships in several terms
 * appears once, with the role from their newest term. Alphabetical by name (the club has not
 * given an order).
 */
export function selectFaculty(source: FacultySource): FacultyMember[] {
  const facultyTeams = new Set(
    source.teams
      .filter(isVerified)
      .filter((team) => real(team.data.name) && isFacultyTeamName(team.data.name))
      .map((team) => team.id),
  );
  if (facultyTeams.size === 0) return [];

  const people = new Map(
    source.people
      .filter(isVerified)
      .filter((p) => p.data.consent === "recorded" && real(p.data.name))
      .map((p) => [p.id, p.data.name as string]),
  );
  const yearOf = new Map(
    source.terms
      .filter(isVerified)
      .filter((t) => real(t.data.academicYear))
      .map((t) => [t.id, t.data.academicYear as string]),
  );

  const best = new Map<string, { role: string; year: string; termId: string }>();
  for (const { data } of source.memberships.filter(isVerified)) {
    const { person, team, term, role } = data;
    if (!real(person) || !real(team) || !real(role) || !facultyTeams.has(team)) continue;
    if (!people.has(person)) continue;
    const year = real(term) ? (yearOf.get(term) ?? "") : "";
    const termId = real(term) ? term : "";
    const current = best.get(person);
    if (!current || year > current.year || (year === current.year && termId < current.termId)) {
      best.set(person, { role, year, termId });
    }
  }

  return [...best.entries()]
    .map(([id, { role }]) => ({ id, name: people.get(id) as string, role }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

// ---- Whole page ----------------------------------------------------------------------------

export interface AboutSource extends FacultySource {
  site: Entry<Data<"site">>[];
}

export interface AboutContent {
  identity: AboutIdentity;
  faculty: FacultyMember[];
  contact: AboutContact | null;
}

export function selectAboutContent(source: AboutSource): AboutContent {
  return {
    identity: selectIdentity(source.site),
    faculty: selectFaculty(source),
    contact: selectContact(source.site),
  };
}

/** True when the page has nothing verified to show beyond its heading. */
export function isAboutEmpty(content: AboutContent): boolean {
  const { identity, faculty, contact } = content;
  return (
    !identity.description &&
    !identity.vision &&
    !identity.mission &&
    identity.aims.length === 0 &&
    faculty.length === 0 &&
    contact === null
  );
}
