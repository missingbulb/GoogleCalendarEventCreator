# Engineering practices (local working set)

General software-engineering-practice lessons captured **in this repo** that
haven't (yet) been promoted into the shared canon. The curated, project-agnostic
canon lives read-only in the Claudinite submodule —
[claude/shared/engineeringPractices.md](claude/shared/engineeringPractices.md) —
which is what the rest of the docs link to.

This file is a **local capture surface**: the "learned lessons" command and the
daily auto-lessons digest write new engineering-practice insights here (capture is
always local — see [claude/workflow.md](claude/workflow.md)). The daily
**optimize-procedures** routine
([claude/auto-optimize-procedures.md](claude/auto-optimize-procedures.md)) is the
only thing that bridges to Claudinite: it promotes generalizable items from here
up (via a `claudinite-lesson` issue) and, once the canon absorbs them and the
submodule pin updates, prunes them from this file. So this doc stays small —
usually just whatever is captured-but-not-yet-upstreamed.

- **A bug report you can't reproduce against HEAD may already be fixed but unreleased — check the SHIPPED version before theorizing about the cause.** A user runs the released build, not your checkout. When a reported behavior doesn't reproduce against `main`, compare the manifest/`package.json` version to the latest release and `git log -S"<the logic>"` the relevant code before inventing explanations. In #507 the "past" pill not showing was the released v1.3.0 deciding it by *year only*; the same-year fix had already merged to `main` but wasn't released — several wrong "mid-day / viewed-before-the-event" theories would have been skipped by checking the version first.
