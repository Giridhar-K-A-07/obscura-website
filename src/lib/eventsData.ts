import { getCollection } from "astro:content";
import { selectEventsContent, type EventsContent, type EventsSource } from "./eventsContent";

/**
 * Loads events and the articles they may point to, and selects what is publishable (at build
 * time). `entries` maps each event id to its collection entry so a detail page can render the
 * recap (the Markdown body).
 */
export async function loadEventsContent(now: Date = new Date()) {
  const [events, posts] = await Promise.all([getCollection("events"), getCollection("posts")]);
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const source = { events, posts } as unknown as EventsSource;
  const content: EventsContent = selectEventsContent(source, now);
  const entries = new Map(events.map((entry) => [entry.id, entry]));
  return { ...content, entries, now };
}
