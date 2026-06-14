# Task: Implement a new site extractor

You are a software engineering agent working on the **GoogleCalendarEventCreator** Chrome extension. Your task is to implement a new site extractor and open a pull request for human review.

## Issue

**Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}**

Issue body:
```
{{ISSUE_BODY}}
```

Repository: `{{REPO}}`

---

## Overview

GoogleCalendarEventCreator is a Chrome extension that reads event pages and creates Google Calendar events. Site-specific extractors live in `pipeline/sources/<site>.js`. Three extraction layers merge (site-specific → schema.org JSON-LD → generic heuristics), first non-empty value per field winning — so a new extractor only needs to supply the fields the other layers get wrong or miss.

You will:
1. Parse the issue to identify the target event URL and derive names from it
2. Create the extractor file, update the load order and service-worker imports
3. Commit placeholder data files and trigger the cache-refresh workflow
4. After the cache is filled, write and verify an integration test case
5. Open a pull request — **never auto-merge**

---

## Step 1 — Parse the issue and derive slugs

From the issue body extract:
- **Event URL** — the full URL of a specific event page (e.g. `https://www.example.com/events/abc-123`)
- **Site slug** — short, lowercase, hyphens only, no dots (e.g. `example`)
- **Case name** — identifies the cached HTML + integration case; format: `<site-slug>-<brief-event-descriptor>` (e.g. `example-rust-workshop`). Keep it concise and filesystem-safe.

All three of these paths use the same `<case-name>`:
- `data/<case-name>.html`
- `data/<case-name>.url`
- `test/integration/cases/<case-name>.json`

---

## Step 2 — Create a feature branch

```bash
git checkout -b claude/extractor/<site-slug>
```

---

## Step 3 — Study the template and available helpers

Read `pipeline/sources/meetup.js` carefully — it is the canonical template. Pay attention to:
- The IIFE wrapper `(() => { ... })()`
- The header comment format (expected HTML, field sources)
- `GCal.sources.push({ name, matches, extract })`
- `matches(host)` — regex that covers bare domain AND subdomains: `/(^|\\.)<escaped-domain>$/.test(host)`
- `extract()` — returns a partial object with only the fields this site needs
- `merge(dom, embeddedEvents.toEvent(...))` — lets JSON-LD fill any gaps

Also skim `pipeline/helpers/dom.js`, `pipeline/helpers/text.js`, and `pipeline/helpers/dates.js` to understand the shared helpers available on `GCal`.

---

## Step 4 — Create `pipeline/sources/<site-slug>.js`

Follow the meetup.js pattern exactly. Write the best extractor you can using:
- General knowledge of the site's page structure, OR
- Common fallback selectors (`h1` for title, `time[datetime]` for start, etc.)

The integration test in Step 12 will show you what is actually extracted from the real HTML, so you can improve the extractor at that point if needed.

Skeleton to follow:
```js
// <Site> event pages: https://<site>/<path-pattern>
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
    name: "<site-slug>",
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

---

## Step 5 — Regenerate the load order

```bash
npm run index
```

Verify `pipeline/load-order.generated.json` now includes your new source file in the sorted list.

---

## Step 6 — Add to `ui/toolbar-icon.js`

Open `ui/toolbar-icon.js`. Inside the `importScripts(...)` call, add the new source **in alphabetical order** among the other sources:
```js
"/pipeline/sources/<site-slug>.js",
```

---

## Step 7 — Create placeholder data files

```bash
# Zero-byte placeholder — the refresh script fills this in
touch data/<case-name>.html

# URL file — contains just the event URL, nothing else
printf '%s' '<event-url>' > data/<case-name>.url
```

The empty HTML file is the signal for the refresh script; do not put any content in it.

---

## Step 8 — Commit and push (Phase 1)

```bash
git add \
  pipeline/sources/<site-slug>.js \
  pipeline/load-order.generated.json \
  ui/toolbar-icon.js \
  data/<case-name>.html \
  data/<case-name>.url

git commit -m "feat: add <site> extractor stub (Refs #{{ISSUE_NUMBER}})"
git push -u origin claude/extractor/<site-slug>
```

---

## Step 9 — Trigger the "Refresh cached HTML files" workflow

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/{{REPO}}/actions/workflows/refresh-cache.yml/dispatches" \
  -d "{\"ref\":\"claude/extractor/<site-slug>\"}"

echo "Triggered refresh-cache on branch claude/extractor/<site-slug>"
```

---

## Step 10 — Find the run ID

Wait 15 seconds for the workflow run to be registered, then get its ID:

```bash
sleep 15

RUNS=$(curl -s \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{{REPO}}/actions/runs?branch=claude/extractor/<site-slug>&event=workflow_dispatch&per_page=10")

RUN_ID=$(echo "$RUNS" | python3 -c "
import json, sys
d = json.load(sys.stdin)
runs = [r for r in d.get('workflow_runs', []) if 'refresh' in r['name'].lower()]
print(runs[0]['id'] if runs else '')
")

echo "Refresh-cache run ID: $RUN_ID"
```

