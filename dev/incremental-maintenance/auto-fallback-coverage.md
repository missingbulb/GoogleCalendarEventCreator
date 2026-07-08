# Automated daily fallback-coverage routine

A daily Claude **Opus** Claude Code routine (not a GitHub Actions workflow) tries
to make the **generic** fallback extractor recover **more** of what the dedicated
per-site sources get, measured by the fallback-coverage gate. Like the lessons
digest it runs unattended on a fresh clone, fully **offline** against the committed
`dev/requirements/extractor/data/**/*.html` fixtures (the environment may block live fetches) — and **most runs
correctly change nothing**: the gate already captures every prior win, so a
genuinely new *generic* win is rare, and a forced or fake one is worse than
nothing. A no-win run means no branch and no PR.

## Precondition — skip the run when nothing meaningful changed in the last 24h

**Before doing anything else** (before the baseline `npm install` / `test:live`
run), gate the whole routine on there having been a **meaningful code change in the
last 24 hours** on the base branch (`main`). Most days nothing lands, and a run
over unchanged code re-derives yesterday's answer and burns a full Opus run for
nothing — so an idle repo should skip. This is just a cheap "has anything happened
lately?" gate, **not** a prediction that the change will yield a win.

A **meaningful code change** is any commit in the window that touches real source —
i.e. *not* a commit whose files are entirely docs (`*.md`) or derived **GENERATED**
/ generated artifacts (those are outputs, not inputs). It is **deliberately broad
and reusable** across the daily routines: don't try to prove a change is relevant
to fallback coverage specifically before running. **When in doubt, run** — a run
that finds nothing is cheap and self-correcting (it just makes no PR), whereas a
too-clever gate that skips a real opportunity is not. So the only things that
suppress a run are an idle repo or pure docs/generated churn.

Check it directly on the fresh clone, e.g.:

```sh
git log --since="24 hours ago" origin/main --name-only --pretty=format: \
  | grep -Ev '(^$|\.md$|GENERATED|\.generated\.)' | grep -q . || echo "nothing meaningful"
```

If nothing meaningful changed, **stop immediately** — no baseline run, no branch,
no PR, and nothing to log on the tracking issue — and print
`"No meaningful code changes in the last 24h — skipping fallback-coverage run."`
Otherwise proceed to the baseline run below.

## Scope — the only code it may change

Just the **generic** extractor: `extension/event-extractors/extract-unsupported.js` and the shared
`extension/event-extractors/helpers/*.js`. *Generic* means a change that keys off a **widely-used**
convention and would plausibly help unseen sites — display conventions
(date↔time separators, start–end time ranges, "Event @ Venue" titles, ordinals)
or standard machine-readable signals (schema.org JSON-LD, Open Graph/meta,
microdata, `<time datetime>`). **Not** generic, so out of scope: lifting one
`extension/event-extractors/custom/<site>.js`'s logic into the fallback, or special-casing a host —
if the only beneficiary is a single case and the rule wouldn't fire elsewhere, it
isn't generic.

## How it measures (the gate)

The fallback-coverage gate lives in `dev/requirements/extractor/fallback/` and runs in
`test:live`: `fallback-coverage.test.js` (the high-watermark gate; logic in
`fallback-coverage.js`), the scorecard `fallback-coverage.GENERATED.md`, and the
watermark `fallback-coverage.baseline.GENERATED.json`. Gate mechanics are
documented in [testing.md](../procedures/testing.md)'s "fallback-coverage gate" — read it, don't
restate it here. Baseline first (`npm install` then `npm run test:live`), reading
the "fallback value differences (informational)" console block and the
per-exemplar matrix (✓ match · ~ different value · ✗ missing · — n/a): a `~`
usually points at a concrete generic gap, a `✗` means it found nothing.

