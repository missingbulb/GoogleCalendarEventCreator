## 2026-08-17 · born · Claudinite growth: extract lessons (#937)
- **Source:** #866.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section, where the habit lives.
- **Landed:** #937 (Refs #910).

## 2026-10-04 · weakened · strip the portable half the node pack now states (#1409)
- **Reason:** node RULES "A throwaway script that imports a project dependency can't live in an
  external scratchpad" covers the module-resolution half; only the task-specific habit stays.
- **Actor:** the growth-dedup run on #1409.
- **Landed:** #1409
