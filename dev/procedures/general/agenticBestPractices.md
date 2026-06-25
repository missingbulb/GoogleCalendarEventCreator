# Agentic best practices (local working set)

Practices for building and running AI agents, captured here, not yet in the
shared canon
([claude/shared/agenticBestPractices.md](../claude/shared/agenticBestPractices.md)).
`optimize-procedures` promotes these up (via a `claudinite-lesson` issue) and
prunes them once the canon absorbs them (capture is always local — see
[claude/workflow.md](../claude/workflow.md)).

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

- **When the user asks to *show* or *see* a visual artifact, deliver the image into the chat — not a path or a link.** Surface the file itself so it renders inline; a link or a bare path makes the user go fetch it. For a tiny artifact (e.g. a 16/32px icon) also send an exact nearest-neighbor upscale, labelled as enlarged, so the detail is legible.

- **After merging a PR back to main, start follow-up work on a NEW branch — don't
  reuse the just-merged branch.** When the repo auto-deletes the head branch on
  merge, the remote branch vanishes while a stale local tracking ref lingers; a
  later `git push --force-with-lease` then fails with "stale info" and the rebase
  dance to re-home commits is needless friction. Branching fresh off the updated
  `main` is trivial — `git checkout -b <new> origin/main` — so just do that for the
  next unit of work instead of continuing on a branch whose PR already landed.
