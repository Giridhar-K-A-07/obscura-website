import type { z } from "astro/zod";
import { selectContact } from "./aboutContent";
import type { schemas } from "./schemas";

/*
  Site footer content (Master Brief §8.2). It reuses the About page's selector, so the footer and
  the About page agree on what is verified: only values from the verified site record, and a
  [[NEEDED: …]] value counts as missing. A value that is missing, or that is not safe to turn
  into a link, is simply not shown, and the footer never prints a placeholder.

  Not shown because the content model has no field for them yet: the official LinkedIn page and
  the copyright holder. Nothing here supplies a value for them.
*/

type SiteEntry = { id: string; data: z.infer<(typeof schemas)["site"]> };

export interface FooterContent {
  /** A contact email, only when it is a plain, well-formed address. */
  email?: string;
  /** The GitHub organisation as written; a link only when it is an https URL. */
  github?: { label: string; href?: string };
}

/** A plain address: no spaces, quotes, angle brackets, or characters that could add mail headers. */
const EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const HTTPS_URL = /^https:\/\/[^\s<>"']+$/;

export function selectFooter(site: SiteEntry[]): FooterContent {
  const contact = selectContact(site);
  const footer: FooterContent = {};
  if (contact?.contactEmail && EMAIL.test(contact.contactEmail))
    footer.email = contact.contactEmail;
  const github = contact?.githubOrganisation;
  if (github) {
    footer.github = HTTPS_URL.test(github) ? { label: github, href: github } : { label: github };
  }
  return footer;
}
