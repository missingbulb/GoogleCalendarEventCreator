## 2026-06-24 · born · delegate all page fetching to ScraperAPI (#518)
- **Reason:** `render=true` output shifts between records, so a re-record can move a live case's
  expected.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a gotcha in the always-imported docs.
- **Landed:** #518.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section, injected at session start.
- **Landed:** #680.
