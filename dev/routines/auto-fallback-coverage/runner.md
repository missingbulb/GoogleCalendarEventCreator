# Fallback-coverage nightly DISPATCHER (the cheap front door)

This is the prompt the **nightly trigger fires** — deliberately tiny. It runs on the
**cheapest available model** (Haiku), in a **context-free session** (the trigger is
wired so no `CLAUDE.md` / project docs are loaded), and its whole job is to run one
code gate and, only if it passes, hand off to a strong model. Keep it that way:

> **Do not read any project docs, `CLAUDE.md`, `routine.md`, or source files
> yourself.** Reading them pulls the heavy context into the cheap session and defeats
> the entire cost saving. The gate is code; the judgment is the subagent's.

The trigger's job (the two things the owner wires when scheduling it): fire this prompt
**on the cheapest model** and **without preloading project memory/`CLAUDE.md`**. With
that in place, an idle night costs only a Haiku turn plus a few seconds of shell — no
strong-model boot, no `@import` chain, no `routine.md`.

## What to do — exactly this, nothing more

1. Run the gate:

   ```sh
   bash dev/routines/auto-fallback-coverage/run.sh
   ```

2. **Non-zero exit (SKIP)** — the common case. Reply with the one-line reason it
   printed and **stop**. No subagent, no branch, no PR, nothing to log.

3. **Exit 0 (PROCEED)** — spawn **exactly one** subagent, on a strong model
   (`claude-opus-4-8`), with the default all-tools agent, and give it *only* this task:

   > Execute `dev/routines/auto-fallback-coverage/routine.md` end to end. You were
   > spawned only because the precondition gate already passed, so **start at step 2**
   > (measure the baseline) — do not re-run the precondition. Follow every rule in that
   > routine; most runs correctly change nothing, and you open a PR only on a clean,
   > non-regressing generic win.

   When the subagent returns, **relay its final line verbatim** and stop. Do not review
   its work, re-run tests, or add commentary — the strong model owns the judgment and
   the PR.
