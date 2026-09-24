## 2026-07-16 · born · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Reason:** always-relevant rules become RULES.md, injected at session start; activity-scoped
  procedures become skills surfaced on demand; the first always-testable rule becomes a check
  (`test-offline-list-sync`).
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** the pack manifest, declared by hand in the settings and never fingerprinted or
  seeded, since a local pack is project content.
- **Rejected:** a second `extractor-pipeline` pack holding the create-extractor and
  fallback-coverage routines as run-daily workers - folded into gcec's "Extractor pipeline" section
  because the run-daily mechanism was not ready for local-pack jobs.
- **Landed:** #680.

## 2026-07-23 · moved · Phase 1 (GCEC pilot): per-project scheduling cutover (#700)
- **Reason:** `.claudinite/local_packs/` became `.claudinite/local/packs/`, the single scan root,
  and the declaration token became `local/gcec`.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 4.8, per the commit trailer.
- **Mechanism:** the pack manifest, unchanged.
- **Landed:** #700 (Refs #394).

## 2026-07-26 · reworded · convert create-extractor to a scheduled gcec task (#757)
- **Reason:** the add-live-case skill left the manifest.
- **Actor:** @missingbulb (owner).
- **Landed:** #757.

## 2026-07-30 · scope-changed · Claudinite maintenance (#793)
- **Reason:** the manifest failed the pack schema: `ruleRoutingGuidance` added, `rules` renamed
  `worldRules`, the dead `run_daily` dropped.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the pack manifest.
- **Landed:** #793 (Refs #794).
