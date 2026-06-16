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
