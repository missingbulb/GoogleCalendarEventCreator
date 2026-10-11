## 2026-09-27 · born · prose-to-checks sweep round 3
- **Source:** RULES.md's site-fully-support bullet ("never annotate one as \"nothing to add\"").
- **Reason:** this fragment of the bullet is a static, always-testable signature (a literal banned
  annotation left in custom/<site>.js); the rest of the bullet (an empty stub's content restating
  the generic base) stays prose — no static check can tell an empty override from a semantic
  restatement without re-implementing the generic extractor's own fields, so the bullet is not
  deleted.
- **Mechanism:** declared check (matchLines over custom/*.js), blocking with the standard 2-week
  grace — a declaration carries no doc pointer and states its own case in failureMessage/what/fix.
- **Actor:** Claude (agent), prose-to-checks-sweep task, item #1350.
- **Retire when:** the "site-fully-support" bullet is retired or reworded away from this phrase.
