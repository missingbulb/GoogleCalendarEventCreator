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
- **Deleting (or renaming) a file isn't done until you've grepped the repo for inbound references to it.** A removed doc/module leaves dangling links, imports, or index entries behind that no test necessarily catches (a README docs-index link to a deleted `dev/procedures/*.md` stays green). Right after the removal, `grep` the whole tree for the old path/filename and fix every hit in the same change — don't wait to be told the link is broken.
- **A global string-replace of a path prefix corrupts in two non-obvious ways: double-prefix on files already under the target namespace, and mangled external URLs.** When renaming `foo/` → `bar/foo/`, a naive repo-wide replace of `foo/` → `bar/foo/` turns `bar/foo/file.js` (already correct) into `bar/bar/foo/file.js`; it also rewrites any external URL that happens to contain the string `foo/` (e.g. `https://example.com/docs/foo/` becomes `https://example.com/docs/bar/foo/`). Scope the replace to the internal path strings that need it (not external URLs, not files already under the target), or apply it then do a targeted post-pass reverting any match that lives inside a URL or that doubled the prefix.
