# Task: write the `extract()` for a new site extractor

You are an expert at writing small, robust HTML scraping/parsing code. That is the
one part of this job that needs judgment, so it's the only part left to you — a
workflow has already done everything deterministic (branch, cached page, the
scaffolded source with `matches()` filled, a placeholder test case, the
`supportedDomains` entry, the regenerated load lists). **Your job: read the real
cached page, fill in `extract()` so it pulls the event's fields correctly, fill in
the test case from the real output, push the two files, and re-label the issue.**

You are running as a Claude Code on the web routine, triggered by the
`extractor-agent-ready` label on a GitHub issue. Everything you need you derive
from that issue and its prepared branch — there is no hand-off file to read.

## Step 0 — Derive your context and check out the branch

The prepare workflow already created the branch and named everything
deterministically from the issue's event URL, so you reproduce those names with
the same code:

1. Take the **event URL**: the first `http(s)` URL in the issue body (the request
   form lists it first).
2. From the repo's default branch, derive the **slug** with the same helper the
   workflow used:
   ```bash
   SLUG=$(node -e "process.stdout.write(require('./tools/new-extractors-creation/extractor-naming').namesFor(process.argv[1]).slug)" "<event-url>")
   ```
3. The names all follow from the slug (for this auto-recorded case `caseName == slug`):
   - **branch**: `claude/extractor/$SLUG`
   - **source**: `pipeline/sources/$SLUG.js`
   - **case**: `test/extractors/custom/$SLUG.json`
   - **cached page**: `data/$SLUG.html` (URL — with the host — in `data/$SLUG.url`)
4. Check the branch out and install deps:
   ```bash
   git fetch origin "claude/extractor/$SLUG" && git checkout "claude/extractor/$SLUG"
   npm install        # dev deps aren't installed on a fresh checkout
   ```
5. Sanity-check you're in the right place: `git diff --name-only origin/main...HEAD`
   should list exactly the scaffolded **source** and **case** (plus the cached
   `data/` files) — those two are your write surface.

Below, `<source>` / `<case>` / `<host>` / `<url>` refer to those derived values.

## Your write surface is exactly TWO files

Edit only these — both already exist on the branch:
1. `<source>` — the extractor. Fill in `extract()` and its header comment.
   **Leave `matches()` alone.**
2. `<case>` — the integration case. Fill in `expected` from the real test output.

**Do not create any new file. Do not edit anything else** — not the load lists,
not `supportedDomains`, not the cached page, and **not the shared helpers in
`pipeline/helpers/` (even to "improve" or refactor them).** If your extractor
needs a helper the shared ones don't provide, write it as a local function inside
your source file's IIFE, exactly as `pipeline/sources/meetup.js` does with its
`fullDescription`. (A guard in the finalize workflow reverts any change outside
those two files before the PR, so straying just wastes your effort.)

## What is already set up for you

- **The real event page is cached** at `data/<slug>.html` (URL in
  `data/<slug>.url`). Read it — this is the markup your selectors must handle.
- `<source>` exists, scaffolded with `matches(host)` already correct and a
  placeholder `extract()`.
- `<case>` exists with `"events": []` — a placeholder for you to fill.
- `<host>` is already in `supportedDomains`; the load lists are regenerated.

The issue body (from the **Event source request** form) may carry user-supplied
name/time/location/description. Only the URL is authoritative — treat the rest as
**hints to sanity-check your extraction against**, never values to copy in. Those
hints are a **generic auto-scrape and are often wrong or garbage** (e.g. a US
venue for a `.de` URL, `[object Object]`, a date that doesn't match the page). A
**large divergence** between your extraction and the hints — different country,
date, or venue — is a **red flag to re-examine whether this is really one usable
event page**, not a cue to reconcile by copying the hints in.

The form also has a **"Single event page" field** (its value is `Single event` or
`Multiple events`; the extension fills it in from what the popup detected).
When it's **`Single event`**, the page is expected to describe one specific event,
and a multi-date listing is a sign something's off (re-examine, then bail per
Step 1). When it's **`Multiple events`**, the submitter (or the popup) is telling
you the page legitimately shows several events (a listing, calendar, or tour with
multiple dates) — so **extract them all** into a `result.events` array (see
Step 2). In that case the single-event hints describe just one of the events on
the page, so your extraction *should* contain more than one event and *will*
diverge from those hints — that divergence is expected and the multi-event result
is still a valid contribution, not a reason to bail. If the field is absent (an
older issue or a hand-applied label), default to treating the page as you actually
find it: extract every genuine event it carries.

## How extraction works (so you write the right thing)

When `matches(host)` is true, **your source is the *only* extractor that runs for
the page** — it must produce every field itself. The generic fallback heuristics
run *only* for unsupported hosts; they will **not** fill any gaps for you. What you
*can* lean on is the page's own schema.org JSON-LD: the scaffold already ends with

```js
return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
```

so your DOM fields in `dom` win where present, and the page's embedded event fills
the rest. Read `pipeline/sources/meetup.js` as the canonical example, and skim
`pipeline/helpers/{dom,text,dates}.js` for the shared helpers on `GCal`
(`text`, `firstText`, `blockText`, `normalizeDateValue`, `findTimezone`, …).

---

## Step 1 — Is the cached page one specific event?

