## 2026-06-16 · born · default extractor: dotted/day-first dates and og:title cleanup (#216)
- **Reason:** setting `GCal.sources = []` is the one way to see the unsupported-host path on a
  supported host's cached page.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a note in the always-imported docs.
- **Landed:** #216.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section, injected at session start.
- **Landed:** #680.

## 2026-07-26 · reworded · Make the generic extractor the core base layer every source overrides (#758)
- **Reason:** `GCal.extract()` alone now carries a supported site's overrides; clearing the sources
  shows the bare base, and a case with no gap is a candidate for deleting its source.
- **Actor:** @missingbulb (owner).
- **Landed:** #758.
