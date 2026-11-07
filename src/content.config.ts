import { readdirSync } from "node:fs";
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { DEMO } from "./lib/demoMode";
import { schemas } from "./lib/schemas";

// Content lives in /content (not in src/) as plain YAML, Markdown and MDX files.
// Collections are empty until verified content exists; see content/README.md.
// A demo build (OBSCURA_DEMO=1, see src/lib/demoMode.ts) reads the synthetic fixtures instead.
const CONTENT_ROOT = DEMO ? "./fixtures/demo" : "./content";
const dataFiles = "**/*.{yaml,yml}";
const documentFiles = "**/*.{yaml,yml,md,mdx}";

const hasFiles = (base: string, pattern: string) => {
  const extensions = /\{([^}]+)\}/.exec(pattern)?.[1].split(",") ?? [];
  try {
    return readdirSync(base, { recursive: true, encoding: "utf8" }).some((file) =>
      extensions.some((extension) => file.endsWith(`.${extension}`)),
    );
  } catch {
    return false;
  }
};

// Same as Astro's glob loader, but an empty folder is a normal state here
// (nothing is verified yet), so it loads nothing instead of logging a warning.
const quietGlob = (options: Parameters<typeof glob>[0]) => {
  const loader = glob(options);
  return {
    ...loader,
    load: async (context: Parameters<typeof loader.load>[0]) => {
      // The content store is cached between runs. Never let entries from one mode survive into
      // the other: a demo entry must not appear in a normal build, or the reverse.
      const mode = DEMO ? "demo" : "content";
      if (context.meta.get("obscura-content-root") !== mode) {
        context.store.clear();
        context.meta.set("obscura-content-root", mode);
      }
      if (!hasFiles(String(options.base), String(options.pattern))) {
        context.store.clear();
        return;
      }
      await loader.load(context);
    },
  };
};

const collection = <Name extends keyof typeof schemas>(
  name: Name,
  directory: string,
  pattern: string = dataFiles,
) =>
  defineCollection({
    loader: quietGlob({ pattern, base: `${CONTENT_ROOT}/${directory}` }),
    schema: schemas[name],
  });

export const collections = {
  site: collection("site", "site"),
  terms: collection("terms", "terms"),
  teams: collection("teams", "teams"),
  people: collection("people", "people"),
  memberships: collection("memberships", "memberships"),
  events: collection("events", "events", documentFiles),
  achievements: collection("achievements", "achievements"),
  spotlights: collection("spotlights", "spotlights"),
  projects: collection("projects", "projects"),
  resources: collection("resources", "resources", documentFiles),
  // Posts are Markdown or MDX only: an article needs a body, and a YAML file has none.
  posts: collection("posts", "posts", "**/*.{md,mdx}"),
};
