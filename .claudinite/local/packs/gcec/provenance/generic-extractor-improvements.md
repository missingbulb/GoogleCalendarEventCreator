## 2026-06-18 · born · fallback-coverage routine doc (#368)
- **Actor:** @missingbulb (owner).
- **Mechanism:** a daily routine doc outside the repo's packs (`auto-fallback-coverage`), with a
  standing tracking issue.
- **Landed:** #368.

## 2026-07-23 · moved · Phase 1 (GCEC pilot): per-project scheduling cutover (#700)
- **Reason:** the per-repo scheduler became the repo's only cron, so the routine had to become a
  task it runs.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 4.8, per the commit trailer.
- **Mechanism:** gcec pack task `fallback-extractor-improvements` - `task.mjs` declaring daily,
  commits signal, opus, `open-pr`, plus the precondition; the routine doc became `task.md`.
- **Landed:** #700 (Refs #394).

## 2026-07-23 · policy-changed · agent_execution_timeout added (#711)
- **Reason:** the agent-preprocessing contract requires an agentic task to declare its run bound.
- **Actor:** @missingbulb (owner).
- **Mechanism:** `agent_execution_timeout: 5400`, set generously as runaway protection for an
  open-ended loop.
- **Rejected:** splitting a deterministic pre-step into `agent_preprocessing` - the agent must see
  the baseline measured on its own clone, and preprocessing has no code-to-agent channel.
- **Landed:** #711 (Refs missingbulb/Claudinite#394).

## 2026-07-24 · policy-changed · run weekly instead of daily (#729)
- **Reason:** a clean win is rare on any given day; weekly still catches new opportunities without a
  strong-model run on most idle days.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the declaration's frequency.
- **Landed:** #729.

## 2026-07-26 · weakened · drop the unfounded "CI green twice" bar (#756)
- **Reason:** the twice bar is scoped to e2e/heavy-browser changes, and `test:live` runs offline
  against committed HTML; RULES.md stays the single source for when it applies.
- **Actor:** @missingbulb (owner).
- **Landed:** #756.

## 2026-07-26 · moved · Make the generic extractor the core base layer every source overrides (#758)
- **Reason:** with one extractor, "fallback" no longer named anything; the task was renamed from
  fallback-extractor-improvements.
- **Actor:** @missingbulb (owner).
- **Mechanism:** gcec pack task `generic-extractor-improvements`.
- **Landed:** #758.

## 2026-08-10 · policy-changed · let generic-extractor-improvements land its own win (#872)
- **Reason:** `postconditions.sh` already gates scope, the ratchet, the jsdom trap and the full
  suite before a PR opens, leaving a reviewer nothing to check.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Mechanism:** the declared outcome ceiling, `open-pr` to `merged-pr`.
- **Landed:** #872 (Closes #873).

## 2026-08-11 · reworded · Growth dedup: prune three canon-covered local-pack items (#830)
- **Reason:** the tracker-logging how-to is canon; which issue to log on stays.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #830 (Refs #818).

## 2026-08-31 · policy-changed · declare the outcome/automerge pair, scoped by a pack merge rule (#1102)
- **Reason:** `merged-pr` normalized to `automerge: anything`, merging even a diff its own
  postconditions would reject.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5, per the commit trailer.
- **Mechanism:** the pack's `generic-coverage-scope` merge rule, kept byte-equal to the
  postcondition's literal by the blocking `generic-coverage-scope-agrees` check.
- **Rejected:** a RULES.md bullet describing the two patterns - the check names both and states the
  fix at the moment one is widened.
- **Landed:** #1102 (Refs #1101).

## 2026-09-02 · policy-changed · use the canon's substantive-change term (#1142)
- **Reason:** the hand-rolled read named every window sha uncapped, flooding the Context the run
  reads as its scope.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5, per the commit trailer.
- **Mechanism:** `preconditions: ['substantive-change']`.
- **Landed:** #1142 (Refs #1143).

## 2026-09-15 · policy-changed · hold a generic-coverage round behind its own open PR (#1244)
- **Actor:** @missingbulb (owner).
- **Mechanism:** the `no-open-pr-titled` precondition, with task.md pinning the PR-title prefix it
  reads.
- **Landed:** #1244 (Closes #1243).
