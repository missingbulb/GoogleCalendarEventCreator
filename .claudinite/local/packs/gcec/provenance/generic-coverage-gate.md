## 2026-06-17 · born · testing.md slimmed to guidelines (#301)
- **Source:** the fallback-coverage gate of #236/#242, and #240's stale-case failure.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a gotcha in the always-imported docs.
- **Landed:** #301.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section, injected at session start.
- **Landed:** #680.

## 2026-07-26 · reworded · Make the generic extractor the core base layer every source overrides (#758)
- **Reason:** the fallback vocabulary was retired: the fallback-coverage gate became
  generic-coverage.
- **Actor:** @missingbulb (owner).
- **Landed:** #758.

## 2026-07-31 · reworded · gcec: growth-dedup (#802)
- **Reason:** the watermark's shared-case-set design is in the canon writing-tests skill; the
  stale-case mechanics and caveat remain.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #802 (Refs #798).
