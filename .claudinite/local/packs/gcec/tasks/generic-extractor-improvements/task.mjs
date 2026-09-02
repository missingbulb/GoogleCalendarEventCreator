// gcec local task: generic-extractor-improvements — the weekly attempt to make the GENERIC
// generic extractor recover more of what the dedicated per-site sources get
// (per-project-scheduling DESIGN §6). Worker: task.md. Most runs correctly change
// nothing — the coverage gate already banks every prior win — so a forced or fake
// win is worse than none; no win → no branch, no PR.
//
// Self-contained (imports nothing): the whole contract is this default export.

export default {
  id: 'generic-extractor-improvements',
  frequency: 'weekly',            // fires on the repo's weekly anchor day/hour
  agent_model: 'opus',                 // closing a real generic-extractor gap is heavy judgment
  expected_outcome: 'pr',
  // What may land unreviewed, measured against the pushed diff rather than trusted:
  // exactly the file scope postconditions.sh already refuses to exceed — the generic
  // extractor, its helpers, the covering test and the regenerated artifacts — named
  // once as `generic-coverage-scope` in the pack's merge-rules.json. A run that
  // wandered into a custom/<site>.js or the manifest, or that DELETED a helper the
  // postcondition would have tolerated, parks for review instead of merging: the
  // postcondition is a gate the run executes on itself, this one is not.
  automerge: ['generic-coverage-scope'],

  agent_instructions: 'task.md',
  // The best-effort run bound the executor surfaces into the subagent's brief
  // (agent-preprocessing DESIGN §2, §6): "fail after N minutes". Very generous —
  // this is an OPEN-ENDED judgment loop (hypothesize → edit → the network-bound
  // `test:live` → compare, iterated), not a predictable mechanical run, so the
  // bound is extreme runaway protection, not a scheduling knob. No deterministic
  // pre-step is split into agent_preprocessing here: the baseline the agent picks
  // targets from is measured by `test:live` on a fresh clone and must be SEEN by
  // the agent, and preprocessing has no code→agent data channel (DESIGN §3), so
  // the whole task stays a single agentic stage.
  agent_execution_timeout: 5400,

  // The canon's own `substantive-change`: a commit touched real source, not only
  // docs or GENERATED output, inside the window. This was hand-rolled here — the
  // same read, the same sha list — which cost the term's context CAP: an unbounded
  // list named every commit of a busy week in the one section this run is told to
  // read as its scope. The built-in also drops any commit carrying the
  // `Claudinite-Task:` trailer, so no other task's output can wake this one.
  //
  // Most weeks nothing meaningful lands, and re-deriving last week's answer costs a
  // full opus run. When in doubt the week still runs: a run that finds nothing is
  // cheap and makes no PR; a too-clever skip that misses a real opportunity is not.
  // That a forced or fake win is worse than none is standing instruction, so it
  // lives in task.md rather than being re-stated as this run's Context.
  preconditions: ['substantive-change'],
};
