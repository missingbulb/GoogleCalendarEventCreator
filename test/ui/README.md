# UI snapshots

> **Generated file — do not edit by hand.** Run `npm run refresh:ui` to
> regenerate; `test/ui/readme.test.js` fails if it drifts.

Each popup state is a self-contained case in [`cases/`](cases/): a
`<name>.case.js` module supplying only *fake data*, paired with its reference
`<name>.png`. The renderer feeds that data to `ui/popup.js`'s real
`render()` — the same `chooseContent` + views the extension runs — and
rasterizes the result, so these images track the shipped popup directly. See
[`docs/claude/testing.md`](../../docs/claude/testing.md) for the mechanics.

The gallery below shows every case's reference image with its description, so the
current (or changed) state is reviewable straight from GitHub.

## 01-off-year-single-cards-get-a-year-pill-past-gray-future-green

Off-year single cards get a year pill: a past year (2025) a gray pill, the current year (2026) none, a future year (2027) a green pill

![01-off-year-single-cards-get-a-year-pill-past-gray-future-green](cases/01-off-year-single-cards-get-a-year-pill-past-gray-future-green.png)

## 02-unlisted-host-shows-event-plus-suggest-correction-link

Unlisted host with a complete event: show it plus a right-aligned 'Suggest Correction' link

![02-unlisted-host-shows-event-plus-suggest-correction-link](cases/02-unlisted-host-shows-event-plus-suggest-correction-link.png)

## 03-no-events-found-shows-glyph-and-disagree-link

No events found: the empty calendar glyph and a 'Disagree?' policy link

![03-no-events-found-shows-glyph-and-disagree-link](cases/03-no-events-found-shows-glyph-and-disagree-link.png)

## 04-denylisted-host-suppresses-even-a-complete-event

Denylisted host suppresses even a complete event: the empty glyph with no link or prompt

![04-denylisted-host-suppresses-even-a-complete-event](cases/04-denylisted-host-suppresses-even-a-complete-event.png)

## 05-same-day-screenings-each-become-their-own-time-button

Same-day screenings each become their own time button: one same-day card with a chip per showing

![05-same-day-screenings-each-become-their-own-time-button](cases/05-same-day-screenings-each-become-their-own-time-button.png)

## 06-month-card-header-shows-shared-time-else-per-day-times-or-allday

Month card surfaces a shared start time in its header (day chips), else drops to per-day time chips, else shows just the location (all-day dates)

![06-month-card-header-shows-shared-time-else-per-day-times-or-allday](cases/06-month-card-header-shows-shared-time-else-per-day-times-or-allday.png)

## 07-capped-list-scrolled-to-end-shows-count-and-show-all-link

Capped list scrolled to the end: the 'N out of M events showing' count, a 'show all' link, and the top edge fade

![07-capped-list-scrolled-to-end-shows-count-and-show-all-link](cases/07-capped-list-scrolled-to-end-shows-count-and-show-all-link.png)

## 08-overflowing-list-at-rest-fades-out-its-bottom-edge

Overflowing list at rest at the top: the bottom edge fades out to cue there's more below

![08-overflowing-list-at-rest-fades-out-its-bottom-edge](cases/08-overflowing-list-at-rest-fades-out-its-bottom-edge.png)
