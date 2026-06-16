# Architecture guidelines

Overarching rules for *how we build this*. Specific design decisions and the
mechanics live in [highLevelDesign.md](highLevelDesign.md) /
[fileDescriptions.md](fileDescriptions.md); product behavior lives in
[productRequirements.md](productRequirements.md); tunable product decisions live
in `config.js`.

- Adding support for a new host is the most common change — the architecture must keep it a single, self-contained new file (`pipeline/sources/<site>.js`) plus regenerating the load list, touching nothing else and assuming nothing about other extractors.
- An agent invoked **unattended** by automation (a GitHub Actions workflow, not interactive Claude Code) must be handed the fewest steps possible. Hard-code the deterministic start and end of the task in the workflow itself — branch setup, fetching/recording inputs, opening the PR, dispatching CI — and give the agent only the part that genuinely needs its judgment. Every step expressed as prose for the agent is a fragile point it can skip, reorder, or improvise around; a step the workflow already did in code can't be fumbled, and the shorter prompt keeps the agent on the one thing only it can do. The auto-implement-extractor pipeline is the worked example: the workflow triages, probes the URL, and records the page before the agent runs, so the agent only writes the extractor and its test case (`docs/claude/auto-extractor.md`).
