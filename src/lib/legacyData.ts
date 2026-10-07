import { getCollection } from "astro:content";
import { selectLegacy, type LegacyContent, type LegacySource } from "./legacyContent";

/** Loads the collections the Legacy page needs and selects what is publishable (at build time). */
export async function loadLegacyContent(): Promise<LegacyContent> {
  const [terms, teams, people, memberships] = await Promise.all([
    getCollection("terms"),
    getCollection("teams"),
    getCollection("people"),
    getCollection("memberships"),
  ]);
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const source = { terms, teams, people, memberships } as unknown as LegacySource;
  return selectLegacy(source);
}
