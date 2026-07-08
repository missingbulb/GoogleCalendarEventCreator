# Task: implement a site extractor — or harden an existing one with a new case

You are an expert at writing small, robust HTML scraping/parsing code. That is the
one part of this job that needs judgment, so it's the only part left to you — a
workflow has already done everything deterministic (branch, cached page, scaffolded
files, load lists). There are **two modes**, and Step 0 tells you which one you're
in:

- **new-source mode** — the host has no extractor yet. You write `extract()` for a
  freshly-scaffolded source and fill its test case.
- **add-a-case mode** — the host **already** has a working extractor. You add a
  fresh integration case for the submitted page and make it pass, hardening the
  existing source against a second real page. You touch the existing source **only
  if** the new page needs a change to extract correctly — and then only minimally.

You are running as a Claude Code on the web routine, triggered by the
`extractor-agent-ready` label on a GitHub issue. Everything you need you derive
from that issue and its prepared branch — there is no hand-off file to read.

## Step 0 — Derive your context, pick your mode, check out the branch

The prepare workflow already created the branch and named everything
deterministically. Reproduce those names with the same code, **from the repo's
default branch (before you check anything out):**

1. Take the **event URL**: the first `http(s)` URL in the issue body (the request
   form lists it first). Call the issue's number `<issue>`.
2. **Decide the mode** by asking whether an existing source already handles the
   host — using the sources' own `matches()`, run against the default branch:
   ```bash
   BASE=$(node dev/routines/create-extractor/resolve-source.js "<event-url>" 2>/dev/null || true)
   ```
   - **`BASE` is empty → new-source mode.** Derive the slug:
     ```bash
     SLUG=$(node -e "process.stdout.write(require('./dev/routines/create-extractor/extractor-naming').namesFor(process.argv[1]).slug)" "<event-url>")
     ```
     - **branch**: `claude/extractor/$SLUG`
     - **source**: `extension/event-extractors/custom/$SLUG.js` (scaffolded, `matches()` filled)
     - **case**: `dev/requirements/extractor/expected/$SLUG.json` (placeholder, `events: []`)
     - **cached page**: `data/server-fetched/$SLUG.html` (URL in `data/server-fetched/$SLUG.url`)
   - **`BASE` is non-empty → add-a-case mode.** `$BASE` is the existing source's
     file name (e.g. `telavivcinematheque`). The names carry the issue number so
     each request for a supported host gets its own case + branch:
     - **branch**: `claude/extractor/$BASE-<issue>`
     - **source**: `extension/event-extractors/custom/$BASE.js` — **already shipped and working**
     - **case**: `dev/requirements/extractor/expected/$BASE-<issue>.json` (placeholder, `events: []`)
     - **cached page**: `data/server-fetched/$BASE-<issue>.html` (URL in `data/server-fetched/$BASE-<issue>.url`)
3. Check the branch out and install deps:
   ```bash
   git fetch origin "<branch>" && git checkout "<branch>"
   npm install        # dev deps aren't installed on a fresh checkout
   ```
4. Sanity-check with `git diff --name-only origin/main...HEAD`:
   - new-source mode lists the scaffolded **source** + **case** (plus `data/` files
     and the regenerated load lists);
   - add-a-case mode lists **only** a new **case** (plus its `data/` files) — the
     existing source is untouched so far.

Below, `<source>` / `<case>` / `<host>` / `<url>` refer to the derived values.

## Your write surface is exactly TWO files

Edit only these:
1. `<source>` — the extractor.
   - **new-source mode**: fill in `extract()` and its header comment. **Leave
     `matches()` alone.**
   - **add-a-case mode**: this is **shipped code other cases depend on**. Prefer to
     **not touch it at all** — add the case and see if it already passes. Change it
     **only if** the new page genuinely doesn't extract correctly, and then make the
     **smallest** change that makes the new case pass **without regressing any
     existing case** (the re-verify runs the whole suite). **Never refactor, rename,
     restyle, or "improve" it**, and never touch `matches()`.
