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

## 2026-10-25 · declined · the testing-guide / snapshot-approval / merge-and-ci skill prose (#1574)
- **Source:** the prose-to-checks sweep of #1574 (Refs #1555), over the gcec pack's skills.
- **Reason:** the rules found there are in-flight procedure (hold the baseline until approval, poll back-off,
  never hand-write expecteds) that leave no artifact a scan could observe, or describe how the
  requirements harness is organised (a product-test statement, not a working rule). Nothing cleared the
  first gate with a confident see-it-fail fixture.
- **Actor:** the `claudinite/prose-to-checks-sweep` task.

## 2026-11-01 · declined · the gcec RULES.md backlog re-sweep (#1596)
- **Source:** the prose-to-checks sweep of #1596, over the gcec pack's RULES.md after the merge of main.
- **Reason:** nothing new cleared the first gate with a confident see-it-fail fixture. `clean-collapses-all`
  and `injected-block-markup` need data-flow or parser-quirk judgment a scan can't make; `pinned-referencenow`,
  `facebook-cant-be` and `ambiguous-numeric-slash` state product or test-harness behavior (requirements);
  `scratch-script-needs` and `keep-divergence-small` are in-flight procedure with no durable artifact.
- **Actor:** the `claudinite/prose-to-checks-sweep` task.
