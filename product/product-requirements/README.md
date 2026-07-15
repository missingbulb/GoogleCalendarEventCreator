# Product requirements

Product-level requirements for the Google Calendar Event Creator extension — the
market/user-facing **why** and **what**, as opposed to the engineering **how**.

This is the one folder under `product/` the rest of the repo may still reference
(see the barrier rule in [`.claudinite-checks.json`](../../.claudinite-checks.json)).
`product/MarketWiki/`, `product/UsersWiki/`, and `product/sample-data/` are a
self-growing research wiki that the extension's source, tests, and docs must stay
decoupled from; this file is the reviewed, human-maintained distillation that's
allowed to cross that line.

## Relationship to `dev/requirements/`

- [`dev/requirements/requirements.md`](../../dev/requirements/requirements.md) — the
  numbered, test-verified **engineering** spec (every leaf has a case). Read it for
  exactly what the shipped extension does today.
- **This folder** — the **product** requirements that spec exists to satisfy: who
  it's for, what problem it solves, and what "good" looks like from the market/user
  side. Sourced from [`../MarketWiki/`](../MarketWiki/README.md) and
  [`../UsersWiki/`](../UsersWiki/README.md) (including
  [`../UsersWiki/competitors/`](../UsersWiki/competitors/README.md)) — folders the
  rest of the repo may **not** read directly.
- Unlike the two wikis, **this file is not auto-grown.** The wikis are maintained by
  the scheduled routine
  ([`dev/routines/product-wiki-growth/routine.md`](../../dev/routines/product-wiki-growth/routine.md));
  this file only changes when a human (or a session acting on the owner's behalf)
  reviews the wikis and decides something here should change — it's the crossing
  point the rest of the repo depends on, so it stays stable and reviewed.

## Problem statement

A person reading an event on the web (a listing page, a venue site, a newsletter,
a social post) wants it on their calendar without re-typing title, date, time, and
location by hand. See [`README.md`](../../README.md) and
[`dev/procedures/highLevelDesign.md`](../../dev/procedures/highLevelDesign.md) for
how the shipped extension solves this today (a toolbar button, one popup, no
OAuth/API keys, `calendar.google.com/render` prefilled for the user to review and
save).

## Target users (see UsersWiki for the full research)

- Individuals who land on a single event page (a concert, a talk, a meetup) and
  want it on their calendar in one click.
- People browsing a listing page with several events and picking the ones they
  want.
- Anyone who'd rather not create a Google account connection or paste an API key
  just to add one event — see the competitive positioning in
  [`../UsersWiki/competitors/README.md`](../UsersWiki/competitors/README.md).

## Core product requirements

1. Extract event name, date/time, location, and details from the current page
   with **no sign-in, OAuth, or API key** — the differentiator against most
   AI-SaaS competitors (see competitors wiki).
2. Work across many independent event-hosting sites via dedicated per-site
   extractors, falling back to a generic extractor elsewhere — never require a
   site to be "supported" before the extension does something useful.
3. Never fabricate a field the page doesn't support (see
   `dev/procedures/technicalGotchas.md`'s `ctz`-derivation rule) — a wrong guess
   is worse than an empty field the user fills in themselves.
4. One button per event on a listing page — the user picks, we don't guess which
   one they meant.

Engineering behavior for each of these is pinned as executable requirements in
`dev/requirements/requirements.md`; this list is the product framing behind them,
not a restatement of the test spec.

## Non-goals (current)

- No account/auth flow, no server component, no analytics — keeping "zero
  installation friction" is itself a requirement, not an omission.
- No calendar other than Google Calendar's prefilled-event URL scheme today —
  MarketWiki tracks whether Outlook/Apple Calendar/ICS export is worth adding.

## Sourcing

Distilled from `../MarketWiki/README.md` and `../UsersWiki/README.md` as of their
last growth-log entries. When the wikis' "Open questions" surface something that
should change a product requirement, review it and update this file by hand.
