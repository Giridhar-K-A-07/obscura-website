# OBSCURA — Master Brief

**Official website of OBSCURA · Project source of truth for design and development**

| | |
|---|---|
| Document status | Draft v1.0 — awaiting club review |
| Created | 29 September 2026 |
| Repository | `Giridhar-K-A-07/obscura-website` |
| Supersedes | Nothing (first project document) |
| Next review | After the club answers the open questions in §15 |

---

## 0. How to read this document

Every statement in this brief carries a label that says where it comes from. Nothing unlabelled should be treated as a requirement.

| Label | Meaning | Can it change? |
|---|---|---|
| **[P]** | Confirmed requirement from the official OBSCURA website proposal | Only by the club |
| **[D]** | Confirmed club fact from the OBSCURA club presentation deck (a snapshot — verify before publishing) | Only by the club |
| **[L]** | Direct observation of the supplied logo files | Only with new brand assets |
| **[R]** | Recommendation by the design/engineering team — not yet approved | Yes, open for discussion |
| **[A]** | Assumption made to keep work moving — **must be verified** | Yes, expected to |
| **[N]** | Needed — information or a decision the club must provide | — |

Rules for using this document:

1. The proposal ([P]) defines *what* the website must contain. This brief's recommendations ([R]) describe *how* it could be done.
2. If a recommendation conflicts with a confirmed requirement, the requirement wins.
3. If two sources conflict, stop and ask the club. Do not pick one silently.
4. Section 13 (anti-fabrication rules) is binding on everyone who writes content or code for this project, including AI assistants.

---

## 1. Sources of truth

| # | Source | File in project | What it contains | Authority |
|---|---|---|---|---|
| S1 | Website proposal | `Obscura_Proposal-Gayathri_M_Nair_-_Gayathri_M.pdf` | One page listing the requested website sections and features | **Primary source for website requirements** |
| S2 | Club presentation deck | `Copy_of_Copy_of_obscura_20260929_133906_0000_compressed.pdf` | 17 pages: cover, vision & mission, aims & objectives, ExeCom '25 team posters, faculty, photos from five events, LinkedIn QR code | Source for club facts, as of the deck's date |
| S3 | Logo — light variant | `IMG-20250402-WA00011.jpg` | Mark + "OBSCURA" wordmark, dark navy on light grey | Brand reference |
| S4 | Logo — dark variant | `IMG-20250402-WA00002.jpg`, `IMG-20250402-WA00003.jpg` | Mark + wordmark + tagline "Unveiling the unknown", off-white on textured black | Brand reference |

Notes on the sources:

