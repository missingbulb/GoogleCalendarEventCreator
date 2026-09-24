## 2026-07-04 · born · doc: injected block markup silently empties a <p> (#612)
- **Source:** building `custom/tel-aviv.js` (#602), where Angular's ng-bind-html put a `<div>`
  inside a `<p>`.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a gotcha in `technicalGotchas.md`.
- **Landed:** #612.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md codebase gotcha, injected at session start.
- **Landed:** #680.
