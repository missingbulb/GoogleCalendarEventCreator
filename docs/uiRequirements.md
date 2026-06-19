# Popup UI requirements

The **specific, testable UI requirements** for the extension's popup — what it
must render, and how it must look and read, down to exact strings, colors,
placement, and structure.

This is deliberately separate from
[productRequirements.md](productRequirements.md), which is the **rough,
feature-level description** of what the extension does and why. The split: "the
popup turns the page's event into a one-click calendar link" is a feature
description and lives there; "an off-current-year chip shows a gray pill for a
past year" is a specific UI requirement and lives here. Anything that isn't the
popup's *rendering* — the toolbar/extension icon, the GitHub source-request issue
form, and the calendar-URL / timezone *semantics* — stays in
productRequirements; this doc covers the **popup only**.

**Numbering.** Every leaf requirement carries a stable number (e.g. `5.6.1`). A
UI snapshot case (`test/ui/`) names the requirement(s) it verifies by number, so a
case and the requirement it pins can be cross-checked. Add new requirements with
new numbers; don't renumber or reuse existing ones.

The five popup **states** (supported / denylisted / nothing-found / allowlisted /
unlisted) and *when* each occurs are defined in
[productRequirements.md](productRequirements.md); this doc specifies how each is
*rendered*. Tunable values referenced below (`maxCardsShown`,
`maxCardsExpanded`, `cardsVisibleBeforeScroll`) live in `config.js`.

## 1. Heading

- `1.1` While the page is being read, the heading reads **"Reading page…"**.
- `1.2` When one or more events are shown, the heading reads **"Add to Google
  Calendar"**.
- `1.3` When no events are shown, the heading reads **"No events found on this
  page"**.

## 2. Empty state (nothing to add)

- `2.1` When there are no events to show, the event area shows a single muted,
  calendar-shaped glyph (a bordered box with a header strip), centered with
  generous vertical spacing — so the popup has a "face" rather than a bare line.
- `2.2` In the nothing-found state (state 3), the "Disagree?" link (→ `3.2`) sits
  **beneath** the glyph.
- `2.3` In the denylisted state (state 2), and on a supported host that simply
  found no events, the glyph stands **alone** — no link beneath it.

## 3. Affordance links

- `3.1` **Suggest Correction** — shown only in the unlisted-with-event state
  (state 5). It sits on the **heading line, right-aligned** (the heading becomes a
  row: title on the left, link on the right, vertically centered). Clicking it
  opens the prefilled source-request issue (the issue form itself is out of
  scope — see productRequirements).
- `3.2` **Disagree?** — shown only in the nothing-found state (state 3), beneath
  the empty-state glyph (→ `2.2`). Clicking it opens the public extraction-policy
  doc.
- `3.3` Both links share one small, understated treatment (≈11px, accent blue, no
  underline at rest, underline on hover) so neither reads as a primary action.
- `3.4` Each link opens its target in a **new tab** (adjacent to the current one)
  and closes the popup.

## 4. Event cards — grouping & ordering

- `4.1` One **card** per distinct event on the page; a listing/series page yields
  one card per event.
- `4.2` A multi-instance event (an event carrying several instances) groups its
  instances **by month** (same calendar month and year) into one or more cards.
- `4.3` Instances are **never merged**: a card built from N instances always
  exposes N addable buttons. Consecutive days are grouped exactly like scattered
  ones — a run is never collapsed into a single spanning event.
- `4.4` A **single card** — a day with a single time that is the only such day in
  its month, or any instance with no usable date: the **whole card is clickable**.
- `4.5` A **same-day card** — a day with two or more times: an **unclickable**
  container, a title/location header over **one button per time**.
- `4.6` A **month card** — two or more single-time days in one month (consecutive
  or scattered): an **unclickable** container, a title/location header over **one
  button per day**. A lone leftover single-time day is a single card (→ `4.4`).
- `4.7` Neither grouped card (same-day, month) has a single left calendar icon —
  its per-instance chip buttons (→ `5`) are its calendar visuals.
- `4.8` The one genuinely spanning card: an event whose **single instance's own
  start–end crosses several days** stays a single card, and its line reads the
  date range.
- `4.9` Cards are ordered by their **earliest instance's start**, and an event's
  instances are ordered within its card — so everything reads chronologically
  regardless of the order the page listed it in.
- `4.10` Because a card sorts by its earliest instance, a month card that spans a
  range can read slightly out of strict day order (a same-day card for a day
  inside that range follows it). This is the accepted month-grouping trade.

## 5. Event cards — appearance

