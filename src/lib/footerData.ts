import { getCollection } from "astro:content";
import { selectFooter, type FooterContent } from "./footerContent";

/** Loads the verified site record and selects what the footer may show (at build time). */
export async function loadFooterContent(): Promise<FooterContent> {
  // Astro validates each record against its schema on load; the loader wrapper in
  // content.config.ts does not carry those types through, so they are restated here.
  const site = (await getCollection("site")) as unknown as Parameters<typeof selectFooter>[0];
  return selectFooter(site);
}
