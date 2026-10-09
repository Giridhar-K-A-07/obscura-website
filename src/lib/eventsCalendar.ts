import { classify, type PublicEvent } from "./eventsContent";

/*
  Per-event calendar file (iCalendar, RFC 5545), built at build time from a PublicEvent, so it
  can only exist for an event the Events pages publish. It is a snapshot: it is not a live feed.

  What it contains, and nothing else: a stable UID, the build time as DTSTAMP, the start (and the
  end, only when it is later than the start) as UTC instants, the title, the venue and, when the
  record has one, the description. There is no VTIMEZONE (UTC needs none), no URL (the production
  site URL is not established, Master Brief §15 C7), and no organiser, geo, duration, speaker,
  photo, slide, repository or recap. The event's recorded timezone still controls how the page
  writes the time; the instants are the same whatever that zone is.

  Text is escaped for iCalendar, control characters are removed, lines end with CRLF and are
  folded at 75 octets without splitting a character, so a title, venue or description can never
  add a property of its own.
*/

const CRLF = "\r\n";
const MAX_OCTETS = 75;
const encoder = new TextEncoder();
const octets = (text: string) => encoder.encode(text).length;

/** Every kind of line break (CRLF, CR, NEL, LS, PS) is written as one escaped newline. */
const LINE_BREAKS = new RegExp(`\\r\\n|[\\r\\x85${String.fromCharCode(0x2028, 0x2029)}]`, "g");
/** Control characters other than tab and newline are dropped. */
// eslint-disable-next-line no-control-regex
const CONTROLS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Escapes a TEXT value: backslash, semicolon, comma and newline. */
export function escapeText(value: string): string {
  return value
    .replace(LINE_BREAKS, "\n")
    .replace(CONTROLS, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Folds one content line at 75 octets (RFC 5545 §3.1): the rest goes on following lines that
 * start with a space. Splits only between characters, and never inside an escape sequence.
 */
export function foldLine(line: string): string {
  if (octets(line) <= MAX_OCTETS) return line;
  const units = line.match(/\\[\s\S]|[\s\S]/gu) ?? [];
  const rows: string[] = [];
  let current = "";
  let size = 0;
  for (const unit of units) {
    const width = octets(unit);
    // Continuation lines spend one octet on the leading space.
    const limit = rows.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (size + width > limit) {
      rows.push(current);
      current = "";
      size = 0;
    }
    current += unit;
    size += width;
  }
  rows.push(current);
  return rows.join(`${CRLF} `);
}

/** A UTC instant as an iCalendar DATE-TIME, for example 20300701T100000Z. */
export function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

/** The calendar entry's UID. It comes from the record id alone and must never change once published. */
export const calendarUid = (id: string) => `obscura-event-${id}`;

/**
 * The .ics text for one public event. `now` is the DTSTAMP and is injected, so the rest of the
 * output is deterministic. `DTEND` appears only when the end is later than the start.
 */
export function buildEventCalendar(event: PublicEvent, now: Date): string {
  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OBSCURA//OBSCURA//EN",
    "BEGIN:VEVENT",
    `UID:${escapeText(calendarUid(event.id))}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(event.start)}`,
  ];
  if (event.end && event.end.getTime() > event.start.getTime()) {
    rows.push(`DTEND:${utcStamp(event.end)}`);
  }
  rows.push(`SUMMARY:${escapeText(event.title)}`);
  rows.push(`LOCATION:${escapeText(event.venue)}`);
  if (event.description) rows.push(`DESCRIPTION:${escapeText(event.description)}`);
  rows.push("END:VEVENT", "END:VCALENDAR");
  return rows.map(foldLine).join(CRLF) + CRLF;
}

/**
 * The static routes for /events/<id>.ics: one per public event, from the same list the event
 * pages are generated from, so the two sets cannot differ.
 */
export function calendarRoutes(events: PublicEvent[], now: Date) {
  return events.map((event) => ({ params: { slug: event.id }, props: { event, now } }));
}

/** The event page links to the calendar file only while the event is upcoming (as of the build). */
export const offersCalendar = (event: PublicEvent, now: Date): boolean =>
  classify(event, now) === "upcoming";
