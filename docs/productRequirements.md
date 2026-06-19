# Product requirements

What the extension does, described as user-facing behavior — independent of how
it's built (that's [highLevelDesign.md](highLevelDesign.md) and the per-file map
in [fileDescriptions.md](fileDescriptions.md)). The tunable values called out
below (default duration, the events cap, fallback copy, the host allow/denylist)
live in `config.js`.

## Purpose

Turn the event on the current web page into a pre-filled Google Calendar event,
opened in a new tab, in one click.

## Toolbar icon

The icon signals how the current page's host is classified:

- **green** — the host has a dedicated extractor;
- **gray** — the host is on the fallback denylist, where we've deliberately
  decided not to extract (the "denylisted host" popup state below);
- **blue** — every other page.

It reflects the host's classification, not whether an event was found — the icon
can't read the page, so a page where the generic fallback later finds an event
still shows the blue icon.

## What the popup shows

When opened, the popup lands in one of five states:

![Flowchart of the popup's five states](popup-states-flowchart.png)

1. **Supported host** — show the events the dedicated extractor found.
2. **Denylisted host** — show "No events found", and nothing else: no event, no
   support request, no policy link. We've deliberately decided not to extract
   there, so there's nothing to dispute.
3. **Unsupported, nothing found** — when the host isn't denylisted and the
   generic fallback finds no *complete* event, show "No events found" with a
   right-aligned "Disagree?" link to the public policy doc
   ([extraction-policy.md](extraction-policy.md)).
4. **Allowlisted, event found** — show the event; don't ask for support (the
   generic result is already trusted there).
5. **Unlisted, event found** — show the event **and** a right-aligned "Suggest
   Correction" link that opens a prefilled "Event source request" GitHub issue,
   so a good page can become a first-class supported source.

A fallback (non-dedicated) event counts as **complete** only when it has all
three of a title, a location, and a start time; anything less is "nothing found".

The heading reads **"Add to Google Calendar"** when events are shown and **"No
events found on this page"** otherwise (briefly **"Reading page…"** while the page
is being read). In the two empty states (2 and 3) the popup shows a muted,
calendar-shaped glyph so it has a face rather than a bare line — with the State-3
"Disagree?" link beneath it, and nothing beneath it on a denylisted host.

## Events

- One **card** per distinct event on the page. An ordinary event page yields one;
  a listing or series page (a film week, a festival) yields one card per event.
- **Multi-instance events.** A single event with several showings — a film with
  several screenings, a show that runs nightly, a multi-night concert — is *one*
  event with several **instances** (each its own start/end). What folds into one
  event is showings matching on title, location, description, and timezone
  (differing only in time); distinct events that merely share a title stay
  separate. Instances are **never merged**: a card built from N instances always
  exposes N addable buttons, and consecutive days are treated exactly like
  scattered ones — no run is ever collapsed into a single spanning event. An
  event's instances are grouped **by month** (same calendar month and year) into
  one or more cards:
  - A **day with a single time** that is the only such day in its month is a plain
    **single card**: the whole card is clickable, exactly like an ordinary event.
  - A **day with two or more times** is a **same-day card**: an *unclickable*
    container — a title/location header over a **button per time**, each button a
    chip showing that date over its time (e.g. JUN 19 / 1 PM) and opening that
    showing's Calendar template.
  - **Two or more single-time days** in the month (consecutive or scattered) fold
    into one **month card**: an *unclickable* container — a title/location header
    over a **button per day**, each button a chip showing the month over the day
    (e.g. JUN / 14) and opening that day's Calendar template. A lone leftover
    single-time day is just a plain single card.

  (Neither grouped card has a single left icon — its per-instance chip buttons
  *are* its calendar visuals. The one genuinely *spanning* case is an event whose
  single instance's own start–end crosses several days: it stays a single card
  and its line reads the date range.)

  Cards still order by their earliest instance, so a month card that spans a range
  can read slightly out of strict day order (a same-day card for a day inside the
  range follows it) — the month grouping is the deliberate trade. For example,
  Jun 5 / Jun 14 / Jun 25 (one show each) and Jul 1 renders as a JUN month card
  with day buttons 5, 14, 25 followed by a plain Jul 1 card; Jun 10 / Jun 11 (two
  shows) / Jun 12 renders as a JUN month card (10, 12) and a Jun 11 same-day card.
