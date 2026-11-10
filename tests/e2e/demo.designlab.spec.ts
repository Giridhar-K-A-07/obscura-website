import { expect, test } from "./support/fixtures";

/**
  The design lab (PR #31): three complete homepage concepts, built only in the demo build. These tests
  check the exploration's own behaviour: that it says which concept is on screen, that the switcher
  works, that every concept keeps the shared navigation, the section order and the single pale accent,
  and that each hero has a pause control and a still frame. Visual quality is judged by eye, from the
  local screenshots; no test claims a concept looks right.
*/
const CONCEPTS = [
  { id: "a", name: "Editorial chamber", hero: ".hero-canvas", background: "rgb(8, 11, 18)" },
  { id: "b", name: "Instrument", hero: ".viewfinder", background: "rgb(14, 15, 18)" },
  { id: "c", name: "Projection", hero: ".projection", background: "rgb(8, 11, 18)" },
] as const;

const SECTIONS = ["top", "next-event", "introduction", "legacy", "recent", "projects", "learning"];
const PRIMARY = ["Legacy", "Events", "Achievements", "Projects", "Learn", "Blog"];
const hydrated = () => !document.querySelector("astro-island[ssr]");

test.describe("design lab: the index", () => {
  test("lists the three concepts and says none is selected", async ({ page }) => {
    await page.goto("/design-lab/");
    await expect(page.locator("h1")).toHaveText("Homepage design exploration");
    for (const { id, name } of CONCEPTS) {
      await expect(
        page
          .getByRole("link", { name: `Concept ${id.toUpperCase()}: ${name}`, exact: true })
          .first(),
      ).toHaveAttribute("href", `/design-lab/${id}/`);
    }
    await expect(page.locator("main")).toContainText("No concept is selected or approved");
    await expect(page.locator("[data-demo-banner]")).toBeVisible();
  });
});

