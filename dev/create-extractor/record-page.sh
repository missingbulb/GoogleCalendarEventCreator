#!/usr/bin/env bash
# record_page — the ONE place this project fetches a target event page. Split out of
# phase1-prepare.sh so it can be reused and unit-tested in isolation
# (dev/create-extractor/test/record-page.test.js). Sourcing this file only DEFINES the function;
# running it directly (record-page.sh <url> <out>) invokes it. See
# dev/create-extractor/auto-extractor.md.
#
# Fetching is delegated wholesale to ScraperAPI (residential proxy + bot/CAPTCHA
# bypass + render=true JS rendering) when SCRAPER_API_KEY is set: the datacenter
# runner is otherwise bot-blocked, and render=true makes a JS single-page-app
# record with real data instead of an empty shell. With no key, fetch directly with
# a browser UA (a developer on a residential IP needs none). `curl -f` makes a
# non-2xx a hard failure, so an undownloadable page fails the job (the "Comment on
# failure" step then hands the issue to a human). Swap vendors by changing this one
# function. (jq is preinstalled on the runner; it percent-encodes the target URL so
# its own query can't leak up as sibling ScraperAPI params.)
#
# QoS escalation: a hard site (Cloudflare/WAF, JS-heavy) can defeat the standard
# proxy pool — ScraperAPI then returns 500 / times out even after its own internal
# retries (this is what failed seatgeek.com #281: a timeout + three 500s). Rather
# than retry the SAME tier, escalate the proxy quality on failure: standard →
# premium (premium=true) → ultra_premium (ultra_premium=true), each tier far more
# capable (and more credits) than the last. Each tier still gets a couple of
# transient-error retries before we climb; only when the top tier is exhausted does
# the page count as undownloadable and the job fail red. Cheapest tier first keeps
# credit cost down on the common case while still cracking the hard ones.
#
# SPA render-wait (#587 eventer): render=true loads the page in a headless browser,
# but it can snapshot BEFORE a single-page-app has fetched its data and replaced the
# framework template placeholders — eventer.co.il recorded as a bare AngularJS shell
# (`og:title` still `ng-attr-content="{{getMetaDataTitle()}}"`, no real fields). We
# pass ScraperAPI's render instruction set (the `x-sapi-instruction_set` header) with a
# fixed `wait` so the browser idles long enough for the XHR data to populate and render
# before capture. It's a generic, per-site-agnostic delay (no selector to maintain);
# bump RENDER_WAIT_SECONDS if a slower SPA still records a shell.
#
# Non-HTML guard (#279 stubhub): a 2xx fetch isn't enough — ScraperAPI's render=true
# can return the SPA's *rendered text* with ZERO markup (stubhub: 4018 bytes, not a
# single '<'), which yields no DOM / CSS selectors / JSON-LD to extract from and is
# useless as a fixture. So a body that doesn't look like HTML is treated exactly like
# a tier failure: we climb the ladder to a stronger (more browser-faithful) tier and
# retry. If even ultra_premium comes back plaintext, the page counts as
# undownloadable and the job fails red — same terminal state as an exhausted ladder.
#
# Unrendered-shell guard (#587 eventer): the wait above is best-effort, so apply the
# same belt-and-suspenders the #279 guard does — a body that still carries Angular's
# unresolved-binding artifact (`ng-attr-…="{{…}}"`, which Angular REMOVES once it
# interpolates, so its presence reliably means "never rendered") is a shell with no
# extractable fields. Treat it exactly like a non-HTML body: escalate the tier, and if
# even ultra_premium comes back a shell, FAIL red into human triage rather than commit
# a useless fixture (the silent shell that blocked #587). (Angular-specific by design —
# other frameworks leave different shells; extend this signature when one bites.)
set -euo pipefail

# Seconds to let a JS single-page-app settle after load before ScraperAPI snapshots.
RENDER_WAIT_SECONDS="${RENDER_WAIT_SECONDS:-8}"

# A recorded body counts as HTML only if it carries at least one real tag-open
# (<tag, </tag, or <!doctype). The #279 plaintext render had none.
looks_like_html() { grep -qiE '<[a-z!/]' "$1"; }

# An unrendered Angular SPA shell still has `ng-attr-` attributes (removed once
# rendered) — a body carrying one never resolved its `{{…}}` bindings (#587).
looks_like_shell() { grep -qiE 'ng-attr-[a-z-]+="\{\{' "$1"; }

record_page() {
  local url="$1" out="$2"
  if [ -n "${SCRAPER_API_KEY:-}" ]; then
    local encoded; encoded="$(jq -rn --arg u "$url" '$u|@uri')"
    # Auto-default: an `.il` host (e.g. .co.il/.gov.il) records from an Israeli IP.
    local host="${url#*://}"; host="${host%%/*}"; host="${host%%:*}"
    local geo=""
    case "$host" in *.il) geo="country_code=il&"; echo "record_page: geo-targeting $host via country_code=il." >&2;; esac
    # Render instruction set: load, then wait for the SPA's data to populate before
    # snapshotting (see header). Passed as the x-sapi-instruction_set header.
    local instr="[{\"type\":\"wait\",\"value\":${RENDER_WAIT_SECONDS}}]"
    local tier label
    # "" = standard; then premium; then ultra_premium. The label is for the log only.
    for tier in "" "premium=true&" "ultra_premium=true&"; do
      label="${tier%%=*}"; label="${label:-standard}"
      if curl -fsS --max-time 90 --retry 2 --retry-delay 2 --retry-all-errors \
        -H "x-sapi-instruction_set: ${instr}" \
        "https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&${tier}${geo}render=true&url=${encoded}" -o "$out"; then
        if looks_like_shell "$out"; then
          echo "record_page: ScraperAPI $label tier returned an unrendered SPA shell (ng-attr bindings) for $url — escalating." >&2
        elif looks_like_html "$out"; then
          echo "record_page: fetched via ScraperAPI ($label tier)." >&2
          return 0
        else
          echo "record_page: ScraperAPI $label tier returned non-HTML (plaintext, no markup) for $url — escalating." >&2
        fi
      else
        echo "record_page: ScraperAPI $label tier failed for $url — escalating." >&2
      fi
    done
    echo "record_page: all ScraperAPI tiers (standard → premium → ultra_premium) failed for $url (non-2xx, non-HTML, or unrendered shell)" >&2
    return 1
  else
    curl -fsS --max-time 30 --retry 3 --retry-delay 2 --retry-all-errors \
      -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" \
      "$url" -o "$out"
  fi
}

# Run as a script; a no-op when sourced (so phase1-prepare.sh and the tests can reuse
# the function without firing a fetch).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  record_page "$@"
fi