- **[L]** S4's two files are byte-for-byte identical (same checksum). There are two logo variants, not three.
- Both "PDF" files are packaged exports (page images plus extracted text), not standard PDFs. All text used in this brief was extracted from them and, where text was only in images, transcribed from zoomed page images. **Transcribed names and titles must be verified by the club** (see §4.6).
- S2 was found in the project folder alongside the proposal. It is used here because it contains confirmed club information the proposal does not, but it describes one point in time (ExeCom '25).
- No other sources were used. Nothing in this brief comes from outside knowledge about OBSCURA.

---

## 2. Project summary

### 2.1 What OBSCURA is

- **[D]** OBSCURA is a student club focused on data science. Its stated vision and mission (verbatim, §4.1) centre on students across disciplines exploring data science and applying it to real-world challenges.
- **[D]** The deck's team posters carry Adi Shankara Institute of Engineering and Technology branding, and the club's LinkedIn page slug is `obscura-asiet`.
- **[L]** Tagline: *Unveiling the unknown*.
- **[N]** An official one- or two-sentence description of the club for the website, the founding date, and the official way to describe its institutional affiliation (host department, if any).

### 2.2 Why the website exists

The proposal lists features but does not state goals. The goals below are **[R]**, inferred from the features, and should be confirmed by the club:

1. **Preserve the club's legacy** — record every term's ExCom, the founders, and the club's evolution (from The Legacy Line).
2. **Show what the club does** — events, achievements, and member projects as evidence of real work (from the Events archive, Hall of Achievements, Project Showcase).
3. **Help students learn** — roadmaps, cheat sheets and datasets for new members (from the Resource & Learning Hub).
4. **Give members a voice** — student-written articles (from the Tech Blog).
5. **Express a technical identity immediately** — the proposal's own words for the hero (from the Interactive Data Canvas).

### 2.3 Audiences **[R]**

| Audience | What they come for | Evidence it exists |
|---|---|---|
| Prospective members (students across disciplines) | What the club is, what it does, how to take part | [D] vision: "students across disciplines" |
| New members | Study roadmaps and resources | [P] roadmaps "tailored for new members" |
| Current members | Upcoming events, RSVP, blog, showcasing their work | [P] upcoming events, blog, projects |
| Past ExCom members and founders | Recognition, a permanent record | [P] Legacy Line, Founders' Badge |
| Industry experts, recruiters, guest speakers | Evidence of member capability; contact | [D] aim: career exposure, industry connections |
| Faculty and institution | A credible public face for the club | [D] faculty listed in ExeCom '25 |

---

## 3. Website requirements from the proposal

This section restates **every** requirement in the proposal. The proposal's wording is quoted exactly. Each feature is broken into atomic requirements (IDs used for traceability in §16), followed by ambiguities that need decisions.

The proposal is organised into seven areas. Their names are official terminology and should be preserved.

### P1. The Legacy Line (Interactive Timeline / Hall of Fame)

**P1.1 — Interactive Scroll** [P]
> "A visual timeline showing the evolution of Obscura batch by batch."

| ID | Requirement |
|---|---|
| P1.1-a | A visual timeline |
| P1.1-b | It is interactive and scroll-based ("Interactive Scroll") |
| P1.1-c | It shows the club's evolution, organised batch by batch |

**P1.2 — ExCom Profiles** [P]
> "Dedicated cards for each term's Executive Committee (all team members ) with photos, roles, LinkedIn links, and key contributions."

| ID | Requirement |
|---|---|
| P1.2-a | Dedicated cards per person |
| P1.2-b | Grouped by term — every term's Executive Committee |
| P1.2-c | Covers all team members, not only top office-holders |
| P1.2-d | Each card: photo |
| P1.2-e | Each card: role |
| P1.2-f | Each card: LinkedIn link |
| P1.2-g | Each card: key contributions |

**P1.3 — Founders' Badge** [P]
> "A dedicated hero banner or section honoring the founding batch who started the club."

| ID | Requirement |
|---|---|
| P1.3-a | A dedicated hero banner *or* section (either form is acceptable) |
| P1.3-b | Honours the founding batch who started the club |

Ambiguities in P1:
- **"Hall of Fame" appears twice** — in this area's subtitle and in P3 ("Wall of Fame"). **[R]** Treat The Legacy Line as *the club's history and people* and P3 as *accomplishments*, and avoid using "Hall of Fame" as a navigation label so visitors don't see two similarly named places. **[N]** Club to confirm.
- **"Batch" vs "term"** — P1.1 says batch, P1.2 says term. **[A]** One batch = one ExCom term = one academic year. **[N]** Confirm, and confirm how terms are named (the deck uses "ExeCom '25").
- **"ExCom" vs "ExeCom"** — the proposal writes *ExCom*; the deck writes *EXECOM '25*. **[N]** Which spelling the website uses publicly.
- **Who the founders are** — not stated anywhere. The deck shows an *Inaugural Event*, but that does not establish whether ExeCom '25 is the founding batch. **[N]** Founding batch names, roles, date, and story. Do not assume.
- **How many terms exist** — only ExeCom '25 is documented. If the club is young, the timeline may launch with one or two entries. **[R]** Design must look intentional with a single term, not like an empty scaffold (see §8.3).

### P2. Events & Initiatives Archive

**P2.1 — Past Events** [P]
> "Photos, recaps, slides, and code repositories from past workshops, guest lectures, and hackathons."

| ID | Requirement |
|---|---|
| P2.1-a | Archive of past events |
| P2.1-b | Event types include workshops, guest lectures, hackathons |
| P2.1-c | Per event: photos |
| P2.1-d | Per event: recap |
| P2.1-e | Per event: slides |
| P2.1-f | Per event: code repositories |

**P2.2 — Upcoming Events** [P]
> "Live calendar with countdown timers, RSVP forms, and event details."

| ID | Requirement |
|---|---|
| P2.2-a | A live calendar |
| P2.2-b | Countdown timers |
| P2.2-c | RSVP forms |
| P2.2-d | Event details |

Ambiguities in P2:
- **Event types** — the deck's documented events include an outreach campaign and multi-day programmes, which are not workshops, guest lectures or hackathons. **[R]** Treat the proposal's three types as examples, and support additional types (e.g. outreach, orientation). **[N]** Club to confirm the type list.
- **Not every event has every asset** — **[R]** photos, recap, slides and repositories are each optional per event; the page shows only what exists.
- **"Live calendar"** — could mean a calendar that updates without a site rebuild, or a calendar view synced with an external calendar. **[N]** Decide who maintains event data and where (§12).
- **RSVP forms** — collecting names/emails creates responsibilities: storage, access, privacy notice, spam protection, capacity limits, and how organisers get the list. **[N]** Who owns RSVP data and which tool processes it.
- **Recaps overlap with the blog** — P6 lists "event recaps" as blog content too. **[R]** One recap, written once, shown on the event page and optionally listed in the blog. Never two versions.

### P3. Hall of Achievements & Wall of Fame

**P3.1 — Competition Winners** [P]
> "Profiles showcasing hackathon winners, project links, and competition leaderboards."

| ID | Requirement |
|---|---|
| P3.1-a | Profiles of hackathon winners |
| P3.1-b | Project links |
| P3.1-c | Competition leaderboards |

**P3.2 — Member Spotlights** [P]
> "Highlights for published research, top certifications, or notable internships secured by members."

| ID | Requirement |
|---|---|
| P3.2-a | Highlights of member accomplishments |
| P3.2-b | Categories: published research, top certifications, notable internships |

Ambiguities in P3:
- **Leaderboards of what?** Either leaderboards from competitions the club runs, or results from external competitions members entered. These need different data. **[N]** Clarify.
- **Selection criteria** — "top" certifications and "notable" internships imply a judgment. **[N]** Who decides what is featured, and on what basis.
- **Consent** — spotlights publish personal achievements. **[R]** Feature a member only with their consent (§13).

### P4. Project Showcase & Portfolio

**P4.1 — Club Repositories** [P]
> "GitHub-linked cards displaying open-source projects built by members, complete with live demos and dataset links."

| ID | Requirement |
|---|---|
| P4.1-a | Cards linked to GitHub |
| P4.1-b | Open-source projects built by members |
| P4.1-c | Live demo links |
| P4.1-d | Dataset links |

Ambiguities in P4:
- **Does OBSCURA have a GitHub organisation?** **[N]** If yes, projects could be listed from it; if not, projects are curated individually from members' repositories.
- **Live GitHub data** (stars, last updated) goes stale or breaks if fetched carelessly. **[R]** Curate project entries by hand; fetch any live figures at build time, never hard-code them.
- **Dataset licensing** — **[N]** each linked dataset's source and licence.

### P5. Resource & Learning Hub

**P5.1 — Study Roadmaps** [P]
> "Curated learning paths for Data Science, Machine Learning, Python, and SQL tailored for new members."

| ID | Requirement |
|---|---|
| P5.1-a | Curated learning paths |
| P5.1-b | Four tracks: Data Science, Machine Learning, Python, SQL |
| P5.1-c | Tailored for new members |

**P5.2 — Cheat Sheets & Datasets** [P]
> "Downloadable guides, code templates, and practice datasets."

| ID | Requirement |
|---|---|
| P5.2-a | Downloadable guides |
| P5.2-b | Code templates |
| P5.2-c | Practice datasets |

Ambiguities in P5:
- **Who writes and maintains the roadmaps** — **[N]** authors and a review owner. Roadmaps go stale; each should show a "last reviewed" date **[R]**.
- **File hosting** — large datasets should not live in the website repository **[R]** (§12.4).
- **Third-party material** — **[R]** link to external resources rather than re-hosting them unless the licence allows redistribution.

### P6. Tech Blog & Insights

**P6.1 — Articles & Tutorials** [P]
> "Student-written posts covering data science trends, project breakdowns, and event recaps."

| ID | Requirement |
|---|---|
| P6.1-a | Articles and tutorials |
| P6.1-b | Written by students |
| P6.1-c | Topics: data science trends, project breakdowns, event recaps |

Ambiguities in P6:
- **Authoring workflow** — **[N]** who can write, who reviews and approves, and whether writers are comfortable with Markdown/Git or need a web editor. This decision strongly affects the technical stack (§12).

### P7. Interactive Data Canvas (Design Element)

**P7.1 — Animated Hero Banner** [P]
> "A dark-mode homepage banner featuring an interactive data visualization or animated network graph to showcase your technical identity immediately."

| ID | Requirement |
|---|---|
| P7.1-a | Located on the homepage, as the hero banner |
| P7.1-b | Dark mode |
| P7.1-c | Animated |
| P7.1-d | Interactive |
| P7.1-e | Content: an interactive data visualisation *or* an animated network graph |
| P7.1-f | Purpose: communicate the club's technical identity immediately |

Ambiguities in P7:
- **Dark mode scope** — the proposal requires dark mode for the hero only. **[R]** Make the whole site dark-first for cohesion; a light theme is optional and later (§7.2). **[N]** Confirm.
- **Which of the two options** — the proposal allows either. See §7.5 for a recommendation that combines them.

---

## 4. Confirmed club information (from the deck)

Everything in this section is **[D]** unless labelled otherwise. It is a snapshot. Before anything here is published, the club must confirm it is current and that the people named consent to appearing on the website.

### 4.1 Vision and mission (verbatim)

> **Vision** — To cultivate a collaborative environment where students across disciplines can explore data science and apply it to real-world challenges

> **Mission** — To empower students through hands-on experience, career insights and interdisciplinary exposure, fostering the next generation of data scientists

### 4.2 Aims & objectives (verbatim, headings normalised)

| Aim | Text |
|---|---|
| Skill Development | Offer workshops and training on core data science topics like machine learning, big data, and data visualization, data cleaning, etc. catering to all skill levels. |
| Career Exposure | Connect students with industry experts and provide internship opportunities to align with their career goals. |
| Innovation & Research | Promote student-led research and innovation challenges to apply data science in solving real-world problems. |
| Interdepartmental Collaboration | Encourage cross-disciplinary workshops & projects with departments like Computer Science, integrating AI, UI/UX, and other fields. |
| Community Building | Build a strong, supportive community through networking events, peer mentorship, and continuous learning resources. |

**[R]** The Skill Development sentence has a small list-grammar issue. Any copy edit to official text needs club approval — never correct it silently.

### 4.3 ExeCom '25

The deck presents the 2025 Executive Committee as a series of team posters. Its structure:

| Team (as named) | People shown | Roles shown |
|---|---|---|
| Core Team | 5 | Chairperson, Vice Chairperson, Secretary, Joint Secretary, Treasurer |
| Technical Team | 2 | Team Lead, Co-Lead |
| Design Team | 3 | Team Lead, Co-Lead, Team Member |
| Content Team | 3 | Team Lead, Co-Lead, Team Member |
| Media Team | 2 | Team Lead, Co-Lead |
| Event Coordination Team | 2 | Team Lead, Co-Lead |
| Office Bearers | 3 | *Roles not shown* |
| Faculty | 3 | Professor & HoD (1), Assistant Professor (2) |

In total: 20 students across seven teams, plus three faculty members.

**Individual names are deliberately not recorded in this document.** This repository is publicly readable, and §13.4 requires consent before a person's details are published. A transcription of the names and roles was provided to the Technical Team separately, for the club to verify. Once verified and consented, names belong in the website's content files (with `source` and `status` fields, §9), not in this brief.

Open points:
- **[N]** Verified spelling of every name (posters use a handwritten-style font) and consent from each person.
- **[N]** Roles of the three Office Bearers.
- **[N]** The faculty members' role in the club (e.g. faculty coordinator/advisor) and department — the deck does not say.
- **[N]** Which academic year "ExeCom '25" refers to.
- **[N]** For P1.2: photos (originals, not poster crops), LinkedIn URLs, and key contributions for each person.

### 4.4 Documented events

The deck shows photo collages for these events. **No dates, venues, speakers or descriptions are stated.**

| Title as shown | What the deck shows |
|---|---|
| Inaugural Event | Photos of an inauguration ceremony |
| Outreach Event | Poster for a *Waste Management Awareness Campaign* (Outreach Program), co-branded OBSCURA and Adi Shankara; photos include a Koovappady Grama Panchayat welcome banner |
| Empower & Inspire — Day 1 | Photos of an interactive session with students |
| Empower & Inspire — Day 2 | Photos of the second day |
| From Curiosity to Clarity: The transformative journey of Data Science | Photos of a talk; some photos show a "Career Meet" banner |

- **[A]** Some Empower & Inspire photos carry camera timestamp overlays from July 2025. That is a lead for the club to confirm, not an event date.
- **[N]** For each event: official title, date, venue, type, recap, speakers (with consent), full-resolution photos, and any slides or repositories. Also whether "From Curiosity to Clarity" and the "Career Meet" are the same event.

### 4.5 Official channels

- **[D]** Official LinkedIn — decoded from the deck's QR code: `https://www.linkedin.com/company/obscura-asiet/` (the QR code includes an admin-view parameter, `?viewAsMember=true`, which must be removed on the website).
- **[N]** Any other official channels (Instagram, email, GitHub organisation, etc.), and a contact email.

### 4.6 Verification status

| Item | Status |
|---|---|
| Proposal text | Extracted from text layer — reliable |
| Vision, mission, aims | Extracted from text layer — reliable |
| ExeCom '25 team structure and roles | Transcribed from images — **verify** |
| Member and faculty names | Kept out of this public document; transcription shared separately — **verify and obtain consent** |
| Event titles | Mix of text layer and images — **verify** |
| LinkedIn URL | Decoded from QR — reliable, but confirm it is the official page |

---

## 5. Brand and logo analysis

### 5.1 What the logo is **[L]**

- **The mark** is a circle cut by a single diagonal gap running from upper left to lower right. The larger right-hand piece is a solid segment of the circle. The smaller left-hand piece is a crescent with a semicircular bite taken from its inner edge, facing the cut.
- **The wordmark** "OBSCURA" is set in uppercase in a sturdy, bracketed serif with moderate contrast (visually close to the Century/Clarendon family — **[N]** the actual typeface name is unknown).
- **The tagline** "Unveiling the unknown" is set in a slanted handwritten script and appears only on the dark variant.
- **Lockup**: centred, mark above wordmark, tagline below.

### 5.2 Variants observed **[L]**

| Variant | Mark | Wordmark | Background | Tagline |
|---|---|---|---|---|
| Light (S3) | Navy-to-slate gradient, sampled ≈ `#06070C` → `#222E3E` → `#34465C` | Dark charcoal | Light grey ≈ `#CBCDCC`, vignetted | No |
| Dark (S4) | Off-white, sampled ≈ `#E9E9E9` (highlights to white, shade ≈ `#BCBCBC`) | Off-white | Textured near-black ≈ `#1E1E20` | Yes |
| Deck cover (S2, p.1) | Periwinkle ≈ `#BCCDFF` with glow | Different condensed display face | Dark textured | Yes, in pink script ≈ `#E8AAC9` |

Important observations:
- **All supplied files are 3D mockup renders** — embossing, drop shadows, lighting and surface texture are baked in. They are not production logo files, and the sampled colours are affected by lighting. **Sampled values are approximations, not official brand colours.**
- **The deck cover uses different typography** from the official renders. **[A]** It is presentation styling, not an alternative official logo. **[N]** Confirm.
- **[N]** A flat vector version of the logo (SVG) in light and dark variants, the wordmark typeface, the tagline typeface, and any official colour values. Until received, the website must not use a self-traced version as if it were official. A clearly marked temporary trace may be used in prototypes only, with the club's approval.

### 5.3 Meaning **[R — interpretation, not confirmed]**

- *Obscura* recalls the *camera obscura* — a darkened room in which light entering through a small opening projects an image of the outside world. The mark reads naturally as an aperture, a lens, or a partially revealed sphere.
- Together with the tagline, the identity is about **revealing what is hidden** — which is also a fair description of data science: finding structure and meaning in noise.
- The deck's own event title, *From Curiosity to Clarity*, expresses the same idea in words.
- **[N]** If the logo's designer had a specific intended meaning, record it here; it should override this interpretation.

### 5.4 Logo usage rules **[R]**

1. Use only official variants: dark mark on light, light mark on dark.
2. Do not recolour, stretch, rotate, outline, add effects to, or crop the mark.
3. Keep clear space around the lockup equal to at least the height of the "O" in the wordmark.
4. Minimum size: mark at least 24 px tall on screen; below that, use the mark without the wordmark.
5. Do not set the tagline in the script face anywhere except inside the logo lockup.
6. Any animation of the logo itself (e.g. the two pieces sliding into alignment) is a brand change and needs explicit club approval. Motion should happen *around* the logo, not *to* it.

---

## 6. Creative concept **[R]**

### 6.1 Core idea: the dark chamber

The website is a *camera obscura*: a dark space where things come into focus when light is directed at them. Content is not dumped on the visitor; it is **revealed** — by scrolling, pointing, or choosing — in the same way data science turns scattered observations into a clear picture.

This gives every page a single organising behaviour:

- **Default state**: quiet, dark, low-contrast context.
- **Focused state**: what the visitor is attending to becomes sharp, bright and connected.

The idea comes directly from the club's own material — the name, the tagline, the mark's aperture shape, and *From Curiosity to Clarity* — rather than from a generic "tech" aesthetic.

### 6.2 What makes OBSCURA's site distinct

1. **Light as the accent.** Colour is used sparingly, as "projected light", only for what is in focus or actionable.
2. **The club as a network.** The hero graph is built from the club's real content (people, events, projects, topics), so the visualisation *is* the club, not decoration (§7.5).
3. **Editorial typography.** A serif that echoes the wordmark gives the site the character of a publication and archive, which suits a legacy-focused club, set against precise technical detail.
4. **Restraint.** One signature motion (the reveal), used consistently, instead of many unrelated effects.

### 6.3 What to avoid

- Generic "tech club" tropes: glowing circuit boards, robot hands, binary rain, neon gradients on everything. (The deck uses some of this imagery; it suits presentation slides but would make the website look templated.)
- A grid of identical rounded cards for every section.
- Decorative stats ("500+ members") — and in any case no statistic may be invented (§13).
- A bright acid-green or neon accent on black, the default "hacker" look.
- Auto-playing motion that cannot be paused.
- Scroll-jacking that takes control of the page away from the visitor.

---

## 7. Visual direction **[R]**

All of §7 is preliminary. It will be tested in a prototype before being fixed as design tokens.

### 7.1 Colour

Derived from the logo samples and the deck cover, then adjusted for accessibility. Contrast ratios were computed against WCAG 2.2.

| Token | Hex | Source | Use | Contrast on Ink |
|---|---|---|---|---|
| Ink | `#080B12` | Logo's navy-black, deepened | Page background | — |
| Chamber | `#111826` | Between Ink and logo navy | Raised surfaces, panels | — |
| Slate | `#34465C` | Logo gradient light end | Decorative lines, inactive graph edges only | 2.04 (not for text) |
| Haze | `#6B7788` | Derived | UI borders, graph nodes, large text only | 4.33 (3.91 on Chamber) — passes 3:1 for UI, **fails for body text** |
| Mist | `#9AA5B4` | Derived | Secondary text, metadata | 7.89 |
| Lumen | `#E9EBEE` | Dark-variant mark | Primary text, logo on dark | 16.48 |
| Aperture | `#BCCDFF` | Deck cover mark | The single accent: focus, links, active states, "revealed" data | 12.48 |

- **Blush** `#E8AAC9` (deck tagline pink, 10.33 on Ink) is noted but **not recommended** as a second accent. One accent keeps the "projected light" idea clear. Revisit only if a second semantic colour (e.g. categories in charts) is needed.
- Data visualisations need their own accessible categorical palette, built from this base and tested for colour-blindness. Never rely on colour alone to carry meaning.
- **[N]** If the club has official brand colours, they replace these.

### 7.2 Theme

- Dark-first across the whole site, matching [P] P7.1-b and the dark logo variant.
- A light theme is not required by the proposal. If added later, it uses the light logo variant and the same token names.

### 7.3 Typography

Candidates to evaluate in the prototype. None is final.

| Role | Direction | Candidates (open licence) | Reason |
|---|---|---|---|
| Display / headings | Bracketed serif with Century-like proportions, echoing the wordmark | TeX Gyre Schola, Libre Caslon Text, Source Serif 4 | Connects the website to the wordmark without copying it |
| Body / UI | Clear, highly legible sans-serif | Atkinson Hyperlegible, Public Sans, IBM Plex Sans | Readability on dark backgrounds and small screens |
| Code | Monospace, used **only** for actual code | JetBrains Mono, IBM Plex Mono | Blog tutorials, cheat sheets, templates |

Type rules:
- Headings in sentence case. The only all-caps text is the OBSCURA name itself.
- Body line length 60–75 characters; line height ≈ 1.6 for body on dark backgrounds.
- Do not use monospace for labels, dates or metadata as decoration.
- The script face stays inside the logo lockup.
- **[N]** If the wordmark font is identified and licensable for web use, consider it for display headings.

### 7.4 Layout and composition

- Left-aligned, asymmetric editorial grid (12 columns on desktop, 4 on mobile) with generous dark space.
- Structure should encode information: numbered steps only where content is a real sequence (roadmaps, the timeline), dividers only where they separate distinct things.
- Cards are used where the proposal asks for them — ExCom Profiles (P1.2) and Club Repositories (P4.1) — and elsewhere only when an item is a self-contained object. Archives and lists (events, resources, articles) use lists, tables and timelines, which scan faster.
- Photography: the deck presents ExCom members as monochrome portraits. A consistent monochrome portrait treatment across all ExCom terms would give The Legacy Line visual continuity. Requires original photos (§4.3).

### 7.5 The hero: Interactive Data Canvas

Options that satisfy [P] P7.1:

| Option | Description | Strengths | Weaknesses |
|---|---|---|---|
| **A. Club network through a lens (recommended)** | A force-directed network whose nodes are the club's real entities — terms, people, events, projects, study tracks — and whose edges are real relationships (a person led an event; a project uses a topic). The pointer or a tap acts as an aperture: inside it, nodes brighten, edges connect, labels appear; outside, the network stays dim. Selecting a node navigates to it. | Meets both halves of P7.1 (data visualisation *and* network graph); expresses the concept; genuinely informative; grows richer as content grows | Needs a content model first (§9); needs care to be accessible and fast |
| B. Data visualisation of a sample dataset | An interactive chart of a practice dataset from the Learning Hub | Directly "data science" | Less about the club; risks feeling like a demo |
| C. Generative particle network | Abstract animated nodes with no meaning | Easiest to build | Decorative only; the most generic outcome |

Requirements for whichever option is chosen:
- Only real data. With little content at launch, Option A can include the four study tracks and the five aims as topic nodes, so the graph is meaningful from day one.
- The heading, tagline and primary actions are real HTML text, readable before and without the canvas.
- A pause control, and a static frame when `prefers-reduced-motion` is set.
- Keyboard and screen-reader alternative: the same entities available as a list of links.
- Touch: tap to focus; no hover-only information.
- Pauses when off-screen or when the tab is hidden.

### 7.6 Motion

- **Signature motion — the reveal**: from dim and unfocused to bright and sharp. Used for the hero, for timeline entries as they come into view, and for expanding details. Nowhere else.
- Everything else is feedback motion that answers the visitor's action (opening, expanding, confirming) and shows what changed.
- Durations: 150–250 ms for feedback, up to 600 ms for the reveal. Ease-out for entrances.
- No section-by-section fade-in on every scroll. No flashing (nothing flashes more than three times per second).
- `prefers-reduced-motion`: replace movement with instant state changes or simple opacity.

---

## 8. Information architecture **[R]**

### 8.1 Sitemap

```
/                           Home — hero canvas, next event, club intro, pathways
/about                      About OBSCURA — vision, mission, aims, faculty       [R] not in proposal
/legacy                     The Legacy Line — timeline of terms + Founders' Badge      (P1.1, P1.3)
/legacy/[term]              A term's Executive Committee — ExCom Profiles              (P1.2)
/events                     Events & Initiatives Archive — upcoming, then past          (P2)
/events/[slug]              Event detail — details, RSVP, or recap/photos/slides/repos  (P2.1, P2.2)
/achievements               Hall of Achievements & Wall of Fame                         (P3)
/projects                   Project Showcase & Portfolio — Club Repositories            (P4)
/projects/[slug]            Project detail (optional; cards may link straight out)      (P4)
/learn                      Resource & Learning Hub                                    (P5)
/learn/roadmaps/[track]     Study Roadmap: data-science | machine-learning | python | sql (P5.1)
/learn/downloads            Cheat Sheets & Datasets                                    (P5.2)
/blog                       Tech Blog & Insights                                       (P6)
/blog/[slug]                Article                                                    (P6)
/privacy                    Privacy notice — required if RSVP collects personal data    [R]
/404                        Not found
```

- `/about` is not in the proposal but the deck supplies its content (vision, mission, aims, faculty) and first-time visitors need it. **[N]** Confirm.
- A "Join" page is not proposed. **[N]** If the club recruits members, how — and whether the website should explain it.
- URL slugs use plain lowercase English; the official feature names appear as page titles.

### 8.2 Navigation

- Primary navigation (desktop): **Legacy · Events · Achievements · Projects · Learn · Blog**, with the logo linking home. About sits in the footer and the home page. Short labels keep the bar usable; full official names appear as page titles (e.g. the Learn page is titled "Resource & Learning Hub").
- Mobile: a full-screen menu with the same order, plus the next upcoming event if there is one.
- Footer: About, official LinkedIn, contact **[N]**, privacy, a link to the GitHub organisation **[N]** if one exists.

### 8.3 Home page composition

In order, with each block shown only when it has real content:

1. **Hero** — Interactive Data Canvas; OBSCURA logo lockup; one-sentence description **[N]**; actions to explore and (if applicable) the next event.
2. **Next event** — countdown, date, RSVP. Hidden if nothing is scheduled.
3. **What OBSCURA is** — the vision in one line, linking to About.
4. **The Legacy Line teaser** — current ExCom and founders, linking to /legacy.
5. **Recent** — latest past event and latest article.
6. **Built by members** — a small selection of projects.
7. **Start learning** — the four study tracks.
8. **Footer.**

**Empty-state rule**: a section with no real content is hidden entirely. The site never shows "Coming soon" grids or placeholder cards in production.

### 8.4 Behaviour by feature

**The Legacy Line** (P1)
- A vertical timeline, one entry per term, newest first, with a sticky year rail on desktop. Native scroll is never hijacked; "interactive scroll" means entries reveal and the rail tracks position as the visitor scrolls normally.
- Each entry shows the term's name, a short summary of that term's milestones **[N]**, and a link to its ExCom.
- The Founders' Badge sits at the origin of the timeline as a distinct, dedicated section, as P1.3 allows.
- With a single term, the layout reads as the beginning of a line — the origin marker, the first term, and the line continuing — not an empty list.

**ExCom Profiles** (P1.2)
- Grouped by team in the order the club uses (Core Team first).
- Card: photo, name, role, team, LinkedIn link. Key contributions revealed on expand (progressive disclosure), so the grid stays scannable.
- A person who served several terms appears in each, and their entries link to each other.

**Events** (P2)
- Upcoming events first, then the past archive filterable by type and year.
- Event detail page adapts: before the event it shows details, countdown, "Add to calendar", and RSVP; afterwards it shows recap, photos, slides and repositories — only those that exist.
- Countdown: always accompanied by the written date and time with the timezone. **[A]** Events are in India Standard Time. After the start time it changes to "Happening now", then "Ended". Screen readers are not interrupted by every tick.
- Photo galleries load lazily with an accessible lightbox.

**Hall of Achievements & Wall of Fame** (P3)
- Two parts: Competition Winners (with project links and leaderboards) and Member Spotlights (research, certifications, internships).
- Leaderboards are real HTML tables, sortable, readable on mobile.
- Entries link to the person's ExCom card where applicable and to the project in the showcase.

**Project Showcase** (P4)
- Card: project name, one-line description, topics, contributors, links (repository, live demo, dataset). Links that don't exist are omitted, not disabled.
- Filters by topic when there are enough projects to need them.

**Resource & Learning Hub** (P5)
- Four roadmap pages as numbered, ordered steps (this content is a real sequence), each step with what to learn, why, and linked resources. Each shows a "last reviewed" date and reviewer.
- Downloads list each file's format and size before downloading.

**Tech Blog** (P6)
- Reading-first layout: comfortable line length, code highlighting, author (linked to their profile when they are an ExCom member), date, reading time, tags.
- Event recaps written as articles are linked from their event page.

---

## 9. Content model **[R]**

A shared content model lets every section link to every other section and powers the hero network. Field lists are indicative.

| Entity | Key fields |
|---|---|
| **Term** | name (e.g. "ExeCom '25"), academic year, summary, milestones, is_founding_term |
| **Person** | name, photo, LinkedIn URL, short bio, consent status |
| **Membership** | person, term, team, role, key contributions — *a person can have memberships in several terms* |
| **Team** | name, display order |
| **Event** | title, slug, type, start/end date-time, timezone, venue, description, speakers, RSVP settings, recap, photos, slides, repositories, related article |
| **Achievement** | title, competition, date, result, people, project, evidence link, leaderboard data |
| **Spotlight** | person, category (research / certification / internship), title, date, link, consent status |
| **Project** | name, description, repository, live demo, datasets, topics, contributors |
| **Resource** | kind (roadmap / cheat sheet / code template / dataset), title, track, file or link, format, size, licence, last reviewed |
| **Post** | title, slug, author(s), date, tags, body, related event or project |

Every record also carries:
- **`source`** — where the information came from (e.g. "Club deck p.4", "email from Secretary, date").
- **`status`** — `draft` or `verified`. Only `verified` records are published.

---

## 10. UX principles **[R]**

1. **Clear before clever.** Every interactive element must also work as a plain page. If an interaction makes content harder to find, it goes.
2. **Progressive disclosure.** Show a scannable overview; reveal detail on request (ExCom contributions, event assets, roadmap steps, older terms).
3. **Consistent vocabulary.** An action keeps its name everywhere — e.g. "RSVP" on the button, the form, and the confirmation.
4. **Honest states.** Empty sections are hidden; errors say what happened and how to fix it; loading states are brief and non-blocking.
5. **Links go where they say.** External links (LinkedIn, GitHub, demos) are clearly marked as external.
6. **No dead ends.** Every page links onward — a person to their events and projects, an event to its recap, a project to its contributors.
7. **Respect the visitor's control.** No scroll-jacking, no autoplay audio, pausable motion.

---

## 11. Quality standards **[R]**

### 11.1 Accessibility — target WCAG 2.2 Level AA

- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components). See §7.1 for which tokens may be used for text.
- Full keyboard access with a clearly visible focus indicator styled in Aperture.
- Semantic HTML: one `h1` per page, logical heading order, landmarks, real lists and tables.
- Meaningful alt text for all informative images; empty alt for decorative ones.
- Auto-moving content lasting over 5 seconds (the hero) has a pause control.
- `prefers-reduced-motion` respected everywhere.
- Touch targets at least 44 × 44 px.
- Forms (RSVP): visible labels, clear error messages tied to fields, no information conveyed by colour alone.
- Page language declared as English.

