// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { satteri } from "@astrojs/markdown-satteri";
import noBodyH1 from "./scripts/no-body-h1.mjs";
import scrollableTables from "./scripts/scrollable-tables.mjs";

// Static output, deployed to Vercel (docs/decisions/0001-site-stack.md).
// `site` is left unset on purpose:
// [[NEEDED: production site URL — domain and hosting constraints, Master Brief §15 C7]]
export default defineConfig({
  output: "static",
  integrations: [react(), mdx()],
  markdown: {
    // Astro 7's Markdown processor (the default, with two plugins added). Both apply to Markdown and
    // MDX: a second page-level h1 in a body fails the render (scripts/no-body-h1.mjs), and each table
    // is wrapped in a keyboard-focusable, labelled scroll container (scripts/scrollable-tables.mjs).
    processor: satteri({ mdastPlugins: [noBodyH1], hastPlugins: [scrollableTables] }),
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
