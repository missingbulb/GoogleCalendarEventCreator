## 2026-07-26 · born · Make the generic extractor the core base layer every source overrides (#758)
- **Reason:** six sources only restated the base and every live case extracted byte-identically
  without them.
- **Actor:** @missingbulb (owner).
- **Mechanism:** an architecture rule of the road in RULES.md.
- **Landed:** #758.

## 2026-07-31 · converted · Prose to checks: the shared pipeline names no supported site (#803)
- **Reason:** a host-gated special case in shared code keeps every suite green while
  generic-coverage reads the site as gap-free, feeding a wrong answer into an automated decision.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the blocking `pipeline-site-agnostic` check, reading hosts from `host-lists.json`
  and blind to comments. The deletion test kept the prose whole: the check catches only the
  host-literal half.
- **Landed:** #803.
