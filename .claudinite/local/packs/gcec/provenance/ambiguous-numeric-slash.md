## 2026-07-18 · born · gcec pack: capture the locale-driven ambiguous-slash-date rule (#686)
- **Source:** the generic extractor's fix reading ambiguous slash dates day-first on non-US-locale
  pages (1760d65).
- **Reason:** resolution is central in `helpers/dates.js`, so a per-source choice or a guess would
  split the behavior.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section.
- **Landed:** #686.
