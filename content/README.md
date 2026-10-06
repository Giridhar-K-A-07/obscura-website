# Content

Plain files that the site is built from. One folder per entity from Master Brief §9. The schemas are in `src/lib/schemas.ts`.

Rules (Master Brief §9 and §13, and `docs/decisions/0001-site-stack.md`):

- Every record has a `source` and a `status` (`draft` or `verified`). Only `verified` records are published.
- Never invent club facts. Write `[[NEEDED: description]]` for anything unknown. A `verified` record that still contains a marker fails the build.
- Do not commit a person's name, photo, LinkedIn link or achievements until their consent is recorded. This repository is public.
- Synthetic sample data does not belong here. It goes in a development-only fixtures folder that is never deployed.

`site/site.yaml` is a placeholder with no club facts. The other folders are empty on purpose.
