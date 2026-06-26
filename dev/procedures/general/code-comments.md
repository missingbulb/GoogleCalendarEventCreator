# Code-comment discipline (local working set)

Portable practices for *what to put in a comment* captured here, not yet in the
shared canon (a candidate for a new `general/code-comments.md` there).
`optimize-procedures` promotes these up and prunes them once the canon absorbs
them (capture is always local — see [this_project/workflow.md](../this_project/workflow.md)).

A comment should carry **why** and the **relationship** to other code — what the
code can't say — not a restatement of what it already says.

- **Don't repeat what same-file code already says.** If a fact is reconstructable
  from a value already in the file plus a known convention, don't spell it out
  again — the copy drifts and every change to the source churns the comments. In
  #543 a fixture dir moved and **25 of 32 modified files were touched only to
  repoint a path in a comment**, each naming a path the code's own `page:
  "<basename>"` already determined.
- **Comment the relationship, not a brittle exact path.** A cross-reference earns
  its keep only when it points to a link *not* in code (e.g. "verified by
  `extractor-support.test.js`," found there by glob, not by name). Name the file or
  directory, not the full path, unless the exact path is the point.
- **Keep one canonical path mention** and have other comments/docs refer to the
  concept, not re-spell it.

(Rewriting references when a path *does* move is
[textAndFileManipulation.md](textAndFileManipulation.md); where a file should live
is the canon's `general/filePlacement.md`. This doc is only about what a comment
should say.)
