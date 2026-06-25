# Testing practices (local working set)

Portable test-discipline practices captured here, not yet in the shared canon
([claude/shared/testingPractices.md](../claude/shared/testingPractices.md)).
`optimize-procedures` promotes these up and prunes them once the canon absorbs
them (capture is always local — see [claude/workflow.md](../claude/workflow.md)).

## jsdom traps that don't match a real browser

A DOM faked with jsdom diverges from Chrome in ways that let a green test hide a
broken production path — two that recur:

- **`body.innerText` is null in jsdom.** Code that reads `el.innerText ||
  el.textContent` therefore gets `textContent` under test — which *includes*
  `<script>`/`<style>` contents, `<select>`/`<option>` text, and CSS-hidden text
  that a real browser's `innerText` omits. A visible-text scrape can pass against
  cached HTML yet find nothing (or the wrong thing) in Chrome; treat body-text
  results as jsdom-optimistic, and don't add a test that only passes because of it.
- **`runScripts: "outside-only"` (the default) parses `<noscript>` into live DOM —
  the opposite of a real browser.** With scripting off, jsdom turns `<noscript>`
  content into real elements, so a `textContent` read looks clean under test but
  splices the `<noscript>` markup into the value in Chrome (which, scripting on,
  keeps `<noscript>` as raw text). To reproduce the browser, parse a script-free
  fragment with `runScripts: "dangerously"`.

## A moved snapshot / golden baseline needs owner approval, not silent regeneration

When a change makes a snapshot/golden test fail because the *output* legitimately
moved (the pixels or bytes changed), don't quietly regenerate the baseline to make
the suite green — an unreviewed baseline change is an unreviewed behavior change.
Surface the diff (the committed **expected**, the newly-rendered **actual**, and a
highlighted **diff**) and get explicit owner approval before re-baselining. While
waiting, keep the *reverted* (expected) baseline committed so the branch honestly
shows the test red-pending — never commit the new baseline first. On approval,
regenerate and confirm green; on rejection, leave the change in place and discuss.

## Render time-dependent tests against a pinned reference "now", not the wall clock

Any test whose output depends on the current date/time (a "past"/"upcoming" badge, a
relative date) rots as the wall clock advances if it reads the real clock — a
snapshot authored today silently changes meaning next month. Thread a single pinned
reference instant into every test entry point and render against that, so
date-bearing snapshots stay deterministic forever. Author neutral cases on or after
the pinned day so they don't accidentally trip a date-dependent branch; reach for a
past or future date only when a case is deliberately pinning that branch.
