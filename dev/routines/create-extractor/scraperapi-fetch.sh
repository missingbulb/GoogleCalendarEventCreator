#!/usr/bin/env bash
# scraperapi_fetch — this project's ONE page fetch, and the single place all of our
# ScraperAPI-specific handling lives. We use ScraperAPI (https://www.scraperapi.com)
# on purpose and name it here on purpose: the datacenter CI runner is bot-blocked by
# most event sites, and ScraperAPI's residential proxy + render=true (real JS
# rendering) gets a real page. This file owns every workaround we've had to add for
# that specific API, so they're visible and in one spot rather than smeared across
# the pipeline. Split out of 3-prepare.sh so it can be reused and unit-tested in
# isolation (dev/routines/create-extractor/test/scraperapi-fetch.test.js). Sourcing this file
# only DEFINES the function; running it directly
# (scraperapi-fetch.sh <url> <out> [wait_selector]) invokes it. See routine.md.
#
# The ScraperAPI request we build (query params on api.scraperapi.com):
#   render=true            execute the page's JS, so a single-page-app returns real
#                          post-render HTML instead of an empty shell.
#   country_code=il        for a `.il` host (.co.il/.gov.il, …): record from an
#                          Israeli residential exit, since these sites geo-gate by IP
#                          (a foreign IP gets blocked or wrong-language content — a
#                          misleading fixture, worse than a hard failure).
#   wait_for_selector=<s>  (#603) when the request carries a CSS selector the
#                          extension derived from the user's live, hydrated page:
#                          ScraperAPI waits for that element to appear before
#                          snapshotting — the render's REAL readiness signal. This
#                          replaced the blind fixed `wait` (reverted in #595 for
#                          firing before the SPA's data loaded) and the standard-tier
#                          SPA re-fetch loop (#599, removed here — see the retry
#                          policy below). The selector is url-encoded (jq @uri) so its
#                          `#`/`[`/`"` can't leak as sibling ScraperAPI params.
#   premium / ultra_premium  proxy-quality escalation, see below.
#
# RETRY POLICY — retry on FAILURE, never on a 200 (the deliberate #279/#587 rule).
#   * A transport/HTTP failure (non-2xx, timeout, dropped connection) is a
#     proxy/WAF problem a stronger proxy tier may get past. curl absorbs the
#     transient blips itself (--retry 5, exp backoff), and if a tier is still
#     exhausted we ESCALATE the tier: standard → premium=true → ultra_premium=true,
#     cheapest first. Only when the top tier fails does the fetch fail red. (This
#     ladder was added after seatgeek.com #281: a timeout + three 500s at standard.)
#   * A 200 is FINAL — we never re-fetch or escalate a 200. If its body is real
#     HTML, we keep it and we're done. If it isn't HTML (ScraperAPI can return the
#     SPA's *rendered text* with zero markup — #279 stubhub, 4018 bytes, not one
#     `<`), that's a bad render, and a re-fetch/tier bump won't fix a rendering
#     problem — so we FAIL and let a human take it, rather than burning credits or
#     committing a junk fixture. (An unhydrated-but-valid-HTML shell also counts as
#     a kept 200 now; wait_for_selector is how we avoid one, not a retry loop.)
#   (ultra_premium currently 403s on this plan — effectively a dead top rung, left in
#   so it activates automatically if the plan changes.)
#
# With no SCRAPER_API_KEY set (a fresh clone, the cloud sandbox) it fetches directly
# with a browser UA — fine for a developer on a residential IP, bot-blocked from CI.
# (jq is preinstalled on the runner; it percent-encodes the URL and the selector.)
set -euo pipefail

# A recorded body counts as HTML only if it carries at least one real tag-open
# (<tag, </tag, or <!doctype). The #279 plaintext render had none.
looks_like_html() { grep -qiE '<[a-z!/]' "$1"; }

scraperapi_fetch() {
  local url="$1" out="$2" wait_selector="${3:-}"
  if [ -n "${SCRAPER_API_KEY:-}" ]; then
    local encoded; encoded="$(jq -rn --arg u "$url" '$u|@uri')"
    local wait_param=""
    if [ -n "$wait_selector" ]; then
      local ws_encoded; ws_encoded="$(jq -rn --arg s "$wait_selector" '$s|@uri')"
      wait_param="wait_for_selector=${ws_encoded}&"
      echo "scraperapi_fetch: waiting for selector '$wait_selector' before snapshot." >&2
    fi
    # Auto-default: an `.il` host (e.g. .co.il/.gov.il) records from an Israeli IP.
    local host="${url#*://}"; host="${host%%/*}"; host="${host%%:*}"
    local geo=""
    case "$host" in *.il) geo="country_code=il&"; echo "scraperapi_fetch: geo-targeting $host via country_code=il." >&2;; esac
    local tier label
    # "" = standard; then premium; then ultra_premium. The label is for the log only.
    for tier in "" "premium=true&" "ultra_premium=true&"; do
      label="${tier%%=*}"; label="${label:-standard}"
      if curl -fsS --max-time 90 --retry 5 --retry-max-time 240 \
        "https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&${tier}${geo}${wait_param}render=true&url=${encoded}" -o "$out"; then
        # A 2xx: FINAL. Keep it if it's HTML; otherwise it's a bad render (no markup)
        # and we fail rather than re-fetch/escalate — a rendering problem is not a
        # proxy-quality problem (#279).
        if looks_like_html "$out"; then
          echo "scraperapi_fetch: fetched via ScraperAPI ($label tier)." >&2
          return 0
        fi
        echo "scraperapi_fetch: ScraperAPI $label tier returned a non-HTML body (no markup) for $url — failing (bad render, not retryable)." >&2
        return 1
      fi
      # A transport/HTTP failure (curl already retried the transient set) — escalate.
      echo "scraperapi_fetch: ScraperAPI $label tier failed (non-2xx) for $url — escalating." >&2
    done
    echo "scraperapi_fetch: all ScraperAPI tiers (standard → premium → ultra_premium) failed for $url" >&2
    return 1
  else
    curl -fsS --max-time 30 --retry 3 --retry-delay 2 --retry-all-errors \
      -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" \
      "$url" -o "$out"
  fi
}

# Run as a script; a no-op when sourced (so 3-prepare.sh and the tests can reuse
# the function without firing a fetch).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  scraperapi_fetch "$@"
fi
