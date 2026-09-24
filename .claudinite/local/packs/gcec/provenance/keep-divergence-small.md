## 2026-06-16 · born · reduce merge-conflict churn across parallel branches (#259)
- **Reason:** a branch synced with main but not regenerated carries stale generated artifacts into
  the merge.
- **Actor:** @missingbulb (owner).
- **Mechanism:** branch hygiene in the always-imported merge-conflicts doc.
- **Landed:** #259 (Closes #253).

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md working rule, injected at session start.
- **Landed:** #680.

## 2026-07-26 · reworded · Claudinite growth: dedup local packs against the canon (#737)
- **Reason:** it prescribed `git merge origin/main`, which the canon forbids in a squash-merge repo;
  now rebase, keeping the regen step the canon does not carry.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Sonnet 5, per the commit trailer.
- **Landed:** #737 (Refs #734).

## 2026-08-16 · reworded · Claudinite growth: dedup local packs (#923)
- **Reason:** the forbids-merge-commits parenthetical is the canon `squash-merge-history` check.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #923 (Refs #908).
