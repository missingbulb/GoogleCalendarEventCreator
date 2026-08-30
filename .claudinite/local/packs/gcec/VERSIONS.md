# Version history

The growth lifecycle's own record for this local pack — one row per automated
change (a prune, a strip, a rephrase, a correction), added in the same commit
as the change. A run that changed nothing writes no row.

| Date | Task | What changed |
|---|---|---|
| 2026-08-25 | rule-revalidation | Corrected three environment-fact claims in `skills/merge-and-ci/SKILL.md`: (1) "the sandbox has no Chrome" — a real Chromium is pre-installed and runs standalone, the actual blocker is no X server/display for the extension-load launch, and UI-snapshot tests (satori+resvg, no browser) run and pass locally already; (2) "the git remote is a git-only proxy … there's no API token in the env" — the remote is now a plain `https://github.com/…` origin with a working `git fetch`, and `GH_TOKEN`/`GITHUB_TOKEN` are present and authenticate generic endpoints, but a repo-scoped call 403s with "GitHub access is not enabled for this session" — the practical conclusion (only MCP sees check state) still holds, just for a different reason; (3) "`subscribe_pr_activity`'s webhooks never deliver CI success" — the tool's own description now promises delivery of successful check-suite rollups, just unreliably (can arrive late or not at all). |
| 2026-08-23 | growth-dedup | Removed the "gallery regenerated → link in chat" rule from RULES.md (and its README.md row) — the general point is now covered by `.claudinite/shared/packs/claudinite-growth/skills/unattended-agents/SKILL.md`: "When a routine regenerates a reviewable artifact (a gallery, a snapshot set, a report), surface it in the chat the same turn you commit it — a URL to the branch's copy, or the file rendered inline — so review is one click away instead of a hunt." The pruned rule only leaned on this repo's command (`npm run refresh:ui`) and file (`dev/requirements/requirements.md`) to make the same point. |
