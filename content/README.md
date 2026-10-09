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

Achievements and spotlights (`achievements/`, `spotlights/`) refer to people by `people` record id, never by written name: a name is shown only if that person is verified with consent recorded, and a spotlight is shown only if its own consent is also recorded. `project` is a `projects` record id and is shown only if that project is verified. Write `date` as a plain date (for example `2030-03-01`). Leaderboards are not built; what they mean is an open club question.

Projects (`projects/`): `repository`, `liveDemo` and `datasets` must be `https` links, and a project without a valid repository is not published. `contributors` are `people` record ids, never written names: a name is shown only if that person is verified with consent recorded. Projects are listed alphabetically by name; the order says nothing about quality or importance.

Learning resources (`resources/`): a verified **roadmap** needs a `track`, a `lastReviewed` date and `steps`, each with a `title` (what to learn), a `why`, and optional `resources` (`title` and an `https` `url`). Step numbers come from the order of the list. One malformed step, or an unsafe step link, stops the whole roadmap from being published. If two verified roadmaps share a track, the newest `lastReviewed` wins. `reviewer` is optional and is the id of a `people` record, shown only with recorded consent; reviewers who are a team or role are not supported yet, because the club has not decided. A verified **cheat-sheet**, **code-template** or **dataset** needs an `https` `link` and a `licence`; `format` and `size` are shown only if you write them. Files are linked, never hosted in this repository; self-hosting is not supported until the club decides a hosting policy.

Posts (`posts/`) are Markdown or MDX files only; the body is the article. A post is published only when it is verified, has a title, a date that is not in the future, and a real body. `authors` are `people` record ids, never written names: a name is shown only with recorded consent, and a post with no nameable author is published without a byline. `relatedEvent` and `relatedProject` are record ids and are shown only if they resolve to a public event or a published project. Reading time is computed, never written. If an event's `relatedPost` is a published post, that article is the event's recap and the event's own recap text is not shown, so keep the recap in one place. `npm run check:posts` rejects scripts and other active HTML, event-handler attributes, `javascript:` or `data:` links, links that are not `https`, site paths or anchors, images without alt text or from other sources, and MDX imports, exports or client directives. Code blocks may show such code. A post that fails is never published.

The committed `site/site.yaml` is a placeholder with no club facts. The other folders are empty on purpose.
