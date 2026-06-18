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
set -euo pipefail

# The setup script runs as root before Claude launches, starting in the repo's
# PARENT directory (/home/user) rather than the checkout. cd in first -- without
# this, `npm ci` finds no package.json and silently installs nothing.
cd /home/user/GoogleCalendarEventCreator

# `|| true` so a transient registry hiccup doesn't block the whole session from
# starting (per the platform's setup-script guidance). A session that never runs
# the tests is unaffected, and Claude can reinstall mid-session if needed.
npm ci || true

# Conflict-resolution hygiene for the generated/derived artifacts that every
# parallel branch regenerates (the load lists, UI snapshots, coverage baseline).
# Two per-clone git settings the committed .gitattributes relies on (see
# docs/claude/github.md). Both are idempotent, so re-running is safe.
#   - rerere: record how a conflict was resolved and replay it automatically when
#     the same conflict recurs — and these recur in the same shape across branches.
#   - the `ours` merge driver .gitattributes maps the generated files to, so a
#     conflict in one keeps a side automatically and you just `npm run regen`.
# git config (local) writes the repo's .git/config, which persists with the
# environment's cached filesystem alongside node_modules above.
git config rerere.enabled true
git config merge.ours.driver true
