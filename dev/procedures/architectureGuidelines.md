# Architecture guidelines

Overarching rules for *how we build this*. Specific design decisions and the
mechanics live in [highLevelDesign.md](highLevelDesign.md) /
[fileDescriptions.md](fileDescriptions.md); product behavior lives in
[requirements.md §12–§16](../requirements/requirements.md); tunable product decisions live
in `extension/config.js`.

Portable agent-architecture principles that aren't specific to this project (the
unattended-agent judgment boundary, the bounded-and-enforced write surface) live
in the shared rules:
[claude/shared/agent-architecture.md](claude/shared/agent-architecture.md). The
worked examples for both are this repo's auto-extractor pipeline
([claude/auto-extractor.md](claude/auto-extractor.md)).

- Adding support for a new host is the most common change — the architecture must keep it a single, self-contained new file (`extension/event-extractors/custom/<site>.js`) plus regenerating the load list, touching nothing else and assuming nothing about other extractors.
