import { test as base, expect } from "@playwright/test";

/** What a test may expect the browser to report, for example the 404 page's own status line. */
export interface Watch {
  problems: string[];
  /** Ignore problems that match, for a page that is meant to fail in a known way. */
  allow(pattern: RegExp): void;
}

/**
  Every test fails if the page it opened reported a console error, an uncaught exception, a failed
  request, or a request to any other origin. The site has no third-party requests (Master Brief
  §11), so an external request is always a regression, not noise.
*/
export const test = base.extend<{ watch: Watch }>({
  watch: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL as string).origin;
      const problems: string[] = [];
      const allowed: RegExp[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console error: ${message.text()}`);
      });
      page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
      page.on("requestfailed", (request) => {
        const reason = request.failure()?.errorText ?? "unknown";
        // A navigation that interrupts a request in flight is not a failure.
        if (!reason.includes("ERR_ABORTED"))
          problems.push(`request failed: ${request.url()} (${reason})`);
      });
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (/^https?:$/.test(url.protocol) && url.origin !== origin) {
          problems.push(`external request: ${request.url()}`);
        }
      });
      await use({ problems, allow: (pattern) => allowed.push(pattern) });
      const unexpected = problems.filter((p) => !allowed.some((pattern) => pattern.test(p)));
      expect(unexpected, "the browser reported problems").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
