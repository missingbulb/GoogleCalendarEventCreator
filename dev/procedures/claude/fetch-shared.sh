#!/usr/bin/env bash
#
# Fetch the Claudinite shared-rules canon into dev/procedures/claude/shared/ over
# HTTPS. This REPLACES the former git-submodule bootstrap (issue #364 set it up as
# a submodule; this is the remote-fetch successor).
#
# WHY HTTPS instead of a git submodule: in Claude Code web sessions the in-session
# git remote is a git-only proxy scoped to THIS repo, so `git submodule update
# --init` -- which must reach the separate missingbulb/Claudinite repo -- gets HTTP
# 403 and the folder never populates, while the harness's own clone-time submodule
# checkout drifts the gitlink and leaves a permanent dirty working tree ("modified:
# dev/procedures/claude/shared (new commits)") that trips every commit nag. GitHub's
# HTTPS endpoints (codeload tarball) go through the general outbound HTTPS proxy and
# return 200, so we vendor the canon by downloading the pinned commit's tarball.
#
# The consumed version is pinned in dev/procedures/claude/shared.ref (one line, a
# Claudinite commit SHA) -- the single source of truth and the plain-file
# replacement for the old submodule gitlink. Roll the canon forward by bumping that
# one line in a PR (reviewable, like the old Dependabot submodule-bump). The vendored
# dev/procedures/claude/shared/ tree is gitignored: it's a fetched artifact, never
# committed, so it can never show as drift again.
#
# Idempotent: a stamp file records the vendored ref and the fetch is skipped when it
# already matches, so re-running across sessions is a cheap no-op. Safe to run from
# the cloud Setup script and from a local clone alike (HTTPS only, no submodule
# machinery, no extra credentials -- Claudinite is public).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEST="$REPO_ROOT/dev/procedures/claude/shared"
REF_FILE="$REPO_ROOT/dev/procedures/claude/shared.ref"
SLUG="missingbulb/Claudinite"
STAMP="$DEST/.claudinite-ref"

if [ ! -f "$REF_FILE" ]; then
  echo "fetch-shared: missing $REF_FILE" >&2
  exit 1
fi
ref="$(tr -d ' \t\r\n' < "$REF_FILE")"
if [ -z "$ref" ]; then
  echo "fetch-shared: $REF_FILE is empty" >&2
  exit 1
fi

# Already vendored at this exact ref -> nothing to do.
if [ -f "$STAMP" ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$ref" ]; then
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

url="https://codeload.github.com/$SLUG/tar.gz/$ref"
echo "fetch-shared: downloading Claudinite @ $ref"
curl -fsSL "$url" -o "$tmp/canon.tar.gz"

mkdir -p "$tmp/x"
# codeload tarballs wrap everything in a single <repo>-<ref>/ top dir; strip it.
tar -xzf "$tmp/canon.tar.gz" -C "$tmp/x" --strip-components=1

rm -rf "$DEST"
mkdir -p "$DEST"
cp -a "$tmp/x/." "$DEST/"
echo "$ref" > "$STAMP"
echo "fetch-shared: vendored Claudinite @ $ref into $DEST"
