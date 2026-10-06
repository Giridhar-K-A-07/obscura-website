// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

// Static output, deployed to Vercel (docs/decisions/0001-site-stack.md).
// `site` is left unset on purpose:
// [[NEEDED: production site URL — domain and hosting constraints, Master Brief §15 C7]]
export default defineConfig({
  output: "static",
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
