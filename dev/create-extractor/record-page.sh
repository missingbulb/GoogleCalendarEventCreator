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
# Transient-error resilience: ScraperAPI is finicky under load — it returns 500 / times
# out / drops the connection intermittently for a page that fetches fine moments later
# (this is what failed seatgeek.com #281: a timeout + three 500s). This is an unattended
# pipeline auto-resolving a ticket, so absorb that flakiness with generous per-tier
# retries rather than failing the run: each tier retries up to 5 times with curl's
# exponential backoff (~1,2,4,8,16s), bounded by --retry-max-time. A request that never
# returns a usable response isn't billed, so the retries are ~free on exactly the errors
# we're papering over. We retry curl's default *transient* set (timeouts, dropped
# connections, 5xx/408/429) — NOT every error: a deterministic 4xx like a plan-limit 403
# won't change on retry, so retrying it just burns time (this is why the old
# --retry-all-errors is gone).
#
# QoS escalation: if a tier is STILL exhausted after its retries (a genuinely hard
# Cloudflare/WAF/JS-heavy site, not a blip), escalate the proxy quality: standard →
# premium (premium=true) → ultra_premium (ultra_premium=true), each more capable (and more
# credits) than the last. Only when the top tier is exhausted does the page count as
# undownloadable and the job fail red. Cheapest tier first keeps credit cost down on the
# common case. (ultra_premium currently 403s on this plan — effectively a dead top rung,
# left in so it activates automatically if the plan changes.)
#
# Non-HTML guard (#279 stubhub): a 2xx fetch isn't enough — ScraperAPI's render=true
# can return the SPA's *rendered text* with ZERO markup (stubhub: 4018 bytes, not a
# single '<'), which yields no DOM / CSS selectors / JSON-LD to extract from and is
# useless as a fixture. So a body that doesn't look like HTML is treated exactly like
# a tier failure: we climb the ladder to a stronger (more browser-faithful) tier and
# retry. If even ultra_premium comes back plaintext, the page counts as
# undownloadable and the job fails red — same terminal state as an exhausted ladder.
#
# Unexpanded-SPA re-fetch (#587 eventer): ScraperAPI's render is FLAKY — the same URL can
# come back fully rendered on one call and as an un-hydrated SPA shell (event fields still
# `{{…}}` bindings) on the next, regardless of geo. A shell is NOT a proxy-quality problem,
# so escalating tiers won't fix it; instead, at the STANDARD tier only, just re-fetch the
# same request up to 5 times hoping a later render expands the page. If one does, keep it.
# If all 5 stay shells, KEEP THE LAST 200 anyway (let downstream extraction / the agent
# judge it) rather than failing — the shell detector is a heuristic and must never fail a
# page it misread. Premium/ultra are reserved for proxy/WAF problems (transient errors),
# NOT rendering, so they keep whatever 200 they return without a shell check. A 200 shell
# is billed (unlike a retried 5xx), but standard-tier credits are cheap and worth it.
set -euo pipefail

# A recorded body counts as HTML only if it carries at least one real tag-open
# (<tag, </tag, or <!doctype). The #279 plaintext render had none.
looks_like_html() { grep -qiE '<[a-z!/]' "$1"; }

# Heuristic: a 200 whose SPA never hydrated. A rendered AngularJS page KEEPS its
# `ng-attr-X="{{…}}"` SOURCE attributes (so a bare `{{` grep false-positives), but it
# resolves the `{{…}}` in its actual content — so strip the ng-attr source attrs first,
# then a `{{…}}` STILL remaining means un-rendered body. Heuristic-only, used to decide
# whether to re-fetch (#587); a misread is harmless — the last 200 is kept either way.
looks_like_unexpanded_spa() {
  sed 's/ng-attr-[a-zA-Z-]*="[^"]*"//g' "$1" | grep -q '{{'
}

record_page() {
  local url="$1" out="$2"
  if [ -n "${SCRAPER_API_KEY:-}" ]; then
    local encoded; encoded="$(jq -rn --arg u "$url" '$u|@uri')"
    # Auto-default: an `.il` host (e.g. .co.il/.gov.il) records from an Israeli IP.
    local host="${url#*://}"; host="${host%%/*}"; host="${host%%:*}"
    local geo=""
    case "$host" in *.il) geo="country_code=il&"; echo "record_page: geo-targeting $host via country_code=il." >&2;; esac
    local tier label attempts spa
    # "" = standard; then premium; then ultra_premium. The label is for the log only.
    for tier in "" "premium=true&" "ultra_premium=true&"; do
      label="${tier%%=*}"; label="${label:-standard}"
      # The standard tier re-fetches an unexpanded SPA up to 5×; the others fetch once.
      attempts=1; [ -z "$tier" ] && attempts=5
      for ((spa = 1; spa <= attempts; spa++)); do
        if curl -fsS --max-time 90 --retry 5 --retry-max-time 240 \
          "https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&${tier}${geo}render=true&url=${encoded}" -o "$out"; then
          if ! looks_like_html "$out"; then
            echo "record_page: ScraperAPI $label tier returned non-HTML (plaintext, no markup) for $url — escalating." >&2
            break   # proxy/garbage problem — escalate the tier
          fi
          if [ -z "$tier" ] && looks_like_unexpanded_spa "$out"; then
            if [ "$spa" -lt "$attempts" ]; then
              echo "record_page: standard tier returned an unexpanded SPA (attempt $spa/$attempts) — re-fetching." >&2
              continue   # flaky render — try the standard tier again
            fi
            echo "record_page: standard tier never expanded the SPA after $attempts attempts — keeping the last 200 for downstream extraction." >&2
          fi
          echo "record_page: fetched via ScraperAPI ($label tier)." >&2
          return 0
        fi
        echo "record_page: ScraperAPI $label tier failed for $url — escalating." >&2
        break   # transient errors already retried by curl — escalate the tier
      done
    done
    echo "record_page: all ScraperAPI tiers (standard → premium → ultra_premium) failed for $url (non-2xx or non-HTML)" >&2
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
