## 2026-06-15 · born · auto-implement extractors via a Claude agent on the extractor-request label (#164)
- **Source:** issue #155.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a label-triggered workflow driving an agent; a `dev/routines/` routine from #658, a
  pack task from #757.
- **Landed:** #164 (Closes #155).

## 2026-07-26 · moved · convert to a scheduled gcec task, retire fetch-page.yml (#757)
- **Reason:** each stage goes where it belongs: a pure precondition over the issues signal,
  preprocessing for triage, claim, scaffold and the ScraperAPI fetch, and the agent for judgment
  only.
- **Actor:** @missingbulb (owner).
- **Mechanism:** gcec pack task, with `SCRAPER_API_KEY` in `required_secrets`.
- **Rejected:** `fetch-page.yml`, which existed only because an agent session cannot hold the key.
- **Landed:** #757.

## 2026-07-26 · reworded · Make the generic extractor the core base layer every source overrides (#758)
- **Reason:** the scaffold and triage write a per-site source as overrides over the generic base.
- **Actor:** @missingbulb (owner).
- **Landed:** #758.

## 2026-07-26 · reworded · Port what the create-extractor rewrite dropped (#761)
- **Source:** #759, the pipeline's first real request, died on one transient ScraperAPI 500.
- **Reason:** the conversion had rewritten the routine rather than porting it: duplicate detection,
  the fetch retry, per-issue triage isolation and the failure contract came back; record-page folded
  in as preprocessing's pending-page sweep.
- **Actor:** @missingbulb (owner).
- **Rejected:** raising the timeout - the worker now reads the declared bound and stops starting
  fetches while there is room to deliver.
- **Landed:** #761.

## 2026-08-06 · reworded · hand the agent its draft PR by identity, not by branch prefix (#844)
- **Reason:** a prefix search that finds nothing reads as nothing created (Claudinite #649);
  preprocessing now names the branch and PR in the dispatch issue, and no section is authoritative.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5, per the commit trailer.
- **Rejected:** a fallback search - the fallback is the bug.
- **Landed:** #844.

## 2026-08-24 · policy-changed · declare create-extractor daily (#1061)
- **Reason:** `hourly` was a retired token already resolving to daily; the declaration now says so.
  The right trigger is the request issue itself, and until that exists a slow cycle is the accepted
  trade.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the declaration's frequency.
- **Landed:** #1061 (Refs #1060).

## 2026-08-31 · policy-changed · declare the outcome/automerge pair (#1102)
- **Reason:** `open-pr` meant a human always reviews the extraction.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5, per the commit trailer.
- **Mechanism:** `expected_outcome: pr` with `automerge: nothing`.
- **Landed:** #1102 (Refs #1101).

## 2026-09-02 · policy-changed · retire the legacy precondition() form (#1142)
- **Reason:** the function form was retired fleet-wide; the gate stays task-local because its
  subject is this repo's labels and recorder directory.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 5, per the commit trailer.
- **Mechanism:** the task-local `extractor-request-eligible` term in `preconditions.mjs`, its
  signals derived from the term.
- **Landed:** #1142 (Refs #1143).

## 2026-09-15 · policy-changed · scope create-extractor's automerge (#1244)
- **Reason:** the write surface is known at declaration time, so a scope replaces the blanket
  refusal; deletions stay uncovered.
- **Actor:** @missingbulb (owner).
- **Mechanism:** the pack's `site-support-scope` merge rule.
- **Landed:** #1244 (Closes #1243).
