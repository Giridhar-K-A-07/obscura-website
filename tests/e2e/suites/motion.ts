import { expect, test } from "../support/fixtures";
import type { SiteMode } from "../support/site";

/** `prefers-reduced-motion` (Master Brief §7.6, §11.1) on the one animated part: the hero canvas. */
export function motionSuite(mode: SiteMode) {
  const hydrated = () => !document.querySelector("astro-island[ssr]");

  test.describe(`${mode} build: motion`, () => {
    // The preference is set on the project's own page (desktop or Pixel 7), so the console and
    // request watcher in the shared fixtures applies here too.
    test.describe("with reduced motion", () => {
      test.use({ reducedMotion: "reduce" });

      test("the hero canvas stays still and offers no animation to pause", async ({ page }) => {
        await page.goto("/");
        await page.waitForFunction(hydrated);
        const canvas = page.locator(".hero-canvas");
        await expect(canvas).toHaveAttribute("data-motion", "off");
        await expect(page.getByRole("button", { name: /animation/i })).toHaveCount(0);
        await expect(canvas.locator(".drift")).toHaveCSS("animation-name", "none");
        // The global safety net in base.css: no smooth scrolling.
        await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
      });
    });

    test.describe("without that preference", () => {
      test.use({ reducedMotion: "no-preference" });

      test("the canvas drifts and the pause control stops it", async ({ page }) => {
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
      });
    });

    test("the list of links beside the canvas works without the canvas", async ({ page }) => {
      await page.goto("/");
      const explore = page.getByRole("navigation", { name: "Explore OBSCURA" });
      await expect(explore.getByRole("link").first()).toBeVisible();
      await expect(page.locator(".hero-canvas svg")).toHaveAttribute("aria-hidden", "true");
    });
  });
}
