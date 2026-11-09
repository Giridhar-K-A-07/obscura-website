# OBSCURA website: design direction

| | |
|---|---|
| Status | **Proposed.** A direction for exploration. Nothing here is an approved brand identity. |
| Date | 2026-11-09 |
| Purpose | Give the homepage design exploration (PR #31) a shared, written starting point. |
| Scope | Documentation only. No code, content, token, route, schema, CI or build behaviour changes. |
| Source of truth | [`OBSCURA_MASTER_BRIEF.md`](../OBSCURA_MASTER_BRIEF.md) (§6, §7, §8, §10, §11). Where this document and the Brief disagree, the Brief wins and the conflict is listed in [section 0.3](#03-where-this-document-meets-the-master-brief). |
| Related | [`docs/quality-guard.md`](quality-guard.md), [`docs/decisions/0002-browser-testing.md`](decisions/0002-browser-testing.md), [`docs/decisions/0003-accessibility-automation.md`](decisions/0003-accessibility-automation.md), [`src/styles/tokens.css`](../src/styles/tokens.css) |

## 0. How to read this document

### 0.1 Status labels

Every statement that sets a direction carries one of three labels, so a reader can see how firm it is.

| Label | Meaning |
|---|---|
| **Decided** | Chosen by the project owner, or required by the Master Brief or `CLAUDE.md`. Changing it needs an explicit decision. |
| **Exploratory** | A proposal for PR #31 to test. It may be changed, replaced or dropped after the exploration. |
| **Needs approval** | A choice only the project owner (and, for brand matters, the club) can make. It is listed again in [section 13](#13-decisions-made-and-decisions-needed). |

### 0.2 What is not decided

**There is no official OBSCURA logo file, colour palette or typeface in this repository.** The Master Brief records that the supplied logo files are 3D mockup renders and that sampled colours are approximations (Brief §5.2). The colours and fonts in `src/styles/tokens.css` are provisional, and the Brief asks the club for the real ones (items B1 to B4 in Brief §15.1).

So in this document:

- Every hex value is an **exploratory proposal**, never an official brand colour.
- Every typeface named is a **candidate to evaluate**, never a choice and never "the OBSCURA font".
- The logo is the temporary typographic placeholder (decision D2 in [section 13](#13-decisions-made-and-decisions-needed)). It is not traced from the supplied renders and is not presented as official.
- If the club supplies official colours, fonts or logo files, they replace the proposals below. The direction stays; the values change.

### 0.3 Where this document meets the Master Brief

The approved hybrid direction asks for a "futuristic" atmosphere, "experimental creative-technology details" and an "electric" accent. The Brief is more restrictive in four places. This document follows the Brief and lists the tension so the owner can decide.

| Direction asks for | Master Brief says | What this document does |
|---|---|---|
| A dark, futuristic atmosphere | §6.3: avoid generic "tech club" tropes (glowing circuit boards, binary rain, neon gradients on everything) | Reads "futuristic" as **precise and instrument-like** (viewfinder framing, fine rules, depth of field), not as sci-fi decoration. |
| A restrained electric accent | §7.1: one accent, "projected light"; §6.3: no acid-green or neon accent on black | Uses the Brief's single pale accent (A1) as the rule. More saturated candidates (A2 to A4) are shown only as labelled alternatives that need the owner's approval (section 3.4). Exactly one accent is used per design. |
| Experimental creative-technology details | §7.3: no monospace for labels, dates or metadata as decoration; headings in sentence case, with OBSCURA as the only all-caps text | Keeps both rules. Creative-tech character comes from layout, framing, motion and real data, not from mono labels or capitalised eyebrows. Relaxing either rule is listed as a decision that needs approval. |
| A distinctive hero with abstract graphics | §7.5: the hero uses real data only; §13: no invented facts | Abstract graphics are allowed as **atmosphere**. Anything that looks like data must be computed from real records. |

A further gap: the Brief sets a JavaScript budget for everything except the hero and sets no hero ceiling (`docs/quality-guard.md`). Section 10 documents the provisional ceiling.

## 1. Design vision

### 1.1 What OBSCURA should feel like

**Decided (direction).** A hybrid of three things:

1. **Dark, futuristic atmosphere.** A quiet dark space, like the camera obscura the name comes from (Brief §6.1). Content comes into focus when it is attended to.
2. **Premium, clean editorial layout.** The site reads like a well-made publication and archive: confident type, deliberate hierarchy, generous space.
3. **Experimental creative-technology details.** A few precise, unexpected touches that show the club works with data and technology, used sparingly and always meaningful.

In one sentence: *a calm dark chamber with an editorial voice, where a few exact, technical details sharpen into focus.*

### 1.2 What it should communicate

- **A real student community that builds and learns**, not a corporation. The tone is confident and precise, not corporate or promotional.
- **Technical credibility** without clichés. The proof is real content (events, projects, learning paths), shown clearly.
- **Continuity and legacy.** The Legacy Line is a core feature, so the design should feel like it has a past worth reading.
- **Honesty.** Empty sections are hidden, not padded (Brief §8.3). Numbers are computed from records, never typed (Brief §13.3).

### 1.3 What it must not feel like

**Decided (from the approved direction and Brief §6.3).**

- A generic AI-generated tech template.
- Excessive glow, bloom or gradient.
- A page of identical rounded cards, or visual clutter.
- Animation for its own sake.
- An institutional or corporate website.

## 2. Visual principles

### 2.1 Atmosphere

**Decided.** Dark-first across the whole site (Brief §7.2). Depth comes from layering near-black surfaces, a quiet gradient, and light that falls on what matters. Shadows separate layers; they do not glow (`tokens.css`).

**Exploratory.** A faint grain or noise texture, a soft vignette, a single diffuse light source that reads as projected light. All of it must stay subtle enough that the page still reads as flat near-black at a glance.

### 2.2 Hierarchy

**Decided.**

- One clear focal point per screen. If two things compete, one is demoted.
- Hierarchy comes first from size and weight, then from space, then from the accent colour. Colour is the last signal, never the only one.
- Primary content is bright and sharp; context is dim. This is the "focus" idea from the Brief (§6.1): default state quiet, focused state bright.

### 2.3 Spacing and layout

**Decided (Brief §7.4).** A left-aligned, asymmetric editorial grid: 12 columns on desktop, 4 on mobile, generous dark space, content width capped on wide screens.

**Exploratory.** Larger vertical rhythm between homepage sections than within them, so each section reads as its own beat. Pull one element per section off the grid (an oversized number, a rule, a crop) to create editorial tension. Avoid doing this in every section.

### 2.4 Contrast

**Decided.** Text meets WCAG 2.2 AA (4.5:1, or 3:1 for large text and UI components). Body text is never set in a token that fails 4.5:1 (see section 3.3). Decorative lines and graph edges may be lower-contrast because they carry no meaning.

### 2.5 Editorial treatment

**Decided (Brief §7.3, §7.4).**

- Headings in sentence case. OBSCURA is the only all-caps text.
- Body line length 60 to 75 characters, body line height about 1.6.
- Lists, tables and timelines for archives (events, resources, articles). Cards only where the Brief asks for them (ExCom profiles, club repositories) or an item is a self-contained object.
- Structure encodes information: numbers only for real sequences, dividers only between distinct things.

**Exploratory.** Large lead paragraphs, a strong first line per section, and long thin horizontal rules that act as the "horizon" between sections.

### 2.6 Creative-technology details

**Exploratory.** Candidates for PR #31, each tied to the camera obscura / data idea so none is arbitrary:

| Detail | Idea | Guard |
|---|---|---|
| Aperture and viewfinder framing | Corner marks or a circular aperture that frames the focal element | Decorative: hidden from assistive technology |
| Focus-pull reveal | Content moves from soft and dim to sharp and bright (the Brief's signature reveal, §7.6) | One signature motion, used consistently |
| Fine rules and registration marks | Thin hairlines that show the underlying grid | Never carry meaning; never mono-set labels |
| Depth of field | A blurred, dim background layer behind a sharp foreground | Static blur only; no animated blur on large areas (cost) |
| Real-data traces | The hero network or small plots drawn from real records | Computed from verified records only |
| Subtle grain | Adds texture to flat near-black | Very low contrast; must not hurt text legibility |

**Not allowed (Decided):** fake telemetry, invented counters, "system online" style text, binary or code rain, circuit-board imagery, scanlines, glitch effects, and anything that implies a number or event that is not in the records.

## 3. Colour direction

> **Every value in this section is an exploratory proposal. None is an official OBSCURA brand colour.** The club has not supplied brand colours (Brief B3). The baseline in `tokens.css` is itself provisional.

### 3.1 Characteristics

**Decided (direction).**

- A **deep charcoal or near-black** foundation.
- **One restrained, electric accent**, used as "projected light".
- Neutrals for text and surfaces that stay quiet and slightly cool.
- No second accent colour unless a semantic need appears (for example chart categories, which need their own tested palette: Brief §7.1).

**Exploratory (what "restrained electric" means).** Cool in hue and used in small amounts (roughly one accent element in view at a time, apart from links in body text), so it reads as light on near-black. Not neon, not acid green, and not a gradient fill across large areas. How saturated it may be is limited by the accent rule in section 3.4: the Brief's single pale accent is in force until the owner approves a change.

### 3.2 Foundation options

Contrast values below are computed with the WCAG relative-luminance formula for this document. They must be re-checked when tokens are implemented.

| Option | Ink (page) | Raised surface | Character |
|---|---|---|---|
| **F1. Navy-black (current provisional baseline)** | `#080B12` | `#111826` | Cool and cinematic; closest to the sampled logo tones (Brief §7.1) |
| **F2. Neutral charcoal** | `#0E0F12` | `#16181D` | Quieter and more neutral; lets the accent carry the colour |

### 3.3 Text and line tokens

The neutrals keep the Brief's roles. Contrast on the F1 and F2 page colours:

| Role | Value (provisional) | On F1 | On F2 | Use |
|---|---|---|---|---|
| Primary text | `#E9EBEE` | 16.48 | 16.05 | Body, headings |
| Secondary text | `#9AA5B4` | 7.89 | 7.68 | Metadata, captions |
| UI border | `#6B7788` | 4.33 | 4.22 | Input and button boundaries (3:1 for UI); **not for body text** |
| Decorative line | `#34465C` | 2.04 | 1.99 | Hairlines and inactive graph edges only; never text, never a required boundary |

The UI border also has to clear 3:1 against the raised surfaces it sits on: `#6B7788` is 3.91 on both F1's `#111826` and F2's `#16181D`.

### 3.4 Accent candidates to explore

| Candidate | Value | Status | On F1 | On F2 | As a fill, with page-colour text on it | Notes |
|---|---|---|---|---|---|---|
| **A1. Aperture (baseline)** | `#BCCDFF` | **In force** (Brief §7.1) | 12.48 | 12.15 | 12.48 | Pale periwinkle from the Brief and `tokens.css`. Softest option. |
| **A2. Electric periwinkle** | `#8FA8FF` | Alternative; **needs owner approval** | 8.64 | 8.41 | 8.64 | More saturated than A1, stays in the same family |
| **A3. Ultraviolet** | `#A58BFF` | Alternative; **needs owner approval** | 7.25 | 7.06 | 7.25 | Violet shift; most distinct from typical blue-tech palettes |
| **A4. Cold cyan** | `#7FD6FF` | Alternative; **needs owner approval** | 12.15 | 11.83 | 12.15 | Brightest; risks reading as generic tech blue |

**Accent rule (Decided).** The Master Brief's single pale accent (§7.1, A1) stays in force unless the project owner explicitly approves changing it. Concepts must respect it. A2 to A4 may be shown only as clearly labelled alternatives that ask for that approval; they are never treated as approved, never made the default, and never described as the chosen accent. Approving one means updating the Brief (section 13.3).

**Exploratory rules for whichever accent is used:**

- **One accent per design.** Do not mix two candidates in one design. A concept that also shows an alternative accent shows it as a separate, labelled version, not mixed into the first.
- The accent is for: the focus ring, links, the primary button, the active navigation item, and the "revealed" element of the hero. Not for body text, large backgrounds or decorative gradients.
- Text set in the accent must meet 4.5:1 on the surface it sits on. All four candidates do on F1 and F2 as computed here.
- Gradients: at most one soft gradient per screen, from the foundation toward a slightly lighter or accent-tinted foundation, never across the accent itself. No rainbow or multi-hue gradients.
- Glow: none on text or controls. A diffuse light behind the hero focal element is the only glow allowed, and it must not reduce text contrast.
- Never rely on colour alone: status, selection and errors also use text, shape or an icon.

### 3.5 Data visualisation colour

**Decided (Brief §7.1).** Data visualisations need their own categorical palette, built from the base and tested for colour-blindness. It is not defined here.

## 4. Typography direction

> **No font is chosen or approved.** The Brief lists candidates to evaluate. The wordmark and tagline typefaces are unknown (Brief B2). `tokens.css` uses system fonts as a placeholder.

### 4.1 Characteristics

**Decided (Brief §7.3, §11.3).**

- At most **two families plus a monospace**, subset, `font-display: swap`.
- Monospace is used only for real code (blog tutorials, cheat sheets).
- Headings in sentence case.
- The script face of the tagline stays inside the logo lockup.

**Exploratory.** Clean and confident: strong headings with clear contrast in size, a calm body face, tight but readable tracking in large headings.

### 4.2 Pairings to test in PR #31

| Pairing | Display | Body | Feel |
|---|---|---|---|
| **T1. Editorial serif (the Brief's direction)** | Bracketed serif with Century-like proportions | Humanist or hyperlegible sans | Archive and publication; echoes the wordmark |
| **T2. Confident sans** | A modern grotesque or geometric sans, heavier weight | The same body sans | Cleaner and more technical; loses the link to the wordmark |
| **T3. Mixed** | Serif for headings, the same sans for UI and metadata | Humanist sans | Editorial headings with a precise interface |

Candidate families named in the Brief (open licence): TeX Gyre Schola, Libre Caslon Text, Source Serif 4 (display); Atkinson Hyperlegible, Public Sans, IBM Plex Sans (body); JetBrains Mono, IBM Plex Mono (code). A concept may propose others if they are open-licence and can be subset. **Naming a candidate here does not select it.**

### 4.3 Hierarchy and readability

**Decided (tokens already encode a fluid scale).** Display, h1 to h4, lead, body and small sizes use `clamp()`, between a 360 px phone and a 1440 px wide screen.

- Body text: 16 px minimum, line height about 1.6 on dark backgrounds, 60 to 75 characters per line.
- Light text on dark appears bolder than it is; test body weight on dark rather than copying light-theme weights.
- Headings must scale down without wrapping awkwardly at 360 px. Test the longest official page title (for example "Resource & Learning Hub").
- No text below 14 px for anything the visitor needs to read.
- Do not set long passages in the display face or in capitals.
- Numerals in tables and countdowns use tabular figures where the chosen font offers them.

## 5. Homepage visual strategy

**Decided: section order and rules.** The order is the Brief's (§8.3) and is already how `src/pages/index.astro` is built. Concepts must not reorder, add or remove sections.

1. Hero
2. Next event
3. What OBSCURA is
4. The Legacy Line teaser
5. Recent
6. Built by members
7. Start learning
8. Footer

**Empty-state rule (Decided).** A section with no verified content is hidden entirely. No "coming soon" grids, no placeholder cards in production. The design must look complete when only the hero exists, and when every section is present.

**Prototype safeguards (Decided).** `PROTOTYPE` stays `true`, every page stays `noindex`, the prototype notice stays, and the demo banner and badge stay unchanged on the demo build. Concepts must not hide, restyle away or weaken them.

### 5.1 Hero

- **Purpose.** Establish the identity in one screen: the Interactive Data Canvas, the logo lockup, one sentence about the club (shown only when verified), and the actions (explore, and the next event if there is one).
- **Visual strategy.** The most distinctive moment on the site. Large, confident display type over the canvas; the canvas is a network (Brief §7.5, option A). In the current prototype its nodes are the site's own areas and the four study tracks (`src/lib/homeGraph.ts`); real, verified entities extend it as they exist. The reveal motion is the hero's signature.
- **Rules (Decided).** Heading, description and actions are real HTML, readable before and without the canvas. A pause control, a static frame under reduced motion, a list of the same entities as links, tap to focus on touch, pause when hidden. On phones, a simplified graph with fewer nodes.
- **Exploratory.** How the canvas is framed (aperture, viewfinder, full-bleed), how much of the headline overlaps it, and how the focal node is lit.

### 5.2 Next event (event feature)

- **Purpose.** The one time-sensitive block: date, countdown, link to the event and RSVP when it exists. Hidden if nothing is scheduled.
- **Visual strategy.** A single strong feature, not a card in a grid: large date, the title, the written date and time with timezone, then actions. Its primary action is the main call to action below the hero.
- **Rules (Decided).** The written date and time always accompany the countdown; the countdown does not announce every tick.

### 5.3 What OBSCURA is (club introduction)

- **Purpose.** The vision in one line, linking to About.
- **Visual strategy.** Pure typography: a large lead statement with generous space and no imagery. The quietest section, which gives the page a pause after the event feature.
- **Rules (Decided).** Official vision and mission text is used as written (Brief §13.5). Until a verified description exists, the section stays hidden. Nothing here is written by hand in a template.

### 5.4 The Legacy Line teaser

- **Purpose.** A preview of the current ExCom and founders, linking to `/legacy`.
- **Visual strategy.** A fragment of the timeline: a vertical or horizontal line with the origin marker and the current term, suggesting a longer line that continues on the Legacy page. With one term, it reads as the beginning of a line, not an empty list.
- **Exploratory.** A consistent monochrome treatment for portraits, as the Brief suggests, once original photographs exist and consent is recorded (section 11).

### 5.5 Recent (recent activity)

- **Purpose.** The latest past event and latest article.
- **Visual strategy.** Two editorial entries side by side on larger screens and stacked on phones. Each has a type label, a date, a title and a short line, set as list items rather than cards.
- **Rules (Decided).** Each half appears only if it exists.

### 5.6 Built by members (projects)

- **Purpose.** A small selection of projects.
- **Visual strategy.** The Brief allows cards for club repositories (P4.1). Use a restrained card: name, one line, topics, links. Vary the layout (for example one larger lead project with others beside it) so it does not read as a uniform grid.
- **Rules (Decided).** Links that do not exist are omitted, not disabled.

### 5.7 Start learning

- **Purpose.** The four study tracks (Data Science, Machine Learning, Python, SQL).
- **Visual strategy.** A numbered, ordered treatment is appropriate here because the roadmaps are real sequences. Keep it as a list with clear links, not a grid of icon tiles.

### 5.8 Footer

See section 6. Links: About, the official LinkedIn, contact, privacy, and a GitHub link when the organisation exists (Brief §8.2). Contact and GitHub stay out until the club confirms them.

### 5.9 Rhythm across the page

**Exploratory.** Alternate density: a dramatic hero, a focused event feature, a quiet typographic introduction, then progressively calmer lists. Avoid giving every section the same container, the same heading size or the same card treatment.

## 6. Shared component direction

These components are shared across pages, so they set the site's character. They reuse the existing design system (`src/styles/`, shared components) and do not introduce a second styling system (`CLAUDE.md` §4).

| Component | Direction | Rules |
|---|---|---|
| **Navigation** | Slim, quiet header; the logo links home. Items stay exactly: **Legacy · Events · Achievements · Projects · Learn · Blog**. The current page is marked. | **Decided:** exact labels and order; About is not in the bar. Mobile: full-screen menu, same order, plus the next event when one exists. Skip link first. No hover-only behaviour. |
| **Buttons** | One primary style (accent fill, page-colour text) and one secondary (outline using the UI border colour). Square or lightly rounded corners, matching the restrained radii in `tokens.css`. | One primary button per view. Minimum 44 × 44 px touch target. A visible focus ring in the accent. No glow. |
| **Links** | Inline links in the accent with an underline. External links are marked as external. | A link is never distinguished by colour alone. Link text says where it goes. |
| **Section headings** | Sentence case, large, with generous space above. An optional small label above a heading names the section type. | No all-caps eyebrows and no mono labels (Brief §7.3). Numbers only for real sequences. |
| **Cards** | Used only where the Brief calls for them (ExCom profiles, club repositories) or for self-contained objects. Flat surface, a fine border, no heavy shadow, no glow. | Archives and lists use lists, tables and timelines instead (Brief §7.4). Not every section is a card grid. |
| **Tags** | Small, text-only labels for type and topic. Filters are real controls (buttons or links) with a visible selected state. | Selected state uses text, weight or a mark as well as colour. A static tag is not styled like a control. |
| **Badges** | Status badges use text and shape (for example Upcoming, Happening now, Ended). | Never colour alone. The **DEMO** banner and badge are safeguards: unchanged and not restyled. The Founders' Badge is a content section, not a UI badge. |
| **Footer** | Quiet, dark, structured as a short list of links with the OBSCURA name. | Same links on every page. Contact and GitHub only when confirmed. Keeps the prototype notice while `PROTOTYPE` is `true`. |
| **Logo** | The temporary typographic placeholder, clearly provisional (decision D2). | Not traced from the supplied renders; not presented as official. Motion happens around the logo, never to it (Brief §5.4). |

## 7. Motion and interaction principles

**Decided (Brief §7.6, §10).**

- **One signature motion: the reveal**, from dim and soft to bright and sharp. Used for the hero, for timeline entries as they enter the view, and for expanding details. Nowhere else.
- Everything else is **feedback motion** that answers the visitor's action (opening, expanding, confirming) and shows what changed.
- Durations: 150 to 250 ms for feedback, up to 600 ms for the reveal. Ease-out for entrances (`--ease-out` in `tokens.css`).
- No section-by-section fade-in on every scroll. No parallax. No scroll-jacking: native scroll is never taken from the visitor.
- Nothing flashes more than three times per second.
- Anything that moves automatically for more than 5 seconds (the hero) has a pause control.
- Motion pauses when the tab is hidden or the element is off-screen.

**Reduced motion (Decided).** With `prefers-reduced-motion: reduce`, movement is replaced by instant state changes or a simple opacity change. The hero shows a static frame and offers no animation to pause. This is already tested in the browser QA suite (`tests/e2e/suites/motion.ts`) and must keep passing.

**Meaningful interaction (Exploratory).** An interaction earns its place if it reveals information (focus on a node shows its label and links), confirms an action, or helps the visitor orient (the timeline rail follows the scroll). If a flourish makes content harder to find, it is removed (Brief §10, principle 1: clear before clever). Every interactive element also works as a plain page.

## 8. Responsive principles

**Decided (Brief §11.2).** Designed mobile-first and tested on real phones as well as emulators.

| Range | Name | Behaviour |
|---|---|---|
| 640 px and below | Mobile | Single column, 4-column grid. Simplified hero graph (fewer nodes, tap to focus). Full-screen menu. Timeline rail hidden. |
| 641 to 1024 px | Tablet | Two columns where content allows. Touch-first: no hover-only information. |
| 1025 to 1439 px | Desktop | Full 12-column grid, sticky timeline rail, pointer lens in the hero. |
| 1440 px and above | Wide | Content width capped. Extra space stays empty rather than stretching content. |

**Rules.**

- Touch targets are at least 44 × 44 px.
- No horizontal scrolling at any width (checked by the browser QA suite).
- The hero headline must stay legible and unobstructed at 360 px, with the actions reachable without scrolling past the canvas.
- Large display type scales with `clamp()`; test the longest title at the smallest width.
- At 1920 px (wide desktop) the content width stays capped and the extra space stays empty; the hero must not stretch awkwardly or leave its focal point stranded.
- Imagery uses responsive sizes with explicit dimensions to avoid layout shift.
- Hover effects are an enhancement only; every hover reveal has a focus and tap equivalent.

## 9. Accessibility requirements

**Decided.** Target **WCAG 2.2 Level AA** (Brief §11.1, `CLAUDE.md` §7). This is a target; a clean automated run is not a conformance claim (`docs/decisions/0003-accessibility-automation.md`).

- **Contrast.** Text 4.5:1 (3:1 for large text and UI components). Text over gradients, grain, depth-of-field layers or images is measured at the worst point under the text, not the average.
- **Keyboard.** Everything works without a mouse, in a logical order. The skip link is the first stop and moves focus to `main`.
- **Focus.** A visible focus indicator in the accent on every interactive element, with enough contrast against its surroundings. Focus is never hidden behind a sticky header (WCAG 2.4.11), so sticky elements need scroll padding.
- **Target size.** At least 44 × 44 px (stricter than the WCAG 2.2 minimum of 24 px).
- **Semantics.** One `h1` per page, a logical heading order, landmarks, real lists and tables, links that make sense out of context.
- **Names and alternatives.** Informative images have meaningful alt text; decorative graphics are hidden from assistive technology. The hero canvas has an equivalent list of links.
- **Reduced motion.** Respected everywhere, see section 7.
- **Not by colour alone.** Status, selection and errors use text, shape or an icon as well.
- **Forced colours.** Check that key content, controls and focus remain visible in a forced-colours mode such as Windows High Contrast.
- **Language.** The page language is declared as English.

**How it is checked.** The browser QA suite (Playwright and axe, WCAG 2.2 AA tags) must pass with no new violations, no baseline file and no disabled rule. Automated checks do not replace manual keyboard and screen-reader testing, which each design concept needs before it is chosen.

## 10. Performance constraints

**Decided: nothing in the design may break an existing budget.** Visual ambition does not buy extra weight.

| Constraint | Value | Where it comes from | Enforced today |
|---|---|---|---|
| Largest Contentful Paint | 2.5 s or less (mid-range phone, 4G) | Brief §11.3 | No (needs a real device on the deployed site) |
| Cumulative Layout Shift | 0.1 or less | Brief §11.3 | No |
| Interaction to Next Paint | 200 ms or less | Brief §11.3 | No |
| **First-load JavaScript, excluding the hero** | **100 KB compressed.** The build guard applies the stricter reading: **100,000 bytes gzip per page** | Brief §11.3; `npm run check:build` | **Yes** |
| **Hero-only JavaScript** | **100 KB gzip, provisional ceiling** | This document | **No. Not yet enforced** |
| Fonts | At most two families plus mono, subset, `font-display: swap` | Brief §11.3 | No |
| Images | Responsive sizes, AVIF or WebP, explicit dimensions, lazy loading below the fold | Brief §11.3 | No |

### 10.1 The hero ceiling is separate

- The Master Brief budgets JavaScript **excluding the hero** and sets no hero limit. The build guard reports hero JavaScript but does not limit it (`docs/quality-guard.md`).
- This document proposes a **provisional hero-only ceiling of 100 KB gzip**. It is **a separate number, never added to or traded against** the non-hero budget. Spare hero budget does not raise the non-hero limit, and a heavy hero does not lower it.
- The current hero is about 73 KB gzip (73,164 bytes, reported by `npm run check:build`), so the ceiling leaves headroom, not a target to fill.
- **The ceiling is a proposal.** Adding it to `check:build` is code and is out of scope for this document; it belongs to a later implementation PR. Whether "100 KB" means 100,000 or 102,400 bytes should be settled when it is enforced (the non-hero budget uses 100,000).
- Heavy libraries stay out unless justified (`CLAUDE.md` §8).

### 10.2 Rules for the design

- The hero's text renders first. The canvas initialises afterwards and never delays the main content.
- Cap the canvas device-pixel ratio, limit node count on small screens, pause when hidden.
- Prefer CSS and SVG for atmosphere (gradients, grain, framing) over JavaScript. Large blurs and filters over big areas are costly on phones: test them on a mid-range device.
- No video or large raster backgrounds in the hero unless a concept shows they fit the LCP target.
- Do not hydrate a component unless it needs interaction.

## 11. Photography and imagery

**Decided (Brief §4.3, §13.4; `CLAUDE.md` §5).**

- **Only approved assets** appear on the site. Today none is approved: `APPROVED_ASSETS` in `src/lib/launchMetadata.ts` is empty, so there is no approved favicon or sharing image.
- **Do not fabricate** club photographs, people, logos, events or achievements. AI-generated images must never depict, or be presented as, real members, events or places.
- Personal photos, names and LinkedIn details are published only with recorded consent. Close-ups of non-members need their consent; otherwise use crowd shots.
- The repository is public: nothing unapproved or private is committed, including screenshots from design exploration.
- Informative images have alt text; decorative images have empty alt text.

**Abstract graphics (Exploratory).** Gradients, grain, rules, framing marks and the hero network are allowed as atmosphere because they depict nothing. They must not imply a fact (for example a map of real locations, a fake dashboard or a made-up count).

**Portraits (Exploratory, needs original photos).** The Brief suggests one consistent monochrome treatment across all ExCom terms. This needs original photographs and consent for each person (Brief L5), so concepts use clearly marked placeholders from the demo fixtures only.

**Placeholders.** A placeholder image is allowed in a design exploration only on the local demo build. It never ships in a production section, because empty sections are hidden (Brief §8.3).

## 12. Design exploration brief for PR #31

### 12.1 What PR #31 is

An exploration of **2 to 3 homepage design concepts** that interpret this document. It is a **draft pull request that is not merged**. Its purpose is to let the project owner see real options and choose a direction (gate G1). It is not the redesign.

### 12.2 What each concept must cover

- The **same eight homepage sections in the same order**, with the empty-state rule.
- The **same navigation labels** (Legacy · Events · Achievements · Projects · Learn · Blog).
- A working **hero** with a pause control, a static reduced-motion frame, a link list alternative and a simplified phone version.
- Layouts at four checkpoints: **mobile (360 px), tablet (768 px), standard desktop (1280 px) and wide desktop (1920 px)**. The comparison in section 12.5 covers all four.
- Shown on the **demo build** (synthetic data, local only) so every section is populated. Real or invented club facts are never used.

### 12.3 What each concept should explore

The three concepts should differ on purpose, within the approved hybrid direction. These are suggested starting points, not fixed designs.

| Concept | Leans toward | Foundation | Accent (A1 is in force) | Type | Hero |
|---|---|---|---|---|---|
| **Concept A: Editorial chamber** | Editorial | F1 navy-black | A1 | T1 serif display | The existing network canvas, framed with restraint; strongest typography |
| **Concept B: Instrument** | Creative technology | F2 neutral charcoal | A1; optional labelled alternative A3 or A4 | T2 sans display | Viewfinder framing, a stronger focus-pull reveal, more visible structure |
| **Concept C: Hybrid** | Balance of both | Either | A1; optional labelled alternative A2 | T3 mixed | A middle path: editorial headings with one or two precise technical details |

Each concept states which foundation and typeface pairing it uses and why, and may deviate on those with a stated reason. The accent is not open to deviation: the main version of every concept uses A1 (section 3.4). A more saturated alternative (A2 to A4) may be added as one extra, clearly labelled version that asks for the owner's approval; it is never the default view of the concept.

### 12.4 Constraints on the exploration

- Reuse the existing design system and components where possible; one styling system.
- No new dependency without a justification (`CLAUDE.md` §3).
- Keep `PROTOTYPE`, noindex, the prototype notice, the demo banner, the demo badge and all demo safeguards unchanged.
- Respect the accent rule in section 3.4: the Brief's single pale accent unless the owner explicitly approves otherwise.
- Do not change real content, schemas, routes or navigation.
- Do not commit exploration screenshots to the public repository. Review them locally.
- Do not share a public preview. Any shared preview needs access control first (decision D5).
- Do not merge PR #31.

### 12.5 How concepts are compared

Each concept is scored on the same criteria so the comparison is fair. The project owner chooses; the scores inform that choice and do not make it.

| Criterion | Question |
|---|---|
| Identity | Does it feel like OBSCURA's dark-chamber idea, and not like a template? |
| Hybrid fit | Does it balance atmosphere, editorial clarity and technical character? |
| Hierarchy | Is the focal point obvious on each screen, in the first five seconds? |
| Restraint | Is any effect, glow, gradient or motion unnecessary? |
| Legibility | Is text comfortable to read on dark, at body size, on a phone? |
| Responsive quality | Does the layout feel designed, not squeezed or stretched, at **mobile (360 px), tablet (768 px), standard desktop (1280 px) and wide desktop (1920 px)**? |
| Accessibility | Does it keep zero axe violations, visible focus and reduced-motion behaviour? |
| Performance | What is the **measured** hero-only gzip size, in bytes, from the concept's own build? How does it compare with the **proposed** 100 KB ceiling, which is a proposal and **not an enforced build check** (section 10.1)? Is non-hero JavaScript within the **enforced** 100,000-byte budget? Are there heavy effects? |
| Sustainability | Can the system grow to the other pages (Legacy, Events, Achievements, Projects, Learn, Blog) without redesign? |
| Honesty | Does it look good with only the hero populated, and avoid implying facts that are not true? |

### 12.6 Evidence each concept provides

- Screenshots at **360 px (mobile), 768 px (tablet), 1280 px (standard desktop) and 1920 px (wide desktop)**, kept local.
- `npm run verify` and the browser QA suite results.
- The **actual measured** hero-only gzip size, in bytes, and the non-hero gzip size, both read from `npm run check:build` on that concept's build. Estimates do not count. State the hero figure as a measurement against the proposed 100 KB ceiling, and say plainly that `check:build` reports the hero size but does not yet enforce a hero limit; only the non-hero budget is enforced.
- A short note on which parts are reusable shared components and which are page-specific.
- A list of what is still provisional (colours, fonts, logo).

## 13. Decisions made and decisions needed

### 13.1 Decided

| # | Decision | Source |
|---|---|---|
| 1 | The visual direction is the hybrid described in section 1 | Project owner |
| 2 | Dark-first across the whole site; no light theme for now | Brief §7.2 |
| 3 | The navigation is exactly Legacy · Events · Achievements · Projects · Learn · Blog | Brief §8.2 |
| 4 | The homepage section order is the Brief's, and empty sections are hidden | Brief §8.3 |
| 5 | WCAG 2.2 AA is the accessibility target; reduced motion is respected | Brief §11.1 |
| 6 | The non-hero JavaScript budget (100,000 bytes gzip per page) is enforced and unchanged | Brief §11.3, `check:build` |
| 7 | `PROTOTYPE` stays `true`, with noindex, the prototype notice, the demo banner and all demo safeguards | `CLAUDE.md`, ADR 0004 |
| 8 | Only verified content is published; nothing is invented | Brief §13, `CLAUDE.md` §5 |
| 9 | D1: demo mode is strictly local only | Roadmap decision |
| 10 | D2: the logo is a clean typographic placeholder, not presented as official | Roadmap decision |
| 11 | D5: no Vercel preview is shared until authentication exists | Roadmap decision |
| 12 | PR #30 is documentation only; PR #31 is a draft exploration that is not merged | Project owner |
| 13 | The Master Brief's single pale accent (A1) stays in force until the owner explicitly approves changing it | Brief §7.1; project owner |

### 13.2 Exploratory (to be settled by PR #31)

| Topic | Options |
|---|---|
| Foundation colour | F1 navy-black or F2 neutral charcoal |
| Accent | A1 is in force. A2 to A4 (or another candidate) only as labelled alternatives, pending approval (section 13.3) |
| Typeface pairing | T1, T2 or T3, and which families |
| Hero framing | Aperture, viewfinder, full-bleed, or another |
| Atmosphere | Whether grain, vignette or a diffuse light source is used |
| Layout rhythm | How much each section departs from the grid |

### 13.3 Needs the owner's approval

| # | Question | Why it needs approval |
|---|---|---|
| 1 | Which concept, or which parts of which, becomes the direction (gate G1) | Visual direction is the owner's call |
| 2 | May monospace be used for labels, dates or metadata, or all-caps for small labels? | The Brief forbids both (§7.3). Allowing them changes a source-of-truth rule, so the Brief would need an explicit edit. |
| 3 | May a more saturated accent (A2 to A4) replace the Brief's single pale accent (§7.1)? Until the answer is yes, concepts use A1 and show any alternative as labelled | The Brief's rule stays in force until then, and the Brief would need an explicit edit if the answer is yes |
| 4 | Confirm the hero-only ceiling of 100 KB gzip, and whether it means 100,000 or 102,400 bytes | A new enforced limit |
| 5 | Is grain or noise acceptable for the atmosphere? | Affects legibility and rendering cost |
| 6 | Should the Brief's visual sections (§7) be updated after G1 to record the chosen direction? | The Brief is edited only when a task says so |

### 13.4 Needs the club, not the owner

These are open Brief items. Nothing here can be decided from the website side.

| Brief item | Question |
|---|---|
| B1 | Vector logo files, light and dark variants |
| B2 | Wordmark and tagline typeface names |
| B3 | Official brand colours, if any |
| B4 | Whether the deck-cover styling (periwinkle mark, pink tagline) is an official variant |
| C1 | The official short description of OBSCURA |
| C3 | Permission and guidelines for using the institution's name and logo |
| L5 | Original photos, LinkedIn URLs and consent for ExCom members |

Until the club answers B1 to B3, colours, fonts and the logo stay provisional, and the site says so.

## 14. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-09 | First version, written for the PR #31 exploration |
