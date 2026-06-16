# Task: write the `extract()` for a new site extractor

You are an expert at writing small, robust HTML scraping/parsing code. That is the
one part of this job that needs judgment, so it's the only part left to you — the
workflow has already done everything deterministic (branch, cached page, the
scaffolded source with `matches()` filled, the `supportedDomains` entry, the
regenerated load lists). **Your job: read the real cached page and fill in
`extract()` so it pulls the event's fields correctly, then verify. That's it.**

## Issue

**Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}**

```
{{ISSUE_BODY}}
```

Repository: `{{REPO}}`  ·  Branch (checked out): `{{BRANCH}}`

## What is already set up for you

- **Branch `{{BRANCH}}` is checked out** — work here.
- **The real event page is cached** at `data/{{CASE_NAME}}.html` (URL in `data/{{CASE_NAME}}.url`). Read it — this is the markup your selectors must handle.
- **The source file exists**: `pipeline/sources/{{SLUG}}.js`, scaffolded with its `matches(host)` already correct and a placeholder `extract()`. **Do not change `matches()`**, the file name, or anything outside this file.
- `{{HOST}}` is already in `supportedDomains`, and the load lists are regenerated. You don't touch those.
- Target URL: `{{EVENT_URL}}`

The issue body (from the **Event source request** form) may carry user-supplied
name/time/location/description. Only the URL is authoritative — treat the rest as
**hints to sanity-check your extraction against**, never values to copy in.

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

## Step 1 — Is the cached page real?

```bash
wc -c data/{{CASE_NAME}}.html
```

Open it and confirm it's the **real event page**. If it's a bot/CAPTCHA challenge,
a login wall, a cookie interstitial, or an empty single-page-app shell with no
event data in the HTML, then there's nothing to extract from a static fetch.
**Stop here**: comment on the issue describing what the page actually contains, and
exit **without** creating the test case. (The workflow checks for the case file; if
it's absent, it opens no PR. Don't fabricate a page or hand-write values.)

Otherwise, note where the title, date/time, location, and description live.

## Step 2 — Fill in `extract()`

Edit `pipeline/sources/{{SLUG}}.js`: replace the placeholder field reads with
selectors that match `data/{{CASE_NAME}}.html`, add `location` / `description` /
`ctz` as the page warrants, and complete the header comment (expected HTML + where
each field comes from), mirroring `meetup.js`. Supply only the fields the page
needs; let `merge(...)` fold in JSON-LD for the rest. Leave `matches()` alone.

## Step 3 — See the real extraction

Create `test/extractors/custom/{{CASE_NAME}}.json`:
```json
{ "description": "{{HOST}}: <one line on what this case tests>", "expected": { "events": [] } }
```
Then run the live tests — your case fails but prints the **actual extracted values**:
```bash
npm run test:live 2>&1
```
There is **no `url` field** in the case JSON — the URL lives in `data/{{CASE_NAME}}.url`.

## Step 4 — Lock in the expected values and verify

Replace `"expected"` with the **actual** output from Step 3 (copy it — never guess),
having checked those values are genuinely right for the page (cross-check the issue
hints). If a field is wrong or empty, fix the selectors in
`pipeline/sources/{{SLUG}}.js` and re-run. Then both of these must pass:
```bash
npm run test:live
npm run test:offline
```

## Step 5 — Stop

When both suites are green, **you're done — stop here.** Do **not** commit, push,
open a PR, or comment. The workflow verifies your work, commits it, opens the PR,
and comments on the issue. Leave the working tree with your edited
`pipeline/sources/{{SLUG}}.js` and the new `test/extractors/custom/{{CASE_NAME}}.json`.

---

## Hard constraints

- **Do only the judgment step.** Edit exactly two files — `pipeline/sources/{{SLUG}}.js`
  (just `extract()` + its header) and `test/extractors/custom/{{CASE_NAME}}.json`.
  Don't touch `matches()`, the load lists, `supportedDomains`, the cached page, or
  anything else; don't commit or open a PR.
- **Never fabricate input or output.** Don't hand-write HTML, and don't invent
  `expected` values — copy them from the real `npm run test:live` run. If the page
  isn't usable (Step 1), stop and comment instead.
- **No `url` field** inside the case JSON — it lives in `data/{{CASE_NAME}}.url`.
