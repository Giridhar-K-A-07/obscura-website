import type { APIRoute } from "astro";
import { calendarRoutes, buildEventCalendar } from "../../lib/eventsCalendar";
import { loadEventsContent } from "../../lib/eventsData";

/*
  The static calendar file for one event, /events/<id>.ics. A file is generated for exactly the
  events that have a page (the same `all` list as /events/[slug]), so a draft, invalid or
  unpublished event never gets one. The build time is read once and shared as DTSTAMP.
*/
export async function getStaticPaths() {
  const { all, now } = await loadEventsContent();
  return calendarRoutes(all, now);
}

export const GET: APIRoute = ({ props }) =>
  new Response(buildEventCalendar(props.event, props.now), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
