#!/usr/bin/env bash
#
# Cloud setup script for Claude Code on the web.
#
# Paste this file's body into the cloud environment's "Setup script" field
# (cloud session settings -> the environment -> Setup script). It is NOT wired
# up automatically; the setup script lives in the environment settings, not the
# repo. This committed copy is the reviewable single source of truth.
#
# It installs the test-only devDependencies (jsdom, ...) that aren't committed,
# so `npm test` works without a mid-session install. Setup-script output is
# filesystem-cached and reused across sessions, so it runs ~once per environment
# and is skipped afterward -- unlike a SessionStart hook, which is uncached and
# would re-install on every new session (taxing even sessions that never test).
#
# Full rationale: issue #186 and
# https://code.claude.com/docs/en/claude-code-on-the-web (Setup scripts /
# Environment caching).
#
# Because this script is pasted into the environment settings by hand, an
# environment can silently drift to a stale (or absent) copy. ENV_VERSION below
# is the drift signal: bump it whenever this script's body changes in a way that
# matters, and the script stamps it into a persistent flag file. A lightweight
# SessionStart validator (.claude/hooks/check-environment-version.sh) compares the committed
# ENV_VERSION against that flag every session and tells the user to re-paste this
# file when it's missing or older. The flag literal is read back by the hook via
# grep, so this `ENV_VERSION=` line is the single source of truth -- keep it on
# one line. (issue #403)
ENV_VERSION=4

# Where the stamped version lives. Outside the checkout (cloned fresh per
# container) but inside the environment's cached filesystem, so it persists
# across sessions exactly like the node_modules this script installs. The hook
# reads this same path.
ENV_VERSION_FLAG=/home/user/.gcal-environment-version

set -euo pipefail

# The setup script runs as root before Claude launches, starting in the repo's
# PARENT directory (/home/user) rather than the checkout. cd in first -- without
# this, `npm ci` finds no package.json and silently installs nothing.
cd /home/user/GoogleCalendarEventCreator

# Pull in the Claudinite shared-rules canon over HTTPS, so a fresh environment has
# it before the first session even runs. Day to day the SessionStart sync hook
# (.claude/hooks/sync-claudinite.sh) keeps it current each session; running it here
# too just primes the cache. Method B (codeload tarball, not a git submodule -- a
# submodule clone 403s on the in-session git-only proxy). Fails soft, and the synced
# canon is gitignored (only its committed marker is tracked). (issue #364)
.claude/hooks/sync-claudinite.sh || true

# `|| true` so a transient registry hiccup doesn't block the whole session from
# starting (per the platform's setup-script guidance). A session that never runs
# the tests is unaffected, and Claude can reinstall mid-session if needed.
npm ci || true

# Conflict-resolution hygiene for the generated/derived artifacts that every
# parallel branch regenerates (the load lists, UI snapshots, coverage baseline).
# Two per-clone git settings the committed .gitattributes relies on (see
# dev/procedures/this_project/github.md). Both are idempotent, so re-running is safe.
#   - rerere: record how a conflict was resolved and replay it automatically when
#     the same conflict recurs — and these recur in the same shape across branches.
#   - the `ours` merge driver .gitattributes maps the generated files to, so a
#     conflict in one keeps a side automatically and you just `npm run regen`.
# git config (local) writes the repo's .git/config, which persists with the
# environment's cached filesystem alongside node_modules above.
git config rerere.enabled true
git config merge.ours.driver true

# Stamp the environment version last, once setup has succeeded, so the flag is
# only written when the environment is genuinely configured. The SessionStart
# hook compares this against the committed ENV_VERSION.
echo "$ENV_VERSION" > "$ENV_VERSION_FLAG"
