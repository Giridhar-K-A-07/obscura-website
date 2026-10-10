// The Markdown/MDX processor that renders every article and event body. astro.config.mjs uses it
// for the site, and scripts/check-body-structure.mjs (run by `npm run check:posts`) uses the very
// same one, so what the check parses is what the site build parses. Two plugins:
//  - noBodyH1: a second h1, or JavaScript in an MDX body, fails the render (no-body-h1.mjs);
//  - scrollableTables: each Markdown table gets a keyboard-focusable, labelled wrapper
//    (scrollable-tables.mjs).
import { satteri } from "@astrojs/markdown-satteri";
import noBodyH1 from "./no-body-h1.mjs";
import scrollableTables from "./scrollable-tables.mjs";

export const bodyProcessor = () =>
  satteri({ mdastPlugins: [noBodyH1], hastPlugins: [scrollableTables] });