```bash
wc -c data/<slug>.html
```

Open it and confirm it carries **at least one genuine, fully-formed event** — a
title with a specific date and a venue/location. **Stop and bail** (Step 5b) only
when there's nothing a static extractor can turn into a calendar event:

- a bot/CAPTCHA challenge, a login wall, or a cookie interstitial;
- an empty single-page-app shell with no event data in the HTML;
- **a page from which you can't assemble even one complete event** — the only
  title you can get is a bare **artist or venue name** with no single date+venue
  attached to it (#283: a livenation.de artist page with five tour dates produced
  just title `"Muse"`, no location). A location-less event is rejected by the
  finalize workflow's quality floor, so if you can't get a venue, bail.

A page that shows **multiple events** is **not** itself a reason to bail — the
pipeline supports a source returning many events (Step 2). Decide by what each
entry yields, and let the "Single event page" field guide you:

- The page is **one specific event** (single title, date, venue) — extract that
  one event. If the field said `Multiple events` yet you find only one, that's
  fine; extract the one.
- The page is a **listing / calendar / tour** where each entry is a complete event
  (its own title — or a shared title — plus its own date *and* a venue) — extract
  **all of them** into `result.events`. This is the case `Multiple events`
  signals.
- The page is a listing whose entries are **not** complete events (bare
  artist/venue names, dates with no venue) — bail per the third bullet above; there
  's no event to build.

Note where the title, date/time, location, and description live for the event(s)
you'll extract.

## Step 2 — Fill in `extract()`

Edit `<source>`: replace the placeholder field reads with selectors that match
`data/<slug>.html`, add `location` / `description` / `ctz` as the page
warrants, and complete the header comment (expected HTML + where each field comes
from), mirroring `meetup.js`. Supply only the fields the page needs; let
`merge(...)` fold in JSON-LD for the rest. Leave `matches()` alone.

**For a single event**, return one partial event object (the scaffold's
`merge(dom, …)` shape). **For a multi-event page** (Step 1 — the `Multiple
events` case), return an object with an `events` array instead — one entry per
event, each with its own `title`/`start`/`location`/… — plus optional page-level
`description`/`ctz` that fill any field an individual event didn't carry. The
orchestrator folds same-titled showings into one multi-instance event on its own,
so emit one entry per distinct occurrence and let it group them
(`pipeline/sources/telavivcinematheque.js` is the canonical multi-event/series
example).

## Step 3 — See the real extraction

Run the live tests — the placeholder case fails but prints the **actual extracted
values**:
```bash
npm run test:live 2>&1
```
There is **no `url` field** in the case JSON — the URL lives in `data/<slug>.url`.

## Step 4 — Fill the case and verify

In `<case>`, replace `"events": []` with the **actual** output from Step 3 (copy
it — never guess) and write a one-line `description`, having checked those values
are genuinely right for the page (cross-check the issue hints). If a field is wrong
or empty, fix the selectors in `<source>` and re-run. Then both of these must
pass:
```bash
npm run test:live
npm run test:offline
```

## Step 5a — Done (the page was usable): commit, push, re-label

When both suites are green:

1. Commit **only your two files** and push to the branch:
   ```bash
   git add <source> <case>
   git commit -m "feat: add <slug> extractor (Refs #<issue>)"
   git push origin <branch>
   ```
2. On the issue, **remove the `extractor-agent-ready` label and add
   `extractor-agent-done`.** Adding that label is what triggers the finalize
   workflow (it re-verifies your work, enforces the two-file blast radius, and
   opens the PR). Do **not** open the PR yourself.

That's it — stop after re-labeling.

## Step 5b — Bail (the page was NOT one usable event)

If Step 1 found a bot/login wall, an empty SPA shell, or a listing/tour page:

1. **Leave the case's `events` empty** and do not push any extractor changes.
2. **Comment on the issue** with a one-sentence diagnosis of what the page
   actually is, e.g. *"This is a livenation.de artist page listing five tour dates,
   not a single event page — there's no one date+venue a static extractor could
   turn into a calendar event."*
3. On the issue, **remove the `extractor-agent-ready` label and add
   `extractor-blocked-needs-human`** — create that label first, since GitHub won't
   make a new label on `--add-label`:
   ```bash
   gh label create "extractor-blocked-needs-human" --color B60205 \
     --description "Automation could not proceed; a maintainer needs to take this over by hand" \
     2>/dev/null || true
   gh issue edit "$ISSUE_NUMBER" \
     --remove-label "extractor-agent-ready" \
     --add-label "extractor-blocked-needs-human"
   ```
   Do not add `extractor-agent-done` (that's the success signal). Then stop.

---

## Hard constraints

- **Edit exactly two files**: `<source>` (just `extract()` + its header) and
  `<case>`. Create nothing; touch nothing else — not `matches()`, the load lists,
  `supportedDomains`, the cached page, or the shared helpers.
- **Never fabricate input or output.** Don't hand-write HTML, and don't invent
  `expected` values — copy them from the real `npm run test:live` run. If the page
  isn't usable (Step 1), bail via Step 5b instead.
- **No `url` field** inside the case JSON — it lives in `data/<slug>.url`.
- **Re-label, don't open the PR.** Success → `extractor-agent-done`; bail →
  `extractor-blocked-needs-human`. The finalize workflow opens the PR.
