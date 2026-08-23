# Version history

The growth lifecycle's own record for this local pack — one row per automated
change (a prune, a strip, a rephrase, a correction), added in the same commit
as the change. A run that changed nothing writes no row.

| Date | Task | What changed |
|---|---|---|
| 2026-08-23 | growth-dedup | Removed the "gallery regenerated → link in chat" rule from RULES.md (and its README.md row) — the general point is now covered by `.claudinite/shared/packs/claudinite-growth/skills/unattended-agents/SKILL.md`: "When a routine regenerates a reviewable artifact (a gallery, a snapshot set, a report), surface it in the chat the same turn you commit it — a URL to the branch's copy, or the file rendered inline — so review is one click away instead of a hunt." The pruned rule only leaned on this repo's command (`npm run refresh:ui`) and file (`dev/requirements/requirements.md`) to make the same point. |
