/**
 * Placeholder rule (Master Brief §13.2): unknown information is written as
 * `[[NEEDED: description]]`, never invented. A record that still contains a
 * marker may be a draft, but it must never be published.
 */
export const NEEDED_MARKER = /\[\[NEEDED:[^\]]*\]\]/;

/** True when the whole string is a single marker, with nothing else around it. */
export const NEEDED_ONLY = /^\s*\[\[NEEDED:[^\]]*\]\]\s*$/;

/** Returns the path of every string inside `value` that contains a marker. */
export function findNeeded(value: unknown, path: (string | number)[] = []): (string | number)[][] {
  if (typeof value === "string") {
    return NEEDED_MARKER.test(value) ? [path] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findNeeded(item, [...path, index]));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => findNeeded(item, [...path, key]));
  }
  return [];
}
