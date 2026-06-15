#!/usr/bin/env bash
#
# Cloud setup script for Claude Code on the web.
#
# This is the single source of truth for what the cloud *environment* installs
# before a session starts. It is NOT wired up automatically: paste its body into
# the environment's "Setup script" field (cloud session settings -> the
# environment -> Setup script). See docs/claude/web-sessions.md for the why and
# the trade-off vs. a SessionStart hook.
#
# It installs the test-only devDependencies (jsdom, ...) that aren't committed,
# so `npm test` works without a mid-session install. Setup-script output is
# filesystem-cached and reused across sessions, so this runs ~once per
# environment rather than taxing every session.
set -euo pipefail

# `|| true` so a transient registry hiccup doesn't block the whole session from
# starting (per the platform's setup-script guidance). A session that never runs
# the tests is unaffected, and Claude can reinstall mid-session if needed.
npm ci || true
