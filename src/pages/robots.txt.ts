import type { APIRoute } from "astro";
import { robotsTxt } from "../lib/crawlers";

/*
  /robots.txt. While the site is a prototype, or has no production `site`, it disallows everything
  (src/lib/crawlers.ts). It never names a host that is not configured.
*/
export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(site), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
