# Architecture guidelines

Overarching rules for *how we build this*. Specific design decisions and the
mechanics live in [highLevelDesign.md](highLevelDesign.md) /
[fileDescriptions.md](fileDescriptions.md); product behavior lives in
[productRequirements.md](productRequirements.md); tunable product decisions live
in `config.js`.

- Adding support for a new host is the most common change — the architecture must keep it a single, self-contained new file (`pipeline/sources/<site>.js`) plus regenerating the load list, touching nothing else and assuming nothing about other extractors.
- The background service worker runs from `ui/toolbar-icon.js`, so any path it hands a Chrome API (`importScripts`, `action.setIcon`) or `fetch` must be extension-root absolute — a leading slash or `chrome.runtime.getURL(...)`. A bare relative path (`icons/...`, `pipeline/...`) resolves against `ui/` and silently fails: the import aborts the worker (#146), or `setIcon` rejects with "Failed to fetch" and the icon never changes (#204).