- Cards are ordered by their earliest instance's start time, and an event's
  instances are ordered within the card, so everything reads chronologically
  regardless of the order the page listed it in.
- The list is scrollable, capped in height to roughly the first
  `cardsVisibleBeforeScroll` rows plus a peek of the next card — and, once it
  overflows, a soft white fade at the top and/or bottom edge whenever there's more
  list in that direction — as "there's more" cues. It shows up to `maxCardsShown`
  **cards** at first (the cap is on cards because it's a height limit). A count
  label is the **last item inside the scrollable list** (so it's only seen once
  scrolled to the end) and reports **event instances** (a card can stand for
  several), so its numbers can exceed the card count:
  - whole list fits unscrolled — no label;
  - all cards shown but taller than fits — "N events showing" (a scroll hint,
    no "out of", no link);
  - a prefix of the cards shown — "N out of M events showing" with a "show all"
    link that expands the list to the `maxCardsExpanded` card cap; past that cap
    it reads "N out of M events shown" with no link.
- Clicking a card (or, for a multi-instance event, one of its instance buttons)
  opens that event/showing's pre-filled Google Calendar template in a new tab.

## Card appearance and cues

How a card looks, beyond which kind it is:

- **The calendar chip is the popup's one "addable event" motif** — a colored
  banner (the shared context: a month, or a full date) over a prominent body (the
  pick: a day, or a time). The same chip marks an addable event whether it's a
  single card's left indicator or one of a grouped card's instance buttons. Two
  forms:
  - a **day chip** — month over day-of-month (JUN / 19) — a single card's icon and
    a month card's per-day buttons;
  - a **time chip** — a full date over a time or range (JUN 19 / 4:30 PM – 6:18 PM)
    — a same-day card's buttons, and a month card's buttons when its days carry
    different times (below).
- **Single vs. grouped weight.** A single card is the heavier element — visibly
  elevated and tinted, its whole surface one click target, with a trailing "›"
  chevron as the resting cue that the card itself is the button. A grouped card
  (same-day or month) is lighter and flat, is **not** itself clickable, and has no
  chevron — you press one of its inner chip buttons instead.
- **Year pill.** A chip whose date falls outside the current year carries a small
  year pill on the corner of its icon: a **gray** pill for a **past** year, a
  **green** ("upcoming") pill for a **future** year — never red, since a next-year
  event isn't an error — and **no pill** for the current year.
- **Month-card header time.** When a month card's days all share one start time,
  that time leads the header line ("7 PM · <location>") and the buttons stay bare
  day chips. When the days carry **different** times there's no shared time to
  show, so each button becomes a **time chip** (its day's own time) so no time is
  lost, and the header is location-only. Any all-day day keeps plain day chips and
  a location-only header.
- **Truncation never grows the popup.** A title clamps to two lines; the
  time/location line is a single line that ellipsizes; the popup's width is fixed.

## Event fields

- **Description** preserves its line and paragraph breaks into the Calendar
  details. Single-line fields (title, location) are whitespace-collapsed.
- **Title** falls back to the page/tab title, and then to a configured default
  (`fallbackEventTitle`) when the page gives none.

## Dates, times, and timezones

- A timed date with **no timezone** is a floating local time: the event shows the
  same wall-clock time the page displayed, wherever the viewer is.
- A date with an explicit offset (or trailing `Z`) is an exact instant: the event
  happens at the same moment regardless of the viewer's timezone.
- A site known to run in a fixed place pins the event to that city's timezone, so
  the time reads as that city shows it for every viewer.
- A date with **no time** becomes an all-day event.
- When the page gives a start but no end, the event is `defaultEventDurationMs`
  long (2 hours by default). All-day events stay all-day.
- **How times read on a card:** a round hour drops its minutes ("10 AM", not
  "10:00 AM"; "6:30 PM" keeps them), a start-and-end shows as an en-dash range
  ("6:30 PM – 8:30 PM"), and a date with no time reads "All day". The card always
  shows the page's **literal wall-clock** time and day — an explicit offset or
  trailing `Z` is dropped for the display, never re-zoned to the viewer's timezone
  — even though that offset still places the actual Calendar event at the right
  instant.

## Requesting support

"Suggest Correction" (state 5) opens a prefilled GitHub "Event source request"
issue. Submitting it kicks off the automated extractor, which implements support
for the site and opens a pull request for review. A request whose host is already
on the allow- or denylist is closed automatically, without a run.
