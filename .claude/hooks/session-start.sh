#!/usr/bin/env bash
#
# SessionStart validator for the cloud environment version (issue #403).
#
# This hook does NOT install anything. Dependency install deliberately lives in
# the pasted Setup script (scripts/cloud-setup.sh), which is filesystem-cached
# and runs ~once per environment; a SessionStart hook is uncached and would
# re-run every session (the #186 rationale). So this hook's only job is to detect
# when the environment was set up with a STALE or MISSING copy of that script and
# tell the user to re-paste it.
#
# How it works: scripts/cloud-setup.sh bakes an `ENV_VERSION=N` and, on success,
# stamps N into a persistent flag file. Here we read the committed (expected)
# ENV_VERSION straight out of that script -- so the version literal has a single
# source of truth and can't drift -- and compare it to the stamped flag.
set -euo pipefail

# Only meaningful in the web/cloud environment, where the Setup script is pasted
# into settings by hand and can drift. A local clone has no such flag (it follows
# the manual git-config steps in docs/claude/github.md), so skip to avoid a false
# warning.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-/home/user/GoogleCalendarEventCreator}"
SETUP_SCRIPT="$PROJECT_DIR/scripts/cloud-setup.sh"
ENV_VERSION_FLAG=/home/user/.gcal-environment-version

# Expected version, read from the committed setup script (the source of truth).
# If we can't parse it, stay silent rather than nag on our own bug.
expected="$(grep -oE '^ENV_VERSION=[0-9]+' "$SETUP_SCRIPT" 2>/dev/null | head -n1 | cut -d= -f2 || true)"
if [ -z "$expected" ]; then
  exit 0
fi

emit_warning() {
  # SessionStart hooks inject stdout into the session as additional context; the
  # assistant relays it to the user. JSON form keeps it unambiguous. The messages
  # below are plain text with no double quotes or backslashes, so they're safe to
  # embed in the JSON string directly (no escaping dependency).
  local msg="$1"
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg"
}

repaste_instructions="Copy the full body of scripts/cloud-setup.sh from this repo into the Setup script field of this environment in Claude Code Web settings (cloud session settings then the environment then Setup script), then start a fresh session so it re-runs."

if [ ! -f "$ENV_VERSION_FLAG" ]; then
  emit_warning "ENVIRONMENT NOT CONFIGURED: no environment-version flag was found, which means this environment's Setup script did not run the committed scripts/cloud-setup.sh (expected version ${expected}). Test devDependencies may be missing. Please alert the user: ${repaste_instructions}"
  exit 0
fi

actual="$(head -n1 "$ENV_VERSION_FLAG" | tr -dc '0-9' || true)"
if [ -z "$actual" ]; then
  emit_warning "ENVIRONMENT FLAG UNREADABLE: ${ENV_VERSION_FLAG} exists but holds no version number. Please alert the user: ${repaste_instructions}"
  exit 0
fi

if [ "$actual" -lt "$expected" ]; then
  emit_warning "ENVIRONMENT OUTDATED: this environment was set up with cloud-setup.sh version ${actual}, but the repo is now at version ${expected}. Please alert the user that the Setup script is stale: ${repaste_instructions}"
  exit 0
fi

# In sync -- say nothing.
exit 0
