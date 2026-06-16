# UI snapshots

Each popup state is a self-contained case in [`cases/`](cases/): a
`<name>.case.js` module exporting `{ description, data, listing?, tab?, action? }`
(only *fake data*) plus its reference `<name>.png`. The renderer feeds that data
to `ui/popup.js`'s real `render()` — the same `chooseContent` + views the
extension runs — and rasterizes the result, so these images track the shipped
popup directly. See [`docs/claude/testing.md`](../../docs/claude/testing.md) for
the mechanics; regenerate after an intentional change with `npm run refresh:ui`.

The gallery below shows every case's reference image with its description, so the
current (or changed) state is reviewable straight from GitHub's file viewer.

## Cases

### 01 — Supported listing
Supported host: the extractor's events (a 2-event listing).

![01-supported-listing](cases/01-supported-listing.png)

### 02 — Denylisted
Denylisted host: 'No events found' (no link, no prompt) — even a complete event is suppressed.

![02-denylisted](cases/02-denylisted.png)

### 03 — Nothing found
Nothing found: 'No events found' + a right-aligned 'Disagree?' link.

![03-nothing-found](cases/03-nothing-found.png)

### 04 — Allowlisted
Allowlisted: show the event (no support request).

![04-allowlisted](cases/04-allowlisted.png)

### 05 — Unlisted
Unlisted: show the event + a right-aligned 'Suggest Correction' link.

![05-unlisted](cases/05-unlisted.png)

### 06 — Long listing, top of scroll
Long listing, top of scroll: capped list, count label below the fold.

![06-long-listing-top](cases/06-long-listing-top.png)

### 07 — Long listing, scrolled to bottom
Long listing, scrolled to bottom: 'N out of M events showing' + 'show all' link.

![07-long-listing-scrolled](cases/07-long-listing-scrolled.png)

### 08 — Eight events, scrolled to bottom
Eight events, scrolled to bottom: the plain 'N events showing' cue (no link).

![08-all-shown-scrolled](cases/08-all-shown-scrolled.png)
