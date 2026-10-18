## 2026-08-31 · born · capture that get_job_logs can hit the same token cap (#1117)
- **Source:** #1101, `tail_lines: 2406` exceeding the token limit.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a sentence in RULES.md's cap-and-qualify-GitHub-MCP-calls rule.
- **Landed:** #1117.

## 2026-09-13 · split · Claudinite growth: dedup local packs (#1176)
- **Reason:** the canon came to cover capping and qualifying list/search calls; the `get_job_logs`
  residue became a rule of its own.
- **Actor:** @missingbulb (owner).
- **Landed:** #1176.

## 2026-10-11 · retired · Claudinite growth: dedup local packs (#1513)
- **Reason:** the canon now states the whole rule: git-github-advanced skill (git-github):
  'get_job_logs tail_lines is not exempt - guessing a large value ... can itself exceed the limit
  ... Pass a small tail_lines first; on overflow, read the saved-to-disk log path and grep it for
  the failure marker'.
- **Actor:** Claudinite growth-dedup task.
- **Landed:** #1513.
