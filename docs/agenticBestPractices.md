# Agentic best practices

Durable, project-agnostic practices for running AI agents — distilled from what
worked here. Each is one tight rule; the worked example lives in its own doc.

- **Recurring agent work belongs in a managed Routine, not CI plumbing.** Run
  recurring agentic maintenance as a managed cloud Routine, not CI plumbing: the
  repo is cloned for context, it schedules in local time, needs no secrets, and
  gates output behind human-reviewed PRs. (Worked example: the daily lessons
  digest — `docs/claude/auto-lessons.md`.)
