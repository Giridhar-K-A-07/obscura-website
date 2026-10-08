import type { z } from "astro/zod";
import { publishablePeople } from "./achievementsContent";
import { NEEDED_MARKER } from "./needed";
import type { schemas } from "./schemas";

/*
  Project Showcase & Portfolio content selection (Master Brief P4, §8.4, §13).

  Pure functions over already-loaded collection entries. The selector returns an empty list when
  nothing qualifies, and the page then shows only its introduction. Nothing here supplies names,
  descriptions, links or wording: it only filters, validates and orders verified records.

  Rules applied here:
  - only `verified` records are published; a [[NEEDED: …]] value counts as missing;
  - a project needs a name, a description and a valid repository link; without them it is not
    published at all;
  - the repository, live demo and dataset links must be `https` URLs. An invalid optional link is
    dropped; the project itself still publishes. Repositories are not limited to any one host;
  - contributors are references: each entry is the id of a record in the `people` collection. A
    name is published only when that person is verified with consent recorded (Master Brief
    §13.4). An id that does not resolve is dropped, and a plain name written in its place is never
    published, because the `projects` schema holds contributors as text with no consent field;
  - only the fields this page shows are returned;
  - order is alphabetical by project name, with id as the tie-breaker. The club has not given an
    order, so this one is arbitrary: it does not mean quality, popularity or importance.
*/

type Data<Name extends keyof typeof schemas> = z.infer<(typeof schemas)[Name]>;
export interface Entry<T> {
  id: string;
  data: T;
}

const isVerified = (entry: { data: { status: string } }) => entry.data.status === "verified";

const real = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !NEEDED_MARKER.test(value);

const HTTPS_URL = /^https:\/\/\S+$/;

/** A usable link: a real value that is an `https` URL. */
export const isHttpsUrl = (value: unknown): value is string =>
  real(value) && HTTPS_URL.test(value) && URL.canParse(value);

export interface PublicProject {
  id: string;
  name: string;
  description: string;
  repository: string;
  liveDemo?: string;
  /** Valid dataset links only; may be empty. */
  datasets: string[];
  /** Verified topics only, in the record's order; may be empty. */
  topics: string[];
  /** Names of contributors who resolve to a publishable person, in the record's order. */
  contributors: string[];
}

export interface ProjectsSource {
  projects: Entry<Data<"projects">>[];
  people: Entry<Data<"people">>[];
}

export function selectProjects(source: ProjectsSource): PublicProject[] {
  const names = publishablePeople(source.people);
  const found: PublicProject[] = [];

  for (const entry of source.projects.filter(isVerified)) {
    const { name, description, repository, liveDemo, datasets, topics, contributors } = entry.data;
    if (!real(name) || !real(description) || !isHttpsUrl(repository)) continue;

    const people = [
      ...new Set(
        contributors
          .filter(real)
          .map((id) => names.get(id))
          .filter((person): person is string => person !== undefined),
      ),
    ];

    found.push({
      id: entry.id,
      name,
      description,
      repository,
      liveDemo: isHttpsUrl(liveDemo) ? liveDemo : undefined,
      datasets: [...new Set(datasets.filter(isHttpsUrl))],
      topics: [...new Set(topics.filter(real))],
      contributors: people,
    });
  }

  return found.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
