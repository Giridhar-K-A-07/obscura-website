import AxeBuilder from "@axe-core/playwright";
import type { Result } from "axe-core";
import { expect, test } from "../support/fixtures";
import {
  BUILD_DIR,
  builtRoutes,
  isNotFoundPage,
  requestPath,
  type SiteMode,
} from "../support/site";

/** The standard the site targets (Master Brief §11.1): WCAG 2.2 AA, which includes A and 2.1. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** One readable block per violation: the rule, how serious, where it is and how to fix it. */
export function formatViolations(route: string, violations: Result[]): string {
  if (violations.length === 0) return `${route}: no accessibility violations`;
  const lines = [`${route}: ${violations.length} accessibility violation(s)`];
  for (const v of violations) {
    lines.push(`  [${v.impact ?? "unknown"}] ${v.id}: ${v.help}`, `    ${v.helpUrl}`);
    for (const node of v.nodes.slice(0, 5)) {
      lines.push(
        `    at ${node.target.join(" ")}`,
        `      ${node.failureSummary?.split("\n").join(" ")}`,
      );
    }
    if (v.nodes.length > 5) lines.push(`    ... and ${v.nodes.length - 5} more element(s)`);
  }
  return lines.join("\n");
}

/** axe-core on every built page, in the project's own viewport (desktop and phone). */
export function accessibilitySuite(mode: SiteMode) {
  test.describe(`${mode} build: accessibility (axe, WCAG 2.2 AA)`, () => {
    for (const route of builtRoutes(BUILD_DIR[mode])) {
      test(`${route} has no WCAG A/AA violations`, async ({ page, watch }, testInfo) => {
        if (isNotFoundPage(route)) watch.allow(/status of 404/);
        await page.goto(requestPath(route));
        // Let the hero island hydrate first, so the scanned DOM is the one a visitor gets.
        await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));

        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        if (violations.length > 0) {
          await testInfo.attach("axe-violations.json", {
            body: JSON.stringify(violations, null, 2),
            contentType: "application/json",
          });
        }
        expect(violations.length, formatViolations(route, violations)).toBe(0);
      });
    }
  });
}
