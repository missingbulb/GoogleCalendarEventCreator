## 2026-07-28 · declined · the scraperapi-fetch-surface check (#776)
- **Source:** the prose-to-checks sweep of #776 (Refs #773), which converted all-page-fetching and
  then dropped the check.
- **Reason:** it derived a usage rule (one fetching module, one key-holding workflow) from an
  implementation choice, not an invariant with a silent-failure mode like `custom-sources-flat`'s.
- **Actor:** @missingbulb (owner), in review of #776.

## 2026-10-11 · declined · the extension-test-mirrors check (#1514)
- **Source:** the prose-to-checks sweep of #1514, over the `extension-test/` mirror bullet.
- **Reason:** not statically checkable as written. The tree already departs from it both ways
  (`event-extractors/extraction.test.js` mirrors no source, and `config.js`, `registry.js` and
  `assemble-events.js` have no test), so either direction would fire on today's correct work, and
  encoding the exemptions would pin the current tree instead of the rule.
- **Actor:** Claude (unattended sweep), no owner review yet.
