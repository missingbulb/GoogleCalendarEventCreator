## 2026-07-26 · born · Make the generic extractor the core base layer every source overrides (#758)
- **Reason:** with the generic extractor as the base, support can no longer be derived from which
  sources exist; `supportedDomains` became the one list.
- **Actor:** @missingbulb (owner).
- **Mechanism:** an architecture rule of the road in RULES.md.
- **Landed:** #758.