### 11.2 Responsiveness

| Range | Name | Notes |
|---|---|---|
| ≤ 640 px | Mobile | Single column; simplified hero graph (fewer nodes, tap to focus); timeline rail hidden |
| 641–1024 px | Tablet | Two-column where content allows; touch-first |
| 1025–1439 px | Desktop | Full grid, sticky timeline rail, pointer lens in hero |
| ≥ 1440 px | Wide | Content max-width capped; extra space stays empty |

Designed mobile-first; tested on real phones as well as browser emulators.

### 11.3 Performance budgets

| Metric | Target (mid-range phone, 4G) |
|---|---|
| Largest Contentful Paint | ≤ 2.5 s |
| Cumulative Layout Shift | ≤ 0.1 |
| Interaction to Next Paint | ≤ 200 ms |
| JavaScript on first load (excluding hero) | ≤ 100 KB compressed |

- The hero's text renders first; the canvas initialises afterwards and never delays the main content.
- Canvas: cap device-pixel ratio, limit node count on small screens, pause when hidden.
- Images: responsive sizes, modern formats (AVIF/WebP), explicit dimensions, lazy loading below the fold.
- Fonts: at most two families plus mono, subset, `font-display: swap`.

### 11.4 SEO and sharing

- Descriptive titles and meta descriptions per page; Open Graph images for events, projects and articles.
- Structured data for events (`Event`) and the organisation (`Organization`) using confirmed facts only.

