## 2026-07-16 · born · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the merge-on-green procedure in `dev/procedures/github.md`, first written in #383.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a pack skill reached by its description, since the procedure matters only while
  driving a merge.
- **Landed:** #680.

## 2026-07-25 · reworded · Claudinite growth: conversation extract (#732)
- **Source:** the 2026-07-24 capture (worked under #717) and the Actions API.
- **Reason:** push-event runs do exist on `claude/**` branches, and `get_status` read pending six
  minutes after both check runs passed; `get_check_runs` is the only true reading.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #732 (Refs #731).

## 2026-07-26 · trigger-changed · Claudinite growth: conversation extract (#746)
- **Source:** the same capture: an executor run whose PR (#718) was incidental never loaded the
  skill, and hit two traps it documented.
- **Reason:** the description read as scoped to a deliberate merge; it now claims any PR a session
  opens and any "is CI green yet?" moment. It also gained the arm-auto-merge bullet: #718 sat green
  and unmerged for 63 of the session's 74 minutes.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Mechanism:** the skill's description, plus a RULES.md pointer for the always-injected path.
- **Landed:** #746 (Refs #738).

## 2026-07-26 · reworded · Claudinite growth: dedup local packs against the canon (#737)
- **Reason:** the `get_check_runs`-not-`get_status` bullet is carried by the canon
  git-github-advanced skill.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Sonnet 5, per the commit trailer.
- **Landed:** #737 (Refs #734).

## 2026-07-28 · trigger-changed · Claudinite growth: conversation extract (#771)
- **Source:** three captured sessions called the unmounted `merge-to-main` skill on "LGTM" first.
- **Reason:** the description claimed "LGTM"/"merge to main" and said `merge-to-main` is not mounted
  here.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Mechanism:** the skill's description, plus a RULES.md bullet.
- **Landed:** #771 (Refs #770).

## 2026-07-28 · trigger-changed · Revert the LGTM lesson; bar personal preferences from packs (#778)
- **Reason:** the trigger phrase is the owner's, injected per session and changed without this repo
  hearing, and why a canon skill is not mounted is engine plumbing; neither belongs in a project
  pack. The phrase also left the auto-merge evidence.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the skill's description, back to its #746 scope.
- **Landed:** #778 (Refs #770).

## 2026-07-30 · reworded · Claudinite growth: conversation extract (#797)
- **Source:** four captured sessions: the checkout was denied twice in one (57s idle), and cost 44s
  and 8s in others.
- **Reason:** the canon recipe's post-merge `git checkout main` is dead weight here: the capture
  script works against the fetched remote tip.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Rejected:** a check - no working-tree state at Stop can observe an in-session git call.
- **Landed:** #797 (Refs #795).

## 2026-07-31 · reworded · Claudinite growth: conversation extract (#811)
- **Source:** four refused `enable_pr_auto_merge` attempts on PR #793, which then sat green 46
  minutes; refused again on #811 while its check was in progress.
- **Reason:** both refusals are state readouts; a green, conflict-free PR that failed to arm is
  squash-merged, never escalated.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #811 (Refs #808).

## 2026-08-11 · reworded · Growth dedup: prune three canon-covered local-pack items (#830)
- **Reason:** batched deferred-tool loading is canon.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #830 (Refs #818).

## 2026-08-11 · reworded · the post-merge fetch gets denied too (#814)
- **Source:** sessions of 2026-07-30/31 where the bare `git fetch origin main` was denied, once
  twice in a row.
- **Reason:** the denial is non-deterministic and not scoped to the checkout: one retry, then
  proceed.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #814 (Refs #813).

## 2026-08-17 · reworded · Claudinite growth: extract lessons (#937)
- **Source:** the same step recurred in #892, #894, #903.
- **Reason:** pass `run_in_background` on every CI-poll sleep from the first call.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #937 (Refs #910).

## 2026-09-20 · reworded · Claudinite growth: rule revalidation (#1227)
- **Reason:** a successful check-suite rollup can now arrive as an event, but delivery is not
  guaranteed.
- **Actor:** @missingbulb (owner).
- **Landed:** #1227.
