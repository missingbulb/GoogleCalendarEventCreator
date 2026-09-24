## 2026-07-28 · declined · the scraperapi-fetch-surface check (#776)
- **Source:** the prose-to-checks sweep of #776 (Refs #773), which converted all-page-fetching and
  then dropped the check.
- **Reason:** it derived a usage rule (one fetching module, one key-holding workflow) from an
  implementation choice, not an invariant with a silent-failure mode like `custom-sources-flat`'s.
- **Actor:** @missingbulb (owner), in review of #776.
