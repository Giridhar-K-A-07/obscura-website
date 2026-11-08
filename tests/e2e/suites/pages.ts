import { expect, test } from "../support/fixtures";
import {
  BUILD_DIR,
  builtRoutes,
  isNotFoundPage,
  requestPath,
  type SiteMode,
} from "../support/site";

/**
  Every built page, opened in a real browser: it loads with the right status, has the document
  structure and metadata the build guard checks in the HTML (here read from the rendered DOM), does
  not scroll sideways, and carries (demo) or lacks (prototype) the demo markers.
*/
export function pageSuite(mode: SiteMode) {
  const routes = builtRoutes(BUILD_DIR[mode]);

  test.describe(`${mode} build: every built page`, () => {
    test("the build has pages to test", () => {
      expect(routes.length).toBeGreaterThanOrEqual(mode === "demo" ? 40 : 10);
      expect(routes).toContain("/");
      expect(routes).toContain("/404.html");
    });

    for (const route of routes) {
      test(`${route} renders and is well formed`, async ({ page, watch }) => {
        const response = await page.goto(requestPath(route));
        const notFound = isNotFoundPage(route);
        if (notFound) watch.allow(/status of 404/);
        expect(response?.status()).toBe(notFound ? 404 : 200);

        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("h1")).not.toHaveText("");
        const title = await page.title();
        expect(title.trim()).not.toBe("");
        expect(title.startsWith("DEMO — ")).toBe(mode === "demo");

        // The prototype policy: every page stays out of search indexes.
        await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
          "content",
          "noindex, nofollow",
        );
        // No production URL exists yet, so no page may claim a canonical.
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

        // Nothing scrolls sideways at this viewport.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, "horizontal overflow in pixels").toBeLessThanOrEqual(0);

        // The demo markers: all of them on a demo build, none of them on a normal build.
        const demo = mode === "demo";
        await expect(page.locator("[data-demo-banner]")).toHaveCount(demo ? 1 : 0);
        await expect(page.locator("[data-demo-badge]")).toHaveCount(demo ? 1 : 0);
        await expect(page.locator('meta[name="obscura-build"]')).toHaveCount(demo ? 1 : 0);
      });
    }
  });
}
