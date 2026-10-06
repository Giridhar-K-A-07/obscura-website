import { readdirSync } from "node:fs";
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { schemas } from "./lib/schemas";

// Content lives in /content (not in src/) as plain YAML, Markdown and MDX files.
// Collections are empty until verified content exists; see content/README.md.
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
    loader: quietGlob({ pattern, base: `./content/${directory}` }),
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
  posts: collection("posts", "posts", documentFiles),
};
