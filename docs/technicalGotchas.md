# Technical gotchas

Non-obvious footguns specific to this codebase — traps that have cost real
debugging time, recorded so they bite only once. Overarching architecture rules
live in [architectureGuidelines.md](architectureGuidelines.md); project-agnostic
engineering practices in [engineeringPractices.md](engineeringPractices.md).

- **Service-worker paths must be extension-root absolute.** The background service
  worker runs from `ui/toolbar-icon.js`, so any path it hands a Chrome API
  (`importScripts`, `action.setIcon`) or `fetch` must be extension-root absolute —
  a leading slash or `chrome.runtime.getURL(...)`. A bare relative path
  (`icons/...`, `pipeline/...`) resolves against `ui/` and silently fails: the
  import aborts the worker (#146), or `setIcon` rejects with "Failed to fetch" and
  the icon never changes (#204).
