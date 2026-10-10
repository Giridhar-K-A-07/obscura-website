import { describe, expect, it } from "vitest";
import { selectFooter } from "../../src/lib/footerContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
*/
const NEEDED = "[[NEEDED: something]]";

const site = (status: string, extra: Record<string, unknown> = {}, id = "site"): never =>
  ({ id, data: { source: "test", status, aims: [], ...extra } }) as never;

describe("footer content", () => {
  it("shows nothing when there is no site record, or only a draft", () => {
    expect(selectFooter([])).toEqual({});
    expect(selectFooter([site("draft", { contactEmail: "test@example.com" })])).toEqual({});
  });

  it("shows a verified contact email and GitHub organisation", () => {
    const footer = selectFooter([
      site("verified", {
        contactEmail: "test@example.com",
        githubOrganisation: "https://github.com/test-org",
      }),
    ]);
    expect(footer).toEqual({
      email: "test@example.com",
      github: { label: "https://github.com/test-org", href: "https://github.com/test-org" },
    });
  });

  it("shows only the values that exist, and nothing for a record that has neither", () => {
    expect(selectFooter([site("verified", { contactEmail: "test@example.com" })])).toEqual({
      email: "test@example.com",
    });
    expect(selectFooter([site("verified", { description: "Test description" })])).toEqual({});
  });

  it("treats a [[NEEDED]] value as missing and never lets a marker through", () => {
    const footer = selectFooter([
      site("verified", { contactEmail: NEEDED, githubOrganisation: NEEDED }),
    ]);
    expect(footer).toEqual({});
    expect(JSON.stringify(footer)).not.toContain("NEEDED");
    expect(
      selectFooter([site("verified", { contactEmail: "  ", githubOrganisation: "" })]),
    ).toEqual({});
  });

  it("uses the same record as the About page: the first verified one", () => {
    const footer = selectFooter([
      site("draft", { contactEmail: "draft@example.com" }, "a"),
      site("verified", { contactEmail: "first@example.com" }, "b"),
      site("verified", { contactEmail: "second@example.com" }, "c"),
    ]);
    expect(footer.email).toBe("first@example.com");
  });

  it("links an email only when it is a plain, well-formed address", () => {
    for (const bad of [
      "not-an-email",
      "a@b",
      "a b@example.com",
      "a@example.com?bcc=x@example.org",
      "a@example.com,b@example.org",
      '"a"@example.com',
      "<a@example.com>",
      "mailto:a@example.com",
      "a@example.com\nBcc: x@example.org",
    ]) {
      expect(selectFooter([site("verified", { contactEmail: bad })]).email).toBeUndefined();
    }
    for (const ok of ["a.b+c@example.com", "x_y@mail.example.co.uk"]) {
      expect(selectFooter([site("verified", { contactEmail: ok })]).email).toBe(ok);
    }
  });

  it("links the GitHub organisation only when it is an https URL, else shows the text", () => {
    const github = (value: string) =>
      selectFooter([site("verified", { githubOrganisation: value })]).github;
    expect(github("https://github.com/test-org")?.href).toBe("https://github.com/test-org");
    for (const text of [
      "test-org",
      "http://github.com/test-org",
      "javascript:alert(1)",
      "//github.com/test-org",
      "https://github.com/a b",
    ]) {
      expect(github(text)).toEqual({ label: text });
    }
  });

  it("has no field for the official LinkedIn page or the copyright holder", () => {
    const footer = selectFooter([
      site("verified", { contactEmail: "test@example.com", linkedin: "https://example.com" }),
    ]);
    expect(Object.keys(footer)).toEqual(["email"]);
  });
});
