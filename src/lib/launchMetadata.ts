import type { ApprovedAssets } from "./metadata";

/*
  The values the club supplies at launch. Both are empty on purpose: nothing here is a club fact,
  and nothing is invented. Until they are filled in, the site has no favicon, no sharing image,
  and every page keeps the description it already gives.

  - APPROVED_ASSETS: a favicon and a sharing image, only once the club has approved them
    (Master Brief §15, B1). Put the file in public/ and give its site path. A sharing image also
    needs alternative text, and it is used only when `site` is set.
  - DESCRIPTION_OVERRIDES: approved page descriptions by route path, e.g. "/events/": "…". A path
    listed here replaces the description the page passes, so launch copy can be supplied in this
    one file instead of editing every page. A description that still holds a [[NEEDED]] marker is
    ignored.
*/
export const APPROVED_ASSETS: ApprovedAssets = {};

export const DESCRIPTION_OVERRIDES: Readonly<Record<string, string>> = {};
