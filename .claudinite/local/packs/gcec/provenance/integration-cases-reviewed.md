## 2026-06-13 · born · integration cases stressed as the reviewed contract (323e8db)
- **Reason:** the owner reviews the extractor expecteds, never the unit tests, so a change proven
  only by a unit test is unreviewed.
- **Actor:** a Claude session for @missingbulb (owner).
- **Mechanism:** a CLAUDE.md rule, loaded in every session.
- **Landed:** commit 323e8db.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md testing invariant, injected at session start.
- **Landed:** #680.
