// Tests for record_page's body guards + SPA re-fetch (dev/create-extractor/record-page.sh).
// #279 (stubhub): ScraperAPI's render=true returned the SPA's rendered TEXT with zero
// markup (4018 bytes, not one '<') — a 2xx fetch with nothing to extract. record_page
// must treat a non-HTML body like a tier failure: escalate the proxy quality and retry,
// and if even ultra_premium comes back plaintext, FAIL (no usable fixture).
// #587 (eventer): ScraperAPI's render is flaky — the standard tier can return an
// un-hydrated SPA shell on one call and a full render on the next. record_page re-fetches
// the STANDARD tier up to 5× on an unexpanded SPA, keeps the first expansion, and if none
// expands keeps the last 200 anyway (never fails, never escalates for a shell). A rendered
// AngularJS page keeps its `ng-attr` source attrs, so the detector strips those before
// checking for leftover `{{…}}` — it must not mistake a good render for a shell.
//
// record_page is bash, so we drive record-page.sh directly with a FAKE curl on PATH (real
// jq stays available — PATH is prepended, not replaced). The fake reads the tier off the
// ScraperAPI URL, logs each call, and per FAKE_CURL_SPEC returns one of: html (plain page),
// rendered (Angular page WITH resolved data + persistent ng-attr attrs), shell (unexpanded
// Angular, `{{…}}` still in the body), text (plaintext), or a 22 failure. A tier's outcome
// may be a `|`-separated SEQUENCE applied per attempt (e.g. "standard:shell|shell|rendered").
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "record-page.sh");

// A curl stand-in: finds the -o target and the ScraperAPI URL, derives the tier, appends
// it to $FAKE_CURL_LOG, then emits a body per the tier's entry in $FAKE_CURL_SPEC. An entry
// may be a single outcome ("standard:html") or a `|`-separated per-attempt sequence
// ("standard:shell|shell|rendered"); the attempt index is how many times this tier has been
// called so far (clamped to the last element), so a repeated standard fetch advances it.
const FAKE_CURL = `#!/usr/bin/env bash
out=""; url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2;;
    https://api.scraperapi.com/*) url="$1"; shift;;
    *) shift;;
  esac
done
tier=standard
case "$url" in
  *ultra_premium=true*) tier=ultra_premium;;
  *premium=true*) tier=premium;;
esac
echo "$tier" >> "$FAKE_CURL_LOG"
attempt=$(grep -cx "$tier" "$FAKE_CURL_LOG")
seq=fail
IFS=',' read -ra pairs <<< "$FAKE_CURL_SPEC"
for p in "\${pairs[@]}"; do
  [ "\${p%%:*}" = "$tier" ] && seq="\${p#*:}"
done
IFS='|' read -ra outs <<< "$seq"
idx=$((attempt - 1))
[ "$idx" -ge "\${#outs[@]}" ] && idx=$((\${#outs[@]} - 1))
outcome="\${outs[$idx]}"
case "$outcome" in
  html)     printf '<!doctype html><html><body><h1>Event</h1></body></html>' > "$out"; exit 0;;
  rendered) printf '<!doctype html><html><head><meta property="og:title" ng-attr-content="{{getMetaDataTitle()}}" content="Real Title"></head><body><h1>Real Title</h1></body></html>' > "$out"; exit 0;;
  shell)    printf '<!doctype html><html><head><meta property="og:title" ng-attr-content="{{getMetaDataTitle()}}"></head><body><h1>{{event.title}}</h1></body></html>' > "$out"; exit 0;;
  text)     printf 'Buy tickets\\nShlomo Artzi\\n8:30 PM Tel Aviv, Israel' > "$out"; exit 0;;
  *)        exit 22;;
esac
`;

function runRecordPage(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "record-page-"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "curl"), FAKE_CURL, { mode: 0o755 });
  const log = path.join(dir, "curl.log");
  const out = path.join(dir, "page.html");
  const res = spawnSync("bash", [SCRIPT, "https://www.stubhub.com/shlomo-artzi/event/1", out], {
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      SCRAPER_API_KEY: "test-key",
      FAKE_CURL_SPEC: spec,
      FAKE_CURL_LOG: log,
    },
    encoding: "utf8",
  });
  const tiers = fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [];
  const body = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  return { status: res.status, stderr: res.stderr, tiers, body };
}

test("a plaintext body escalates the proxy tier and retries", () => {
  const r = runRecordPage("standard:text,premium:text,ultra_premium:html");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard", "premium", "ultra_premium"]);
  assert.match(r.body, /<html/i); // the ultra_premium HTML was kept
});

test("plaintext at every tier (incl. ultra_premium) is a hard failure", () => {
  const r = runRecordPage("standard:text,premium:text,ultra_premium:text");
  assert.notEqual(r.status, 0); // declare failure and stop
  assert.deepEqual(r.tiers, ["standard", "premium", "ultra_premium"]);
});

test("real HTML at the standard tier is kept without escalating", () => {
  const r = runRecordPage("standard:html");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard"]); // no needless credit spend
  assert.match(r.body, /<html/i);
});

test("a non-2xx still escalates (the original ladder is preserved)", () => {
  const r = runRecordPage("standard:fail,premium:html");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard", "premium"]);
  assert.match(r.body, /<html/i);
});

// #587 (eventer): standard-tier SPA re-fetch on a flaky render.
test("an unexpanded SPA is re-fetched at standard and the expansion is kept", () => {
  const r = runRecordPage("standard:shell|shell|rendered");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard", "standard", "standard"]); // re-fetched, no escalation
  assert.match(r.body, /content="Real Title"/); // the expanded render (resolved data) was kept
});

test("a persistently unexpanded SPA keeps the last 200 after 5 standard attempts", () => {
  const r = runRecordPage("standard:shell");
  assert.equal(r.status, 0, r.stderr);   // never fails — the last 200 is kept for downstream
  assert.deepEqual(r.tiers, ["standard", "standard", "standard", "standard", "standard"]);
  assert.match(r.body, /\{\{event\.title\}\}/); // the (still-shell) last response was kept
});

test("a rendered AngularJS page (ng-attr present) is not mistaken for a shell", () => {
  const r = runRecordPage("standard:rendered");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard"]); // recognized as expanded — fetched once, no re-fetch
  assert.match(r.body, /Real Title/);
});

test("premium does NOT re-fetch a shell (SPA retry is standard-only)", () => {
  const r = runRecordPage("standard:fail,premium:shell");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard", "premium"]); // escalated on the standard error, then kept
  assert.match(r.body, /\{\{event\.title\}\}/); // premium's 200 is kept as-is, not retried
});
