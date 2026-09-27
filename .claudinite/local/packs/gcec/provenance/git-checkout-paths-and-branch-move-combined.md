## 2026-09-13 · born · prose-to-checks sweep round 2 (#1191)
- **Source:** RULES.md's "Never carry uncommitted edits onto a new branch with `git checkout
  <old-branch> -- <paths>`" bullet (#734 — wiped three finished edits).
- **Reason:** the one-liner combining a path-restoring checkout with `git checkout -b` is a static
  Bash command shape a guard can assert live; the bullet was deleted whole (deletion test: the
  check's what/why/fix fully carry it, #734 citation included).
- **Mechanism:** `scope: "action"` guardToolCalls declaration over the Bash tool.
- **Actor:** Claude (agent), prose-to-checks-sweep task.
