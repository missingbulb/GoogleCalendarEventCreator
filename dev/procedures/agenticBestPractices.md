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

- **For an open-ended visual/layout requirement, render real candidate designs and
  let the owner pick — before building one.** When the spec leaves *how it looks or
  groups* open, the fastest way to converge is to drive the **production renderer**
  with hand-shaped fake data and put 2–4 **actually-rendered** options in front of
  the owner (delivered as images), not prose descriptions. Fully implementing,
  testing, and snapshot-approving a single interpretation before showing
  alternatives risks discarding it wholesale when the owner reorients — here an
  in-place card design (#509) was built end-to-end and merged-ready, then replaced
  by a stream-split chosen from rendered mockups, wasting the whole first build and
  its approval cycles. Reach for throwaway mockups through the real render path
  (e.g. the snapshot renderer fed a fake data object) at the first sign of layout
  ambiguity, *ahead* of the implement→test→snapshot-approve cycle. (This is the
  design-exploration complement to the existing "drive snapshots through the real
  code path" and snapshot-review rules, which only kick in *after* a change exists.)

- **After merging a PR back to main, start follow-up work on a NEW branch — don't
  reuse the just-merged branch.** When the repo auto-deletes the head branch on
  merge, the remote branch vanishes while a stale local tracking ref lingers; a
  later `git push --force-with-lease` then fails with "stale info" and the rebase
  dance to re-home commits is needless friction. Branching fresh off the updated
  `main` is trivial — `git checkout -b <new> origin/main` — so just do that for the
  next unit of work instead of continuing on a branch whose PR already landed.
