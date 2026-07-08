#!/usr/bin/env bash
#
# Postconditions for the daily fallback-coverage routine
# (dev/incremental-maintenance/auto-fallback-coverage/routine.md).
#
# Runs AFTER the agent has made a candidate change, and bundles every
# deterministic validation that a "win" is clean, generic, real and non-regressing.
#   Exit 0   → the win is valid; finalize and open the PR.
#   Non-zero → a postcondition FAILED. Mark the run failed; do NOT retry and do
#              NOT open a PR. A failure means this deliberately-lean spec let the
#              agent produce an invalid change — the fix is to re-introduce guiding
#              prose to the routine, not to loop.
#
# Pass every value the change newly recovered via the body-text scan as arguments,
# so the jsdom-artifact trap can be checked automatically:
#   postconditions.sh "<recovered value 1>" "<recovered value 2>" ...
#
# Checks (all deterministic):
#   1. SCOPE — the diff touches ONLY the generic extractor and its allowed
#      companions: extract-unsupported.js and the shared helpers/*.js (the generic
#      extractor), a covering test in extension-test/event-extractors/extraction.test.js,
#      and the regenerated fallback-coverage GENERATED artifacts. A custom/<site>.js
#      edit or a host special-case is out of scope — it isn't a GENERIC win. (This
#      enforces WHICH files changed; whether the rule keys off a widely-used
#      convention rather than one page's quirk is the agent's judgment.)
#   2. SUITE — `npm test` is green. Runs the whole offline+live+UI suite, including
#      the fallback-coverage high-watermark gate, which FAILS on any field
#      regression. (Red-before-green and authoring the covering test are the
#      agent's job; this asserts the end state.)
#   3. WIN — the regenerated baseline really improved on the committed (pre-change)
#      baseline: every headline % is >= the committed value and at least one is
#      strictly greater. A change that improves nothing, or lifts one field while
#      dropping another, is not a clean win. (Compares the working tree to the base
#      ref, so no state has to be carried over from preconditions.)
#   4. JSDOM — no value passed as an argument is a jsdom-only artifact. The offline
#      body-text scan reads document.body.textContent, which INCLUDES <script> JSON
#      (Next.js __NEXT_DATA__), <noscript>, <style>, <select>/<option> — none of
#      which Chrome's innerText exposes, so a win matching only such content is
#      illusory. (grep can't see CSS-hidden text — eyeball that separately. And
#      widening a body-text scan-window cap can make a DIFFERENT case start matching
#      a <script> blob it never reached: before raising any cap, re-run the whole
#      corpus at the new size and confirm no other case gains a wrong value.)

set -uo pipefail
cd "$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

fail() { echo "POSTCONDITION FAILED — mark this run failed, do not retry: $*" >&2; exit 1; }

ref=origin/main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=HEAD

# ── 1. SCOPE ──
allowed='^(extension/event-extractors/extract-unsupported\.js|extension/event-extractors/helpers/[^/]+\.js|extension-test/event-extractors/extraction\.test\.js|dev/requirements/extractor/fallback/fallback-coverage\.(baseline\.GENERATED\.json|GENERATED\.md))$'
changed="$( { git diff --name-only "$ref"...HEAD 2>/dev/null; git diff --name-only HEAD 2>/dev/null; \
              git ls-files --others --exclude-standard; } | sort -u | sed '/^$/d' )"
offenders="$(printf '%s\n' "$changed" | grep -Ev "$allowed" || true)"
[ -z "$offenders" ] || fail "out-of-scope changes (only the generic extractor may change):
$(printf '  %s\n' $offenders)"

# ── 2. SUITE ──
npm test || fail "npm test is not green"

# ── 3. WIN ──
blpath="dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json"
pre_json="$(git show "$ref:$blpath" 2>/dev/null)" || fail "no committed baseline at $ref to compare against"
post_json="$(cat "$blpath" 2>/dev/null)" || fail "regenerated baseline missing — run the live suite first"
node -e '
  const pre = JSON.parse(process.argv[1]);
  const post = JSON.parse(process.argv[2]);
  const fields = ["criticalFieldsPct", "allFieldsPct"];
  const regressed = fields.filter(f => post[f] < pre[f]);
  const improved  = fields.filter(f => post[f] > pre[f]);
  const show = fields.map(f => `${f} ${pre[f]}→${post[f]}`).join(", ");
  if (regressed.length) { console.error(`regressed: ${regressed.join(", ")} (${show})`); process.exit(1); }
  if (!improved.length) { console.error(`no improvement over baseline (${show})`); process.exit(1); }
  console.log(`win: ${show}`);
' "$pre_json" "$post_json" || fail "coverage did not cleanly improve over the committed baseline"

# ── 4. JSDOM ──
for value in "$@"; do
  [ -n "$value" ] || continue
  node -e '
    const fs = require("fs"), path = require("path");
    const value = process.argv[1];
    const dir = "dev/requirements/extractor/data/server-fetched";
    const strip = s => s.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
    const hidden = [];
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith(".html"))) {
      const html = fs.readFileSync(path.join(dir, f), "utf8");
      if (!html.includes(value)) continue;
      if (!strip(html).includes(value)) hidden.push(f);
    }
    if (hidden.length) { console.error("only inside <script>/<style>/<noscript>: " + hidden.join(", ")); process.exit(1); }
  ' "$value" || fail "recovered value is a jsdom-only artifact (illusory in Chrome): \"$value\""
done

echo "All postconditions passed — the win is valid. Finalize and open the PR."
exit 0
