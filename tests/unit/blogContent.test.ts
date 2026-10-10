import { describe, expect, it } from "vitest";
import {
  WORDS_PER_MINUTE,
  cleanTags,
  countWords,
  isPublishableBody,
  postPaths,
  publishedPosts,
  readingMinutes,
  selectPublicPosts,
  type BlogSource,
} from "../../src/lib/blogContent";
import { selectPublicEvents } from "../../src/lib/eventsContent";
import { schemas } from "../../src/lib/schemas";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  The helpers must work from whatever the records say.
*/
const NEEDED = "[[NEEDED: something]]";
const NOW = new Date("2030-06-15T12:00:00Z");
const BODY = "Test article body with a few words.";

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const rec = (id: string, data: Record<string, unknown>, body?: string): never =>
  ({ id, data: { source: "test", ...data }, body }) as never;

const post = (
  id: string,
  extra: Record<string, unknown> = {},
  body: string | undefined = BODY,
  status = "verified",
) =>
  rec(
    id,
    {
      status,
      title: `Test post ${id}`,
      date: new Date("2030-03-01"),
      authors: [],
      tags: [],
      ...extra,
    },
    body,
  );

const person = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, { status, name: `Test Person ${id}`, consent: "recorded", ...extra });

const project = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, {
    status,
    name: `Test project ${id}`,
    description: "Test",
    repository: "https://example.com/r",
    datasets: [],
    topics: [],
    contributors: [],
    ...extra,
  });

const empty: BlogSource = { posts: [], people: [], projects: [], events: [] };
const withPosts = (posts: never[], extra: Partial<BlogSource> = {}): BlogSource => ({
  ...empty,
  posts,
  ...extra,
});
const ids = (source: BlogSource) => selectPublicPosts(source, NOW).map((p) => p.id);
const first = (source: BlogSource) => selectPublicPosts(source, NOW)[0];

describe("empty state", () => {
  it("returns nothing, so the index shows only its introduction and no article page exists", () => {
    expect(selectPublicPosts(empty, NOW)).toEqual([]);
    expect(postPaths(selectPublicPosts(empty, NOW))).toEqual([]);
  });

  it("returns nothing when every post is a draft", () => {
    expect(ids(withPosts([post("a", {}, BODY, "draft")]))).toEqual([]);
  });
});

describe("publication rule", () => {
  it("publishes a verified post with a title, a valid past date and a real body", () => {
    expect(ids(withPosts([post("a")]))).toEqual(["a"]);
  });

  it("never publishes a [[NEEDED]] title or date, even on a verified record", () => {
    for (const field of ["title", "date"]) {
      expect(ids(withPosts([post("a", { [field]: NEEDED })]))).toEqual([]);
    }
  });

  it("does not publish an invalid date", () => {
    expect(ids(withPosts([post("a", { date: new Date("x") })]))).toEqual([]);
  });

  it("does not publish without a real body", () => {
    for (const body of ["", "   \n  ", NEEDED, `Some text ${NEEDED} more`]) {
      expect(ids(withPosts([post("a", {}, body)]))).toEqual([]);
    }
  });

  it("does not publish a post that has no body at all (for example a YAML-only record)", () => {
    const noBody = rec("a", {
      status: "verified",
      title: "Test post",
      date: new Date("2030-03-01"),
      authors: [],
      tags: [],
    });
    expect(ids(withPosts([noBody]))).toEqual([]);
  });

  it("does not publish a future-dated post, but does on the day it is due", () => {
    expect(ids(withPosts([post("a", { date: new Date("2030-06-16") })]))).toEqual([]);
    expect(ids(withPosts([post("a", { date: NOW })]))).toEqual(["a"]);
  });

  it("does not publish a post whose body contains an unsafe construct", () => {
    const unsafe = [
      "<script>alert(1)</script>",
      '<a href="x" onclick="steal()">x</a>',
      "[x](javascript:alert(1))",
      "![](https://example.com/a.png)",
    ];
    for (const body of unsafe) expect(isPublishableBody(body)).toBe(false);
    expect(ids(withPosts(unsafe.map((body, i) => post(`p${i}`, {}, body))))).toEqual([]);
  });

  it("does not publish a post whose body has a second h1, and publishes one with ## headings", () => {
    const withH1 = "Intro.\n\n# Another title\n\nText.";
    const setext = "Another title\n=============\n\nText.";
    const html = "<h1>Another title</h1>";
    for (const body of [withH1, setext, html]) expect(isPublishableBody(body)).toBe(false);
    expect(ids(withPosts([post("h1", {}, withH1)]))).toEqual([]);
    const fine = "Intro.\n\n## Section\n\n### Part\n\nText.";
    expect(isPublishableBody(fine)).toBe(true);
    expect(ids(withPosts([post("ok", {}, fine)]))).toEqual(["ok"]);
  });

  it("accepts a body with safe links, an image with alt text, and code that shows unsafe markup", () => {
    const body = [
      "Read [the docs](https://example.com/docs) or [another page](/events).",
      "![A chart of results](https://example.com/chart.png)",
      "```html",
      "<script>alert(1)</script>",
      "```",
    ].join("\n\n");
    expect(isPublishableBody(body)).toBe(true);
  });

  it("orders newest first, with id as the tie-breaker, regardless of input order", () => {
    const posts = [
      post("old", { date: new Date("2029-01-01") }),
      post("b", { date: new Date("2030-05-01") }),
      post("a", { date: new Date("2030-05-01") }),
      post("mid", { date: new Date("2030-02-01") }),
    ];
    const forward = ids(withPosts(posts));
    expect(forward).toEqual(["a", "b", "mid", "old"]);
    expect(ids(withPosts([...posts].reverse()))).toEqual(forward);
  });

  it("the shared rule returns the same posts the blog publishes", () => {
    const posts = [
      post("a"),
      post("b", {}, BODY, "draft"),
      post("c", { date: new Date("2031-01-01") }),
    ];
    expect(publishedPosts(posts as never, NOW).map((p) => p.id)).toEqual(ids(withPosts(posts)));
  });

  it("generates routes only for published posts", () => {
    const posts = [post("ok"), post("draft", {}, BODY, "draft"), post("nobody", {}, "")];
    const paths = postPaths(selectPublicPosts(withPosts(posts), NOW));
    expect(paths.map((p) => p.params.slug)).toEqual(["ok"]);
  });
});

