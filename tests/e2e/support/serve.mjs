// A static file server for the built site, used only by the browser tests (playwright.config.ts).
//   node tests/e2e/support/serve.mjs <folder> <port>
// It serves what is in the folder and nothing else: no build, no Astro, no environment variables.
// Like the static host the site is deployed to, a folder address without a trailing slash is
// redirected to it, a missing file gets the folder's own 404.html with status 404, and nothing
// outside the folder is ever read, not even through a symbolic link. It listens on the loopback
// address only. Its behaviour is tested in tests/integration/staticServer.test.ts.
import { createServer } from "node:http";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const [folderArg, portArg] = process.argv.slice(2);
const port = Number(portArg);
if (!folderArg || !Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("Usage: node tests/e2e/support/serve.mjs <folder> <port>");
  process.exit(2);
}
const root = resolve(folderArg);
if (!existsSync(join(root, "index.html"))) {
  console.error(`${root} has no index.html: build the site first.`);
  process.exit(2);
}
const realRoot = realpathSync(root);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ics": "text/calendar; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const inside = (path) => path === realRoot || path.startsWith(realRoot + sep);

/** The real path of `path` when it is a file inside the folder, otherwise undefined. */
function fileInside(path) {
  try {
    const real = realpathSync(path);
    return inside(real) && statSync(real).isFile() ? real : undefined;
  } catch {
    return undefined;
  }
}

/**
  What a request path names inside the folder: a file, a folder (served as its index.html), or
  nothing. Every path is resolved through symbolic links before it is trusted, so a link that points
  out of the folder reads as missing.
*/
function resolveTarget(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (decoded.includes("\0")) return undefined;
  const wanted = normalize(join(root, decoded));
  if (wanted !== root && !wanted.startsWith(root + sep)) return undefined; // never leave the folder
  let real;
  try {
    real = realpathSync(wanted);
    if (!inside(real)) return undefined;
  } catch {
    return undefined;
  }
  const stats = statSync(real);
  // A file is not a folder: "/robots.txt/" is a missing page, as on a static host.
  if (stats.isFile()) return pathname.endsWith("/") ? undefined : { file: real, folder: false };
  const index = stats.isDirectory() ? fileInside(join(real, "index.html")) : undefined;
  return index ? { file: index, folder: true } : undefined;
}

const send = (response, status, body, type = "text/plain; charset=utf-8", headers = {}) => {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store", ...headers });
  response.end(body);
};

createServer((request, response) => {
  try {
    const { pathname, search } = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method !== "GET" && request.method !== "HEAD") {
      return send(response, 405, "", undefined, { allow: "GET, HEAD" });
    }

    const target = resolveTarget(pathname);
    if (target?.folder && !pathname.endsWith("/")) {
      response.writeHead(301, { location: `${pathname}/${search}`, "cache-control": "no-store" });
      return response.end();
    }
    if (!target) {
      const notFound = fileInside(join(root, "404.html"));
      return send(response, 404, notFound ? readFileSync(notFound) : "Not found", TYPES[".html"]);
    }
    const type = TYPES[extname(target.file).toLowerCase()] ?? "application/octet-stream";
    send(response, 200, readFileSync(target.file), type);
  } catch (error) {
    send(response, 500, `Server error: ${error instanceof Error ? error.message : error}`);
  }
}).listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
