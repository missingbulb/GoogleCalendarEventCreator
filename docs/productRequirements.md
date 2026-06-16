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

## Events

- One **card** per distinct event on the page. An ordinary event page yields one;
  a listing or series page (a film week, a festival) yields one card per event.
- **Multi-instance events.** A single event with several showings — a film with
  several screenings, a show that runs nightly, a multi-night concert — is *one*
  event with several **instances** (each its own start/end). What folds into one
  event is showings matching on title, location, description, and timezone
  (differing only in time); distinct events that merely share a title stay
  separate. That event's instances are then split into **cards strictly by
  date** — one card per distinct day:
  - A **day with a single time** is a plain single-occurrence card: the whole
    card is clickable, exactly like an ordinary event.
  - A **day with two or more times** is a *same-day card*: the card itself is
    **not** clickable (only an ordinary single card is); its icon shows that
    date and it holds a small **clickable button per time**, each opening that
    showing's Calendar template.

  Because every card is a single day, cards order cleanly by date and none spans
  several days — so a card can never "jump ahead" of a later one. For example,
  Jun 10 (one show) / Jun 11 (two shows) / Jun 12 (one show) renders as three
  cards in date order: a plain Jun 10 card, a Jun 11 same-day card with two time
  buttons, and a plain Jun 12 card.
- Cards are ordered by their earliest instance's start time, and an event's
  instances are ordered within the card, so everything reads chronologically
  regardless of the order the page listed it in.
- The list is scrollable, capped in height to roughly the first
  `cardsVisibleBeforeScroll` rows plus a peek of the next as a "there's more"
  cue. It shows up to `maxCardsShown` **cards** at first (the cap is on cards
  because it's a height limit). A count label is the **last item inside the
  scrollable list** (so it's only seen once scrolled to the end) and reports
  **event instances** (a card can stand for several), so its numbers can exceed
  the card count:
  - whole list fits unscrolled — no label;
  - all cards shown but taller than fits — "N events showing" (a scroll hint,
    no "out of", no link);
  - a prefix of the cards shown — "N out of M events showing" with a "show all"
    link that expands the list to the `maxCardsExpanded` card cap; past that cap
    it reads "N out of M events shown" with no link.
- Clicking a card (or, for a multi-instance event, one of its instance buttons)
  opens that event/showing's pre-filled Google Calendar template in a new tab.

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

## Requesting support

"Suggest Correction" (state 5) opens a prefilled GitHub "Event source request"
issue. Submitting it kicks off the automated extractor, which implements support
for the site and opens a pull request for review. A request whose host is already
on the allow- or denylist is closed automatically, without a run.
