import { getCollection } from "astro:content";
import { selectHomeContent, type HomeContent, type HomeSource } from "./homeContent";

/**
 * Loads the collections the homepage needs and selects what is publishable.
 * Selection is static: it runs at build time, so "upcoming" is as of the last build.
 */
export async function loadHomeContent(now: Date = new Date()): Promise<HomeContent> {
  const [site, events, posts, terms, projects, people, resources] = await Promise.all([
    getCollection("site"),
    getCollection("events"),
    getCollection("posts"),
    getCollection("terms"),
    getCollection("projects"),
    getCollection("people"),
    getCollection("resources"),
  ]);
  // Astro validates every record against its schema when it loads the collection. The loader
  // wrapper in content.config.ts does not carry those types through, so they are restated here.
  const source = {
    site,
    events,
    posts,
    terms,
    projects,
    people,
    resources,
  } as unknown as HomeSource;
  return selectHomeContent(source, now);
}
