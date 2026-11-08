import { expect, test } from "../support/fixtures";
import type { SiteMode } from "../support/site";

/** `prefers-reduced-motion` (Master Brief §7.6, §11.1) on the one animated part: the hero canvas. */
export function motionSuite(mode: SiteMode) {
  const hydrated = () => !document.querySelector("astro-island[ssr]");

  test.describe(`${mode} build: motion`, () => {
    test("with reduced motion the hero canvas stays still and offers no animation to pause", async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ baseURL, reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        await page.goto("/");
        await page.waitForFunction(hydrated);
        const canvas = page.locator(".hero-canvas");
        await expect(canvas).toHaveAttribute("data-motion", "off");
        await expect(page.getByRole("button", { name: /animation/i })).toHaveCount(0);
        await expect(canvas.locator(".drift")).toHaveCSS("animation-name", "none");
        // The global safety net in base.css: no smooth scrolling.
        await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
      } finally {
        await context.close();
      }
    });

    test("without that preference the canvas drifts and the pause control stops it", async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ baseURL, reducedMotion: "no-preference" });
      try {
        const page = await context.newPage();
        await page.goto("/");
        const canvas = page.locator(".hero-canvas");
        await expect(canvas).toHaveAttribute("data-motion", "on");
        await expect(canvas.locator(".drift")).toHaveCSS("animation-name", "hero-drift");
        await expect(canvas.locator(".drift")).toHaveCSS("animation-play-state", "running");

        await page.getByRole("button", { name: "Pause animation" }).click();
        await expect(page.getByRole("button", { name: "Play animation" })).toBeVisible();
        await expect(canvas).toHaveAttribute("data-running", "false");
        await expect(canvas.locator(".drift")).toHaveCSS("animation-play-state", "paused");

        await page.getByRole("button", { name: "Play animation" }).click();
        await expect(canvas).toHaveAttribute("data-running", "true");
      } finally {
        await context.close();
      }
    });

    test("the list of links beside the canvas works without the canvas", async ({ page }) => {
      await page.goto("/");
      const explore = page.getByRole("navigation", { name: "Explore OBSCURA" });
      await expect(explore.getByRole("link").first()).toBeVisible();
      await expect(page.locator(".hero-canvas svg")).toHaveAttribute("aria-hidden", "true");
    });
  });
}
