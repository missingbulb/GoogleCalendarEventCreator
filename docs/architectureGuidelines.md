# Architecture guidelines

Short, top-level rules of the road. (Detail: [highLevelDesign.md](highLevelDesign.md),
[lowLevelDesign.md](lowLevelDesign.md).)

- One top-level entry point: everything (popup, tests) extracts via `GCal.extract()`, which selects the per-URL source internally.
- A per-site extractor is self-contained: it produces every field of its events itself. Nothing is merged over a matched source.
- No extractor depends on another extractor — only on shared helpers. If reusable logic lives in one extractor, lift it to a helper both can call.
- Helpers vs extractors: helpers are reusable utilities (DOM, text, dates, embedded-events reader, location `parts`, …); extractors are the per-site sources plus the single unsupported-site fallback.
- Supported vs unsupported: a matched source's result is authoritative; with no source, the unsupported-site extractor scrapes a best-effort event used only to seed the request-a-source form (never shown as a button).
- Name by scope/responsibility, not technology (`embeddedEvents`, `unsupportedSiteEvents` — not `jsonLd`/`generic`).
- Sources say *what* (which element/field); helpers own *how* (rendering, whitespace, de-dup). Push generic decisions up; keep only site-specific ones (hardcoded ctz, composition, year inference) in the source.
- No layer collapses newlines: descriptions preserve `<br>`/line breaks via the text helpers; `clean()` is only for single-line fields (title, location).
- Timezone normalization is central: `assemble-events.js` re-expresses an absolute start/end as floating local time in a known `ctz`; sources just supply `ctz`.
- Integration cases are the reviewed contract: a behavior-preserving refactor must keep them byte-identical.
