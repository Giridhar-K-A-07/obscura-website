import { expect, test } from "../support/fixtures";
import type { SiteMode } from "../support/site";

/** The six links in `primaryNav` (src/lib/navigation.ts) and where each one goes. */
const PRIMARY = [
  { label: "Legacy", path: "/legacy" },
  { label: "Events", path: "/events" },
  { label: "Achievements", path: "/achievements" },
  { label: "Projects", path: "/projects" },
  { label: "Learn", path: "/learn" },
  { label: "Blog", path: "/blog" },
];

/** Moving around the site the way a visitor does: links, the menu, the keyboard, no JavaScript. */
export function navigationSuite(mode: SiteMode) {
  test.describe(`${mode} build: navigation`, () => {
    test("every primary link is reachable from the home page and lands on its page", async ({
      page,
      isMobile,
    }) => {
      for (const { label, path } of PRIMARY) {
        await page.goto("/");
        // On a phone the links sit inside the menu, which starts closed.
        if (isMobile) await page.locator("summary.menu-toggle").click();
        const link = page
          .getByRole("navigation", { name: "Primary" })
          .getByRole("link", { name: label, exact: true });
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${path}/?$`));
        await expect(page.locator("h1")).toBeVisible();
        if (isMobile) await page.locator("summary.menu-toggle").click();
        await expect(link).toHaveAttribute("aria-current", "page");
      }
    });

    test("the brand link returns to the home page", async ({ page }) => {
      await page.goto("/about/");
      await page.getByRole("link", { name: "OBSCURA, home" }).click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("the hero Explore links all resolve to pages", async ({ page }) => {
      await page.goto("/");
      const explore = page.getByRole("navigation", { name: "Explore OBSCURA" });
      const hrefs = await explore
        .getByRole("link")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
      expect(hrefs.length).toBeGreaterThan(3);
      for (const href of hrefs) {
        const response = await page.request.get(href);
        expect(response.status(), href).toBe(200);
      }
    });

    test("an unknown address shows the 404 page with a way home", async ({ page, watch }) => {
      watch.allow(/status of 404/);
      const response = await page.goto("/no-such-page/");
      expect(response?.status()).toBe(404);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByRole("link", { name: "OBSCURA, home" })).toBeVisible();
    });

    test("the skip link is the first keyboard stop and moves focus to the main region", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "keyboard order is checked at the desktop viewport");
      await page.goto("/about/");
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to main content" });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main$/);
      await expect(page.locator("main#main")).toBeFocused();
    });

    test("keyboard focus is visible as the Tab key moves along the page", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "keyboard order is checked at the desktop viewport");
      await page.goto("/");
      for (let stop = 0; stop < 8; stop++) {
        await page.keyboard.press("Tab");
        const outline = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const style = getComputedStyle(el);
          return {
            tag: `${el.tagName} ${el.textContent?.trim().slice(0, 30)}`,
            style: style.outlineStyle,
            width: parseFloat(style.outlineWidth),
          };
        });
        expect(outline.style, `tab stop ${stop + 1}: ${outline.tag}`).not.toBe("none");
        expect(outline.width, `tab stop ${stop + 1}: ${outline.tag}`).toBeGreaterThan(0);
      }
    });

    test("on a phone the menu opens full screen, locks the page behind it and closes with Escape", async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "the full-screen menu is the phone layout");
      await page.goto("/");
      const toggle = page.locator("summary.menu-toggle");
      const menu = page.locator("[data-menu]");
      const legacy = page.getByRole("link", { name: "Legacy", exact: true });
      await expect(menu).not.toHaveAttribute("open", "");
      await expect(legacy).toBeHidden();

      await toggle.click();
      await expect(menu).toHaveAttribute("open", "");
      await expect(legacy).toBeVisible();
      await expect(page.locator("main")).toHaveJSProperty("inert", true);

      await page.keyboard.press("Escape");
      await expect(menu).not.toHaveAttribute("open", "");
      await expect(toggle).toBeFocused();
      await expect(page.locator("main")).toHaveJSProperty("inert", false);
    });

    test("with JavaScript off the header links are all present and work", async ({
      browser,
      baseURL,
      isMobile,
    }) => {
      test.skip(isMobile, "the no-JavaScript layout is the desktop one");
      const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto("/");
        const nav = page.getByRole("navigation", { name: "Primary" });
        for (const { label } of PRIMARY) {
          await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
        }
        await nav.getByRole("link", { name: "Legacy", exact: true }).click();
        await expect(page).toHaveURL(/\/legacy\/?$/);
      } finally {
        await context.close();
      }
    });
  });
}
