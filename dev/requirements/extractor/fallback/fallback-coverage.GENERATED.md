# Fallback extractor coverage

> **Auto-generated** by `dev/requirements/extractor/fallback/fallback-coverage.test.js` (logic in `dev/requirements/extractor/fallback/fallback-coverage.js`). Do not hand-edit — it is rewritten whenever the tests run locally. See `.claudinite/local_packs/extractor-pipeline/RULES.md`.

What the generic **fallback** extractor (`extension/event-extractors/extract-unsupported.js`) recovers on each integration-test page, compared to that page's **dedicated per-site source** — the reviewed-correct extraction the live test pins down. For every `dev/requirements/extractor/expected/*.json` page, `GCal.extract()` is run twice on the same cached HTML: once normally (custom) and once with the site registry emptied (fallback). We grade the fallback's **primary event** (`events[0]` after the chronological sort) field-by-field against the custom primary event, counting a field only when the custom event filled it.

`start`/`end` count as a match when the values are byte-identical **or** resolve to the same absolute instant — a dedicated source localizing to a floating time via its `ctz` is the same moment as the fallback's offset-bearing time, not a miss (see `.claudinite/local_packs/extractor-pipeline/RULES.md`). A floating time read an hour off, or a date that dropped its time, is a real miss.

## Score

Headline coverage over all 34 cases in the corpus:

| Metric | Coverage | Hits / gradeable |
| --- | --: | --: |
| **Critical fields** (title + start + location) | **72.5%** | 74 / 102 |
| **All fields** | **53.5%** | 106 / 198 |
| Event coverage *(informational)* | 24.8% | 40 / 161 |

### Gate

The gate (`dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json`) compares the current run to the stored watermark over the cases they **share**. A newly added case isn't in the watermark's case list, so it's excluded until the watermark is re-baselined — **adding an extractor never fails the gate**. The watermark ratchets **up** on an unchanged case set and re-anchors to the current aggregate when the set changes.

| Metric | Watermark | Current (shared) | |
| --- | --: | --: | :-: |
| Critical fields | 72.5% | 72.5% | ✓ |
| All fields | 53.5% | 53.5% | ✓ |

Gated over **34** shared case(s).

