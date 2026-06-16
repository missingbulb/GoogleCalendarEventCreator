# Architecture guidelines

Overarching rules for *how we build this*. Specific design decisions and the
mechanics live in [highLevelDesign.md](highLevelDesign.md) /
[fileDescriptions.md](fileDescriptions.md); product behavior lives in
[productRequirements.md](productRequirements.md); tunable product decisions live
in `config.js`.

- Adding support for a new host is the most common change — the architecture must keep it a single, self-contained new file (`pipeline/sources/<site>.js`) plus regenerating the load list, touching nothing else and assuming nothing about other extractors.
- An agent invoked **unattended** by automation (a CI workflow, not interactive Claude Code) should be left only the part of the task that genuinely needs its judgment; hard-code every deterministic part — the setup before *and* the wrap-up after — in the workflow around it. A step described in prose is one the agent can skip, reorder, or improvise; a step the workflow runs in code can't be fumbled, and the shorter prompt keeps the agent on the one thing only it can do. Push that boundary continually: each time a step proves mechanical, move it out of the prompt and into the workflow. (Worked example: the auto-implement-extractor pipeline — `docs/claude/auto-extractor.md`.)
