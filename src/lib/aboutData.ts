import { getCollection } from "astro:content";
import { selectAboutContent, type AboutContent, type AboutSource } from "./aboutContent";

/** Loads the collections the About page needs and selects what is publishable (at build time). */
export async function loadAboutContent(): Promise<AboutContent> {
  const [site, people, memberships, teams, terms] = await Promise.all([
    getCollection("site"),
    getCollection("people"),
    getCollection("memberships"),
    getCollection("teams"),
    getCollection("terms"),
  ]);
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const source = { site, people, memberships, teams, terms } as unknown as AboutSource;
  return selectAboutContent(source);
}
