import { expect, test } from "./support/fixtures";

/** The demo build (synthetic data, local only) must be unmistakable on every page and in every file. */
test.describe("demo build: labelling and the demo clock", () => {
  test("the banner says the data is synthetic and cannot be dismissed", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator("[data-demo-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("DEMO");
    await expect(banner).toContainText("Synthetic data");
    await expect(banner).toContainText("Nothing on this site is real OBSCURA content");
    await expect(banner.getByRole("button")).toHaveCount(0);
    await expect(banner.getByRole("link")).toHaveCount(0);
  });

  test("the DEMO badge stays on screen at the bottom left while scrolling", async ({ page }) => {
    await page.goto("/events/");
    const badge = page.locator("[data-demo-badge]");
    for (const y of [0, 600, 100000]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await expect(badge).toBeInViewport({ ratio: 1 });
    }
    const box = await badge.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport && box.x < viewport.width / 2 && box.y > viewport.height / 2).toBe(true);
  });

  test("the page title and the build marker say DEMO", async ({ page }) => {
    await page.goto("/learn/");
    await expect(page).toHaveTitle(/^DEMO — /);
    await expect(page.locator('meta[name="obscura-build"]')).toHaveAttribute("content", "demo");
  });

  test("event status follows the fixed demo clock, not the visitor's", async ({ page }) => {
    // Without the demo clock, events dated in the 2090s would all read as upcoming today.
    await page.goto("/events/demo-career-meet-past/");
    await expect(page.locator("[data-status-text]")).toHaveText("Ended");

    await page.goto("/events/demo-hackathon-upcoming/");
    await expect(page.locator("[data-status-text]")).toHaveText("Upcoming");
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toBeVisible();
    await expect(countdown).not.toHaveText("");
  });

  test("every calendar file offered is labelled as demo data", async ({ page }) => {
    await page.goto("/events/demo-hackathon-upcoming/");
    const hrefs = await page
      .locator('a[href$=".ics"]')
      .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.status(), href).toBe(200);
      const text = await response.text();
      expect(text, href).toContain("X-OBSCURA-BUILD:DEMO");
      expect(text, href).toMatch(/SUMMARY:\[DEMO\] /);
      expect(text, href).toMatch(/DESCRIPTION:\[DEMO\] /);
    }
  });
});
