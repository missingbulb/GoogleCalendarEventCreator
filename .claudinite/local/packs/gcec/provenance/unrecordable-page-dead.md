## 2026-07-26 · born · convert create-extractor to a scheduled gcec task (#757)
- **Reason:** a task failure would also converge to a `needs-human` dispatch issue, duplicating the
  signal and implying the pipeline broke when it correctly declined.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section.
- **Landed:** #757.

## 2026-07-26 · reworded · Port what the create-extractor rewrite dropped (#761)
- **Reason:** the pending-page sweep, folded in from record-page, follows the same exit-0 contract.
- **Actor:** @missingbulb (owner).
- **Landed:** #761.
