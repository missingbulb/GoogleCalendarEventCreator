# Automated daily "optimize procedures" routine

A daily, unattended agent routine that reconciles a project's **local**
documentation against the shared **canon** of portable rules it consumes (a
separate, read-only repo, synced into this repo over HTTPS — see CLAUDE.md's
"Shared portable rules" section). Everything else — the on-demand "learned
lessons" command, the daily lessons digest — writes **only to local docs**; this
routine keeps those local docs from duplicating what the canon already covers.
Like the other daily routines it runs unattended and **most days changes little or
nothing** — the steady state is already reconciled, so a forced move is worse than
none.

Reconciliation is **one-directional**: the canon is consumed read-only and nothing
is handed back up to it from here (there is no up-path). The routine's only job is
to prune / rephrase local docs the canon now covers.

## Prune / rephrase local docs the canon now covers (→ pushed to main)

The shared canon is synced into this repo read-only over HTTPS, kept current
automatically — the session-start sync hook pulls the latest Claudinite `main`
each session. When the canon has **absorbed** a practice that a local doc still
carries — the canon evolves upstream independently and the next session's sync
pulls it in — the local copy is redundant. The routine:

- **Removes** the now-duplicated local item (typically from the local working-set
  practice docs, but any local doc qualifies), since the canon is the single source
  of truth.
- **Rephrases / reframes** a local procedure when the canon's wording of the same
  idea has changed, so the local docs stay consistent with the canon they point at.

These edits are **pushed straight to `main`** (no PR, no approval wait) once the
offline suite is green — this is a self-gating routine, not a reviewed change. Be
correspondingly conservative: only remove a local item you can show is genuinely
covered by the *current pinned* canon — quote the canon line. When in doubt, leave
it; a wrongful prune loses a real local lesson and there is no PR review to catch
it.

**Track every removal — it's the audit trail for an unreviewed push.** Because the
prune lands on `main` with no PR to read, the removal must be logged to a standing
**superseded-instructions tracking issue** (found **by title**, e.g.
`Superseded local instructions (optimize-procedures)`, not a hard-coded number;
open it if missing, reopen it if it was closed). Each prune adds a **dated comment**
recording, for **every** instruction removed this run:

1. the **full text** of the removed local instruction, and which local doc it came
   from;
2. the **full text** of the canon instruction that superseded it — the one whose
   coverage justified the removal — and which canon doc (path) it now lives in.

So the ledger answers, for any dropped local guidance, exactly what in the canon
replaced it. This issue is the durable home for the "quote the canon line"
justification; never remove a local instruction without writing its paired entry
here. (A run that prunes nothing writes no comment.)

## Discipline

- Be conservative: a wrongful prune deletes a real lesson, and it lands with no PR
  review to catch it. Most days, few or no items qualify.
- Keep the suite green: this routine pushes to `main` with no PR/CI gate, so run the
  project's offline test suite locally and push **only if it is green** (a doc a
  test reads can turn `main` red otherwise). If it fails, don't push — open a PR
  with the edits instead so the failure is reviewable.
- Compare local docs against the **currently synced** canon (what the
  session-start hook just pulled from Claudinite `main`) — that is what the project
  actually consumes.
- Never edit the read-only synced canon (a vendored artifact); the routine only
  edits local docs, pushing them to `main` directly. It never merges a PR.

## Output & tracking

- The routine **pushes its doc edits straight to `main`** (no PR, no approval) once
  the offline suite is green. It never merges a PR.
- Log each run that pushed to `main` as a **dated comment** on this routine's own
  standing tracking issue (found **by title**, not a hard-coded number; open it if
  missing, reopen it if it was closed while the routine is still producing output).
  A quiet day logs nothing.
- When a run **removed** any local instruction, additionally log each removed
  instruction — paired with the full text of the canon instruction that superseded
  it — to the standing **superseded-instructions tracking issue** (see above). The
  two issues are separate concerns: the run-log issue is the routine's activity
  history; the superseded-instructions issue is the durable ledger of what local
  guidance was dropped and what replaced it.

## The launcher

Keep the routine's config a **thin pointer** to this doc, not an inlined spec. The
launcher prompt should say: run the daily "optimize procedures" routine exactly as
specified in this doc — reconcile the local docs against the pinned shared canon by
pruning/rephrasing local docs the canon now covers, pushing those edits directly to
`main` (gated on the offline suite being green, no PR), log every removal — paired
with the canon text that superseded it — to the standing superseded-instructions
tracking issue, follow the discipline above, keep the offline test suite green, log
the run on the routine's standing tracking issue, and never merge a PR.

Schedule it daily in the agent's routine scheduler; the repo can't schedule itself,
so the doc is the spec and the routine is the trigger.
