## 2026-06-16 · born · reduce merge-conflict churn across parallel branches (#259)
- **Reason:** every generated artifact moved onto the `ours` merge driver, so one command has to
  reproduce them all after a merge.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the generated-files section of the always-imported merge-conflicts doc.
- **Landed:** #259 (Closes #253).

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md working rule, injected at session start.
- **Landed:** #680.

## 2026-07-29 · reworded · Growth dedup: prune gcec local items the canon now covers (#788)
- **Reason:** the never-hand-merge recipe and the `merge=ours` entry are the canon's; stripped to
  the repo's regen inventory, the part-authored gallery exception and the coverage-regression
  caution.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #788 (Refs #785).

## 2026-07-31 · converted · Prose-to-checks: the ours-driver rule (#812)
- **Reason:** requirement kinds are auto-discovered, so a new image kind's baselines can miss
  `.gitattributes` silently until a binary merge conflict.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the blocking `regen-artifacts-merge-ours` check, scoped to what the canon's
  `generated-merge-driver` leaves. The deletion test kept the bullet whole.
- **Landed:** #812 (Refs #809).
