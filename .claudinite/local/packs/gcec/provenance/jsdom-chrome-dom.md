## 2026-06-16 · born · default extractor: dotted/day-first dates and og:title cleanup (#216)
- **Source:** the jsdom body-text trap first appears in the docs here; the rule cites #130/#137.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a gotcha in the always-imported docs.
- **Landed:** #216.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md codebase gotcha, injected at session start.
- **Landed:** #680.

## 2026-07-23 · reworded · strip the jsdom + GCal gotchas the canon now covers (3967cb9)
- **Reason:** the test-side traps had reached the canon; kept only
  the production strip remedy the canon, framed for tests, leaves out.
- **Model:** Claude Opus 4.8, per the commit trailer.
- **Rejected:** the corrupt run in PR #713, which "rephrased" by re-importing canon prose instead of
  stripping.
- **Landed:** commit 3967cb9 (Refs #685).
