// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { bodyProcessor } from "./scripts/body-processor.mjs";

// Static output, deployed to Vercel (docs/decisions/0001-site-stack.md).
// `site` is left unset on purpose:
// [[NEEDED: production site URL — domain and hosting constraints, Master Brief §15 C7]]
export default defineConfig({
  output: "static",
  integrations: [react(), mdx()],
  markdown: {
    // The one Markdown/MDX processor for every article and event body (Astro 7's Sätteri, with two
    // plugins added; see scripts/body-processor.mjs). A second page-level h1, or JavaScript in an MDX
    // body, fails the render, and each table is wrapped in a keyboard-focusable, labelled scroll
    // region. `npm run check:posts` compiles every body with this same processor.
    processor: bodyProcessor(),
    // Code highlighting runs at build time (Shiki, built into Astro): no client JavaScript. The
    // css-variables theme takes its colours from the site's design tokens (see PostBody.astro),
    // so no new colours are introduced. Long lines scroll inside the block, which is made
    // keyboard-focusable so it can be scrolled without a mouse.
    shikiConfig: {
      theme: "css-variables",
      wrap: false,
      transformers: [
        {
          pre(node) {
            node.properties.tabindex = 0;
          },
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
