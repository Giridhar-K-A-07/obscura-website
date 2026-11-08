// A static file server for the built site, used only by the browser tests (playwright.config.ts).
//   node tests/e2e/support/serve.mjs <folder> <port>
// It serves what is in the folder and nothing else: no build, no Astro, no environment variables.
// Like the static host the site is deployed to, a folder address without a trailing slash is
// redirected to it, a missing file gets the folder's own 404.html with status 404, and nothing
// outside the folder is ever read. It listens on the loopback address only.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
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

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ics": "text/calendar; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** The file a request path names inside the folder, or undefined when it names none. */
function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const file = normalize(join(root, decoded));
  if (file !== root && !file.startsWith(root + sep)) return undefined; // never leave the folder
  if (!existsSync(file)) return undefined;
  const stats = statSync(file);
  if (stats.isFile()) return file;
  const index = join(file, "index.html");
  return existsSync(index) ? index : undefined;
}

const send = (response, status, body, type = "text/plain; charset=utf-8") => {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  response.end(body);
};

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "GET" && request.method !== "HEAD") return send(response, 405, "");

  const file = resolveFile(pathname);
  const isFolder = file?.endsWith(`${sep}index.html`) && !extname(pathname);
  if (file && isFolder && !pathname.endsWith("/")) {
    response.writeHead(301, { location: `${pathname}/` });
    return response.end();
  }
  if (!file) {
    const notFound = join(root, "404.html");
    return send(
      response,
      404,
      existsSync(notFound) ? readFileSync(notFound) : "Not found",
      TYPES[".html"],
    );
  }
  send(response, 200, readFileSync(file), TYPES[extname(file)] ?? "application/octet-stream");
}).listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