describe("authors (consent)", () => {
  const authorsOf = (authors: unknown, people: never[]) =>
    first(withPosts([post("a", { authors })], { people })).authors;

  it("names an author who is a verified person with consent recorded, in the record's order", () => {
    expect(authorsOf(["b", "a"], [person("a"), person("b")])).toEqual([
      "Test Person b",
      "Test Person a",
    ]);
  });

  it("publishes a post with no authors, with no byline and no generic credit", () => {
    const published = first(withPosts([post("a", { authors: [] })]));
    expect(published.authors).toEqual([]);
    expect(JSON.stringify(published)).not.toMatch(/member|club|anonymous|staff/i);
  });

  it("omits a draft person, a person without consent, a marker name and an unresolved id, but still publishes", () => {
    const people = [
      person("a", {}, "draft"),
      person("b", { consent: "not-recorded" }),
      person("c", { name: NEEDED }),
    ];
    const published = first(
      withPosts([post("p", { authors: ["a", "b", "c", "missing"] })], { people }),
    );
    expect(published.id).toBe("p");
    expect(published.authors).toEqual([]);
  });

  it("never treats a written name as an author", () => {
    expect(authorsOf(["Test Person a", "Some Written Name"], [person("a")])).toEqual([]);
  });

  it("lists a person once even if referenced twice", () => {
    expect(authorsOf(["a", "a"], [person("a")])).toEqual(["Test Person a"]);
  });

  it("exposes only the name: no raw id, photo, LinkedIn link or bio", () => {
    const rich = person("secret-id", {
      name: "Test Author Name",
      photo: "/people/secret.jpg",
      linkedin: "https://www.linkedin.com/in/secret",
      bio: "Secret bio",
    });
    const text = JSON.stringify(
      selectPublicPosts(
        withPosts([post("a", { authors: ["secret-id"] })], { people: [rich] }),
        NOW,
      ),
    );
    for (const leaked of ["secret-id", "secret.jpg", "linkedin", "Secret bio"]) {
      expect(text).not.toContain(leaked);
    }
    expect(text).toContain("Test Author Name");
  });
});

describe("tags", () => {
  it("trims, drops blanks and markers, de-duplicates ignoring case, and keeps the first spelling and order", () => {
    expect(cleanTags([" Python ", "python", "", "  ", NEEDED, "Data Science", "PYTHON"])).toEqual([
      "Python",
      "Data Science",
    ]);
  });

  it("copes with a missing or malformed tag list", () => {
    expect(cleanTags(undefined)).toEqual([]);
    expect(cleanTags("python")).toEqual([]);
    expect(cleanTags([1, null, {}])).toEqual([]);
  });

  it("is applied to published posts", () => {
    expect(first(withPosts([post("a", { tags: ["x", "X", NEEDED] })])).tags).toEqual(["x"]);
  });
});

