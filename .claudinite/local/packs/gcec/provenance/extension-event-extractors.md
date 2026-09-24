## 2026-07-26 · born · Make the generic extractor the core base layer every source overrides (#758)
- **Actor:** @missingbulb (owner).
- **Mechanism:** an architecture rule of the road in RULES.md.
- **Landed:** #758.

## 2026-07-28 · converted · Prose to checks: flat custom/ sources (#776)
- **Reason:** the load-order generator reads `custom/` one level deep and keeps only `*.js`, so a
  nested directory or other file kind silently never runs.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the blocking `custom-sources-flat` check, with red-first fixtures; the prose kept
  the rationale and pointed at it.
- **Landed:** #776 (Refs #773).

## 2026-07-29 · reworded · Prose to checks: npm test reaches every test file (#789)
- **Reason:** under the deletion test the `custom-sources-flat` parenthetical went: the check
  catches and explains every violation.
- **Actor:** @missingbulb (owner).
- **Landed:** #789 (dispatch #786, tracker #777).
