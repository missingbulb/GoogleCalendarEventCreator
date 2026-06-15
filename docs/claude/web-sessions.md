# Web (cloud) session setup

Claude Code on the web runs each session in a fresh Anthropic-managed VM with
the repo freshly cloned. `node_modules` starts empty there (the test-only
devDependencies — `jsdom`, … — aren't committed), so something has to install
them before `npm test` will run. This file is about doing that install *once*,
up front, instead of paying for it mid-session.

## The fix: a cached setup script (not a SessionStart hook)

The install lives in a **setup script**, configured per cloud environment. A
setup script runs once, before Claude Code launches; its filesystem result is
then snapshotted and reused as the starting point for later sessions, so the
script is *skipped* on subsequent starts. It only re-runs when you change the
script (or the environment's allowed hosts) or after the cache's ~7-day expiry.
Net effect: a session that runs the tests starts with `node_modules` already on
disk, and a session that never touches the tests pays nothing per-session — only
the one-time, amortized first-run cost.

The canonical script body lives in
[`scripts/cloud-setup.sh`](../../scripts/cloud-setup.sh) so it's
version-controlled and reviewable. It is **not** wired up automatically — the
setup script lives in the cloud environment settings, which aren't part of the
repo. Activate it once per environment:

> Cloud session settings → the environment → **Setup script** field → paste the
> body of `scripts/cloud-setup.sh`.

Platform mechanics (the *Setup scripts* and *Environment caching* sections):
<https://code.claude.com/docs/en/claude-code-on-the-web>.

## Why not a SessionStart hook

A committed `SessionStart` hook (`.claude/settings.json`) is the other obvious
place to run `npm install`, and the platform even suggests it for project setup
that should run both locally and in the cloud. We deliberately don't use it for
*this*, because a hook:

- runs on **every** session start and resume, and
- is **not** captured by environment caching — its output isn't part of the
  snapshot, so a fresh VM re-installs on every new session.

That turns a cost only *some* sessions pay today (the ones that run tests) into a
cost **every** session pays, including pure Q&A or docs edits. The cached setup
script avoids that.

If you specifically want the install to run in **local** dev too, add a guarded
hook on top of the setup script — guarded to no-op when `node_modules` already
exists (so it's free in the cloud, where the snapshot already has it) and only
does real work on a fresh local checkout. That's an opt-in for local parity, not
a speed measure; the setup script above is what keeps web startup fast.