### 11.5 Privacy

- Collect only the RSVP data organisers actually need, state why, and state who can see it.
- Publish a privacy notice before RSVP goes live.
- Personal details (photos, LinkedIn, achievements) are published only with consent.
- Analytics, if any, should be privacy-friendly and cookie-light. **[N]** Institutional policies, if any (§15, C10).

---

## 12. Technical considerations **[R]**

The stack is deliberately **not** chosen yet. This section lists what the choice must satisfy and the decisions that need evaluating.

### 12.1 Shape of the problem

- Mostly **content**: archives, profiles, roadmaps, articles. This favours pre-rendered (static) pages — fast, cheap, secure.
- A few **dynamic** parts: RSVP submissions, the live calendar, the hero canvas, optionally live GitHub data.
- **Maintained by rotating student teams.** Each year a new ExCom inherits the site. This is the most important constraint: the site must be easy to hand over, cheap or free to host, and updatable by non-developers.

### 12.2 Evaluation criteria

1. Can next year's team maintain it with little onboarding?
2. Can non-developers (Content, Media, Event Coordination teams) add events, photos and posts safely?
3. Hosting cost — ideally zero or institution-covered.
4. Performance and accessibility out of the box.
5. Supports the hero canvas without making every page heavy.
6. Low long-term maintenance (few dependencies, no servers to patch).

