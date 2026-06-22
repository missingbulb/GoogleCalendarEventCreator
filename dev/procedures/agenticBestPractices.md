# Agentic best practices (local working set)

Practices specific to building and running AI agents, captured **in this repo**
that haven't (yet) been promoted into the shared canon. The curated,
project-agnostic canon lives read-only in the Claudinite submodule —
[claude/shared/agenticBestPractices.md](claude/shared/agenticBestPractices.md) —
which is what the rest of the docs link to.

This file is a **local capture surface**: the "learned lessons" command and the
daily auto-lessons digest write new agentic-practice insights here (capture is
always local — see [claude/workflow.md](claude/workflow.md)). The daily
**optimize-procedures** routine
([claude/auto-optimize-procedures.md](claude/auto-optimize-procedures.md)) is the
only thing that bridges to Claudinite: it promotes generalizable items from here
up (via a `claudinite-lesson` issue) and, once the canon absorbs them and the
submodule pin updates, prunes them from this file. So this doc stays small —
usually just whatever is captured-but-not-yet-upstreamed.

- **A SessionStart hook gates session progress through directive text, not blocking.**
  A SessionStart hook can't block execution or prompt interactively — its stdout is
  injected into the session as context the assistant reads. Use this for environment
  or setup validation: when a check fails, output a STOP directive that tells the
  assistant to ask the user (via AskUserQuestion) before doing any work. The
  assistant's instruction-following is the enforcement mechanism; the hook provides
  the check. Stay silent on success — only emit when something requires the user's
  decision. (`.claude/hooks/session-start.sh` is a worked example.)
