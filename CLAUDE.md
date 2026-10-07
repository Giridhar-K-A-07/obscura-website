# CLAUDE.md — OBSCURA website

Persistent development instructions for anyone (human or AI) working in this repository. Read this file first, then the source-of-truth documents in section 2.

## 1. Project identity

- Repository: `Giridhar-K-A-07/obscura-website`.
- This is the official OBSCURA website.
- GitHub `main` is the canonical source of truth. Local clones follow it, never the reverse.
- The repository is **public**. Anything committed or pushed is published.

## 2. Source-of-truth documents

Read and respect these before changing anything:

- `OBSCURA_MASTER_BRIEF.md` — requirements, content rules, budgets, open decisions.
- `docs/decisions/0001-site-stack.md` — the accepted stack decision.
- Any later architecture decision records in `docs/decisions/`.
- The relevant existing implementation, before you change it.

If this file and a source-of-truth document disagree, the source-of-truth document wins. Report the conflict instead of choosing silently. Do not edit the Master Brief or an accepted decision record unless the task explicitly asks for it.

## 3. Approved stack

- Astro 7
- React 19 islands
- TypeScript 6.x
- Tailwind CSS 4
- MDX
- YAML content
- Zod validation (imported from `astro/zod`)
- Node 22 (see `.nvmrc` and `engines` in `package.json`)
- Vercel as the deployment target

Do not add a framework, library or tool outside this list without a justification and, for architectural choices, a new decision record.

## 4. Architecture principles

- Prefer static, pre-rendered HTML.
- Use React islands only where interaction requires them.
- Keep client-side JavaScript minimal.
- Reuse the existing design system (`src/styles/`, tokens, shared components).
- Do not introduce a second styling system without justification.
- Keep reusable components separate from page-specific composition.
- Do not over-engineer. Build what the task needs, not what it might need.

## 5. Content safety

- Never invent OBSCURA facts.
- Never invent names, roles, dates, events, statistics, achievements, quotes, contact information or history.
- Mark unknown information with `[[NEEDED: ...]]`.
- Only verified content may be published. Records carry `source` and `status` (`draft` or `verified`); `npm run check:needed` enforces that verified records contain no marker.
- Personal information, photographs and LinkedIn details need appropriate consent before they enter the repository.
- The repository is public: never commit secrets, private data or unconsented personal data.

## 6. Design direction

- Dark-first.
- Camera obscura / dark chamber.
- Editorial, cinematic, atmospheric, restrained, sophisticated.
- Avoid generic neon, cyberpunk and AI-dashboard aesthetics.
- Colours and fonts are **provisional** until officially confirmed. Do not present them as final branding.

## 7. Accessibility

- Target WCAG 2.2 AA.
- Use semantic HTML.
- Keep everything keyboard accessible, with visible focus.
- Support `prefers-reduced-motion`.
- No hover-only functionality.
- Provide accessible alternatives for visual interactions (for example a list of links beside the hero canvas, and a pause control).

## 8. Performance

- Respect the Master Brief performance budgets (§11.3), including the JavaScript budget for first load.
- Do not hydrate components unnecessarily.
- Keep heavy libraries out unless justified.
- Re-measure real pages as the site grows.

## 9. Development workflow

1. Run `git fetch origin` before starting new work.
2. Start from the latest `origin/main`.
3. Use a dedicated feature branch.
4. Make focused changes.
5. Run `npm run verify` before opening a PR.
6. Open a PR against `main`.
7. Do not merge unless the user explicitly approves.
8. After approval, merge using the repository's established strategy (merge commits, as in PRs #1–#5).
9. After merging, synchronise local `main` (`git fetch origin`, then fast-forward).
10. Do not create long-lived development branches.

## 10. Git safety

- Never force-push.
- Never reset or discard user changes without explicit instruction.
- Run `git status` before any destructive operation.
- Keep unrelated changes out of PRs.

## 11. Local tooling

- The local repository path is `E:\obscura-website`.
- `.freebuff/` is local tooling data. Keep it untracked, do not commit it, and do not delete it unless explicitly told to.

## 12. Current development status

Completed, each through a reviewed PR:

- Master Brief (PR #1)
- Website stack decision, ADR 0001 (PR #2)
- Astro technical foundation (PR #3)
- Provisional design system (PR #4)
- Homepage prototype (PR #5)

The site is still a prototype. Continue incrementally through focused PRs. Do not build several large areas at once.

## 13. Review expectation

Treat every substantial PR as:

implementation → verification → PR → review → approval → merge

A passing build does not mean the design or architecture is approved. Wait for review.

## 14. When information is missing

- If a missing fact can be marked, use `[[NEEDED: ...]]`.
- If a missing decision cannot safely use a marker, stop and ask for clarification.
- Do not assume official branding or club facts.
