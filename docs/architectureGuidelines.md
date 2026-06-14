# Architecture guidelines

Overarching rules for *how we build this*. Specific design decisions and the
mechanics live in [highLevelDesign.md](highLevelDesign.md) /
[lowLevelDesign.md](lowLevelDesign.md); tunable product decisions live in
`config.js`.

- Adding support for a new host is the most common change — the architecture must keep it a single, self-contained new file (`pipeline/sources/<site>.js`) plus regenerating the load list, touching nothing else.
- One top-level entry point: everything (popup, tests) extracts through a single function (`GCal.extract()`) that selects the per-URL source internally.
- A per-site extractor is self-contained: it produces every field of its events itself; nothing is merged over a matched source.
- No extractor depends on another extractor — only on shared helpers. Reusable logic that emerges in one extractor is lifted to a helper.
- Two kinds of building block: extractors (the per-site sources plus one fallback for unsupported hosts) and helpers (reusable utilities). A source decides *what* (which element/field); helpers own *how* (rendering, whitespace, de-dup, normalization), applied uniformly rather than re-decided per source.
- Name by scope/responsibility, not technology or mechanism.
- Tunable product decisions (durations, limits, fallback copy) live in `config.js`, not hardcoded across extractors or UI.
