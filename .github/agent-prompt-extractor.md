# Task: Implement a new site extractor

You are a software engineering agent working on the **GoogleCalendarEventCreator** Chrome extension. Your task is to implement a new site extractor and open a pull request for human review.

## Issue

**Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}**

Issue body:
```
{{ISSUE_BODY}}
```

Repository: `{{REPO}}`

## What the workflow has already done for you

You do **not** need to create a branch, write the URL file, or fetch/cache the page — the workflow already did Phase 1:

- **Branch `{{BRANCH}}` is checked out.** Do all your work here.
- **The event page is already recorded** at `data/{{CASE_NAME}}.html` (and its URL is in `data/{{CASE_NAME}}.url`). It was fetched and verified non-empty before you started. **Read it** — it's the real markup your extractor must handle.
- Target event URL: `{{EVENT_URL}}`  (host: `{{HOST}}`)

These names are fixed; use them exactly:
- **Slug:** `{{SLUG}}` → `pipeline/sources/{{SLUG}}.js`
- **Case name:** `{{CASE_NAME}}` → `data/{{CASE_NAME}}.html`, `data/{{CASE_NAME}}.url`, `test/extractors/custom/{{CASE_NAME}}.json`

The issue body (from the **Event source request** form) may also carry user-supplied name/time/location/description. Only the URL is authoritative — treat the rest as **hints to sanity-check your extraction against**, not values to copy.

---

## Overview

Site-specific extractors live in `pipeline/sources/<slug>.js`. Three extraction layers merge (site-specific → schema.org JSON-LD → generic heuristics), first non-empty value per field winning — so a new extractor only needs to supply the fields the other layers get wrong or miss.

You will: inspect the cached page → write the extractor → regenerate the load lists + supported-domains list → write and verify the integration case against the cached page → open a PR. **Never auto-merge.**

---

## Step 1 — Sanity-check the cached page first

```bash
wc -c data/{{CASE_NAME}}.html
```

