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

## 01-supported-listing

Supported host: the extractor's events (a 2-event listing)

![01-supported-listing](cases/01-supported-listing.png)

## 02-denylisted

Denylisted host: 'No events found' (no link, no prompt) — even a complete event is suppressed

![02-denylisted](cases/02-denylisted.png)

## 03-nothing-found

Nothing found: 'No events found' + a right-aligned 'Disagree?' link

![03-nothing-found](cases/03-nothing-found.png)

## 04-allowlisted

Allowlisted: show the event (no support request)

![04-allowlisted](cases/04-allowlisted.png)

## 05-unlisted

Unlisted: show the event + a right-aligned 'Suggest Correction' link

![05-unlisted](cases/05-unlisted.png)

## 06-fits-no-fade

Short listing that fits: no scroll, no edge fades

![06-fits-no-fade](cases/06-fits-no-fade.png)

## 07-overflow-bottom-fade

Overflowing list, top of scroll: bottom edge fades out (more below)

![07-overflow-bottom-fade](cases/07-overflow-bottom-fade.png)

## 08-scrolled-top-fade

Scrolled to the bottom: top edge fades out, no bottom fade

![08-scrolled-top-fade](cases/08-scrolled-top-fade.png)

## 09-scrolled-middle-both-fades

Scrolled to the middle of a long list: both edges fade out

![09-scrolled-middle-both-fades](cases/09-scrolled-middle-both-fades.png)

## 10-scrolled-bottom-count

Long capped list scrolled to the bottom: 'N out of M' + top fade only

![10-scrolled-bottom-count](cases/10-scrolled-bottom-count.png)

## 11-multi-instance-same-day-times

Multi-instance, one date: icon shows the date, instance buttons show the times (with ranges)

![11-multi-instance-same-day-times](cases/11-multi-instance-same-day-times.png)

## 12-month-scattered-with-sameday

Month grouping: two scattered single-show days fold into one month card; a two-show day stays a same-day card

![12-month-scattered-with-sameday](cases/12-month-scattered-with-sameday.png)

## 13-same-day-three-screenings

Same day, three screenings: one same-day card with a button per time

![13-same-day-three-screenings](cases/13-same-day-three-screenings.png)

## 14-month-allday-and-sameday

Month grouping with an all-day day and a timed day folding into one month card, plus a same-day card

![14-month-allday-and-sameday](cases/14-month-allday-and-sameday.png)

## 15-mixed-single-and-multi-listing

A listing mixing a clickable single-occurrence card and an unclickable same-day card

![15-mixed-single-and-multi-listing](cases/15-mixed-single-and-multi-listing.png)

## 16-events-outnumber-cards-count

Count cue counts events, not cards: 8 cards (two same-day cards) -> 13 events showing

![16-events-outnumber-cards-count](cases/16-events-outnumber-cards-count.png)

## 17-month-grouped-across-months

Month grouping across months: three scattered June dates become one JUN card (5/14/25), the July date a single card

![17-month-grouped-across-months](cases/17-month-grouped-across-months.png)

## 18-consecutive-run-multiday

Consecutive run: Jun 5–7 collapse into one clickable multi-day card; scattered Jun 14/25 stay a month card; July a single card

![18-consecutive-run-multiday](cases/18-consecutive-run-multiday.png)