That baseline run **is** the unmodified-code reference — it fixes the pre-change
numbers and case set. Attribute any post-change delta by comparing against it;
don't re-derive the pre-change numbers with a `git stash`/rerun round trip (it also
conflicts on the `ours`-driver GENERATED artifacts). A committed baseline listing
**fewer** `cases` than the live run (a case an earlier merge added without
`npm run regen`) is pre-existing drift the baseline run already proves isn't yours —
not something your change introduced.

## The two traps that disqualify a "win" — the crux

- **(a) jsdom artifacts.** In tests the body-text scan reads
  `document.body.textContent` (jsdom's `innerText` is null), which **includes**
  `<script>` JSON (e.g. Next.js `__NEXT_DATA__`), `<select>/<option>`, and
  CSS-hidden text — none of which Chrome's `innerText` exposes. A gain from the
  body-text scan matching such content is **illusory**; before trusting one,
  `grep -n "<value>" data/<case>.html` and reject it if it lives inside a
  `<script>` or hidden markup. A real win comes from visible text or a
  Chrome-read DOM attribute (meta / JSON-LD / microdata / `<time datetime>`).
  (Same jsdom-vs-Chrome class as the notes in [technicalGotchas.md](../procedures/technicalGotchas.md).)
  **Widening a body-text scan window (raising a `slice`/scan cap) is trap (a) at
  corpus scale — grepping the target case is not enough.** A larger window can make
  a *different* case that currently finds nothing start matching a `<script>` blob
  it previously never reached (a jsdom-only false positive Chrome's `innerText`
  wouldn't hit), silently corrupting that case's future test behavior. Before
  raising any cap, re-run the **whole** corpus at the new size — ideally also with
  `<script>/<style>/<noscript>` stripped first (approximating `innerText`) — and
  confirm no *other* case gains a wrong value; pick a bound comfortably above the
  real win but below the nearest offending blob.
- **(b) deliberate decisions.** Some misses are intentional and pinned by a unit
  test (e.g. a date with intervening non-separator text before its time is
  all-day, in `extension-test/event-extractors/extraction.test.js`). Never "fix" what a test
  deliberately asserts. And `ctz` (an IANA zone) and `eventLengthInMinutes` are
  usually not derivable generically — don't invent them (a wrong `ctz` is worse
  than none); `start`/`end` match when they resolve to the same instant, so don't
  chase representation-only differences.

## Discipline

Red-before-green (confirm the new test fails on the pre-change code, passes
after); cover every change with an existing integration case or a focused unit
test in `extension-test/event-extractors/extraction.test.js`; full suite green (`npm test`) and
`npm run test:live` regenerates the GENERATED artifacts. Every gated % must be
**≥** its previous value (no field regressed) and at least one must improve — a
change that lifts one field but drops another isn't clean, so drop it. Never
weaken a test or lower the gate; never hand-edit a GENERATED file (commit the
regenerated baseline + scorecard).

## Output: a PR, never a merge

On a clean, generic, Chrome-real, test-covered win: branch
`claude/fallback-coverage/<date>`, commit, push, open a **PR for review**. The PR
body states the hypothesis, **why** it's generic (which unseen sites it helps),
**how** the jsdom trap was ruled out, the before→after numbers, and the covering
test. It never merges — from there it merges through the usual flow (see
[github.md](../procedures/github.md)) and CI must go green **twice** (it touches `test:live`).
No win → no branch, no PR; print "No generic fallback-coverage improvement found."

## Tracking: log each run under the routine's own issue

When a run produces a PR, log it on this routine's standing tracking issue — the
*Auto-Improvements Tracker - Fallback Extractor Coverage* issue (find
it **by title**, currently **#366**, not a hard-coded number; if it doesn't exist,
open it). Log the run as a **dated comment** on that issue — **not** a sub-issue —
so it accumulates a scrollable history of every run over time; also reference the
issue from the PR (`Refs #366`). The issue is long-lived: if it was **closed**,
**reopen it** when a run needs logging (a closure while the routine is still
producing PRs is stale). Each daily routine keeps its own such issue.