Open `data/{{CASE_NAME}}.html` and confirm it is the **real event page**. If instead it is a bot/CAPTCHA challenge, a login wall, a cookie/consent interstitial, or an empty single-page-app shell with no event data in the HTML, then there is nothing to extract from a static fetch. **Stop now**: do not write a synthetic page or hand-author expected values. Comment on the issue describing what the cached page actually contains, and exit without opening a PR. (Recording a real fetchable page is the workflow's job; faking one defeats the test.)

Otherwise, note where the title, date/time, location, and description live in the markup.

---

## Step 2 — Study the template and helpers

Read `pipeline/sources/meetup.js` — the canonical template. Note:
- The IIFE wrapper `(() => { ... })()`
- The header comment format (expected HTML, where each field comes from)
- `GCal.sources.push({ name, matches, extract })`
- `matches(host)` — a regex covering the bare domain AND subdomains: `/(^|\\.)<escaped-domain>$/.test(host)`
- `extract()` — returns a partial object with only the fields this site needs
- `merge(dom, embeddedEvents.toEvent(...))` — lets JSON-LD fill any gaps

Also skim `pipeline/helpers/dom.js`, `pipeline/helpers/text.js`, and `pipeline/helpers/dates.js` for the shared helpers on `GCal`.

---

## Step 3 — Write `pipeline/sources/{{SLUG}}.js`

Follow the meetup.js pattern, writing selectors that match what you saw in `data/{{CASE_NAME}}.html`. Skeleton:
```js
// {{HOST}} event pages: {{EVENT_URL}}
//
// Expected HTML input (simplified):
//   <h1>Event Title</h1>
//   <time datetime="2026-07-08T18:30:00-04:00">...</time>
//   ...
//
// Where each field comes from:
//   title    ...
//   start    ...
//   ...
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "{{SLUG}}",
    matches: (host) => /(^|\\.)<escaped-domain>$/.test(host),
    extract() {
      const dom = {
        title: text("h1"),
        start: (() => {
          const el = document.querySelector("time[datetime]");
          return el ? normalizeDateValue(el.getAttribute("datetime")) : "";
        })(),
        // add other fields only if this site needs them
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
```

`matches()` must accept `{{HOST}}` (and its subdomains). It is the gate that turns the toolbar icon green on supported pages.

---

## Step 4 — Register the host and regenerate the load lists

Add `"{{HOST}}"` to `supportedDomains` in `pipeline/fallback-lists.json` (keep the array sorted). This static list is what the triage uses to recognise an already-supported host; `test/unit/supported-domains.test.js` asserts every entry is accepted by some source's `matches()` and vice-versa, so the domain you add **must** be one your `matches()` accepts.

Then regenerate both load lists:
```bash
npm run index
```

Confirm `pipeline/load-order.generated.json` and `pipeline/worker-imports.generated.js` now include `pipeline/sources/{{SLUG}}.js`. You never hand-edit those generated files or `ui/toolbar-icon.js`.

---

## Step 5 — Write the integration case and see the real output

Create `test/extractors/custom/{{CASE_NAME}}.json` with a placeholder:
```json
{
  "description": "{{HOST}}: <one-line description of what this case tests>",
  "expected": { "events": [] }
}
```

Run the live tests — your new case fails but prints the **actual extracted values** from the cached page:
```bash
npm run test:live 2>&1
```

There is **no `url` field** in the case JSON — the URL lives in `data/{{CASE_NAME}}.url`.

---

## Step 6 — Fill in the real expected values and verify

Replace `"expected"` with the actual output from Step 5 (copy it — never guess). If the important fields (title, start, location) are wrong or empty, fix the selectors in `pipeline/sources/{{SLUG}}.js` against the markup in `data/{{CASE_NAME}}.html`, then re-run:
```bash
npm run test:live
npm run test:offline
```

Both must pass before you continue.

---

## Step 7 — Commit

```bash
git add \
  pipeline/sources/{{SLUG}}.js \
  pipeline/fallback-lists.json \
  pipeline/load-order.generated.json \
  pipeline/worker-imports.generated.js \
  test/extractors/custom/{{CASE_NAME}}.json

git commit -m "feat: add {{SLUG}} extractor (Refs #{{ISSUE_NUMBER}})"
git push
```

(The cached `data/{{CASE_NAME}}.*` files are already committed by the workflow.)

---

## Step 8 — Open a pull request

```bash
gh pr create \
  --base main \
  --head "{{BRANCH}}" \
  --title "feat: add {{SLUG}} extractor" \
  --body "Implements the extractor for {{HOST}}.

## Changes
- \`pipeline/sources/{{SLUG}}.js\` — site-specific extractor
- \`pipeline/fallback-lists.json\` — \`{{HOST}}\` added to supportedDomains
- \`pipeline/load-order.generated.json\` / \`pipeline/worker-imports.generated.js\` — regenerated
- \`data/{{CASE_NAME}}.html\` + \`data/{{CASE_NAME}}.url\` — real cached event page (recorded by the workflow)
- \`test/extractors/custom/{{CASE_NAME}}.json\` — integration case asserting the real extraction

Closes #{{ISSUE_NUMBER}}"
```

---

## Step 9 — Trigger CI on the branch

A push or PR made with the workflow's `GITHUB_TOKEN` does **not** start the `Tests` workflow — GitHub suppresses runs triggered by `GITHUB_TOKEN` to prevent recursion. The one exception is `workflow_dispatch`. `test.yml` has a `workflow_dispatch:` trigger, so dispatch it against your branch; the run executes against the branch head, so its checks attach there and show on the PR.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/{{REPO}}/actions/workflows/test.yml/dispatches" \
  -d "{\"ref\":\"{{BRANCH}}\"}"

echo "Triggered Tests workflow on {{BRANCH}}"
```

Don't wait for this run or merge based on it — opening the PR is the end of your job. The reviewer reads the CI result on the PR.

---

## Step 10 — Comment on the issue

```bash
PR_URL=$(gh pr view "{{BRANCH}}" --json url -q .url 2>/dev/null || echo "(see Actions run)")

gh issue comment {{ISSUE_NUMBER}} \
  --body "The extractor has been implemented. PR ready for review: $PR_URL

The integration case asserts against the real cached event page. Please review the extractor logic and the extracted field values before merging."
```

---

## Hard constraints

- **Never auto-merge.** Open a PR; a human reviews and approves.
- **Never fabricate input or output.** Don't hand-write HTML, and don't invent `expected` values — copy them from the `npm run test:live` run against the real cached page. If the cached page isn't a usable event page (Step 1), stop and comment instead of opening a PR.
- **The three `{{CASE_NAME}}` files must match exactly**: `data/{{CASE_NAME}}.html`, `data/{{CASE_NAME}}.url`, `test/extractors/custom/{{CASE_NAME}}.json`. No `url` field inside the case JSON.
- **`{{HOST}}` in `supportedDomains` must be accepted by your `matches(host)`** — `test/unit/supported-domains.test.js` checks both directions.
