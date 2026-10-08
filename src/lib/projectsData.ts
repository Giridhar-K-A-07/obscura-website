import { getCollection } from "astro:content";
import { selectProjects, type ProjectsSource, type PublicProject } from "./projectsContent";

/** Loads the collections the Projects page needs and selects what is publishable (at build time). */
export async function loadProjects(): Promise<PublicProject[]> {
  const [projects, people] = await Promise.all([
    getCollection("projects"),
    getCollection("people"),
  ]);
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const source = { projects, people } as unknown as ProjectsSource;
  return selectProjects(source);
}
