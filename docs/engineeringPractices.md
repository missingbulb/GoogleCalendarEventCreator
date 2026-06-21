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
- **Relocating a deployment/package root within the repo leaves runtime-resolved paths unchanged — only repo-relative tooling references move.** When an app/extension's files move into a subfolder that becomes the new deployment root (the dir a runtime loads from), every path resolved *relative to that root* stays byte-identical: manifest/config field values, the runtime's own path resolution, and `getURL(...)`-style strings. Only build/test/CI code that reads files by *repo*-relative path gains the new segment. So a bulk path-rename must **not** blindly prefix every occurrence — runtime path strings, manifest field values, and "this resolves against X" examples stay as-is. Watch this especially in docs (prose paths aren't test-checked, so a wrong prefix slips through silently) and when delegating the sweep to an agent: spell out the runtime-vs-repo-location distinction and review category-confusable edits, or you ship plausible-but-wrong paths. (The `extension/`-subfolder move — #460: the manifest's literal `background.service_worker` value and the service-worker path-resolution gotcha had to stay extension-root-relative while the file map and build tooling moved.)
