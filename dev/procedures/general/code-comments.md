# Code-comment discipline

A comment should carry **why** and the **relationship** to other code — what the
code can't say — not a restatement of what it already says.

- **Don't repeat what same-file code already says.** If a fact is reconstructable
  from a value already in the file plus a known convention, don't spell it out
  again — the copy drifts, and a path repeated in a comment turns every move into
  churn across comments the code never needed.
- **Comment the relationship, not a brittle exact path.** A cross-reference earns
  its keep only when it points to a link *not* in code (e.g. "verified by
  `extractor-support.test.js`," found there by glob, not by name). Name the file or
  directory, not the full path, unless the exact path is the point.
- **Keep one canonical path mention** and have other comments/docs refer to the
  concept, not re-spell it.

(Rewriting references when a path *does* move is a separate text-manipulation
concern; where a file should live is [filePlacement.md](filePlacement.md). This doc
is only about what a comment should say.)
