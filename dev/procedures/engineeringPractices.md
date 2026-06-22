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
- **When retrofitting a clock/date-relative rule into a golden-snapshot suite, the pinned reference instant controls the blast radius — choose it to minimize incidental churn.** A date-dependent rendering rule (e.g. a "past" badge keyed on "before today") moves every fixture whose date crosses the new threshold relative to the pinned "now". Pin the reference so existing fixtures land on the *same* side they were authored for (e.g. at the floor of their dates), so only the cases that deliberately exercise the new rule change and the diff stays small and reviewable — instead of a sprawling, hard-to-review baseline churn that buries the intended change.