### 12.3 Decisions to make

| Decision | Options to evaluate | Key trade-off |
|---|---|---|
| Site framework | A static-first framework with interactive "islands"; a full React-based framework; a minimal hand-built static site | Performance and simplicity vs ecosystem and team familiarity |
| Content source | Markdown/MDX files in this repo (edited via pull requests); a Git-based CMS with a web editor; a hosted headless CMS; a shared spreadsheet | Version control and zero cost vs ease for non-developers |
| Hosting | GitHub Pages; Netlify; Vercel; Cloudflare Pages; institution server | Free tiers and simplicity vs server-side features |
| RSVP | Embedded form service; serverless function + small database; platform form handling | Speed to launch vs data ownership and customisation |
| Live calendar | Club-maintained calendar feed as source; event data in the content source with generated `.ics` | Real-time updates vs a single source of truth |
| Hero rendering | Canvas 2D; WebGL; SVG — with a force-layout library | Visual richness vs performance and accessibility |
| Media storage | In the repo; Git LFS; external image hosting/CDN | Simplicity vs repository size (event galleries grow every year) |
| Domain | Institution subdomain; club-owned domain | Credibility and permanence vs control **[N]** |

### 12.4 Repository and workflow

- `main` stays stable and deployable. Work happens on branches and merges by pull request with a short description.
- Keep the existing `README.md` and `.gitignore`. The README should later link to this brief.
- Record significant technical decisions briefly in `docs/decisions/` (one short file per decision: context, options, choice, reasons).
- Large media and datasets are kept out of Git history.
- Development-only sample data lives in a clearly named fixtures folder and is never deployed (§13).
- A handover guide for each new ExCom is part of the deliverable, not an afterthought.