for (const concept of CONCEPTS) {
  const url = `/design-lab/${concept.id}/`;

  test.describe(`design lab: Concept ${concept.id.toUpperCase()} (${concept.name})`, () => {
    test("says which concept this is, and keeps the demo and prototype safeguards", async ({
      page,
    }) => {
      await page.goto(url);
      const note = page.locator("[data-lab-note]");
      await expect(note).toContainText(`Concept ${concept.id.toUpperCase()}: ${concept.name}`);
      await expect(note).toContainText("No concept is selected or approved");
      await expect(page.locator("[data-demo-banner]")).toBeVisible();
      await expect(page.locator("[data-demo-badge]")).toBeVisible();
      await expect(page.getByText("Design prototype.")).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
      await expect(page).toHaveTitle(/^DEMO — Concept /);
    });

    test("is a complete homepage: the same sections in the Master Brief's order, then the footer", async ({
      page,
    }) => {
      await page.goto(url);
      const ids = await page.locator("main section[id]").evaluateAll((els) => els.map((e) => e.id));
      expect(ids).toEqual(SECTIONS);
      await expect(page.locator("main h1")).toHaveText("OBSCURA");
      // Each section has a heading, and the footer keeps its links.
      await expect(page.locator("main section[id] h2")).toHaveCount(SECTIONS.length - 1);
      const footer = page.locator("footer");
      await expect(footer.getByRole("link", { name: "About OBSCURA" })).toHaveAttribute(
        "href",
        "/about",
      );
      await expect(footer.getByRole("link", { name: "Privacy page" })).toHaveAttribute(
        "href",
        "/privacy",
      );
    });

    test("keeps the shared navigation exactly: six links in order, and the logo goes home", async ({
      page,
    }) => {
      await page.goto(url);
      const labels = await page
        .locator('nav[aria-label="Primary"] .links > li:not(.next-event) a')
        .allTextContents();
      expect(labels.map((l) => l.trim())).toEqual(PRIMARY);
      await expect(page.getByRole("link", { name: "OBSCURA, home" })).toHaveAttribute("href", "/");
    });

    test("uses the pale accent A1 for the primary action, and its own foundation colour", async ({
      page,
    }) => {
      await page.goto(url);
      const colours = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const primary = document.querySelector("main .btn-primary") as HTMLElement;
        return {
          accent: root.getPropertyValue("--accent").trim().toLowerCase(),
          background: getComputedStyle(document.documentElement).backgroundColor,
          primary: getComputedStyle(primary).backgroundColor,
        };
      });
      expect(colours.accent).toBe("#bccdff");
      expect(colours.primary).toBe("rgb(188, 205, 255)");
      expect(colours.background).toBe(concept.background);
    });

    test("the Explore list lights the matching point in the hero (the keyboard path)", async ({
      page,
    }) => {
      await page.goto(url);
      await page.waitForFunction(hydrated);
      const link = page.locator('[data-node-link="projects"]');
      // The island attaches its listeners just after hydration, so retry the focus until they react.
      await expect(async () => {
        await link.evaluate((el) => (el as HTMLElement).blur());
        await link.focus();
        await expect(page.locator('[data-node="projects"]')).toHaveAttribute("data-lit", "true", {
          timeout: 500,
        });
      }).toPass();
      await expect(page.locator('[data-node="legacy"]')).toHaveAttribute("data-lit", "false");
      await expect(page.locator(`${concept.hero} svg`)).toHaveAttribute("aria-hidden", "true");
    });

    test.describe("with motion allowed", () => {
      test.use({ reducedMotion: "no-preference" });

      test("the hero can be paused and played again", async ({ page }) => {
        await page.goto(url);
        await page.waitForFunction(hydrated);
        const hero = page.locator(concept.hero);
        await expect(hero).toHaveAttribute("data-motion", "on");
        await page.getByRole("button", { name: "Pause animation" }).click();
        await expect(page.getByRole("button", { name: "Play animation" })).toBeVisible();
        if (concept.id === "c") await expect(hero).toHaveAttribute("data-running", "false");
        await page.getByRole("button", { name: "Play animation" }).click();
        await expect(page.getByRole("button", { name: "Pause animation" })).toBeVisible();
      });
    });

    // The scroll reveal on the legacy entries is CSS only. A minifier once dropped it without any
    // error, so the computed style is checked: it runs without the preference and not with it.
    if (concept.id !== "b") {
      test.describe("the legacy entries reveal as they scroll", () => {
        test.describe("with motion allowed", () => {
          test.use({ reducedMotion: "no-preference" });
          test("through a scroll timeline", async ({ page }) => {
            await page.goto(url);
            const style = await page
              .locator(".stop")
              .first()
              .evaluate((el) => {
                const cs = getComputedStyle(el);
                return { name: cs.animationName, timeline: cs.animationTimeline };
              });
            expect(style.name).toBe(`${concept.id}-reveal`);
            expect(style.timeline).not.toBe("auto");
          });
        });
        test.describe("with reduced motion", () => {
          test.use({ reducedMotion: "reduce" });
          test("not at all", async ({ page }) => {
            await page.goto(url);
            await expect(page.locator(".stop").first()).toHaveCSS("animation-name", "none");
          });
        });
      });
    }

    test.describe("with reduced motion", () => {
      test.use({ reducedMotion: "reduce" });

      test("the hero is a still frame with nothing to pause, and the page does not scroll sideways", async ({
        page,
      }) => {
        await page.goto(url);
        await page.waitForFunction(hydrated);
        await expect(page.locator(concept.hero)).toHaveAttribute("data-motion", "off");
        await expect(page.getByRole("button", { name: /animation/i })).toHaveCount(0);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    });

    test("on a wide screen the content stays inside a controlled width", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "the wide layout is checked at the desktop viewport");
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(url);
      const widths = await page
        .locator(".wrap, .rail-wrap")
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
      expect(widths.length).toBeGreaterThan(3);
      expect(Math.max(...widths)).toBeLessThanOrEqual(1280);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("on a phone the shared menu opens full screen and closes with Escape", async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "the full-screen menu is the phone layout");
      await page.goto(url);
      const toggle = page.locator("summary.menu-toggle");
      await toggle.click();
      await expect(page.getByRole("link", { name: "Legacy", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-menu]")).not.toHaveAttribute("open", "");
      await expect(toggle).toBeFocused();
    });
  });
}

test.describe("design lab: the switcher", () => {
  test("marks the current concept and moves between concepts", async ({ page }) => {
    await page.goto("/design-lab/a/");
    const switcher = page.getByRole("navigation", { name: "Design lab concepts" });
    await expect(switcher.getByRole("link", { name: /^Concept A/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await switcher.getByRole("link", { name: /^Concept B/ }).click();
    await expect(page).toHaveURL(/\/design-lab\/b\/$/);
    await expect(switcher.getByRole("link", { name: /^Concept B/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await switcher.getByRole("link", { name: /^Concept C/ }).click();
    await expect(page).toHaveURL(/\/design-lab\/c\/$/);
    await switcher.getByRole("link", { name: "All concepts" }).click();
    await expect(page).toHaveURL(/\/design-lab\/$/);
  });

  test("never covers a control the keyboard reaches (the page keeps scroll padding)", async ({
    page,
  }) => {
    await page.goto("/design-lab/a/");
    const padding = await page.evaluate(
      () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0,
    );
    const height = await page
      .locator("[data-lab-switch]")
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(padding).toBeGreaterThan(height);
  });
});
