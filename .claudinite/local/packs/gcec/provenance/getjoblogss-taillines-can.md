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

## 2026-09-27 · retired · prose-to-checks sweep round 3
- **Reason:** since #1176 split the bullet down to just this content, it states nothing
  `github-job-logs-guessed-tail-lines` (declared-checks.json, landed round 1) doesn't already assert
  — what/why/fix match verbatim. Deletion test re-applied now that the split makes it apply; the
  parenthetical pointing at the canon's separate rule carries no further remedy.
- **Mechanism:** `github-job-logs-guessed-tail-lines`, landed on this same PR's round 1.
- **Actor:** Claude (agent), prose-to-checks-sweep task, item #1350.