---

## 13. Rules against fabricated club information

These rules are **binding** for everyone — designers, developers, writers and AI assistants.

### 13.1 Never invent

- Member, ExCom, founder, faculty or speaker names, photos, roles or bios
- Achievements, awards, competition results or leaderboard entries
- Events, dates, venues, attendance figures or recaps
- Projects, repositories, demos or datasets
- History, founding dates, milestones or "firsts"
- Statistics of any kind (member counts, events held, "years of excellence")
- Partnerships, sponsors, collaborating organisations or institutions
- Contact details, email addresses, phone numbers or social media links
- Quotes or testimonials

### 13.2 When information is missing

- Mark it in content and code as `[[NEEDED: description]]`, e.g. `[[NEEDED: founding year]]`.
- In development builds, render these markers as a visible "Content needed" flag so nobody mistakes them for real content.
- **[R]** Production builds should fail if any `[[NEEDED: …]]` marker remains in published content.
- Do not use realistic-looking filler: no "John Doe", no fake bios, no stock photos of students presented as members, no lorem ipsum in layouts that will be reviewed as if final.
- For layout testing, use obviously synthetic data (e.g. "Test Person 1", grey silhouette placeholders) kept in the development fixtures folder only.

### 13.3 Provenance and verification

- Every content record has a `source` and a `status` (§9). Only `verified` records are published.
- Information transcribed from images (posters, photos, QR codes) is `draft` until confirmed by the club.
- Numbers shown on the site are computed from real records (e.g. "5 events" counted from the events data), never typed by hand.

