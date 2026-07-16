# Product wiki growth routine

A scheduled Claude Code routine that keeps
[`product-wiki/Market/`](../../../product-wiki/Market/README.md),
[`product-wiki/Users/`](../../../product-wiki/Users/README.md), and
[`product-wiki/Competitors/`](../../../product-wiki/Competitors/README.md)
current — the self-growing market/user/competitor research wiki for this
extension. Modeled on
[`dev/routines/auto-fallback-coverage/`](../auto-fallback-coverage/routine.md):
**most runs should find little or nothing new.** A forced or fabricated "update"
is worse than none. No new, citable material → no branch, no PR.

`product-wiki/product-requirements/` is explicitly **out of scope** for this
routine — it's the reviewed crossing point the rest of the repo depends on
(see `product-wiki/README.md`) and only changes on human review, never automatically.
`product-wiki/sample-data/` is edited by this routine only when a wiki update
actually needs an illustrative example to point to — it is not grown for its
own sake.

## The mechanic: compile once, refine in place

This follows Andrej Karpathy's ["LLM Wiki"](https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5)
pattern: instead of re-researching the market/competitors/users from scratch on
every pass (live RAG-style), each run **reads what's already in the wiki first**,
then extends or corrects it — the wiki is the compounding artifact, not a cache
of one search session. Concretely, every run:

1. **Reads the target file(s) end to end first** — including the "Open
   questions" and "Growth log" sections — before searching for anything new.
   Don't re-derive a claim that's already cited and still current.
2. **Researches only what the existing file flags as open, thin, or dated** — the
   "Open questions" list is the backlog; also spot-check one or two existing
   citations for staleness (a dead link, a superseded stat) per run.
3. **Cites every claim** with a real URL in that file's "Sources" section. An
   uncited claim doesn't get written — this is a research wiki, not a set of
   assertions.
4. **Never silently overwrites.** A claim that turns out wrong or superseded is
   corrected with a note of *why* (e.g. "superseded by the 2027 report — see
   Sources"), not deleted without trace. Prune only when a section has grown
   unwieldy and the growth log already records the history.
5. **Appends a dated "Growth log" entry** summarizing what changed this run (one
   line is fine: "2026-08-01 — added Outlook-export competitor note, verified
   Google Calendar market-share stat still current").
6. **Updates "Open questions"** — remove ones this run answered, add ones this
   run's research surfaced.

## Steps

### 1. Precondition

Fresh clone (or `git merge origin/main` if resuming), `npm install` not required
(this routine touches no code — only Markdown under `product-wiki/`).

### 2. Pick a target

Read all three wiki files
(`product-wiki/Market/README.md`, `product-wiki/Users/README.md`,
`product-wiki/Competitors/README.md`) and their "Open questions" sections.
Pick the one or two open questions across the set most worth researching this
run — don't try to close everything in one pass; a few well-sourced updates beat
a wholesale rewrite.

### 3. Research and write

Web-search the picked question(s). Write findings directly into the relevant
wiki file(s) following the mechanic above. Stay inside `product-wiki/Market/`,
`product-wiki/Users/`, `product-wiki/Competitors/`, and, only if a finding needs an
illustrative example, `product-wiki/sample-data/`. **Never edit
`product-wiki/product-requirements/`** — if a finding seems important enough to
change a product requirement, say so in the growth log and leave it for human
review instead.

### 4. Stop condition

If nothing surfaces beyond what's already cited (a real, expected outcome — see
the fallback-coverage routine's own precedent), make **no commit** and stop.
Don't pad the growth log with a no-op entry.

### 5. Open the PR (never merge)

Branch `claude/product-wiki-growth/<date>`, commit only the changed `product-wiki/`
files, push, and open a **PR for review** — it never merges itself. PR body:
which open question(s) were researched, what changed and where, and the new
"Open questions" left for the next run. This is unattended automation (per
[`dev/procedures/github.md`](../../procedures/github.md)'s classification of
Claude Code routines): a failed run should still leave something human-visible —
if research stalls or the picked question turns out unanswerable, comment that
on the PR (or skip opening one and note the miss in the next run's context) rather
than failing silently.
