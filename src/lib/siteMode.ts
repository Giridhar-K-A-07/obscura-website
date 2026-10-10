/*
  The one switch between the prototype and the launched site.

  While `PROTOTYPE` is true (the current and default state) every page is kept out of search
  indexes (`<meta name="robots" content="noindex, nofollow">`) and the Prototype notice is shown.
  Changing this one value to false removes both from every page, with no page to edit. Nothing
  else changes with it: club content still appears only when it is verified, and a page that must
  never be indexed (the 404 page, the development preview) says so itself with `noindex`.

  Do not change it until the club has approved launching the site (Master Brief §15, C7 and C8).
  Launching also needs real page descriptions, a production URL and the other launch items in the
  Master Brief; this switch is only the place the prototype state lives.
*/
export const PROTOTYPE = true;

export interface SiteMode {
  prototype: boolean;
  /** Whether every page is kept out of search indexes. */
  noindex: boolean;
  /** Whether the Prototype notice is shown. */
  showPrototypeNotice: boolean;
}

/** What each mode means. Both prototype behaviours follow the one flag. */
export const modeFor = (prototype: boolean): SiteMode => ({
  prototype,
  noindex: prototype,
  showPrototypeNotice: prototype,
});

export const siteMode: SiteMode = modeFor(PROTOTYPE);

/** Whether a page is kept out of search indexes: it asks to be, or the whole site is a prototype. */
export const isNoindex = (pageNoindex: boolean, mode: SiteMode = siteMode): boolean =>
  pageNoindex || mode.noindex;
