import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/*
  The browser tests trust tests/e2e/support/serve.mjs to behave like a static host and to read
  nothing outside the folder it serves. These tests start the real script on a temporary folder
  and talk to it over raw HTTP (so the request path reaches the server exactly as written).
*/
const SCRIPT = "tests/e2e/support/serve.mjs";
const SECRET = "TOP-SECRET-OUTSIDE-THE-FOLDER";

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

/** A raw request: Node's `http` sends the path untouched, unlike `fetch`, which tidies it first. */
function get(port: number, path: string, method = "GET"): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: "127.0.0.1", port, path, method }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        }),
      );
    });
    req.on("error", reject);
    req.end();
  });
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
    probe.on("error", reject);
  });
}

function start(folder: string, port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, folder, String(port)], { stdio: "pipe" });
    const fail = (message: string) => {
      child.kill();
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail("the server did not start in time"), 15_000);
    child.stdout.on("data", (data: Buffer) => {
      if (data.toString().includes("Serving")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on("exit", (code) => fail(`the server exited early (code ${code})`));
  });
}

let work: string;
let site: string;
let bare: string;
let port: number;
let barePort: number;
const servers: ChildProcess[] = [];
let linked = false;

beforeAll(async () => {
  work = realpathSync(mkdtempSync(join(tmpdir(), "obscura-serve-")));
  // work/secret.txt sits beside the served folder; a path that escapes `site` would reach it.
  writeFileSync(join(work, "secret.txt"), SECRET);
  mkdirSync(join(work, "outside"));
  writeFileSync(join(work, "outside", "secret.txt"), SECRET);

  site = join(work, "site");
  const page = (title: string) => `<!doctype html><title>${title}</title>`;
  mkdirSync(join(site, "about"), { recursive: true });
  mkdirSync(join(site, "empty"));
  mkdirSync(join(site, "v1.2"));
  mkdirSync(join(site, "_astro"));
  writeFileSync(join(site, "index.html"), page("home"));
  writeFileSync(join(site, "404.html"), page("missing"));
  writeFileSync(join(site, "about", "index.html"), page("about"));
  writeFileSync(join(site, "v1.2", "index.html"), page("dotted"));
  writeFileSync(join(site, "robots.txt"), "User-agent: *\nDisallow: /\n");
  writeFileSync(join(site, "_astro", "site.css"), "body{}");
  writeFileSync(join(site, "_astro", "site.js"), "export {}");
  writeFileSync(join(site, "mark.svg"), "<svg/>");
  writeFileSync(join(site, "event.ics"), "BEGIN:VCALENDAR");
  writeFileSync(join(site, "UPPER.HTML"), page("upper"));
  writeFileSync(join(site, "data.unknownext"), "x");
  writeFileSync(join(site, "mixed.PNG"), "x");

  // A link inside the folder that points out of it. Windows allows a directory junction without
  // special rights; elsewhere a plain symbolic link works. If neither can be made, those tests skip.
  try {
    symlinkSync(join(work, "outside"), join(site, "linked"), "junction");
    linked = true;
  } catch {
    linked = false;
  }

  bare = join(work, "bare"); // a folder with no 404.html
  mkdirSync(bare);
  writeFileSync(join(bare, "index.html"), page("bare home"));

  [port, barePort] = [await freePort(), await freePort()];
  servers.push(await start(site, port), await start(bare, barePort));
}, 30_000);

afterAll(() => {
  for (const server of servers) server.kill();
  rmSync(work, { recursive: true, force: true });
});

describe("serving files", () => {
  it("serves the home page, a nested page and an explicit index.html", async () => {
    for (const [path, title] of [
      ["/", "home"],
      ["/about/", "about"],
      ["/about/index.html", "about"],
      ["/index.html", "home"],
    ] as const) {
      const reply = await get(port, path);
      expect(reply.status, path).toBe(200);
      expect(reply.body, path).toContain(`<title>${title}</title>`);
    }
  });

  it("sends the right content type for each kind of file, whatever the case of the extension", async () => {
    const expected: Record<string, string> = {
      "/": "text/html; charset=utf-8",
      "/_astro/site.css": "text/css; charset=utf-8",
      "/_astro/site.js": "text/javascript; charset=utf-8",
      "/robots.txt": "text/plain; charset=utf-8",
      "/event.ics": "text/calendar; charset=utf-8",
      "/mark.svg": "image/svg+xml",
      "/mixed.PNG": "image/png",
      "/UPPER.HTML": "text/html; charset=utf-8",
      "/data.unknownext": "application/octet-stream",
    };
    for (const [path, type] of Object.entries(expected)) {
      const reply = await get(port, path);
      expect(reply.status, path).toBe(200);
      expect(reply.headers["content-type"], path).toBe(type);
    }
  });

  it("never lets a response be cached", async () => {
    for (const path of ["/", "/robots.txt", "/missing", "/about"]) {
      expect((await get(port, path)).headers["cache-control"], path).toBe("no-store");
    }
  });

  it("answers HEAD with the headers and no body, and refuses other methods", async () => {
    const head = await get(port, "/about/", "HEAD");
    expect(head.status).toBe(200);
    expect(head.body).toBe("");
    expect(head.headers["content-type"]).toBe("text/html; charset=utf-8");
    for (const method of ["POST", "PUT", "DELETE"]) {
      const reply = await get(port, "/", method);
      expect(reply.status, method).toBe(405);
      expect(reply.headers.allow, method).toBe("GET, HEAD");
    }
  });
});

