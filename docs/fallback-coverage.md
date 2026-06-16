# Fallback extractor coverage

> **Auto-generated** by `test/integration/fallback-coverage.test.js` (logic in `test/fallback-coverage.js`). Do not hand-edit — it is rewritten whenever the tests run locally. See `docs/claude/testing.md`.

What the generic **fallback** extractor (`pipeline/extract-unsupported.js`) recovers on each integration-test page, compared to that page's **dedicated per-site source** — the reviewed-correct extraction the live test pins down. For every `test/integration/cases/*.json` page, `GCal.extract()` is run twice on the same cached HTML: once normally (custom) and once with the site registry emptied (fallback). We grade the fallback's **primary event** (`events[0]` after the chronological sort) field-by-field against the custom primary event, counting a field only when the custom event filled it.

`start`/`end` count as a match when the values are byte-identical **or** resolve to the same absolute instant — a dedicated source localizing to a floating time via its `ctz` is the same moment as the fallback's offset-bearing time, not a miss (see `docs/claude/testing.md`). A floating time read an hour off, or a date that dropped its time, is a real miss.

## Score

| Metric | Coverage | Hits / gradeable | Watermark (gate) |
| --- | --: | --: | --: |
| **Critical fields** (title + start + location) | **50%** | 30 / 60 | 50% |
| **All fields** | **31.7%** | 40 / 126 | 31.7% |
| Event coverage *(informational)* | 22.1% | 15 / 68 | — |

The two **field** percentages are gated by `test/integration/fallback-coverage.baseline.json`: the test fails if either drops below its stored high-watermark, and ratchets the watermark up (locally) when it improves. Event coverage — events the fallback found vs. the dedicated source — is reported but not gated; it is dominated by a few listing pages the fallback can't enumerate.

## By field type

| Field | Gradeable | ✓ match | ~ diff | ✗ miss | Match % |
| --- | --: | --: | --: | --: | --: |
| `title` **(critical)** | 20 | 14 | 1 | 5 | 70% |
| `start` **(critical)** | 20 | 8 | 7 | 5 | 40% |
| `end` | 15 | 8 | 0 | 7 | 53.3% |
| `location` **(critical)** | 20 | 8 | 1 | 11 | 40% |
| `ctz` | 20 | 0 | 0 | 20 | 0% |
| `eventLengthInMinutes` | 11 | 0 | 0 | 11 | 0% |
| `description` | 20 | 2 | 8 | 10 | 10% |

## By host

| Host | Cases | Events found (fb/custom) | Critical % | All % |
| --- | --: | --: | --: | --: |
| `bandsintown.com` | 1 | 1/1 | 66.7% | 66.7% |
| `cinema.co.il` | 4 | 0/11 | 0% | 0% |
| `edfringe.com` | 5 | 5/44 | 33.3% | 14.3% |
| `eventbrite.com` | 2 | 2/2 | 100% | 57.1% |
| `eventim.co.il` | 1 | 1/1 | 100% | 66.7% |
| `luma.com` | 1 | 1/1 | 66.7% | 66.7% |
| `meetup.com` | 3 | 3/3 | 100% | 66.7% |
| `secrettelaviv.com` | 1 | 1/1 | 33.3% | 16.7% |
| `thinkdrink.co.il` | 1 | 1/1 | 66.7% | 40% |
| `ticketmaster.co.il` | 1 | 0/3 | 0% | 0% |

## By exemplar

Legend: ✓ match · ~ different value · ✗ missing (source had it, fallback didn't) · — source left it empty

| Case | Events fb/custom | title | start | end | loc | ctz | len | desc |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `bandsintown-berry-sakharof` | 1/1 | ~ | ✓ | ✓ | ✓ | ✗ | — | ✓ |
| `edinburghfringe-daniel-sloss` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-kristen-schaal` | 1/5 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-mr-chonkers` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-richard-herring-rhlstp` | 1/14 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-sophie-duker` | 1/23 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `eventbrite-1989775742810` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ~ |
| `eventbrite-games-for-change` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ~ |
| `eventim-co-il-the90sshow` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `luma-event` | 1/1 | ✓ | ✓ | ✓ | ~ | ✗ | — | ✓ |
| `meetup-fusion-la-israel` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `meetup-nyc-tech-mixer` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `meetup-startup-designers` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `secrettelaviv-world-cup-eve` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | — | ~ |
| `telavivcinematheque-left-handed-girl` | 0/1 | ✗ | ✗ | — | ✗ | ✗ | ✗ | ✗ |
| `telavivcinematheque-poetry-bookstores` | 0/1 | ✗ | ✗ | — | ✗ | ✗ | ✗ | ✗ |
| `telavivcinematheque-sentimental-value` | 0/3 | ✗ | ✗ | — | ✗ | ✗ | ✗ | ✗ |
| `telavivcinematheque-taiwan-week` | 0/6 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `thinkdrink-quantum-lecture` | 1/1 | ✓ | ~ | — | ✓ | ✗ | — | ~ |
| `ticketmaster-ravid-plotnik` | 0/3 | ✗ | ✗ | — | ✗ | ✗ | — | ✗ |
