import type { z } from "astro/zod";
import { describeWhen, eventPath } from "./eventsContent";
import { selectNextEvent } from "./homeContent";
import type { schemas } from "./schemas";

/*
  The next event in the mobile menu (Master Brief §8.2: "plus the next upcoming event if there is
  one"). It is the homepage's Next event: the soonest event in the canonical public set that has
  not ended (`selectNextEvent`, which uses `selectPublicEvents`), so an unverified, invalid or
  unsafe event can never appear here, and an event shown always has a page. Nothing is written
  here: the title and date come from the record, and with no such event the item is null and the
  menu shows no event row. As elsewhere, "upcoming" is as of the last build.
*/

type EventEntry = { id: string; data: z.infer<(typeof schemas)["events"]> };

export interface MenuEvent {
  /** The event's own page. */
  href: string;
  title: string;
  /** The start date, written in the event's recorded timezone, for example "1 July 2030". */
  date: string;
  /** The start instant, for the <time> element. */
  datetime: string;
}

export function selectMenuEvent(events: EventEntry[], now: Date): MenuEvent | null {
  const next = selectNextEvent(events, now);
  if (!next) return null;
  return {
    href: eventPath(next.id),
    title: next.title,
    date: describeWhen(next).startDate,
    datetime: next.start.toISOString(),
  };
}