describe("folders", () => {
  it("redirects a folder address to its trailing slash and keeps the query string", async () => {
    const plain = await get(port, "/about");
    expect(plain.status).toBe(301);
    expect(plain.headers.location).toBe("/about/");
    const withQuery = await get(port, "/about?x=1&y=2");
    expect(withQuery.status).toBe(301);
    expect(withQuery.headers.location).toBe("/about/?x=1&y=2");
  });

  it("treats a folder whose name contains a dot as a folder", async () => {
    const reply = await get(port, "/v1.2");
    expect(reply.status).toBe(301);
    expect(reply.headers.location).toBe("/v1.2/");
    expect((await get(port, "/v1.2/")).body).toContain("<title>dotted</title>");
  });

  it("does not list a folder that has no index.html", async () => {
    for (const path of ["/empty", "/empty/", "/_astro", "/_astro/"]) {
      expect((await get(port, path)).status, path).toBe(404);
    }
  });

  it("does not treat a file as a folder", async () => {
    expect((await get(port, "/robots.txt/")).status).toBe(404);
  });

  it("never redirects to another origin, even for an address that looks like one", async () => {
    for (const path of ["//evil.example/about", "///evil.example/about", "/%2F%2Fevil.example"]) {
      const reply = await get(port, path);
      const location = String(reply.headers.location ?? "");
      expect(location.startsWith("//"), `${path} -> ${location}`).toBe(false);
      expect(location, path).not.toMatch(/^https?:/);
    }
  });
});

describe("a missing page", () => {
  it("answers 404 with the build's own 404 page", async () => {
    for (const path of ["/nope", "/nope/", "/about/nope.html", "/_astro/missing.css"]) {
      const reply = await get(port, path);
      expect(reply.status, path).toBe(404);
      expect(reply.body, path).toContain("<title>missing</title>");
      expect(reply.headers["content-type"], path).toBe("text/html; charset=utf-8");
    }
  });

  it("answers 404 with a plain message when the build has no 404 page", async () => {
    const reply = await get(barePort, "/nope");
    expect(reply.status).toBe(404);
    expect(reply.body).toBe("Not found");
  });

  it("survives a malformed or odd address and keeps answering", async () => {
    for (const path of ["/%E0%A4%A", "/%", "/%00", "/%00.html", "/a%00b", "/%zz"]) {
      const reply = await get(port, path);
      expect(reply.status, path).toBe(404);
    }
    expect((await get(port, "/")).status).toBe(200);
  });
});

describe("staying inside the folder", () => {
  const ESCAPES = [
    "/../secret.txt",
    "/../../secret.txt",
    "/about/../../secret.txt",
    "/%2e%2e/secret.txt",
    "/%2E%2E/secret.txt",
    "/..%2fsecret.txt",
    "/%2e%2e%2fsecret.txt",
    "/..%2F..%2Fsecret.txt",
    "/..%5csecret.txt",
    "/%2e%2e%5csecret.txt",
    "/..\\secret.txt",
    "/%252e%252e/secret.txt",
    "/....//secret.txt",
    "/about/%2e%2e/%2e%2e/secret.txt",
    "/../site-evil/secret.txt",
    "/..;/secret.txt",
  ];

  it("never serves a file from outside the folder, however the path is spelled", async () => {
    for (const path of ESCAPES) {
      const reply = await get(port, path);
      expect(reply.body, path).not.toContain(SECRET);
      expect([301, 404], path).toContain(reply.status);
    }
  });

  it("does not follow a link inside the folder that points outside it", async (context) => {
    if (!linked) return context.skip();
    for (const path of ["/linked/secret.txt", "/linked/", "/linked", "/linked/../secret.txt"]) {
      const reply = await get(port, path);
      expect(reply.body, path).not.toContain(SECRET);
      expect(reply.status, path).toBe(404);
    }
  });

  it("refuses a sibling folder whose name starts with the served folder's name", async () => {
    // "site-evil" shares the "site" prefix: a prefix check without a separator would let it through.
    mkdirSync(join(work, "site-evil"), { recursive: true });
    writeFileSync(join(work, "site-evil", "secret.txt"), SECRET);
    const reply = await get(port, "/../site-evil/secret.txt");
    expect(reply.body).not.toContain(SECRET);
    expect(reply.status).toBe(404);
  });
});

describe("starting up", () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", timeout: 15_000 });

  it("exits with a usage message when the arguments are missing or the port is not valid", () => {
    for (const args of [[], ["dist"], ["dist", "abc"], ["dist", "80"], ["dist", "70000"]]) {
      const result = run(...args);
      expect(result.status, args.join(" ")).toBe(2);
      expect(result.stderr, args.join(" ")).toContain("Usage:");
    }
    // Five Node start-ups in a row: slow on a busy machine, so the default 5 s is not enough.
  }, 60_000);

  it("exits with a hint when the folder has not been built", () => {
    const result = run(join(work, "outside"), "45999");
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("build the site first");
  }, 30_000);
});