describe("reading time", () => {
  const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

  it("rounds up and is never less than one minute", () => {
    expect(WORDS_PER_MINUTE).toBe(200);
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes(words(1))).toBe(1);
    expect(readingMinutes(words(200))).toBe(1);
    expect(readingMinutes(words(201))).toBe(2);
    expect(readingMinutes(words(400))).toBe(2);
    expect(readingMinutes(words(401))).toBe(3);
  });

  it("does not count link addresses or HTML tags as words", () => {
    expect(countWords("[two words](https://example.com/a/very/long/path?with=params)")).toBe(2);
    expect(countWords('<span class="x">three small words</span>')).toBe(3);
  });

  it("counts words in any script", () => {
    expect(countWords("naïve café résumé")).toBe(3);
  });

  it("is computed from the body, not read from the record", () => {
    const published = first(withPosts([post("a", { readingMinutes: 99 } as never, words(450))]));
    expect(published.readingMinutes).toBe(3);
  });
});

describe("related event and project", () => {
  const eventsOf = (list: never[]) => selectPublicEvents(list, [], NOW);
  const event = (id: string, status = "verified", extra: Record<string, unknown> = {}) =>
    rec(id, {
      status,
      title: `Test event ${id}`,
      type: "Test type",
      start: new Date("2030-01-01T10:00:00Z"),
      timezone: "Asia/Kolkata",
      venue: "Test venue",
      speakers: [],
      photos: [],
      slides: [],
      repositories: [],
      ...extra,
    });

  it("links a public event", () => {
    const source = withPosts([post("a", { relatedEvent: "e1" })], {
      events: eventsOf([event("e1")]),
    });
    expect(first(source).relatedEvent).toEqual({ id: "e1", title: "Test event e1" });
  });

  it("drops a draft, invalid, missing or marker event reference", () => {
    const drafts = eventsOf([event("e1", "draft")]);
    const invalid = eventsOf([event("e1", "verified", { timezone: "Not/AZone" })]);
    for (const [events, ref] of [
      [drafts, "e1"],
      [invalid, "e1"],
      [eventsOf([event("other")]), "e1"],
      [eventsOf([event("e1")]), NEEDED],
    ] as const) {
      const source = withPosts([post("a", { relatedEvent: ref })], { events: [...events] });
      expect(first(source).relatedEvent).toBeUndefined();
      expect(first(source).id).toBe("a"); // the post itself still publishes
    }
  });

  it("links a published project, as plain data", () => {
    const source = withPosts([post("a", { relatedProject: "pr" })], { projects: [project("pr")] });
    expect(first(source).relatedProject).toEqual({ id: "pr", name: "Test project pr" });
  });

  it("drops a draft, unresolvable, invalid or marker project reference", () => {
    for (const [projects, ref] of [
      [[project("pr", {}, "draft")], "pr"],
      [[project("other")], "pr"],
      [[project("pr", { repository: "http://example.com/r" })], "pr"],
      [[project("pr", { name: NEEDED })], "pr"],
      [[project("pr")], NEEDED],
    ] as const) {
      const source = withPosts([post("a", { relatedProject: ref })], { projects: [...projects] });
      expect(first(source).relatedProject).toBeUndefined();
    }
  });

  it("invents no relationship when none is recorded", () => {
    const published = first(
      withPosts([post("a")], { events: eventsOf([event("e1")]), projects: [project("pr")] }),
    );
    expect(published.relatedEvent).toBeUndefined();
    expect(published.relatedProject).toBeUndefined();
  });
});

describe("posts schema", () => {
  const verified = { status: "verified", source: "test", title: "Test post", date: "2030-03-01" };

  it("accepts a verified post with authors as ids, tags and related ids", () => {
    expect(
      schemas.posts.safeParse({
        ...verified,
        authors: ["a"],
        tags: ["x"],
        relatedEvent: "e",
        relatedProject: "p",
      }).success,
    ).toBe(true);
  });

  it("rejects a [[NEEDED]] marker on a verified post and unknown fields such as a stored reading time", () => {
    expect(schemas.posts.safeParse({ ...verified, title: NEEDED }).success).toBe(false);
    expect(schemas.posts.safeParse({ ...verified, readingTime: 5 }).success).toBe(false);
  });

  it("lets a draft hold markers", () => {
    expect(
      schemas.posts.safeParse({ status: "draft", source: "test", title: NEEDED, date: NEEDED })
        .success,
    ).toBe(true);
  });
});
