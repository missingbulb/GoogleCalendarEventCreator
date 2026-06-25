# Engineering practices (local working set)

General software-engineering-practice lessons captured **in this repo** that
haven't (yet) been promoted into the shared canon. The curated, project-agnostic
canon lives read-only in the Claudinite submodule —
[claude/shared/engineeringPractices.md](../claude/shared/engineeringPractices.md) —
which is what the rest of the docs link to.

This file is a **local capture surface**: the "learned lessons" command and the
daily auto-lessons digest write new engineering-practice insights here (capture is
always local — see [claude/workflow.md](../claude/workflow.md)). The daily
**optimize-procedures** routine
([auto-optimize-procedures.md](auto-optimize-procedures.md)) is the
only thing that bridges to Claudinite: it promotes generalizable items from here
up (via a `claudinite-lesson` issue) and, once the canon absorbs them and the
submodule pin updates, prunes them from this file. So this doc stays small —
usually just whatever is captured-but-not-yet-upstreamed.

- **A bug report you can't reproduce against HEAD may already be fixed but unreleased — check the SHIPPED version before theorizing about the cause.** A user runs the released build, not your checkout. When a reported behavior doesn't reproduce against `main`, compare the manifest/`package.json` version to the latest release and `git log -S"<the logic>"` the relevant code before inventing explanations. In #507 the "past" pill not showing was the released v1.3.0 deciding it by *year only*; the same-year fix had already merged to `main` but wasn't released — several wrong "mid-day / viewed-before-the-event" theories would have been skipped by checking the version first.

- **Automated / CI environments are often bot-blocked from fetching target sites — the block is the datacenter IP, not the User-Agent.** A live fetch that works on your machine can fail from CI or a sandbox (HTTP 403/400, a CAPTCHA wall) no matter how browser-like the headers are, because the *IP* is what's blocked. Route the fetch through a residential-proxy service (these usually also render JS, so a single-page-app records real content) rather than tweaking headers. Some hard sites stay blocked even through a proxy — treat those as un-cacheable.

- **Collapse parallel classifiers to one, and prefer a structural classifier the code can't desync from over a hand-set field.** When the same property is tagged in more than one place (a spec tag, a side manifest, a per-item field), the copies drift — fold them into a single source of truth. Best of all is a *structural* classifier that derives the category from where something lives (its folder or path), so there's no field to forget to update and no way for the classifier to desync from the item it classifies.

- **A setup script may start in the repo's parent directory, not the checkout — `cd` into the checkout first.** A root or cloud setup script can begin a level above the repo, where a bare `npm ci` / build finds no `package.json` and silently does nothing — surfacing much later as a confusing mid-session install or a missing-deps error. Make the setup script `cd` into the checkout before it runs anything.
