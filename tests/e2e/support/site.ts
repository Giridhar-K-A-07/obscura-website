import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

export type SiteMode = "prototype" | "demo";

/** The built folder each mode is tested against (the same folders `check:build` inspects). */
export const BUILD_DIR: Record<SiteMode, string> = {
  prototype: "dist",
  demo: "dist-demo",
};

/** Every built HTML file under `folder`, as the URL path a visitor would request. */
export function builtRoutes(folder: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".html")) routes.push(toRoute(relative(folder, path)));
    }
  };
  walk(folder);
  return routes.sort();
}

/** `about/index.html` is `/about/`; `404.html` is `/404.html`; `index.html` is `/`. */
export function toRoute(file: string): string {
  const posix = file.split(sep).join("/");
  if (posix === "index.html") return "/";
  if (posix.endsWith("/index.html")) return `/${posix.slice(0, -"index.html".length)}`;
  return `/${posix}`;
}

/** Whether a route is the 404 page, which the server answers with status 404. */
export const isNotFoundPage = (route: string) => route === "/404.html";

/** What a visitor is asked for: the 404 page is requested by an address that does not exist. */
export const requestPath = (route: string) =>
  isNotFoundPage(route) ? "/this-page-does-not-exist/" : route;