If `RUN_ID` is empty, wait another 15 seconds and retry the curl command — the run may not have been created yet.

---

## Step 11 — Poll until the refresh workflow completes

```bash
while true; do
  DATA=$(curl -s \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/{{REPO}}/actions/runs/$RUN_ID")

  STATUS=$(echo "$DATA"     | python3 -c "import json,sys; r=json.load(sys.stdin); print(r.get('status',''))")
  CONCLUSION=$(echo "$DATA" | python3 -c "import json,sys; r=json.load(sys.stdin); print(r.get('conclusion') or '')")

  echo "$(date -u +%H:%M:%S)  status=$STATUS  conclusion=$CONCLUSION"
  [ "$STATUS" = "completed" ] && break
  sleep 30
done

if [ "$CONCLUSION" != "success" ]; then
  echo "ERROR: refresh-cache workflow ended with conclusion=$CONCLUSION"
  echo "Run: https://github.com/{{REPO}}/actions/runs/$RUN_ID"
  exit 1
fi
echo "Refresh succeeded."
```

---

## Step 12 — Pull the filled HTML

```bash
git pull origin claude/extractor/<site-slug>
wc -c data/<case-name>.html
```

The file must be non-empty (typically tens of KB). If it is still 0 bytes, the refresh failed silently — check the workflow run logs.

---

## Step 13 — Bootstrap the integration case and see actual output

Create `test/integration/cases/<case-name>.json` with a placeholder:
```json
{
  "description": "<Site>: <one-line description of what this case tests>",
  "expected": {
    "events": []
  }
}
```

Run the live tests — they will fail on your new case but print the **actual extracted values**:
```bash
npm run test:live 2>&1
```

Read the test failure output carefully. It shows what the extractor produced from the real HTML.

---

## Step 14 — Update the case with real expected values

Replace the `"expected"` object in `test/integration/cases/<case-name>.json` with the actual output from Step 13. Then confirm the tests pass:
```bash
npm run test:live
```

If important fields (title, start, location) are wrong or empty, examine `data/<case-name>.html` to find the correct selectors and update `pipeline/sources/<site-slug>.js`, then re-run `npm run test:live`.

Also run the full offline suite to catch regressions:
```bash
npm run test:offline
```

---

## Step 15 — Commit Phase 2

```bash
git add test/integration/cases/<case-name>.json
git add pipeline/sources/<site-slug>.js   # include only if you modified it

git commit -m "feat: add <site> integration test case (Refs #{{ISSUE_NUMBER}})"
git push
```

---

## Step 16 — Open a pull request

```bash
gh pr create \
  --base main \
  --head "claude/extractor/<site-slug>" \
  --title "feat: add <site> extractor" \
  --body "Implements the extractor for <site>.

## Changes
- \`pipeline/sources/<site-slug>.js\` — site-specific extractor
- \`pipeline/load-order.generated.json\` — regenerated
- \`ui/toolbar-icon.js\` — importScripts list updated
- \`data/<case-name>.html\` + \`data/<case-name>.url\` — cached event page
- \`test/integration/cases/<case-name>.json\` — integration case

Closes #{{ISSUE_NUMBER}}"
```

---

## Step 17 — Trigger CI on the branch

A push or PR made with the workflow's `GITHUB_TOKEN` does **not** start the
`Tests` workflow — GitHub suppresses workflow runs triggered by `GITHUB_TOKEN`
to prevent recursion. The one exception is `workflow_dispatch`. `test.yml` has a
`workflow_dispatch:` trigger, so dispatch it explicitly against your branch; the
resulting run executes against the branch's head commit, so its checks attach to
that commit and show up on the PR for the reviewer.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/{{REPO}}/actions/workflows/test.yml/dispatches" \
  -d "{\"ref\":\"claude/extractor/<site-slug>\"}"

echo "Triggered Tests workflow on claude/extractor/<site-slug>"
```

Do not wait for this run to finish or merge based on it — opening the PR is the
end of the agent's job. The reviewer reads the CI result on the PR.

---

## Step 18 — Comment on the issue

```bash
PR_URL=$(gh pr view "claude/extractor/<site-slug>" --json url -q .url 2>/dev/null || echo "(see Actions run)")

gh issue comment {{ISSUE_NUMBER}} \
  --body "The extractor has been implemented. PR ready for review: $PR_URL

The integration case uses a real cached event page. Please review the extractor logic and the extracted field values before merging."
```

---

## Hard constraints

- **Never auto-merge.** Open a PR; a human must review and approve.
- **The three `<case-name>` files must match exactly**: `data/<name>.html`, `data/<name>.url`, `test/integration/cases/<name>.json`.
- **No `url` field in the case JSON.** The URL lives in `data/<name>.url` only.
- **`matches(host)` must be correct.** It is the gate that turns the toolbar icon green on supported pages.
- **Integration case `expected` values must reflect real extraction** — copy them from the `npm run test:live` output, not from guessing.
