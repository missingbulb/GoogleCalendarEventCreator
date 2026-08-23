# Version history

The growth record for this local pack — one row per rule an automatic pass corrected, added or
deleted, written in the same commit as the change. The pack carries no `version` field (a local
pack is declared by hand, never vendored or fingerprinted), so the rows are dated rather than
version-numbered. A run that changed nothing writes no row.

| Date | Task | What changed |
|---|---|---|
| 2026-08-23 | `rule-revalidation` | RULES.md's GitHub-MCP-call rule re-anchored on `fields`. Probes: `search_issues` is now natural-language semantic matching already scoped to `is:issue` — `in:title "Claudinite tracker: …"` was ignored, returning five loosely-related issues of 106 matches; `perPage: 3` unfielded cost ~9 KB against ~0.3 KB for five fielded results, so the envelope, not the body, is the weight; `actions_list` ignored `per_page` outright (`per_page: 1` → all 9 workflows, `per_page: 2` → a full default page of runs) and exposes no `fields`, leaving `workflow_runs_filter` as its only bound. |
| 2026-08-23 | `rule-revalidation` | merge-and-ci's "the shell can't observe GitHub state" keeps its conclusion but loses its dead premises. Probes: `GITHUB_TOKEN`/`GH_TOKEN` *are* in the env, `git remote -v` is plain `https://github.com/<owner>/<repo>` (no `/git/…` proxy path), and `api.github.com/rate_limit` and `/user` return 200 — but every repository path answers `{"message":"GitHub access is not enabled for this session…"}` with or without the token, and no `gh` binary is installed. |
| 2026-08-23 | `rule-revalidation` | merge-and-ci's `subscribe_pr_activity` rule corrected against the tool's own contract (doc-verified; subscribing is a write, so it was not run): the schema now names "successful check-suite rollups" among the delivered events, contradicting "never delivers CI success". The operative advice — never end a turn on the subscription — is unchanged, and the PR-Steward pre-emption the schema documents is now stated. |
| 2026-08-23 | `rule-revalidation` | merge-and-ci's quoted `sleep 30` refusal updated to the harness's current wording, which adds "Do not chain shorter sleeps to work around this block." Probe: a foreground `sleep 30` was refused with that text; the same sleep with `run_in_background: true` was accepted and completed. |
