# Fallback extractor coverage

> **Auto-generated** by `test/extractors/fallback/fallback-coverage.test.js` (logic in `test/extractors/fallback/fallback-coverage.js`). Do not hand-edit — it is rewritten whenever the tests run locally. See `docs/claude/testing.md`.

What the generic **fallback** extractor (`pipeline/extract-unsupported.js`) recovers on each integration-test page, compared to that page's **dedicated per-site source** — the reviewed-correct extraction the live test pins down. For every `test/extractors/custom/*.json` page, `GCal.extract()` is run twice on the same cached HTML: once normally (custom) and once with the site registry emptied (fallback). We grade the fallback's **primary event** (`events[0]` after the chronological sort) field-by-field against the custom primary event, counting a field only when the custom event filled it.

`start`/`end` count as a match when the values are byte-identical **or** resolve to the same absolute instant — a dedicated source localizing to a floating time via its `ctz` is the same moment as the fallback's offset-bearing time, not a miss (see `docs/claude/testing.md`). A floating time read an hour off, or a date that dropped its time, is a real miss.

## Score

Headline coverage over all 20 cases in the corpus:

| Metric | Coverage | Hits / gradeable |
| --- | --: | --: |
| **Critical fields** (title + start + location) | **58.3%** | 35 / 60 |
| **All fields** | **36.5%** | 46 / 126 |
| Event coverage *(informational)* | 64% | 16 / 25 |

### Gate

The gate (`test/extractors/fallback/fallback-coverage.baseline.GENERATED.json`) compares the current run to the stored watermark over the cases they **share**. A newly added case isn't in the watermark's case list, so it's excluded until the watermark is re-baselined — **adding an extractor never fails the gate**. The watermark ratchets **up** on an unchanged case set and re-anchors to the current aggregate when the set changes.

| Metric | Watermark | Current (shared) | |
| --- | --: | --: | :-: |
| Critical fields | 58.3% | 58.3% | ✓ |
| All fields | 36.5% | 36.5% | ✓ |

Gated over **20** shared case(s).

Event coverage is reported but **not gated** (a few listing pages the fallback can't enumerate dominate it).

## By field type

| Field | Gradeable | ✓ match | ~ diff | ✗ miss | Match % |
| --- | --: | --: | --: | --: | --: |
| `title` **(critical)** | 20 | 15 | 1 | 4 | 75% |
| `start` **(critical)** | 20 | 10 | 6 | 4 | 50% |
| `end` | 15 | 9 | 0 | 6 | 60% |
| `location` **(critical)** | 20 | 10 | 1 | 9 | 50% |
| `ctz` | 20 | 0 | 0 | 20 | 0% |
| `eventLengthInMinutes` | 11 | 0 | 0 | 11 | 0% |
| `description` | 20 | 2 | 9 | 9 | 10% |

## By host

| Host | Cases | Events found (fb/custom) | Critical % | All % |
| --- | --: | --: | --: | --: |
| `bandsintown.com` | 1 | 1/1 | 66.7% | 66.7% |
| `cinema.co.il` | 4 | 0/9 | 0% | 0% |
| `edfringe.com` | 5 | 5/5 | 33.3% | 14.3% |
| `eventbrite.com` | 2 | 2/2 | 100% | 57.1% |
| `eventim.co.il` | 1 | 1/1 | 100% | 66.7% |
| `luma.com` | 1 | 1/1 | 66.7% | 66.7% |
| `meetup.com` | 3 | 3/3 | 100% | 66.7% |
| `secrettelaviv.com` | 1 | 1/1 | 100% | 66.7% |
| `thinkdrink.co.il` | 1 | 1/1 | 66.7% | 40% |
| `ticketmaster.co.il` | 1 | 1/1 | 100% | 60% |

## By exemplar

Legend: ✓ match · ~ different value · ✗ missing (source had it, fallback didn't) · — source left it empty

| Case | Events fb/custom | title | start | end | loc | ctz | len | desc |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `bandsintown-berry-sakharof` | 1/1 | ~ | ✓ | ✓ | ✓ | ✗ | — | ✓ |
| `edinburghfringe-daniel-sloss` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-kristen-schaal` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-mr-chonkers` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-richard-herring-rhlstp` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `edinburghfringe-sophie-duker` | 1/1 | ✓ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `eventbrite-1989775742810` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ~ |
| `eventbrite-games-for-change` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ~ |
| `eventim-co-il-the90sshow` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `luma-event` | 1/1 | ✓ | ✓ | ✓ | ~ | ✗ | — | ✓ |
| `meetup-fusion-la-israel` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `meetup-nyc-tech-mixer` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `meetup-startup-designers` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `secrettelaviv-world-cup-eve` | 1/1 | ✓ | ✓ | ✓ | ✓ | ✗ | — | ~ |
| `telavivcinematheque-left-handed-girl` | 0/1 | ✗ | ✗ | — | ✗ | ✗ | ✗ | ✗ |
| `telavivcinematheque-poetry-bookstores` | 0/1 | ✗ | ✗ | — | ✗ | ✗ | ✗ | ✗ |
| `telavivcinematheque-sentimental-value` | 0/1 | ✗ | ✗ | — | ✗ | ✗ | ✗ | ✗ |
| `telavivcinematheque-taiwan-week` | 0/6 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `thinkdrink-quantum-lecture` | 1/1 | ✓ | ~ | — | ✓ | ✗ | — | ~ |
| `ticketmaster-ravid-plotnik` | 1/1 | ✓ | ✓ | — | ✓ | ✗ | — | ~ |
