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
- **A push or PR made with the Actions `GITHUB_TOKEN` does not start another
  workflow.** GitHub suppresses workflow runs triggered by the built-in
  `GITHUB_TOKEN` to prevent recursion, so a workflow's own `git push` or
  `gh pr create` won't fire `test.yml` or `refresh-cache.yml`. The one exception is
  `workflow_dispatch` / `repository_dispatch` — which is why the auto-extractor
  pipeline dispatches `refresh-cache.yml` and `test.yml` explicitly (see
  `docs/claude/auto-extractor.md`). A run dispatched against a branch executes on
  its head commit, so its checks still attach to the PR.
- **`Cannot find module 'jsdom'` means the dev deps aren't installed, not a code
  bug.** `node_modules` starts empty on a fresh checkout (including the ephemeral
  cloud sandbox); `jsdom` is a test-only devDependency loaded by `test/harness.js`.
  Run `npm install` and re-run — don't look for another cause first.
- **Automated environments are bot-blocked from fetching target sites.** A
  live-page fetch that works on your machine often fails from CI/sandboxes:
  `npm run refresh` gets HTTP 403 in the cloud sandbox (so new cached HTML is
  filled by the **Refresh cached HTML files** workflow, not locally), and GitHub
  Actions runners get HTTP 400 from `facebook.com` (so Facebook is covered by unit
  tests only — it can't be a cached live case).
