# Fallback-coverage routine

Daily Claude **Opus** routine. Goal: make the **generic** fallback extractor
(`extension/event-extractors/extract-unsupported.js` + `extension/event-extractors/helpers/*.js`)
recover more of what the dedicated per-site sources get. Runs unattended on a fresh
clone, offline against the committed fixtures. **Most runs correctly change nothing.**

## 1. Preconditions

```sh
bash dev/incremental-maintenance/auto-fallback-coverage/preconditions.sh
```

Non-zero exit → **stop the routine**: no change, no branch, no PR, nothing to log.

## 2. Attempt one generic win

From the baseline matrix the script printed, pick a `~` (value gap) or `✗` (found
nothing) and close it — but only with a **generic** change: one keying off a
widely-used convention (date↔time separators, start–end ranges, "Event @ Venue"
titles, ordinals; schema.org JSON-LD, OG/meta, microdata, `<time datetime>`), not
one page's quirk. Do **not** invent `ctz` or `eventLengthInMinutes`, and do **not**
override a miss a unit test deliberately asserts. Cover the change with a new or
extended test in `extension-test/event-extractors/extraction.test.js`, red-before-green.

If no clean generic win exists, print `No generic fallback-coverage improvement found.`
and stop — this is the common, correct outcome.

## 3. Postconditions

Pass every value the change newly recovered via the body-text scan as arguments:

```sh
bash dev/incremental-maintenance/auto-fallback-coverage/postconditions.sh "<recovered value>" ...
```

- Exit 0 → the win is valid; go to step 4.
- **Non-zero → the run has FAILED.** Do not retry and do not open a PR; surface the
  failure so guiding prose can be re-introduced to this routine.

## 4. Open a PR (never merge)

Branch `claude/fallback-coverage/<date>`, commit the change plus the regenerated
GENERATED artifacts, push, and open a **PR for review** (it never merges itself).
PR body: the hypothesis, why it's generic (which unseen sites it helps), how the
jsdom trap was ruled out, the before→after numbers, and the covering test.

Then log the run as a dated comment on the standing *Auto-Improvements Tracker -
Fallback Extractor Coverage* issue (find it **by title**, currently #366; open it
if missing, reopen it if closed), and `Refs` that issue in the PR.
