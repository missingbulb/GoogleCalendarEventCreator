# Agentic best practices (local working set)

Practices for building and running AI agents, captured here, not yet in the
shared canon.
`optimize-procedures` promotes these up (via a `claudinite-lesson` issue) and
prunes them once the canon absorbs them (capture is always local — see
[this_project/workflow.md](../this_project/workflow.md)).

- **In a multi-stage agent pipeline, every failure exit — including infrastructure
  failures in pre-agent stages — must converge to the same human-triage state.**
  A setup-phase failure (page download, authentication, scaffolding) that posts a
  comment but leaves the original trigger label in place makes the item look
  unprocessed rather than blocked, defeating the escalation mechanism. Treat each
  failure mode — pre-agent setup, agent bail, post-agent quality check — as
  equivalent from the triage perspective.

- **In a CLAUDE.md, `@import` only docs whose guidance applies to every session;
  reference specialized pipeline docs with non-@import pointer links.** An `@import`
  expands the doc inline at launch in *every* session, taxing the always-loaded
  context budget even when the session has nothing to do with that pipeline.
  Self-contained pipelines (release, auto-extractor, maintenance routines) belong
  in their own folders, discoverable via plain links in CLAUDE.md. `@import` only
  docs (workflow, testing, gotchas, coding practices) whose rules apply to every
  commit.
