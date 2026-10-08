import { getCollection } from "astro:content";
import { selectLearnContent, type LearnContent, type LearnSource } from "./learnContent";

/** Loads the collections the Learning Hub needs and selects what is publishable (at build time). */
export async function loadLearnContent(): Promise<LearnContent> {
  const [resources, people] = await Promise.all([
    getCollection("resources"),
    getCollection("people"),
  ]);
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const source = { resources, people } as unknown as LearnSource;
  return selectLearnContent(source);
}
