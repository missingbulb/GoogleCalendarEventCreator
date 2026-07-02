#!/usr/bin/env bash
# Regenerate the cross-reference analysis from the current repo state.
set -euo pipefail
cd "$(dirname "$0")"
node extract.js
node build-graph.js
echo "done -> refs.json, graph.json, report.md, graph.html"
