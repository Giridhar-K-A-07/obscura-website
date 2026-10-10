import { describe, expect, it } from "vitest";
import { absoluteUrl, assetUrl, pagePath, parseSiteUrl } from "../../src/lib/siteUrl";

// A fixture host that only exists in these tests. It is not a club or production address.
const SITE = "https://metadata-test.example.org";

describe("parseSiteUrl accepts only a usable production URL", () => {
  it("is undefined when site is not set", () => {
    for (const unset of [undefined, null, ""]) expect(parseSiteUrl(unset)).toBeUndefined();
  });

  it("accepts an https public host, as a string or a URL, ending the path in a slash", () => {
    expect(parseSiteUrl(SITE)?.href).toBe(`${SITE}/`);
    expect(parseSiteUrl(new URL(SITE))?.href).toBe(`${SITE}/`);
    expect(parseSiteUrl(`${SITE}/club`)?.href).toBe(`${SITE}/club/`);
  });

  it("drops a query and a fragment", () => {
    expect(parseSiteUrl(`${SITE}/?a=1#x`)?.href).toBe(`${SITE}/`);
  });

  it("rejects everything that is not a real public https address", () => {
    for (const bad of [
      "http://metadata-test.example.org",
      "ftp://metadata-test.example.org",
      "javascript:alert(1)",
      "not a url",
      "https://localhost",
      "https://localhost:4321",
      "https://app.localhost",
      "https://127.0.0.1",
      "https://192.168.0.10",
      "https://[::1]",
      "https://intranet",
      "https://club.test",
      "https://club.invalid",
      "https://club.example",
      "https://club.local",
      "https://user:pass@metadata-test.example.org",
    ]) {
      expect(parseSiteUrl(bad), bad).toBeUndefined();
    }
  });
});

describe("pagePath normalizes a route to the form the build emits", () => {
  it("keeps the root and ends every page path with a slash", () => {
    expect(pagePath("/")).toBe("/");
    expect(pagePath("/events")).toBe("/events/");
    expect(pagePath("/events/")).toBe("/events/");
    expect(pagePath("/blog/intro-to-python-3.12")).toBe("/blog/intro-to-python-3.12/");
  });

  it("refuses anything that is not a plain local path", () => {
    for (const bad of [
      undefined,
      "",
      "events",
      "//evil.example/",
      "/../etc/",
      "/a/./b/",
      "/a/../b/",
      "/a b/",
      "/a?x=1",
      "/a#x",
      "/a\\b/",
      "/a%2Fb/",
      "/a%5cb/",
      "https://evil.example/",
      "/<script>/",
    ]) {
      expect(pagePath(bad), String(bad)).toBeUndefined();
    }
  });
});

describe("absoluteUrl", () => {
  it("is undefined without a usable site, so nothing guesses a host", () => {
    expect(absoluteUrl(undefined, "/events/")).toBeUndefined();
    expect(absoluteUrl("https://localhost:4321", "/events/")).toBeUndefined();
  });

  it("builds the canonical form of a page", () => {
    expect(absoluteUrl(SITE, "/")).toBe(`${SITE}/`);
    expect(absoluteUrl(SITE, "/events")).toBe(`${SITE}/events/`);
    expect(absoluteUrl(SITE, "/events/some-event/")).toBe(`${SITE}/events/some-event/`);
  });

  it("keeps a base path of the site", () => {
    expect(absoluteUrl(`${SITE}/club/`, "/events/")).toBe(`${SITE}/club/events/`);
  });

  it("cannot be pointed at another host or scheme", () => {
    expect(absoluteUrl(SITE, "//evil.example/")).toBeUndefined();
    expect(absoluteUrl(SITE, "/a:b/")).toBe(`${SITE}/a:b/`); // a colon is a path, not a scheme
    expect(absoluteUrl(SITE, "/..//evil.example/")).toBeUndefined();
  });
});

describe("assetUrl", () => {
  it("is undefined without a usable site, and never adds a trailing slash to a file", () => {
    expect(assetUrl(undefined, "/brand/og.png")).toBeUndefined();
    expect(assetUrl(SITE, "/brand/og.png")).toBe(`${SITE}/brand/og.png`);
  });

  it("refuses a directory, a protocol-relative path and a traversal", () => {
    for (const bad of [
      "/brand/",
      "//evil.example/a.png",
      "/a/../b.png",
      "brand/og.png",
      "/a b.png",
    ]) {
      expect(assetUrl(SITE, bad), bad).toBeUndefined();
    }
  });
});