2. `<case>` — the integration case. Fill in `expected` from the real test output.

**Do not create any new file. Do not edit anything else** — not the load lists,
not `supportedDomains`, not the cached page, and **not the shared helpers in
`extension/event-extractors/helpers/`** (even to "improve" them). If your extractor needs a helper the
shared ones don't provide, write it as a local function inside `<source>`'s IIFE,
exactly as `extension/event-extractors/custom/meetup.js` does with its `fullDescription`. (A guard in
the finalize workflow reverts any change outside those two files before the PR, so
straying just wastes your effort.)

## What is already set up for you

- **The real event page is cached** at the `data/` path from Step 0 — read it; this
  is the markup your selectors must handle.
- `<case>` exists with `"events": []` — a placeholder for you to fill.
- **new-source mode**: `<source>` is scaffolded with `matches(host)` correct and a
  placeholder `extract()`; `<host>` is in `supportedDomains`; load lists regenerated.
- **add-a-case mode**: `<source>` already exists and works; `<host>` is already
  registered; nothing else was scaffolded.

The issue body (from the **Event source request** form) may carry user-supplied
name/time/location/description. Only the URL is authoritative — treat the rest as
**hints to sanity-check your extraction against**, never values to copy in. Those
hints are a **generic auto-scrape and are often wrong or garbage** (e.g. a US venue
for a `.de` URL, `[object Object]`, a date that doesn't match the page). A **large
divergence** between your extraction and the hints — different country, date, or
venue — is a **red flag to re-examine whether this is really one usable event
page**, not a cue to reconcile by copying the hints in.

The form also has a **"Number of events on the page" field** (a count the extension
fills from what the popup detected, defaulting to 1). When it's **1**, the page is
expected to describe one specific event, and a multi-date listing is a sign
something's off (re-examine, then bail per Step 1). When it's **greater than 1**, the
page legitimately shows several events (a listing, calendar, or tour) — **extract
them all** into a `result.events` array (Step 2); the single-event hints then
describe just one of them, so divergence is expected and a multi-event result is
still valid. Treat the count as a **hint, not a quota**: extract every genuine event
the page actually carries even if that's more than the number given. If the field is
absent, default the same way.

## How extraction works (so you write/read the right thing)

When `matches(host)` is true, **that source is the *only* extractor that runs for
the page** — it must produce every field itself; the generic fallback runs *only*
for unsupported hosts and won't fill gaps. What a source *can* lean on is the page's
own schema.org JSON-LD: sources typically end with

```js
return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
```

so DOM fields win where present and the page's embedded event fills the rest. Read
`extension/event-extractors/custom/meetup.js` as the canonical single-event example and
`extension/event-extractors/custom/telavivcinematheque.js` as the multi-event/series one; skim
`extension/event-extractors/helpers/{dom,text,dates}.js` for the shared `GCal` helpers.

---

## Step 1 — Is the cached page one usable event (or a clean multi-event listing)?

```bash
wc -c <cached-page>
```

Open it and confirm it carries **at least one genuine, fully-formed event** — a
title with a specific date and a venue/location. **Stop and bail** (Step 5b) only
when there's nothing a static extractor can turn into a calendar event:

- a bot/CAPTCHA challenge, a login wall, or a cookie interstitial;
- an empty single-page-app shell with no event data in the HTML;
- **a page from which you can't assemble even one complete event** — the only title
  you can get is a bare **artist or venue name** with no single date+venue attached
  (#283). A location-less event is rejected by the finalize quality floor, so if you
  can't get a venue, bail.

A page that shows **multiple events** is **not** itself a reason to bail — a source
may return many events (Step 2). Let the count guide you: one specific event →
extract it; a listing/tour where each entry is a complete event → extract them all;
a listing whose entries are **not** complete events → bail.

Note where the title, date/time, location, and description live.

## Step 2 — Make the extraction work

- **new-source mode:** edit `<source>` — replace the placeholder field reads with
  selectors that match the cached page, add `location` / `description` / `ctz` as
  warranted, complete the header comment, mirroring `meetup.js`. Supply only the
  fields the page needs; let `merge(...)` fold in JSON-LD. Leave `matches()` alone.
  For a multi-event page, return an object with an `events` array (one entry per
  occurrence; the orchestrator groups same-titled showings).

- **add-a-case mode:** **do not edit the source yet.** Go straight to Step 3 and run
  the existing extractor against the new page. Only if the output is wrong/empty do
  you come back and make the **minimal** source change described under "write
  surface" — re-running the full suite each time to confirm no existing case broke.

## Step 3 — See the real extraction

The placeholder case fails but prints the **actual extracted values**:
```bash
npm run test:live 2>&1
```
There is **no `url` field** in the case JSON — the URL lives in the `data/server-fetched/…​.url`
file.

## Step 4 — Fill the case and verify

In `<case>`, replace `"events": []` with the **actual** output from Step 3 (copy it
— never guess) and write a one-line `description`, having checked the values are
genuinely right for the page (cross-check the issue hints). If a field is wrong or
empty: in new-source mode fix your selectors; in add-a-case mode make the minimal
source change (or, if the page isn't really one usable event, bail per Step 5b).
Then both must pass:
```bash
npm run test:live
npm run test:offline
```

## Step 5a — Done (the page was usable): commit, push, re-label

When both suites are green:

1. Commit **only your two files** (in add-a-case mode where you didn't need a source
   change, that's just the case) and push:
   ```bash
   git add <source> <case>   # <source> only if you actually changed it
   git commit -m "<feat: add <slug> extractor | test: add <host> case> (Refs #<issue>)"
   git push origin <branch>
   ```
2. On the issue, **remove `extractor-agent-ready` and add `extractor-agent-done`** —
   that label triggers the finalize workflow (it re-verifies, enforces the two-file
   blast radius, and opens the PR). Do **not** open the PR yourself.

That's it — stop after re-labeling.

## Step 5b — Bail (the page was NOT one usable event)

If Step 1 found a bot/login wall, an empty SPA shell, or a listing/tour page with no
complete event:

1. **Leave the case's `events` empty** and make no source change.
2. **Comment on the issue** with a one-sentence diagnosis of what the page actually
   is.
3. **Remove `extractor-agent-ready` and add `extractor-blocked-needs-human`** —
   create that label first (GitHub won't make a new label on `--add-label`):
   ```bash
   gh label create "extractor-blocked-needs-human" --color B60205 \
     --description "Automation could not proceed; a maintainer needs to take this over by hand" \
     2>/dev/null || true
   gh issue edit "$ISSUE_NUMBER" \
     --remove-label "extractor-agent-ready" \
     --add-label "extractor-blocked-needs-human"
   ```
   Do not add `extractor-agent-done`. Then stop.

---

## Hard constraints

- **Edit at most two files**: `<source>` and `<case>`. Create nothing; touch nothing
  else — not `matches()`, the load lists, `supportedDomains`, the cached page, or the
  shared helpers.
- **In add-a-case mode, the existing source is shipped code.** Don't touch it unless
  the new page needs it to pass; if it does, make the smallest change that keeps
  every existing case green. Never refactor it.
- **Never fabricate input or output.** Don't hand-write HTML, and don't invent
  `expected` values — copy them from the real `npm run test:live`. If the page isn't
  usable, bail via Step 5b.
- **No `url` field** inside the case JSON — it lives in the `data/server-fetched/…​.url` file.
- **Re-label, don't open the PR.** Success → `extractor-agent-done`; bail →
  `extractor-blocked-needs-human`. The finalize workflow opens the PR.
