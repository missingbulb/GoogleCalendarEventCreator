## 2026-09-07 · born · prose-to-checks sweep round 1 (#1191)
- **Source:** RULES.md's "Cap and qualify every GitHub MCP list/search call" bullet — the perPage
  half (#734 twice, #753, #760).
- **Reason:** an uncapped search_issues/list_issues/actions_list call is a static tool-call shape a
  guard can assert live, at the moment it's about to run.
- **Mechanism:** `scope: "action"` guardToolCalls declaration — the PreToolUse hook denies/warns
  before the call, check_the_work is the transcript backstop.
- **Actor:** Claude (agent), prose-to-checks-sweep task.