Event coverage is reported but **not gated** (a few listing pages the fallback can't enumerate dominate it).

## By field type

| Field | Gradeable | ✓ match | ~ diff | ✗ miss | Match % |
| --- | --: | --: | --: | --: | --: |
| `title` **(critical)** | 34 | 29 | 3 | 2 | 85.3% |
| `start` **(critical)** | 34 | 24 | 8 | 2 | 70.6% |
| `end` | 22 | 13 | 0 | 9 | 59.1% |
| `location` **(critical)** | 34 | 21 | 6 | 7 | 61.8% |
| `ctz` | 31 | 12 | 0 | 19 | 38.7% |
| `eventLengthInMinutes` | 11 | 0 | 0 | 11 | 0% |
| `description` | 32 | 7 | 18 | 7 | 21.9% |

## By host

| Host | Cases | Events found (fb/custom) | Critical % | All % |
| --- | --: | --: | --: | --: |
| `bandsintown.com` | 1 | 1/1 | 100% | 100% |
| `barby.co.il` | 1 | 1/1 | 66.7% | 40% |
| `cinema.co.il` | 5 | 5/118 | 86.7% | 43.3% |
| `dash.datadoghq.com` | 1 | 1/1 | 100% | 100% |
| `dice.fm` | 1 | 1/1 | 100% | 100% |
| `edfringe.com` | 5 | 5/5 | 33.3% | 14.3% |
| `eventbrite.com` | 2 | 2/2 | 100% | 71.4% |
| `eventer.co.il` | 1 | 1/1 | 66.7% | 66.7% |
| `eventim.co.il` | 1 | 1/1 | 100% | 83.3% |
| `events.datadoghq.com` | 1 | 1/1 | 66.7% | 40% |
| `livenation.de` | 1 | 4/4 | 100% | 100% |
| `luma.com` | 1 | 1/1 | 66.7% | 83.3% |
| `meetup.com` | 3 | 3/3 | 100% | 83.3% |
| `seatgeek.com` | 1 | 0/7 | 0% | 0% |
| `secrettelaviv.com` | 1 | 1/1 | 100% | 66.7% |
| `seetickets.com` | 1 | 1/1 | 100% | 100% |
| `stubhub.com` | 1 | 6/6 | 100% | 100% |
| `tabitisrael.co.il` | 1 | 0/1 | 0% | 0% |
| `tel-aviv.gov.il` | 1 | 1/1 | 33.3% | 40% |
| `thinkdrink.co.il` | 1 | 1/1 | 100% | 60% |
| `ticketmaster.co.il` | 1 | 1/1 | 100% | 80% |
| `visit.tel-aviv.gov.il` | 2 | 2/2 | 33.3% | 16.7% |

## By exemplar

Legend: ✓ match · ~ different value · ✗ missing (source had it, fallback didn't) · — source left it empty

| Case | Events fb/custom | title | start | end | loc | ctz | len | desc |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `bandsintown-berry-sakharof` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `barby` | 1/1 | ✓ | ✓ | — | ~ | ✗ | — | ~ |
| `dash-datadoghq` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `dice` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `edinburghfringe-daniel-sloss` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-kristen-schaal` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-mr-chonkers` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-richard-herring-rhlstp` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-sophie-duker` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `eventbrite-1989775742810` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ~ |
| `eventbrite-games-for-change` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ~ |
| `eventer` | 1/1 | ✓ | ✓ | ✓ | ~ | ✓ | — | ~ |
| `eventim-co-il-the90sshow` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ~ |
| `events-datadoghq` | 1/1 | ~ | ✓ | — | ✓ | ✗ | — | ~ |
| `livenation` | 39/4 | ✓ | ✓ | — | ✓ | — | — | — |
| `luma-event` | 1/1 | ✓ | ✓ | ✓ | ~ | ✓ | — | ✓ |
| `meetup-fusion-la-israel` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ~ |
| `meetup-nyc-tech-mixer` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ~ |
| `meetup-startup-designers` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ~ |
| `seatgeek` | 0/7 | ✗ | ✗ | ✗ | ✗ | ✗ | — | — |
| `secrettelaviv-world-cup-eve` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `seetickets` | 1/1 | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| `stubhub` | 6/6 | ✓ | ✓ | — | ✓ | — | — | ✓ |
| `tabitisrael` | 0/1 | ✗ | ✗ | — | ✗ | ✗ | — | ✗ |
| `tel-aviv` | 1/1 | ✓ | ~ | — | ~ | ✓ | — | ~ |
| `telavivcinematheque-506` | 1/109 | ~ | ✓ | — | ✓ | ✗ | — | ✗ |
| `telavivcinematheque-left-handed-girl` | 1/1 | ✓ | ✓ | — | ✓ | ✗ | ✗ | ~ |
| `telavivcinematheque-poetry-bookstores` | 1/1 | ✓ | ✓ | — | ✓ | ✗ | ✗ | ~ |
| `telavivcinematheque-sentimental-value` | 1/1 | ✓ | ✓ | — | ✓ | ✗ | ✗ | ~ |
| `telavivcinematheque-taiwan-week` | 1/6 | ~ | ✓ | ✗ | ✓ | ✗ | ✗ | ~ |
| `thinkdrink-quantum-lecture` | 1/1 | ✓ | ✓ | — | ✓ | ✗ | — | ~ |
| `ticketmaster-ravid-plotnik` | 1/1 | ✓ | ✓ | — | ✓ | ✗ | — | ✓ |
| `visit-tel-aviv-timed` | 1/1 | ✓ | ~ | ✗ | ~ | ✗ | — | ~ |
| `visit-tel-aviv` | 1/1 | ✓ | ~ | ✗ | ~ | ✗ | — | ~ |
