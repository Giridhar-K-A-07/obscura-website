import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { schemas } from "../../src/lib/schemas";

// Obviously synthetic values only. No club facts.
const draftWithMarker = {
  status: "draft",
  source: "test",
  name: "[[NEEDED: name]]",
  order: "[[NEEDED: display order]]",
};

describe("content schemas", () => {
  it("accepts a draft record that still contains [[NEEDED]] markers", () => {
    expect(schemas.teams.safeParse(draftWithMarker).success).toBe(true);
  });

  it("rejects a verified record that still contains a [[NEEDED]] marker", () => {
    const result = schemas.teams.safeParse({ ...draftWithMarker, status: "verified" });
    expect(result.success).toBe(false);
  });

  it("accepts a verified record with real values", () => {
    const result = schemas.teams.safeParse({
      status: "verified",
      source: "test",
      name: "Test Team 1",
      order: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a record with no source", () => {
    const result = schemas.teams.safeParse({ status: "draft", name: "x", order: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects a status other than draft or verified", () => {
    const result = schemas.teams.safeParse({
      status: "published",
      source: "test",
      name: "x",
      order: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (catches typos)", () => {
    const result = schemas.teams.safeParse({
      status: "draft",
      source: "test",
      name: "x",
      order: 1,
      extra: true,
    });
    expect(result.success).toBe(false);
  });

  it("does not let a person be verified without recorded consent", () => {
    const person = { status: "verified", source: "test", name: "Test Person 1" };
    expect(schemas.people.safeParse(person).success).toBe(false);
    expect(schemas.people.safeParse({ ...person, consent: "recorded" }).success).toBe(true);
  });

  it("defaults consent to not-recorded", () => {
    const result = schemas.people.parse({
      status: "draft",
      source: "test",
      name: "[[NEEDED: name]]",
    });
    expect(result.consent).toBe("not-recorded");
  });

  it("accepts a [[NEEDED]] marker where a date or url is expected, in a draft", () => {
    const result = schemas.projects.safeParse({
      status: "draft",
      source: "test",
      name: "[[NEEDED: name]]",
      description: "[[NEEDED: description]]",
      repository: "[[NEEDED: repository url]]",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed url that is not a marker", () => {
    const result = schemas.projects.safeParse({
      status: "draft",
      source: "test",
      name: "x",
      description: "x",
      repository: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts the committed placeholder content/site/site.yaml, and keeps it a draft", () => {
    const data = parse(
      readFileSync(new URL("../../content/site/site.yaml", import.meta.url), "utf8"),
    );
    const result = schemas.site.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.success && result.data.status).toBe("draft");
  });
});