### 13.4 Consent and respect

- Publish a person's name, photo, LinkedIn or achievements only with their consent. Keep a record of consent.
- Photos of event attendees who are not club members: use crowd shots, or get consent for close-ups.
- AI-generated images must never depict, or be presented as, real members, events or places.

### 13.5 Official wording

- Official text (vision, mission, aims, feature names) is used as written. Copy edits need club approval.
- The club decides on naming questions such as "ExCom" vs "ExeCom" and "OBSCURA" vs "Obscura" in running text. Until decided: **[A]** "OBSCURA" in running text, "ExCom" for the feature name (as in the proposal), and "ExeCom '25" when naming that specific term (as in the deck).

---

## 14. Glossary of official terms

Preserve these names from the proposal ([P]) and deck ([D]) as page and section titles.

| Term | Source | Meaning on the website |
|---|---|---|
| The Legacy Line | P | Interactive timeline of the club's terms, ExCom and founders |
| Interactive Scroll | P | The scroll-driven visual timeline |
| ExCom Profiles | P | Cards for each term's Executive Committee members |
| Founders' Badge | P | Section honouring the founding batch |
| Events & Initiatives Archive | P | All events, upcoming and past |
| Past Events / Upcoming Events | P | Sub-sections of the archive |
| Hall of Achievements & Wall of Fame | P | Competition wins and member accomplishments |
| Competition Winners / Member Spotlights | P | Sub-sections of the Hall |
| Project Showcase & Portfolio | P | Member-built open-source projects |
| Club Repositories | P | GitHub-linked project cards |
| Resource & Learning Hub | P | Learning material |
| Study Roadmaps | P | Learning paths for Data Science, Machine Learning, Python, SQL |
| Cheat Sheets & Datasets | P | Downloadable guides, code templates, practice datasets |
| Tech Blog & Insights | P | Student-written articles |
| Interactive Data Canvas / Animated Hero Banner | P | The homepage hero visualisation |
| ExeCom '25 | D | The club's 2025 executive committee as named in the deck |
| Core Team, Technical Team, Design Team, Content Team, Media Team, Event Coordination Team, Office Bearers | D | ExCom team names |
| Unveiling the unknown | L | Official tagline |

---

## 15. Information and decisions needed from the club

**Priority A** — blocks design or the first public launch. **Priority B** — needed before the related section launches.

### 15.1 Brand

| # | Item | Priority |
|---|---|---|
| B1 | Vector logo files (SVG), light and dark variants | A |
| B2 | Wordmark and tagline typeface names | A |
| B3 | Official brand colours, if any | A |
| B4 | Whether the deck-cover styling (periwinkle mark, pink tagline) is an official variant | B |
| B5 | Intended meaning of the logo, if documented | B |

### 15.2 Club identity

