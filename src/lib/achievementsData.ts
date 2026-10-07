import { getCollection } from "astro:content";
import {
  selectAchievementsContent,
  type AchievementsContent,
  type AchievementsSource,
} from "./achievementsContent";

/** Loads the collections the Achievements page needs and selects what is publishable (at build time). */
export async function loadAchievementsContent(): Promise<AchievementsContent> {
  const [achievements, spotlights, people, projects] = await Promise.all([
    getCollection("achievements"),
    getCollection("spotlights"),
    getCollection("people"),
    getCollection("projects"),
  ]);
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const source = { achievements, spotlights, people, projects } as unknown as AchievementsSource;
  return selectAchievementsContent(source);
}
