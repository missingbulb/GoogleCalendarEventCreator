## 2026-06-14 · born · the "does the extension load?" safety net (#157)
- **Source:** the real-Chrome load tests added with it, guarding the #146 class of startup failure.
- **Reason:** a new test, the heavy browser ones above all, must go green twice before a merge is
  trusted.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a testing guideline in the always-imported docs.
- **Landed:** #157 (Fixes #152, #156).

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md working rule (squash merges, `(#N)`, CI green first), injected at
  session start.
- **Landed:** #680.

## 2026-07-17 · reworded · Prune canon-covered "approval only backward" (#684)
- **Reason:** the canon now carries approval-applies-only-backward.
- **Actor:** @missingbulb (owner).
- **Landed:** #684.

## 2026-07-26 · reworded · Claudinite growth: conversation extract (#746)
- **Reason:** load the merge-and-ci skill for any PR a session opens, since this pointer is what an
  unattended run reads first.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #746 (Refs #738).

## 2026-07-26 · reworded · Claudinite growth: dedup gcec local pack against the mounted canon (#736)
- **Reason:** squash with `(#N)` is the canon default, enforced by `squash-merge-history`; kept only
  this repo's divergence, the CI-green-first gate.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #736 (Refs #685).

## 2026-07-29 · reworded · Prose to checks: npm test reaches every test file (#789)
- **Reason:** the squash-merge-history parenthetical failed the deletion test, and misattributed the
  `(#N)` title to a check that only forbids merge commits.
- **Actor:** @missingbulb (owner).
- **Landed:** #789 (dispatch #786, tracker #777).
