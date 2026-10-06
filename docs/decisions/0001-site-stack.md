# 0001 — Website stack

| | |
|---|---|
| Status | Accepted (approved in review, 2026-10-06) |
| Date | 2026-10-06 |
| Decides | Framework, language, styling, content format and validation, hosting target, Node version |
| Source requirements | `OBSCURA_MASTER_BRIEF.md` (§3, §7.5, §9, §11, §12, §13) |
| Supersedes | Nothing |

This record settles the "Site framework", "Content source" and (target only) "Hosting" decisions listed in Master Brief §12.3. Other decisions in that table stay open (see [Deferred decisions](#deferred-decisions)).

## 1. Context

### 1.1 What the website must do

The Master Brief (§3) restates the club's proposal as seven areas and 46 atomic requirements:

- **The Legacy Line** — an interactive, scroll-based timeline batch by batch, ExCom Profiles, and a Founders' Badge.
- **Events & Initiatives Archive** — past events with photos, recaps, slides and repositories; upcoming events with a calendar, countdown timers and RSVP forms.
- **Hall of Achievements & Wall of Fame** — competition winners, leaderboards and member spotlights.
- **Project Showcase & Portfolio** — GitHub-linked project cards.
- **Resource & Learning Hub** — four study roadmaps, plus cheat sheets, code templates and datasets.
- **Tech Blog & Insights** — student-written articles.
- **Interactive Data Canvas** — a dark, animated, interactive hero (a data visualisation or an animated network graph).

### 1.2 Constraints from the brief

| Driver | Source | What it asks for |
|---|---|---|
| JavaScript budget | §11.3 | At most 100 KB compressed JavaScript on first load, excluding the hero. The hero's text renders first and the canvas never delays main content. |
| Performance | §11.3 | LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms on a mid-range phone over 4G. |
| SEO | §11.4 | Per-page titles and descriptions, Open Graph images, `Event` and `Organization` structured data using confirmed facts only. |
| Accessibility | §11.1 | WCAG 2.2 AA, keyboard access, semantic HTML, `prefers-reduced-motion`, a pause control on the hero, and a list-of-links alternative to the canvas. |
| Content shape | §12.1 | Mostly content (archives, profiles, roadmaps, articles), which favours pre-rendered pages. A few dynamic parts: RSVP, the live calendar, the hero canvas, optionally live GitHub data. |
| Content rules | §9, §13 | Every record carries `source` and `status` (`draft` or `verified`). Only `verified` records are published. Missing facts are marked `[[NEEDED: …]]`. Production must not ship a marker. |
| Handover | §12.1, §12.2 | A new ExCom inherits the site each year. It must be easy to hand over, cheap or free to host, and updatable by non-developers. This is the most important constraint. |
| Interactive parts | §7.5, §7.6, §8.4 | Hero canvas, timeline reveal, countdown timers, photo lightbox, RSVP form. |

### 1.3 Repository facts at the time of this decision

- The repository is public, so no unconsented personal data can be committed (§13.4).
- It contained only `README.md`, `.gitignore` and the brief. No source, tooling or CI existed.

## 2. Options considered

| Option | Summary | Fits the brief | Main cost |
|---|---|---|---|
| **A. Astro + React islands** | Pre-rendered pages. React components load only where an interactive part needs them. | Static output on Vercel. Content collections with schema validation. Interactive parts are React islands. | Smaller community than Next.js. |
| **B. Next.js App Router** | React framework with server and client components, pre-rendered where possible. | Largest ecosystem. Good SEO and accessibility support. | A larger JavaScript baseline. More framework to hand over. |
| **C. Vite React SPA** | Client-rendered single-page app. | Simple tooling. | Client rendering is a poor fit for SEO and for the JavaScript budget. |
| **D. Hand-built static site** | Plain HTML/CSS, or a minimal static generator. | Lightest output. | No component model for the hero, timeline, cards and lightbox. Hard for rotating maintainers to extend. |

Options C and D were rejected on first principles. Options A and B were measured (next section).

## 3. Measured evidence

These measurements come from throwaway spikes built on 2026-10-06 in a scratchpad **outside this repository**. Nothing from them is committed. Versions were taken from the npm registry on the same day.

### 3.1 JavaScript weight

| Spike | Versions | JavaScript for a modern browser |
|---|---|---|
| Next.js, one static page with no site code | Next.js 16.3.8, React 19.3.0 | **≈ 130 KB gzip / 111 KB brotli** (130.4 KB gzip, 111.2 KB brotli) |
| Astro, one static page, no island | Astro 7.3.5 | **0 KB** |
| Astro, one page with one React island (`client:visible`) | Astro 7.3.5, `@astrojs/react` 7.0.0, React 19.3.0 | **≈ 65 KB gzip** (64.6 KB gzip, 55.8 KB brotli) |

Method:
- Production builds (`next build`, `astro build`).
- Every `<script>` the page loads, compressed with gzip and brotli at default settings and summed.
- Next.js's separate `noModule` polyfill bundle (38.7 KB gzip) is **excluded**, because modern browsers skip it. Including it, the Next.js total is 169.1 KB gzip.
- The Astro island figure is React plus a one-button component, loaded when the island becomes visible.

### 3.2 Content validation

In an Astro content collection with a Zod schema (`status` limited to `draft` or `verified`, `source` required, and a rule rejecting any `verified` record that contains `[[NEEDED: …]]`):

| Case | Result |
|---|---|
| `draft` record containing `[[NEEDED: …]]` | Accepted. Filtering on `status === "verified"` left it out of the published set. |
| `verified` record still containing `[[NEEDED: …]]` | **Build failed** with a clear schema error. |
| Record with no `source` | **Build failed** with "source: Required". |

This enforces Master Brief §9 and §13.3 at build time with no extra tooling.

### 3.3 Toolchain compatibility

| Check | Result |
|---|---|
| TypeScript 7.0.2 (npm `latest`) with Next.js build and `tsc --noEmit` | Worked. |
| `typescript-eslint` 8.71.1 with TypeScript 7.0.2 | **Refused to run** ("typescript-eslint does not support TS 7.0"). Its peer range is `typescript >=4.8.4 <6.1.0`. |
| `typescript-eslint` 8.71.1 with TypeScript 6.0.3 | Worked. |
| Tailwind CSS 4.3.3 with `@tailwindcss/postcss`, built under Next.js 16.3.8 | Worked. |

### 3.4 What was not measured

- Real pages. These are bare pages, so the true figures will differ. The budget is re-measured in the design-system phase and enforced in CI.
- Tailwind CSS under Astro, MDX under Astro, Vercel deployment, and the Interactive Data Canvas.
- Runtime behaviour (LCP, INP) on real devices.

## 4. Decision

Build the site with **Astro and React islands, in TypeScript**:

| Area | Decision |
|---|---|
| Framework | **Astro 7** (pre-rendered, static output) |
| Interactive parts | **React 19** islands, loaded only where needed |
| Language | **TypeScript pinned to 6.0.x** for now |
| Styling | **Tailwind CSS 4** with CSS design tokens |
| Content | **MDX and YAML** files in this repository |
| Content validation | **Zod** schemas through Astro content collections |
| Hosting target | **Vercel**, deploying the static output |
| Runtime | **Node 22** |

### 4.1 Why this fits OBSCURA

1. **It meets the JavaScript budget by default.** A static Astro page ships no JavaScript, and a page with one React island measured about 65 KB gzip. A bare Next.js page already measured about 130 KB gzip, over the 100 KB budget in §11.3 before any site code.
2. **The site is mostly content.** Archives, profiles, roadmaps and articles pre-render to plain HTML, which is good for SEO, accessibility and low-end phones (§11).
3. **Interactive parts stay interactive.** The hero canvas, timeline reveal, countdown, lightbox and RSVP form are React islands. The hero's heading and actions are real HTML that renders before, and without, the canvas (§7.5).
4. **The content rules are enforced by the build.** `source`, `status` and `[[NEEDED: …]]` rules (§9, §13) are checked by schemas, so a rule cannot be forgotten by a new maintainer.
5. **It suits handover.** Content is plain files edited through pull requests. There is no database, no server and no CMS to maintain. Interactive code is ordinary React, which students are likely to know.
6. **It deploys simply.** Static output on Vercel needs no server runtime for the pages.

## 5. Version decisions

Only facts checked on 2026-10-06 are recorded as verified.

| Item | Decision | Verification |
|---|---|---|
| Node | **22** (Astro requires ≥ 22.12.0; Vitest requires `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`) | Engines read from the npm registry. Setting Node 22 in Vercel is not yet verified. |
| TypeScript | **6.0.x** (latest 6.x was 6.0.3) | Verified: works with `typescript-eslint` 8.71.1 and with Next.js and Astro builds. |
| Why not TypeScript 7 | `typescript-eslint` 8.71.1 refuses TypeScript 7.0 (§3.3). Revisit when `typescript-eslint` supports it. | Verified. |
| Astro | **7.x** (7.3.5 in the spike) | Verified for a static build with the React integration. |
| React | **19.x** (19.3.0 in the spike) | Verified. |
| `@astrojs/react` | 7.0.0 in the spike | Verified. |
| Tailwind CSS | **4.x** (4.3.3 verified under Next.js) | **Not yet verified under Astro.** To be confirmed when the project is scaffolded. |
| MDX | `@astrojs/mdx` (8.0.2 on the registry) | **Not yet tested.** |
| Zod | Through Astro content collections | Verified in the spike. The bundled Zod version was not recorded. |

Exact dependency versions and lockfile are fixed when the project is scaffolded, not in this record.

## 6. Trade-offs and consequences

- **Astro is less familiar than Next.js** to most students. This matters because handover is the brief's top constraint (§12.1). Interactive code is ordinary React inside islands, which reduces the learning cost. Documentation and a handover guide (§12.4) cover the rest.
- **It is not a single React application.** There is no shared client state between pages. This suits a content site and is not expected to be a problem.
- **TypeScript is held below 7** until `typescript-eslint` supports it. The pin is revisited then.
- **Fewer ready-made integrations** than the Next.js ecosystem. Anything missing is handled case by case.
- **Next.js remains viable.** If the club later changes the JavaScript budget in §11.3, or handover familiarity outweighs the budget, Next.js is a reasonable alternative. This decision would then be superseded by a new record. The content files (MDX and YAML) and the React components are portable, which limits the cost of changing.
- **Bare-page numbers are optimistic.** They will rise with real content and are re-measured early.

## 7. Deferred decisions

None of these is decided by this record.

| Decision | Status and trigger |
|---|---|
| CMS or web editor for non-developers | Deferred. Content is plain files, so one can be added later without migrating. Depends on the blog and authoring workflow (brief §15: W1, W2). |
| Database | Deferred. None is needed for a static site. |
| Analytics | Deferred. Depends on institutional policy (§11.5, §15 C10). None is added until then. |
| RSVP implementation | Deferred (§15 E4: owner, tool, data retention, capacity). |
| Live calendar approach | Deferred (§12.3, §16 P2.2-a). |
| Domain and Vercel project configuration | Deferred (§15 C7: domain and hosting constraints from the institution). Vercel is the target only. |
| Blog authoring workflow | Deferred (§15 W1, W2). |
| Hero rendering technique and libraries | Deferred to the interactive-experiences phase (§12.3, §7.5). |
| Media storage | Deferred (§12.3). Large media and datasets stay out of Git history (§12.4). |
| Fonts and design tokens | Deferred to the design-system phase. The brief's values are provisional (§7). |
| Licence for this repository | Not decided here. |

## 8. Important content and data rules

These rules from Master Brief §9 and §13 apply to all code and content in this repository.

1. **No invented club facts.** Never invent names, photos, roles, achievements, events, dates, venues, statistics, projects, history, partnerships, contact details or quotes.
2. **`[[NEEDED: …]]` for unknown information.** Missing facts are marked in content and code, for example `[[NEEDED: founding year]]`. No realistic-looking filler.
3. **Verified content only in production.** Every content record has `source` and `status`. Only `verified` records are published. A `verified` record containing a `[[NEEDED: …]]` marker fails the build. Information transcribed from images stays `draft` until the club confirms it.
4. **No personal information without consent.** A person's name, photo, LinkedIn link or achievements are committed and published only with their consent, and the consent is recorded. This repository is public.
5. **Development-only sample data** (obviously synthetic, for example "Test Person 1") lives in a clearly named fixtures folder and is never deployed.
6. **Official wording is used as written.** Copy edits to official text need club approval.
7. **Counts and statistics are computed** from real records, never typed by hand.

## 9. What this record does not do

It does not scaffold Astro, create `package.json`, install dependencies, add source files, or deploy anything. Scaffolding is a separate step after this record is merged.

## 10. Revisit when

- `typescript-eslint` supports TypeScript 7 (move the pin).
- The club changes the JavaScript budget or the handover constraint in the brief.
- The CMS, RSVP, analytics, domain or blog-workflow decisions are made, which may need their own records.
