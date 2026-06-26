// Tests for record_page's non-HTML guard (dev/create-extractor/record-page.sh).
// #279 (stubhub): ScraperAPI's render=true returned the SPA's rendered TEXT with zero
// markup (4018 bytes, not one '<') — a 2xx fetch with nothing to extract. record_page
// must treat a non-HTML body like a tier failure: escalate the proxy quality and retry,
// and if even ultra_premium comes back plaintext, FAIL (no usable fixture).
//
// record_page is bash, so we drive record-page.sh directly with a FAKE curl on PATH
// (real jq stays available — PATH is prepended, not replaced). The fake reads the tier
// off the ScraperAPI URL it's handed, logs each call, and returns html / plaintext / a
// non-2xx failure per FAKE_CURL_SPEC, exactly as the real ladder would observe them.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "record-page.sh");

// A curl stand-in: finds the -o target and the ScraperAPI URL, derives the tier from
// the URL, appends it to $FAKE_CURL_LOG, then emits html / plaintext / a 22 failure
// per the tier's entry in $FAKE_CURL_SPEC ("standard:text,premium:text,ultra:html").
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
outcome=fail
IFS=',' read -ra pairs <<< "$FAKE_CURL_SPEC"
for p in "\${pairs[@]}"; do
  [ "\${p%%:*}" = "$tier" ] && outcome="\${p##*:}"
done
case "$outcome" in
  html) printf '<!doctype html><html><body><h1>Event</h1></body></html>' > "$out"; exit 0;;
  text) printf 'Buy tickets\\nShlomo Artzi\\n8:30 PM Tel Aviv, Israel' > "$out"; exit 0;;
  *)    exit 22;;
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
