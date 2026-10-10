import { getCollection } from "astro:content";
import { selectMenuEvent, type MenuEvent } from "./menuContent";

/** Loads the events and selects the one the mobile menu shows (at build time). */
export async function loadMenuEvent(now: Date = new Date()): Promise<MenuEvent | null> {
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const events = (await getCollection("events")) as unknown as Parameters<
    typeof selectMenuEvent
  >[0];
  return selectMenuEvent(events, now);
}
