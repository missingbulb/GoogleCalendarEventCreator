## 2026-07-28 · declined · the scraperapi-fetch-surface check (#776)
- **Source:** the prose-to-checks sweep of #776 (Refs #773), which converted all-page-fetching and
  then dropped the check.
- **Reason:** it derived a usage rule (one fetching module, one key-holding workflow) from an
  implementation choice, not an invariant with a silent-failure mode like `custom-sources-flat`'s.
- **Actor:** @missingbulb (owner), in review of #776.

## 2026-10-21 · declined · an extension-test-mirrors check (#1555)
- **Source:** the prose-to-checks sweep of #1555, over the gcec pack's RULES.md.
- **Reason:** the checkable half (every `extension-test/<area>/<name>.test.js` has an
  `extension/<area>/<name>.js`) already fails on the tree today — `extension-test/event-extractors/extraction.test.js`
  is a departure the rule does not list — so a blocking check would red on correct work, and allowlisting that file would pin
  today's tree. The sweep's other candidates were already proven by existing suites (`load-order.test.js`,
  `supported-domains.test.js`) or are product statements.
- **Actor:** the `claudinite/prose-to-checks-sweep` task.
