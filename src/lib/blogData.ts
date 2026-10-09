import { getCollection } from "astro:content";
import { selectPublicPosts, type BlogSource, type PostEntry } from "./blogContent";
import { selectPublicEvents, type EventsSource } from "./eventsContent";

/**
 * Loads the collections the blog needs and selects the published posts (at build time).
 * `entries` maps each post id to its collection entry so an article page can render the body.
 */
export async function loadBlogContent(now: Date = new Date()) {
  const [posts, people, events, projects] = await Promise.all([
    getCollection("posts"),
    getCollection("people"),
    getCollection("events"),
    getCollection("projects"),
  ]);
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const postEntries = posts as unknown as PostEntry[];
  const publicEvents = selectPublicEvents(
    events as unknown as EventsSource["events"],
    postEntries,
    now,
  );
  const source = {
    posts: postEntries,
    people,
    projects,
    events: publicEvents,
  } as unknown as BlogSource;
  return {
    posts: selectPublicPosts(source, now),
    entries: new Map(posts.map((entry) => [entry.id, entry])),
    now,
  };
}
