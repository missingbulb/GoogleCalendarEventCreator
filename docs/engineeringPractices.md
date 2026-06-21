# Engineering practices (local working set)

General software-engineering-practice lessons captured **in this repo** that
haven't (yet) been promoted into the shared canon. The curated, project-agnostic
canon lives read-only in the Claudinite submodule —
[claude/shared/engineeringPractices.md](claude/shared/engineeringPractices.md) —
which is what the rest of the docs link to.

This file is a **local capture surface**: the "learned lessons" command and the
daily auto-lessons digest write new engineering-practice insights here (capture is
always local — see [claude/workflow.md](claude/workflow.md)). The daily
**optimize-procedures** routine
([claude/auto-optimize-procedures.md](claude/auto-optimize-procedures.md)) is the
only thing that bridges to Claudinite: it promotes generalizable items from here
up (via a `claudinite-lesson` issue) and, once the canon absorbs them and the
submodule pin updates, prunes them from this file. So this doc stays small —
usually just whatever is captured-but-not-yet-upstreamed.

- **A CI job that reads submodule files must fetch submodules in the checkout step.** `actions/checkout` does not fetch submodules by default — without `submodules: true` (or `recurse-submodules: true`) the submodule folder is an empty directory in CI, and any gate that reads it passes vacuously. The symptom is a green check that validates nothing (e.g. a Dependabot bump PR whose CI was a no-op until the `test.yml` checkout was fixed — #444). Add the flag to every CI job whose tests read submodule content.
- **Deleting (or renaming) a file isn't done until you've grepped the repo for inbound references to it.** A removed doc/module leaves dangling links, imports, or index entries behind that no test necessarily catches (a README docs-index link to a deleted `docs/*.md` stays green). Right after the removal, `grep` the whole tree for the old path/filename and fix every hit in the same change — don't wait to be told the link is broken.
- **A mechanical rename/path sweep (`sed`) fails in two opposite directions — verify both after running it.** (1) *Too narrow:* a path assembled from separate `path.join("a","b","c")` args, or a literal split across a line break, contains no `a/b/c` substring, so a slash-form sweep silently misses it (a real `path.join(ROOT,"test","ui","fonts")` survived a `test/ui`→new-path rename and only broke when the script was finally run). After a directory move, also `grep` the component segments, and run any tool the sweep touched. (2) *Too greedy:* replacing a bare token over-matches every longer identifier that contains it (`Requirements.md`→`requirements.md` also rewrote `productRequirements.md`→`productrequirements.md`). Anchor the pattern where possible, and after the sweep grep both for stragglers of the *old* form and for unintended artifacts of the *new* form.
