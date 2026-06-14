# Architecture guidelines

Overarching rules for *how we build this*. Specific design decisions and the
mechanics live in [highLevelDesign.md](highLevelDesign.md) /
[lowLevelDesign.md](lowLevelDesign.md); tunable product decisions live in
`config.js`.

- Adding support for a new host is the most common change — the architecture must keep it a single, self-contained new file (`pipeline/sources/<site>.js`) plus regenerating the load list, touching nothing else and assuming nothing about other extractors.
- Name by scope/responsibility, not technology or mechanism.
- Verify how a platform or runtime actually behaves against authoritative docs or a real run — not against a comment or a prior commit's claim.
- Earn each dependency: prefer a built-in (or a few lines) for a narrow job, and drop one when the assumption that justified it lapses.
