# Architecture guidelines

Overarching rules for *how we build this*. Specific design decisions and the
mechanics live in [highLevelDesign.md](highLevelDesign.md) /
[lowLevelDesign.md](lowLevelDesign.md); tunable product decisions live in
`config.js`.

- Adding support for a new host is the most common change — the architecture must keep it a single, self-contained new file (`pipeline/sources/<site>.js`) plus regenerating the load list, touching nothing else and assuming nothing about other extractors.
- Name by scope/responsibility, not technology or mechanism.
- When a change hinges on how a platform or runtime actually behaves (MV3/service-worker semantics, `importScripts` path resolution, what Node provides), confirm it against authoritative docs or a real run — never against an existing comment or a prior commit's claim. The toolbar-icon `importScripts` bug (#146) shipped, and a "fix" (#132) made it worse, because each step trusted a confident-but-wrong belief about path resolution; the platform docs settled it.
- Keep dependencies minimal and earn each one: before adding a dependency for a narrow job, check whether a platform built-in (or a few lines) does it, and drop a dependency once the assumption that justified it lapses. The real-Chrome load test began on `puppeteer-core` (chosen for "no browser download"); once it had to fetch Chrome for Testing anyway, ~40 lines of Node's built-in `WebSocket` (DevTools Protocol) replaced ~84 packages.
