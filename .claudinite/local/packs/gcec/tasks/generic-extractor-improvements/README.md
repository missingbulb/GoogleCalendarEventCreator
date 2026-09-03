# generic-extractor-improvements

## Why the declaration reads as it does

Carried over from the declaration's comments when it became task.json.

gcec local task: generic-extractor-improvements — the weekly attempt to make the GENERIC
generic extractor recover more of what the dedicated per-site sources get
(per-project-scheduling DESIGN §6). Worker: task.md. Most runs correctly change
nothing — the coverage gate already banks every prior win — so a forced or fake
win is worse than none; no win → no branch, no PR.

Self-contained (imports nothing): the whole contract is this default export.
fires on the repo's weekly anchor day/hour
closing a real generic-extractor gap is heavy judgment
What may land unreviewed, measured against the pushed diff rather than trusted:
exactly the file scope postconditions.sh already refuses to exceed — the generic
extractor, its helpers, the covering test and the regenerated artifacts — named
once as `generic-coverage-scope` in the pack's merge-rules.json. A run that
wandered into a custom/<site>.js or the manifest, or that DELETED a helper the
postcondition would have tolerated, parks for review instead of merging: the
postcondition is a gate the run executes on itself, this one is not.
The best-effort run bound the executor surfaces into the subagent's brief
(agent-preprocessing DESIGN §2, §6): "fail after N minutes". Very generous —
this is an OPEN-ENDED judgment loop (hypothesize → edit → the network-bound
`test:live` → compare, iterated), not a predictable mechanical run, so the
bound is extreme runaway protection, not a scheduling knob. No deterministic
pre-step is split into agent_preprocessing here: the baseline the agent picks
targets from is measured by `test:live` on a fresh clone and must be SEEN by
the agent, and preprocessing has no code→agent data channel (DESIGN §3), so
the whole task stays a single agentic stage.
When in doubt the week still runs: a run that finds nothing is cheap and makes
no PR; a too-clever skip that misses a real opportunity is not.
