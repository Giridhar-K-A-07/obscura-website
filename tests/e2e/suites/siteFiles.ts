import { expect, test } from "../support/fixtures";
import type { SiteMode } from "../support/site";

/**
  The crawler-facing files, requested from the running server. In the prototype (and always in a
  demo build) the site asks crawlers to stay away from everything and publishes no sitemap.
*/
export function siteFilesSuite(mode: SiteMode) {
  test.describe(`${mode} build: crawler files`, () => {
    test("robots.txt disallows everything and names no sitemap", async ({ request }) => {
      const response = await request.get("/robots.txt");
      expect(response.status()).toBe(200);
      const lines = (await response.text()).split(/\r?\n/).filter(Boolean);
      expect(lines).toEqual(["User-agent: *", "Disallow: /"]);
    });

    test("no sitemap is published", async ({ request }) => {
      for (const path of ["/sitemap.xml", "/sitemap-index.xml", "/sitemap-0.xml"]) {
        expect((await request.get(path)).status(), path).toBe(404);
      }
    });
  });
}