- `5.1` The **calendar chip** is the popup's single "addable event" motif: a
  colored banner (the shared context) over a prominent body (the pick). The same
  chip marks an addable event whether it's a single card's left indicator or one
  of a grouped card's instance buttons.
- `5.2` **Day chip** — a month banner over the day-of-month (e.g. JUN / 19). Used
  as a single card's left indicator and as a month card's per-day buttons.
- `5.3` **Time chip** — a full-date banner over a time or time range (e.g.
  JUN 19 / 4:30 PM – 6:18 PM). Used as a same-day card's buttons, and as a month
  card's buttons when its days carry different times (→ `5.7.2`).
- `5.4` **Single-card weight.** A single card is the heavier element — visibly
  elevated and tinted, its whole surface one click target — with a trailing **"›"
  chevron** as the resting cue that the card itself is the button.
- `5.5` **Grouped-card weight.** A grouped card (same-day, month) is lighter and
  flat, is **not** itself clickable, and has **no** chevron — you press one of its
  inner chip buttons instead.
- `5.6` **Year pill.** A chip whose date falls outside the current year carries a
  small year pill on the corner of its calendar icon.
  - `5.6.1` A **past** year shows a **gray** pill.
  - `5.6.2` A **future** year shows a **green** ("upcoming") pill — never red
    (a next-year event isn't an error).
  - `5.6.3` The **current** year shows **no** pill.
- `5.7` **Grouped-card header time.**
  - `5.7.1` When a month card's days all share one start time, that time leads the
    header line ("7 PM · &lt;location&gt;") and the buttons stay bare day chips.
  - `5.7.2` When the days carry **different** times, no shared time is shown, so
    each button becomes a **time chip** (its own day's time) so no time is lost,
    and the header is location-only.
  - `5.7.3` When any day is all-day (no time), the buttons stay plain day chips and
    the header is location-only.
- `5.8` **Truncation never grows the popup.** A title clamps to two lines; the
  time/location line is a single line that ellipsizes; the popup's width is fixed.

## 6. Date & time display

- `6.1` A round hour drops its minutes ("10 AM", not "10:00 AM"); a non-round time
  keeps them ("6:30 PM").
- `6.2` A start with an end shows as a time range joined by an **en dash**
  ("6:30 PM – 8:30 PM"); an end that isn't after the start is dropped (the single
  time is shown).
- `6.3` A date with no time reads **"All day"**.
- `6.4` A start that can't be parsed to a date reads **"No date found"**.
- `6.5` A card whose instance has no usable date shows **no** calendar chip — just
  the title and the time line.
- `6.6` A card always shows the page's **literal wall-clock** time and day: an
  explicit UTC offset or trailing `Z` is stripped for display and **never re-zoned
  to the viewer's timezone**. (The underlying instant still drives the Calendar
  event — see productRequirements.)

## 7. List, scrolling & overflow

- `7.1` The event list is height-capped to roughly the first
  `cardsVisibleBeforeScroll` rows plus a **peek** of the next card, and scrolls
  past that.
- `7.2` At most `maxCardsShown` cards render at first (the cap is on **cards** —
  it's a height limit); "show all" (→ `8.5`) expands to `maxCardsExpanded`.
- `7.3` A soft **white fade** appears at the **top** edge once scrolled away from
  the top, and at the **bottom** edge while there's more list below — a cue that
  there's more in that direction. An edge with nothing beyond it shows no fade.

## 8. Count label

- `8.1` The count label is the **last item inside the scrollable list** (it
  scrolls with the cards, so it's seen only once scrolled to the end).
- `8.2` It counts **event instances**, not cards (a card can stand for several),
  so its numbers can exceed the card count.
- `8.3` When the whole list fits unscrolled, there is **no label**.
- `8.4` When every card is shown but the list is taller than fits: "**N events
  showing**" — a scroll cue, with no "out of" and no link.
- `8.5` When only a prefix of the cards is shown and the list can still grow:
  "**N out of M events showing**" with a right-aligned "**show all**" link that
  expands the list to the `maxCardsExpanded` cap.
- `8.6` Once the `maxCardsExpanded` cap is reached with more still remaining:
  "**N out of M events shown**" with **no** link.
- `8.7` The "show all" link's presence keys off the **card** cap, not the event
  count.

## 9. Opening an event

- `9.1` Clicking a single card opens that event's prefilled Google Calendar
  template in a new browser tab.
- `9.2` Clicking a grouped card's instance button opens that **specific
  showing's** template in a new tab.
- `9.3` A template opens in a tab **adjacent** to the current one, and the popup
  then closes.
