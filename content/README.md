# Content

Plain files that the site is built from. One folder per entity from Master Brief §9. The schemas are in `src/lib/schemas.ts`.

Rules (Master Brief §9 and §13, and `docs/decisions/0001-site-stack.md`):

- Every record has a `source` and a `status` (`draft` or `verified`). Only `verified` records are published.
- Never invent club facts. Write `[[NEEDED: description]]` for anything unknown. A `verified` record that still contains a marker fails the build.
- Do not commit a person's name, photo, LinkedIn link or achievements until their consent is recorded. This repository is public.
- Synthetic sample data does not belong here. It goes in a development-only fixtures folder that is never deployed.

`site/site.yaml` holds club-level facts. Every field is optional: leave a field out until it is verified, and the site hides it. It also holds the official `vision`, `mission` and `aims` (one entry per official category) for the About page. A verified record must never contain a marker.

Faculty on the About page are ordinary `people` with a verified `memberships` record in a verified team named `Faculty`, a stated role, and recorded consent.

Events (`events/`) are published at `/events/<file name>`, so choose the file name carefully. Write `start` and `end` with an explicit UTC offset (for example `2030-07-01T15:30:00+05:30`) and give `timezone` as an IANA name (for example `Asia/Kolkata`); an event with an unrecognised timezone, or an end before its start, is not published. Past or upcoming is decided from the instants alone. In a Markdown or MDX event file, the body is the recap. `photos` and `slides` are site paths or `https` links; `repositories` are `https` links. Speakers are not published.

The committed `site/site.yaml` is a placeholder with no club facts. The other folders are empty on purpose.
