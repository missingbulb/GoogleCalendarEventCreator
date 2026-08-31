# Version history

The growth lifecycle's own record for this local pack — one row per automated
change (a prune, a strip, a rephrase, a correction), added in the same commit
as the change. A run that changed nothing writes no row.

| Date | Task | What changed |
|---|---|---|
| 2026-08-30 | rule-revalidation | Corrected the "cap and qualify every GitHub MCP list/search call" rule in RULES.md — probed `search_issues` live: it is now natural-language semantic matching (scoped to `is:issue`), and an `in:title "..."` qualifier is no longer honored as a literal filter (a query with it and without it returned the same broad, unrelated result set). Replaced the `in:title` remedy with `list_issues` + `labels` for an exact-match lookup. |
| 2026-08-23 | growth-dedup | Removed the "gallery regenerated → link in chat" rule from RULES.md (and its README.md row) — the general point is now covered by `.claudinite/shared/packs/claudinite-growth/skills/unattended-agents/SKILL.md`: "When a routine regenerates a reviewable artifact (a gallery, a snapshot set, a report), surface it in the chat the same turn you commit it — a URL to the branch's copy, or the file rendered inline — so review is one click away instead of a hunt." The pruned rule only leaned on this repo's command (`npm run refresh:ui`) and file (`dev/requirements/requirements.md`) to make the same point. |
