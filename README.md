# obscura-website
Official website for OBSCURA

## Status

Technical foundation only. No pages and no club content exist yet. Scope and rules are in
[`OBSCURA_MASTER_BRIEF.md`](OBSCURA_MASTER_BRIEF.md); the stack decision is in
[`docs/decisions/0001-site-stack.md`](docs/decisions/0001-site-stack.md).

## Setup

Requires Node 22 (`>=22.12.0 <23`, see `.nvmrc`).

```sh
npm ci
npm run dev      # local dev server
npm run build    # static production build to dist/
npm run verify   # format check, lint, type check, tests, [[NEEDED]] check, build
```

## Content rules

Content lives in `content/` as YAML (and MDX for long text), validated by Zod schemas in
`src/lib/schemas.ts`. Every record needs a `source` and a `status` (`draft` or `verified`).
Only verified records may be published, and a verified record must not contain a
`[[NEEDED: ...]]` placeholder. See `content/README.md`.

## Design system (provisional)

Tokens and primitives live in `src/styles/` (`tokens.css`, `base.css`, `components.css`). All colours
and fonts are provisional until the Design/Brand review. `npm run dev` serves a development-only
preview at `/dev/design-system`; it is not part of the production build.
