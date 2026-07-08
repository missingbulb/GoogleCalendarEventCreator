# Fallback-coverage routine

Daily Claude **Opus** routine, offline on a fresh clone. Goal: make the **generic**
fallback extractor — `extension/event-extractors/extract-unsupported.js` and the
shared `extension/event-extractors/helpers/*.js` — recover **more** of what the
dedicated per-site sources get, measured by the fallback-coverage gate. **Most runs
correctly change nothing**, and that is a success: no win → no branch, no PR.

## 1. Precondition

```sh
bash dev/incremental-maintenance/auto-fallback-coverage/preconditions.sh
```

Non-zero exit → **stop**: nothing meaningful changed; no branch, no PR, nothing to log.

## 2. Measure the baseline

```sh
npm install && npm run test:live
```

The fallback-coverage gate prints a "fallback value differences (informational)"
block and a per-exemplar matrix (✓ match · ~ different value · ✗ missing · — n/a).
Read it: a `~` is a concrete generic gap the fallback gets wrong; a `✗` is a field
it finds nothing for. These are your candidate targets.

## 3. Improve — the feedback loop

Pick one or a few `~`/`✗` gaps and close them, iterating: **hypothesize → edit only
the generic extractor / helpers → `npm run test:live` again → compare to the
baseline**, until you have one or more clean wins (or conclude there are none).
Constraints on every change:

- **Generic only.** Key off a widely-used convention that would help unseen sites —
  display conventions (date↔time separators, start–end ranges, "Event @ Venue"
  titles, ordinals) or machine-readable signals (schema.org JSON-LD, OG/meta,
  microdata, `<time datetime>`). Lifting one `custom/<site>.js`'s logic, or
  special-casing a host, is out of scope.
- **No illusory or forbidden wins.** Don't trust a body-text match that only exists
  in `<script>`/hidden markup; don't invent `ctz` or `eventLengthInMinutes`; don't
  override a miss a unit test deliberately asserts.
- **Cover it**, red-before-green, with a new or extended case in
  `extension-test/event-extractors/extraction.test.js`.

If no clean generic win emerges, print `No generic fallback-coverage improvement found.`
and stop.

## 4. Postcondition

Pass every value the change newly recovered via the body-text scan as arguments:

```sh
bash dev/incremental-maintenance/auto-fallback-coverage/postconditions.sh "<recovered value>" ...
```

- Exit 0 → the win is valid; go to step 5.
- **Non-zero → the run has FAILED.** Do not retry and do not open a PR; surface the
  failure so guiding prose can be re-introduced to this routine.

## 5. Open the PR (never merge)

Branch `claude/fallback-coverage/<date>`, commit the change plus the regenerated
GENERATED artifacts, and push. Then open a **PR for review** (never merge) whose
body gives the hypothesis, why it's generic (which unseen sites it helps), how the
jsdom trap was ruled out, the before→after numbers, and the covering test.

Then log the run as a dated comment on the standing *Auto-Improvements Tracker -
Fallback Extractor Coverage* issue (find it **by title**, currently #366; open it
if missing, reopen it if closed), and `Refs` that issue in the PR.
