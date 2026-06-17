# Task: write the `extract()` for a new site extractor

You are an expert at writing small, robust HTML scraping/parsing code. That is the
one part of this job that needs judgment, so it's the only part left to you — the
workflow has already done everything deterministic (branch, cached page, the
scaffolded source with `matches()` filled, a placeholder test case, the
`supportedDomains` entry, the regenerated load lists). **Your job: read the real
cached page, fill in `extract()` so it pulls the event's fields correctly, and
fill in the test case from the real output. That's it.**

## Issue

**Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}**

```
{{ISSUE_BODY}}
```

Repository: `{{REPO}}`  ·  Branch (checked out): `{{BRANCH}}`

## Your write surface is exactly TWO files

Edit only these — both already exist:
1. `pipeline/sources/{{SLUG}}.js` — the extractor. Fill in `extract()` and its
   header comment. **Leave `matches()` alone.**
2. `test/extractors/custom/{{CASE_NAME}}.json` — the integration case. Fill in
   `expected` from the real test output.

**Do not create any new file. Do not edit anything else** — not the load lists,
not `supportedDomains`, not the cached page, and **not the shared helpers in
`pipeline/helpers/` (even to "improve" or refactor them).** If your extractor
needs a helper the shared ones don't provide, write it as a local function inside
your source file's IIFE, exactly as `pipeline/sources/meetup.js` does with its
`fullDescription`. Do not commit, push, or open a PR — the workflow does that
after you stop. (A guard reverts any change outside those two files, so straying
just wastes your effort.)

## What is already set up for you

- **The real event page is cached** at `data/{{CASE_NAME}}.html` (URL in `data/{{CASE_NAME}}.url`). Read it — this is the markup your selectors must handle.
- `pipeline/sources/{{SLUG}}.js` exists, scaffolded with `matches(host)` already correct and a placeholder `extract()`.
- `test/extractors/custom/{{CASE_NAME}}.json` exists with `"events": []` — a placeholder for you to fill.
- `{{HOST}}` is already in `supportedDomains`; the load lists are regenerated.
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
**Stop here**: write a one-sentence diagnosis of what the page actually contains
to the file `{{BAIL_REASON_FILE}}`, and **leave the test case's `events` empty**.
Do **not** comment on the issue yourself — the workflow reads that file and posts
the comment for you. (The workflow opens no PR for an unfilled case. Don't
fabricate a page or hand-write values.)

```bash
echo "This page is an AWS WAF bot-challenge interstitial, not the event page — no event data is present in the static HTML." > {{BAIL_REASON_FILE}}
```

Otherwise, note where the title, date/time, location, and description live.

## Step 2 — Fill in `extract()`

Edit `pipeline/sources/{{SLUG}}.js`: replace the placeholder field reads with
selectors that match `data/{{CASE_NAME}}.html`, add `location` / `description` /
`ctz` as the page warrants, and complete the header comment (expected HTML + where
each field comes from), mirroring `meetup.js`. Supply only the fields the page
needs; let `merge(...)` fold in JSON-LD for the rest. Leave `matches()` alone.

## Step 3 — See the real extraction

Run the live tests — the placeholder case fails but prints the **actual extracted
values**:
```bash
npm run test:live 2>&1
```
There is **no `url` field** in the case JSON — the URL lives in `data/{{CASE_NAME}}.url`.

## Step 4 — Fill the case and verify

In `test/extractors/custom/{{CASE_NAME}}.json`, replace `"events": []` with the
**actual** output from Step 3 (copy it — never guess) and write a one-line
`description`, having checked those values are genuinely right for the page
(cross-check the issue hints). If a field is wrong or empty, fix the selectors in
`pipeline/sources/{{SLUG}}.js` and re-run. Then both of these must pass:
```bash
npm run test:live
npm run test:offline
```

## Step 5 — Stop

When both suites are green, **you're done — stop here.** Do **not** commit, push,
open a PR, or comment. The workflow re-verifies your work, commits the two files,
opens the PR, and comments on the issue.

---

## Hard constraints

- **Edit exactly two files**: `pipeline/sources/{{SLUG}}.js` (just `extract()` + its
  header) and `test/extractors/custom/{{CASE_NAME}}.json`. Create nothing; touch
  nothing else — not `matches()`, the load lists, `supportedDomains`, the cached
  page, or the shared helpers. Don't commit or open a PR.
- **Never fabricate input or output.** Don't hand-write HTML, and don't invent
  `expected` values — copy them from the real `npm run test:live` run. If the page
  isn't usable (Step 1), write the diagnosis to `{{BAIL_REASON_FILE}}` and leave
  the case empty instead — don't comment on the issue yourself.
- **No `url` field** inside the case JSON — it lives in `data/{{CASE_NAME}}.url`.
