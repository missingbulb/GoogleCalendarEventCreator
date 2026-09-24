## 2026-06-18 · born · lessons from the declarativeContent icon PR (#367)
- **Source:** the icon change's CI loop, where awaiting `getRules` over CDP hung until the job timed
  out.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a gotcha in `docs/technicalGotchas.md`.
- **Landed:** #367.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md codebase gotcha, injected at session start.
- **Landed:** #680.

## 2026-07-31 · reworded · gcec: growth-dedup (#802)
- **Reason:** the plain-promises fix is chrome-extension canon and the bound-every-await rule basics
  canon; kept where the traps bit here.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #802 (Refs #798).
