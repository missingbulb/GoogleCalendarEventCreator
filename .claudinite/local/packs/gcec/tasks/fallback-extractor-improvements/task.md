# Fallback-coverage routine

Weekly Claude routine (on a strong model), offline on a fresh clone. Goal: make the **generic**
fallback extractor — `extension/event-extractors/extract-unsupported.js` and the
shared `extension/event-extractors/helpers/*.js` — recover **more** of what the
dedicated per-site sources get, measured by the fallback-coverage gate. **Most runs
correctly change nothing** — the gate already banks every prior win, so a new
generic win is rare and a forced or fake one is worse than none. No win → no branch,
no PR.

## 1. Scope — the strong model runs only because the cheap gate already passed

This task is a two-tier run, cheap gate first: the **scheduler** (a pure-code Action,
no model at all) ran this task's precondition (`task.mjs`, over the `commits` signal),
and only *because* it found a meaningful change did it dispatch you — a strong-model
subagent — via the `ready-for-agent` issue. Most weeks the gate skips and no strong
model ever boots; you are paid for solely on the weeks there's real work. (This is
the "cheap dispatcher front door" cost model — the scheduler precondition is that
front door, cheaper than a dispatcher session because it runs no model.)

So **you don't re-run that gate.** The dispatch issue's **Context** names the
substantive commits in the window; treat it as binding scope and don't re-litigate
whether to run. Still: **most runs correctly change nothing** (below), so "ran" never
means "must produce a PR".

## 2. Measure the baseline

```sh
npm install && npm run test:live
```

The gate prints a "fallback value differences (informational)" block and a
per-exemplar matrix (✓ match · ~ different value · ✗ missing · — n/a): a `~` is a
concrete generic gap the fallback gets wrong, a `✗` a field it finds nothing for —
your candidate targets. This run is your pre-change reference (the committed
`fallback-coverage.baseline.GENERATED.json`); don't `git stash`/rerun to re-derive
it — that conflicts on the `ours`-driver GENERATED artifacts. A committed baseline
listing **fewer** `cases` than the live run is pre-existing drift, not something
your change introduced. Gate mechanics: [the gcec pack’s RULES.md](../../RULES.md)
(and the gate's own headers).

## 3. Improve — the feedback loop

Pick one or a few `~`/`✗` gaps and close them, iterating: **hypothesize → edit only
the generic extractor / helpers → `npm run test:live` → compare to the baseline**,
until you have one or more clean wins (or conclude there are none). Every change
must clear the bars **postconditions.sh** enforces in step 4 — hold to them as you
work, because a run that trips one there is marked **failed**:

- **Generic only** (postcondition: *scope*). Key off a widely-used convention that
  would help unseen sites — display conventions (date↔time separators, start–end
  ranges, "Event @ Venue" titles, ordinals) or machine-readable signals (schema.org
  JSON-LD, OG/meta, microdata, `<time datetime>`). Lifting one `custom/<site>.js`'s
  logic or special-casing a host is out of scope: if the only beneficiary is a
  single case and the rule wouldn't fire elsewhere, it isn't generic. **The only
  files you may leave changed are `extract-unsupported.js`, `helpers/*.js`, your
  covering test in `extension-test/event-extractors/extraction.test.js`, and the
  regenerated fallback-coverage GENERATED artifacts** — anything else fails scope.
- **A real, non-regressing win** (postcondition: *win*, via the suite's gate). Every
  gated % must end **≥** its baseline and at least one strictly higher; a change
  that lifts one field but drops another isn't clean — drop it.
- **No illusory win** (postcondition: *jsdom*). The offline body-text scan reads
  `document.body.textContent`, which includes `<script>` JSON (Next.js
  `__NEXT_DATA__`), `<noscript>`, `<style>`, `<select>/<option>`, and CSS-hidden
  text — none of which Chrome's `innerText` exposes. A win matching only such
  content is illusory; a real one comes from visible text or a Chrome-read attribute
  (meta / JSON-LD / microdata / `<time datetime>`). **In step 4 you must pass every
  value the change newly recovered via the body-text scan** so this is checked.
  (Widening a scan-window cap can make a *different* case match a `<script>` blob it
  never reached — re-run the whole corpus before raising any cap.)
- **No forbidden win.** Don't invent `ctz` or `eventLengthInMinutes` (a wrong `ctz`
  is worse than none). `ctz` may only be *derived*, never guessed: two independent
  page-declared hints must agree — the contract
  `extension/event-extractors/helpers/derive-timezone.js` implements (#674/#676) —
  so never weaken its refusal rules for a coverage win. When a change fills a field
  generically, also check the cases whose dedicated source deliberately leaves that
  field EMPTY (stubhub/seetickets set no `ctz`) still come out empty — a "win"
  there silently breaks strict parity. `start`/`end` already match when they
  resolve to the same instant, so don't chase representation-only differences;
  never override a miss a unit test deliberately asserts.
- **Covered and clean.** Add or extend a case in
  `extension-test/event-extractors/extraction.test.js`, red-before-green; the full
  `npm test` must be green (postcondition: *suite*). Never weaken a test, lower the
  gate, or hand-edit a GENERATED file — commit the regenerated baseline + scorecard
  as produced.

If no clean generic win emerges, print `No generic fallback-coverage improvement found.`
and stop.

## 4. Postcondition

Pass every value the change newly recovered via the body-text scan as arguments:

```sh
bash .claudinite/local/packs/gcec/tasks/fallback-extractor-improvements/postconditions.sh "<recovered value>" ...
```

- Exit 0 → the win is valid; go to step 5.
- **Non-zero → the run has FAILED.** Do not retry and do not open a PR; surface the
  failure so guiding prose can be re-introduced to this routine.

## 5. Open the PR (never merge)

Branch `claude/fallback-coverage/<date>`, commit the change plus the regenerated
GENERATED artifacts, and push. Then open a **PR for review** — it never merges
itself; from there it goes through the usual flow (the gcec pack's
[merge-and-ci skill](../../skills/merge-and-ci/SKILL.md)), and CI must
go green **twice** (it touches `test:live`). PR body: the hypothesis, why it's generic (which unseen sites
it helps), how the jsdom trap was ruled out, the before→after numbers, and the
covering test.

Then log the run as a dated comment (**not** a sub-issue) on the standing
*Auto-Improvements Tracker - Fallback Extractor Coverage* issue (find it **by
title**, currently #366; open it if missing, reopen it if closed) so it builds a
scrollable history, and `Refs` that issue in the PR.
