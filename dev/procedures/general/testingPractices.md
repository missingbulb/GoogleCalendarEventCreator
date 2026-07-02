# Testing practices (local working set)

Portable test-discipline practices captured here, not yet in the shared canon.
`optimize-procedures` prunes or rephrases them once the shared canon comes to cover
them (capture is always local — see
[this_project/workflow.md](../this_project/workflow.md)).

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

## Mirror the test tree to the source tree, one test per source file

Lay the test directory out as a parallel of the source tree — `src/<area>/<name>`
tested by `test/<area>/<name>.test` at the same relative path. The path *is* the
link, so a source file never has to name its own test, and a missing or misfiled
test is obvious at a glance. Keep departures (whole-interaction tests, files with
no single unit to mirror) few and deliberate.
