# Code-comment discipline (local working set)

Portable practices for *what to put in a comment* captured here, not yet in the
shared canon (a candidate for a new `general/code-comments.md` there).
`optimize-procedures` promotes these up and prunes them once the canon absorbs
them (capture is always local — see [this_project/workflow.md](../this_project/workflow.md)).

The governing idea: a comment should carry **why** and the **relationship** to
other code — the things the code itself can't say — not a restatement of what the
code already says. A comment that merely echoes the code earns nothing and rots
independently of it.

## Don't repeat in a comment what the code in the same file already says

If a fact is reconstructable from a value already present in the file (plus a known
convention), don't spell it out a second time in prose — the copy drifts from the
source and turns every change to the source into churn across the comments. Concrete
case (#543): a fixture directory moved `data/` → `data/server-fetched/`, and **25 of
the 32 modified files were touched only to repoint a path inside a comment** — none
of their executable code changed. Each extractor-support case file carried a comment
naming the full cached-page path while the code two lines below already had
`page: "<basename>"`; the path was fully derivable from `page` + the data
convention, so the comment was pure redundancy and pure churn. Reference the
*relationship* ("validated against its real cached page by
`extractor-support.test.js`"), and let the code's own value supply the specifics.

## Comment the relationship, not a brittle exact path

A cross-reference comment earns its keep only when it points to a relationship that
is **not discoverable in code** — e.g. "this case is verified by
`extractor-support.test.js`," where the test finds the case by directory glob and
never names this file (a distance-1 link no grep from the test would surface). The
*relationship* is the durable, valuable part; the **exact deep path** is the brittle
part that breaks on any move. So name the file or the directory, not the full path,
unless the exact path is genuinely the point — "the cached page under
`data/server-fetched/`" survives a parent-dir rename that
`dev/requirements/extractor/data/server-fetched/<name>.html` does not.

## Keep one canonical path mention; refer to the concept elsewhere

When a path must be written out exactly, do it in **one** canonical place (a file
index / the doc that owns that area) and have other comments and docs refer to the
*concept*, not re-spell the path. N copies of a path are N edits on every move and N
chances to leave one stale.

(The mechanics of *finding and rewriting* references when a path does move — and the
ways a sweep misses non-contiguous references — are a separate concern, in
[textAndFileManipulation.md](textAndFileManipulation.md). Where a file should live to
keep references short is in the canon's `general/filePlacement.md`. This doc is only
about what a comment should say in the first place.)
