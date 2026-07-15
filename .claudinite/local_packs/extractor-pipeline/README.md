# extractor-pipeline pack (local)

A **local pack** of this repo (`.claudinite/local_packs/` — tracked project
content, run by the same Claudinite engine as the canon packs). It bundles the
extractor-automation domain: prose rules, two `run_daily` tasks (each task's
gate `.mjs` sits beside the routine folder that is its worker), and one skill.
Declared by hand in [`.claudinite-checks.json`](../../../.claudinite-checks.json)
like any pack; never fingerprinted or seeded.

## Contents

| Slot | What |
|---|---|
| Prose | [RULES.md](RULES.md) — fetching via ScraperAPI, facebook limits, re-record drift, fetch-page attendance, fallback-gate invariants |
| Checks | none yet — the fallback-coverage gate already enforces its territory as an npm test |
| Daily tasks | [create-extractor](run_daily/create-extractor.mjs) (gate: open `extractor-request` issues; worker: [routine.md](run_daily/create-extractor/routine.md)) · [auto-fallback-coverage](run_daily/auto-fallback-coverage.mjs) (gate: project changed; worker: [routine.md](run_daily/auto-fallback-coverage/routine.md)) |
| Skills | [add-live-case](skills/add-live-case/SKILL.md) — record a cached page and author its reviewed live case |

## Prose rules (`RULES.md`)

| Rule (≤5 words) | How enforced |
|---|---|
| Fetch pages via ScraperAPI workflow | prose |
| Facebook stays unit-tests-only | prose |
| Re-record drift is legitimate | prose |
| fetch-page is dispatcher-attended | prose |
| Fallback gate: high-watermark, re-anchor | check (the npm-test gate itself) + prose caveat |
| Force fallback via empty sources | prose |
