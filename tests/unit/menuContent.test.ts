import { describe, expect, it } from "vitest";
import { eventPath, selectPublicEvents } from "../../src/lib/eventsContent";
import { selectNextEvent } from "../../src/lib/homeContent";
import { selectMenuEvent } from "../../src/lib/menuContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
*/
const NEEDED = "[[NEEDED: something]]";
const NOW = new Date("2030-06-15T12:00:00Z");

const event = (
  id: string,
  start: string,
  extra: Record<string, unknown> = {},
  status = "verified",
  body?: string,
): never =>
  ({
    id,
    data: {
      source: "test",
      status,
      title: `Test event ${id}`,
      type: "Test type",
      start: new Date(start),
      timezone: "Asia/Kolkata",
      venue: "Test venue",
      speakers: [],
      photos: [],
      slides: [],
      repositories: [],
      ...extra,
    },
    body,
  }) as never;

describe("the next event in the mobile menu", () => {
  it("is the soonest upcoming public event, linked to its own page", () => {
    const menu = selectMenuEvent(
      [event("later", "2030-09-01T10:00:00Z"), event("sooner", "2030-07-01T10:00:00Z")],
      NOW,
    );
    expect(menu).toEqual({
      href: "/events/sooner",
      title: "Test event sooner",
      date: "1 July 2030",
      datetime: "2030-07-01T10:00:00.000Z",
    });
  });

  it("links to the canonical event detail route", () => {
    const menu = selectMenuEvent([event("a", "2030-07-01T10:00:00Z")], NOW);
    expect(menu?.href).toBe(eventPath("a"));
    const routes = selectPublicEvents([event("a", "2030-07-01T10:00:00Z")], [], NOW).map((e) =>
      eventPath(e.id),
    );
    expect(routes).toContain(menu?.href);
  });

  it("is the same event as the homepage Next event", () => {
    const events = [
      event("b", "2030-08-01T10:00:00Z"),
      event("a", "2030-07-01T10:00:00Z"),
      event("old", "2029-01-01T10:00:00Z"),
    ];
    expect(selectMenuEvent(events, NOW)?.title).toBe(selectNextEvent(events, NOW)?.title);
    expect(selectMenuEvent(events, NOW)?.href).toBe(
      eventPath(selectNextEvent(events, NOW)?.id ?? ""),
    );
  });

  it("is null when there is no event, so the menu shows no event row", () => {
    expect(selectMenuEvent([], NOW)).toBeNull();
  });

  it("never selects a past event", () => {
    const past = [event("p1", "2030-01-01T10:00:00Z"), event("p2", "2030-06-01T10:00:00Z")];
    expect(selectMenuEvent(past, NOW)).toBeNull();
    const ended = event("done", "2030-06-15T09:00:00Z", { end: new Date("2030-06-15T11:00:00Z") });
    expect(selectMenuEvent([ended], NOW)).toBeNull();
  });

  it("keeps an event in progress, as the rest of the site does", () => {
    const running = event("running", "2030-06-15T09:00:00Z", {
      end: new Date("2030-06-15T18:00:00Z"),
    });
    expect(selectMenuEvent([running], NOW)?.href).toBe("/events/running");
  });

  it("skips events that are not publishable, and picks the next valid one", () => {
    const unpublishable = [
      event("draft", "2030-06-20T10:00:00Z", {}, "draft"),
      event("bad-zone", "2030-06-21T10:00:00Z", { timezone: "Not/AZone" }),
      event("no-zone", "2030-06-22T10:00:00Z", { timezone: NEEDED }),
      event("end-first", "2030-06-23T10:00:00Z", { end: new Date("2030-06-22T10:00:00Z") }),
      event("no-title", "2030-06-24T10:00:00Z", { title: NEEDED }),
      event("no-venue", "2030-06-25T10:00:00Z", { venue: " " }),
      event("script", "2030-06-26T10:00:00Z", {}, "verified", "<script>alert(1)</script>"),
      event("import", "2030-06-27T10:00:00Z", {}, "verified", "import X from './x.astro';"),
      event("bad-link", "2030-06-28T10:00:00Z", {}, "verified", "[x](javascript:alert(1))"),
    ];
    expect(selectMenuEvent(unpublishable, NOW)).toBeNull();
    const withValid = [...unpublishable, event("valid", "2030-12-01T10:00:00Z")];
    expect(selectMenuEvent(withValid, NOW)?.href).toBe("/events/valid");
  });

  it("is deterministic regardless of input order, with the id as the tie-break", () => {
    const a = event("a", "2030-07-01T10:00:00Z");
    const b = event("b", "2030-07-01T10:00:00Z");
    expect(selectMenuEvent([b, a], NOW)).toEqual(selectMenuEvent([a, b], NOW));
    expect(selectMenuEvent([b, a], NOW)?.href).toBe("/events/a");
  });

  it("writes the date in the event's own timezone, and carries no invented field", () => {
    // 20:00 UTC on 30 June is already 1 July in India (UTC+05:30).
    const menu = selectMenuEvent([event("a", "2030-06-30T20:00:00Z")], NOW);
    expect(menu?.date).toBe("1 July 2030");
    expect(Object.keys(menu ?? {}).sort()).toEqual(["date", "datetime", "href", "title"]);
  });
});
