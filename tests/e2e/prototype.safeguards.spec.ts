import { expect, test } from "./support/fixtures";
import { BUILD_DIR, builtRoutes } from "./support/site";

/** Demo content must never reach the normal build: this is what a visitor to dist/ would get. */
const DEMO_TRACE =
  /data-demo-banner|data-demo-badge|obscura-build|X-OBSCURA-BUILD|\[DEMO\]|DEMO — |Test Person|Test Faculty|example\.org/;

test.describe("prototype build: no demo content", () => {
  test("no served page carries a demo marker or any synthetic text", async ({ request }) => {
    const found: string[] = [];
    for (const route of builtRoutes(BUILD_DIR.prototype)) {
      const html = await (await request.get(route)).text();
      const match = DEMO_TRACE.exec(html);
      if (match) found.push(`${route}: ${match[0]}`);
    }
    expect(found).toEqual([]);
  });

  test("the demo fixtures are not served", async ({ request }) => {
    for (const path of [
      "/events/demo-career-meet-past/",
      "/events/demo-career-meet-past.ics",
      "/events/demo-hackathon-upcoming/",
      "/demo/",
    ]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("the design exploration is not part of the normal build", async ({ request }) => {
    for (const path of ["/design-lab/", "/design-lab/a/", "/design-lab/b/", "/design-lab/c/"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
    expect(
      builtRoutes(BUILD_DIR.prototype).filter((route) => route.startsWith("/design-lab")),
    ).toEqual([]);
  });

  test("a visitor sees the prototype notice and no demo banner on the home page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Design prototype.")).toBeVisible();
    await expect(page.locator("[data-demo-banner]")).toHaveCount(0);
    await expect(page.getByText("DEMO", { exact: true })).toHaveCount(0);
  });
});