| # | Item | Priority |
|---|---|---|
| C1 | Official short description of OBSCURA (1–2 sentences) | A |
| C2 | Founding date and institutional affiliation wording (host department, if any) | A |
| C3 | Permission and guidelines for using the institution's name and logo | A |
| C4 | Contact email and all official social channels | A |
| C5 | Preferred casing ("OBSCURA" or "Obscura") and spelling ("ExCom" or "ExeCom") | A |
| C6 | Whether the website should explain how to join | B |
| C7 | Domain name and hosting constraints from the institution | A |
| C8 | Who approves website content | A |
| C9 | Naming of The Legacy Line vs Hall of Achievements & Wall of Fame, given both mention "Fame" (§3, P1) | A |
| C10 | Any institutional policies on privacy, photography, analytics or data collection | A |

### 15.3 The Legacy Line

| # | Item | Priority |
|---|---|---|
| L1 | List of every term/batch, with academic years and naming convention | A |
| L2 | Founding batch: names, roles, founding story, date, photo | A |
| L3 | Verified ExeCom '25 names, spellings and roles (including the three Office Bearers) | A |
| L4 | The faculty members' role in the club and department | A |
| L5 | Original photos, LinkedIn URLs and key contributions for each ExCom member, with consent | A |
| L6 | Milestones for each term | B |
| L7 | Rosters for any earlier terms | B |

### 15.4 Events

| # | Item | Priority |
|---|---|---|
| E1 | For the five documented events: title, date, venue, type, recap, speakers, photos, slides, repositories | A |
| E2 | Whether "From Curiosity to Clarity" and the "Career Meet" are the same event | A |
| E3 | Upcoming events and who maintains event data | A |
| E4 | RSVP: owner, tool, data retention, capacity handling | A (if RSVP launches first) |
| E5 | Official list of event types | B |

### 15.5 Achievements, projects, learning, blog

| # | Item | Priority |
|---|---|---|
| H1 | Competition wins with evidence; what "leaderboards" refers to | B |
| H2 | Member spotlights with consent; selection criteria | B |
| R1 | Whether OBSCURA has a GitHub organisation | B |
| R2 | Project list: repositories, demos, datasets (with licences), contributors | B |
| R3 | Roadmap authors and reviewers for the four tracks | B |
| R4 | Cheat sheets, code templates and datasets, with licences | B |
| W1 | Blog authoring and approval workflow; first articles | B |
| W2 | Whether writers prefer Markdown/Git or a web editor | A (affects stack) |

### 15.6 Scope confirmations

| # | Item | Priority |
|---|---|---|
| S1 | Whole site dark-first (proposal only specifies the hero) | A |
| S2 | Hero direction (Option A recommended, §7.5) | A |
| S3 | Adding an About page and a Privacy page | A |
| S4 | Phasing in §17 | A |

---

## 16. Traceability — proposal to website

Every requirement in §3 mapped to where it lives. Status is "planned" for all until built.

| Requirement | Location | Notes |
|---|---|---|
| P1.1-a, b, c | `/legacy` timeline | Native-scroll reveal; batch = term [A] |
| P1.2-a – g | `/legacy/[term]` | Cards grouped by team; contributions on expand |
| P1.3-a, b | `/legacy` origin section; teaser on `/` | Founders unknown [N] |
| P2.1-a – f | `/events`, `/events/[slug]` | Assets optional per event |
| P2.2-a | `/events` calendar view + `.ics` feed | "Live" to be defined [N] |
| P2.2-b | Event pages and home "Next event" | Written date always shown |
| P2.2-c | `/events/[slug]` RSVP form | Tool undecided [N] |
| P2.2-d | `/events/[slug]` | — |
| P3.1-a, b, c | `/achievements` — Competition Winners | Leaderboard meaning [N] |
| P3.2-a, b | `/achievements` — Member Spotlights | Consent required |
| P4.1-a – d | `/projects` | GitHub organisation [N] |
| P5.1-a, b, c | `/learn/roadmaps/[track]` | Four tracks |
| P5.2-a, b, c | `/learn/downloads` | External hosting for large files |
| P6.1-a, b, c | `/blog`, `/blog/[slug]` | Recaps shared with events |
| P7.1-a – f | `/` hero | Option A recommended |

All 12 proposal features and their 46 atomic requirements are mapped. Nothing from the proposal has been dropped or merged away.

---

## 17. Proposed phasing **[R]**

Phasing sets order, not scope — every proposal requirement is delivered.

| Phase | Goal | Contents |
|---|---|---|
| 0. Foundation | Agree what we're building | This brief approved; priority-A answers from §15; brand assets received; stack evaluated and chosen; content collection started |
| 1. Design | Agree how it looks and behaves | Design tokens; hero prototype (tested on phones); wireframes and visual designs for Home, Legacy, ExCom term, Events, Event detail |
| 2. First launch | A credible public site | Home with hero; About; The Legacy Line with ExeCom '25 and Founders' Badge; Events archive with the verified events; Upcoming Events (with RSVP if ready); Privacy |
| 3. Learning and showcase | Useful to members | Resource & Learning Hub; Project Showcase; Tech Blog |
| 4. Recognition | Celebrate members | Hall of Achievements & Wall of Fame; leaderboards |
| 5. Handover | Survives the next ExCom | Maintainer guide; content editing guide; decision records |

---

## 18. Review log

Self-review performed after drafting, 29 September 2026.

| Check | Result |
|---|---|
| Completeness against proposal | All 7 areas, 12 features and 46 atomic requirements restated verbatim and traced (§3, §16) |
| Internal consistency | Terminology aligned to §14; dark-first stance consistent across §3, §7.2, §15; phasing covers all requirements |
| Missing information | Collected in §15 with priorities; every [N] in the document has a matching item there |
| Unnecessary assumptions | Limited to five, each labelled [A] and listed for verification: batch = term; deck-cover styling is not an official variant; events in IST; interim casing/spelling; July 2025 photo timestamps are leads only |
| Fabrication | No facts included beyond the proposal, deck and logo files; transcribed items flagged for verification |
| Privacy | Repository confirmed publicly readable; individual names removed from §4.3 to stay consistent with §13.4 |
| Corrections made during review | Requirement counts corrected (12 features, 46 atomic requirements); two open items added to §15 (C9, C10) |
| Foundation for the website | Concept, IA, content model, quality standards and decision list are sufficient to begin Phase 1 once priority-A items are answered |

---

## 19. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-29 | First draft created from proposal, club deck and logo files |
