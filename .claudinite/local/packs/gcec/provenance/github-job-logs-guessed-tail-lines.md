## 2026-09-07 · born · prose-to-checks sweep round 1 (#1191)
- **Source:** the same bullet's get_job_logs sentence — the #1101 tail_lines:2406 overflow.
- **Reason:** a guessed large tail_lines is a static tool-call shape a guard can assert live.
- **Mechanism:** `scope: "action"` guardToolCalls declaration, same as its sibling above.
- **Actor:** Claude (agent), prose-to-checks-sweep task.
