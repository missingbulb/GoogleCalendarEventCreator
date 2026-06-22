# Popup UI requirements

The **specific, testable UI requirements** for the extension's popup — what it
must render, and how it must look and read, down to exact strings, colors,
placement, and structure.

The **rough, feature-level description** of what the extension does and why lives
in the top-level [README.md](../README.md); the testable product behavior is §12–§16
below. The split: "the popup turns the page's event into a one-click calendar
link" is a feature description and lives in the README; "an off-current-year chip
shows a gray pill for a past year" is a specific UI requirement and lives here.
Anything that isn't a
pixel-assertable *rendering* — the GitHub source-request issue form, and the
calendar-URL / timezone *semantics* — stays in the top-level README. This doc
covers the popup's rendering **and** the toolbar/extension icon (§10): both are
pixel-assertable, so both are specified here as numbered, snapshot-pinned leaves.

> # ⚠️ INCOMPLETE TESTING — A GREEN BUILD MEANS "CLAIMED", NOT "FULLY VERIFIED" ⚠️
>
> Every leaf below is *claimed* by exactly one case, so the coverage gate proves
> each leaf is verified by the right kind of test. What it does **not** prove is how
> *faithfully*: a `kind: "behavior"` case (a click → new-tab → close-popup action)
> has no pixels, so it's verified by `dev/requirements/ui/events-view-actions.test.js`, which
> **stubs `chrome.tabs.create`/`window.close`** — confirming our code *asks* for the
> right action, **not** that a real Chrome performs it. A faithful (non-stub)
> verification is still owed; tracked in the issue linked from
> [`dev/procedures/claude/testing.md`](claude/testing.md). Likewise, the toolbar-icon leaves
> (§10) are verified offline through a **fake Chrome**, so they pin the icon the
> extension *generates*, not that real Chrome *paints* it — only the e2e test does
> that.

**Numbering.** Every leaf requirement carries a stable number (e.g. `5.6.1`). Each
leaf has exactly one case named `<slug>.<id>.case.js`, where `<slug>` is the
section's component/feature name (e.g. `event-cards-appearance`) and `<id>` is the
leaf number (`event-cards-appearance.5.6.1.case.js`), so a case and the requirement
it pins are cross-checked by number. Keying on the section's name (not a bare
`req-<id>`) means renumbering or retitling a section doesn't force a mass rename.
Add new requirements with new numbers; don't renumber or reuse existing ones.

**How each leaf is verified is declared by its CASE, not tagged here.** The spec is
just numbered prose; each leaf's `<slug>.<id>.case.js` declares how it's verified via
its own `kind` (default `"popup"`) — and `dev/requirements/infra/render-snapshot.js` dispatches on
it:

- `"popup"` / `"icon"` — an **image** leaf, pinned by a `<slug>.<id>.png` snapshot in
  the **two-column table** below (image left, requirement right). `"popup"` is the
  popup's real `render()`; `"icon"` is the real `extension/icon/toolbar-icon.js` in a fake
  browser (the toolbar icon, §10).
- `"behavior"` — a click/navigation a static image can't observe; the case carries
  no image, its left cell shows a note, and it's verified by
  `dev/requirements/ui/events-view-actions.test.js`.
- a case may also set **`tbd: true`** — an edge case whose correct behavior isn't
  decided yet; its left cell shows a loud "TO BE DECIDED" banner above its
  provisional (current-behavior) snapshot.

The left cells are generated from the cases; don't hand-edit a line carrying a
`<!-- req-gallery:… -->` marker.

**One spec per leaf.** Each leaf requirement states exactly one display
specification. When a rendering is conditional — "in case X render Y, in case Z
render W" — split it into one numbered child per case rather than bundling the
cases in a single bullet (the parent becomes a heading, the cases its leaves), as
done for the `5.6`, `5.7`, `6.1`, and `6.2` groups.

The five popup **states** (supported / denylisted / nothing-found / allowlisted /
unlisted) and *when* each occurs are specified as executable requirements in §12
below; §1–§3 specify how each is *rendered*. Tunable values referenced below (`maxCardsShown`,
`maxCardsExpanded`, `cardsVisibleBeforeScroll`) live in `extension/config.js`.

## 1. Heading

<table>
<tr>
<td valign="top" width="320">

![heading.1.1](ui/cases/heading.1.1.png) <!-- req-gallery:1.1 -->

</td>
<td valign="top">

`1.1` While the page is being read, the heading reads **"Reading page…"**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![heading.1.2](ui/cases/heading.1.2.png) <!-- req-gallery:1.2 -->

</td>
<td valign="top">

`1.2` When one or more events are shown, the heading reads **"Add to Google
Calendar"**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![heading.1.3](ui/cases/heading.1.3.png) <!-- req-gallery:1.3 -->

</td>
<td valign="top">

`1.3` When no events are shown, the heading reads **"No events found on this
page"**.

</td>
</tr>
</table>


## 2. Empty state (nothing to add)

<table>
<tr>
<td valign="top" width="320">

![empty-state.2.1](ui/cases/empty-state.2.1.png) <!-- req-gallery:2.1 -->

</td>
<td valign="top">

`2.1` When there are no events to show, the event area shows a single muted,
calendar-shaped glyph (a bordered box with a header strip), centered with
generous vertical spacing — so the popup has a "face" rather than a bare line.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![empty-state.2.2](ui/cases/empty-state.2.2.png) <!-- req-gallery:2.2 -->

</td>
<td valign="top">

`2.2` In the nothing-found state (state 3), the "Disagree?" link (→ `3.2`) sits
**beneath** the glyph.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![empty-state.2.3](ui/cases/empty-state.2.3.png) <!-- req-gallery:2.3 -->

</td>
<td valign="top">

`2.3` In the denylisted state (state 2), and on a supported host that simply
found no events, the glyph stands **alone** — no link beneath it.

</td>
</tr>
</table>


## 3. Affordance links

<table>
<tr>
<td valign="top" width="320">

![affordance-links.3.1](ui/cases/affordance-links.3.1.png) <!-- req-gallery:3.1 -->

</td>
<td valign="top">

`3.1` **Suggest Correction** — shown in the unlisted-with-event state (state 5),
and on a supported host where the dedicated source found nothing but the generic
fallback did (state 1b — see §12). It sits on the **heading line,
right-aligned** (the heading becomes a row: title on the left, link on the right,
vertically centered). Clicking it opens the prefilled source-request issue (the
issue form itself is out of scope — see §12).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![affordance-links.3.2](ui/cases/affordance-links.3.2.png) <!-- req-gallery:3.2 -->

</td>
<td valign="top">

`3.2` **Disagree?** — shown only in the nothing-found state (state 3), beneath
the empty-state glyph (→ `2.2`). Clicking it opens the public extraction-policy
doc.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![affordance-links.3.3](ui/cases/affordance-links.3.3.png) <!-- req-gallery:3.3 -->

</td>
<td valign="top">

`3.3` Both links share one small, understated treatment (≈11px, accent blue, no
underline at rest, underline on hover) so neither reads as a primary action.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🚩 _Behavior leaf — verified by `dev/requirements/ui/events-view-actions.test.js` (a click a snapshot can't show), not an image._ <!-- req-gallery:3.4 -->

</td>
<td valign="top">

`3.4` Each link opens its target in a **new tab** (adjacent to the
current one) and closes the popup.

</td>
</tr>
</table>


## 4. Event cards — grouping & ordering

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.1](ui/cases/event-cards-grouping.4.1.png) <!-- req-gallery:4.1 -->

</td>
<td valign="top">

`4.1` One **card** per distinct event on the page; a listing/series page yields
one card per event.

</td>
</tr>
</table>

- `4.2` A multi-instance event (an event carrying several instances) groups its
  instances **by month** (same calendar month and year) into one or more cards:

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.2.1](ui/cases/event-cards-grouping.4.2.1.png) <!-- req-gallery:4.2.1 -->

</td>
<td valign="top">

`4.2.1` Two showings in the **same** month group into **one** grouped card.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.2.2](ui/cases/event-cards-grouping.4.2.2.png) <!-- req-gallery:4.2.2 -->

</td>
<td valign="top">

`4.2.2` Two showings in **different** months **split** into one card per month.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

⚠️ **TO BE DECIDED** — behavior not yet decided; provisional render of CURRENT behavior: ![event-cards-grouping.4.2.3](ui/cases/event-cards-grouping.4.2.3.png) <!-- req-gallery:4.2.3 -->

</td>
<td valign="top">

`4.2.3` Edge case — **one event** with three instances: one in June, one a
**multi-day instance spanning June → July**, and one in July. Today the spanning
instance groups by its **start** (June), so it shows under June only and never
under July (provisional render at left). Whether a cross-month instance should
also surface in the later month is **to be decided**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.3](ui/cases/event-cards-grouping.4.3.png) <!-- req-gallery:4.3 -->

</td>
<td valign="top">

`4.3` Instances are **never merged**: a card built from N instances always
exposes N addable buttons. Consecutive days are grouped exactly like scattered
ones — a run is never collapsed into a single spanning event.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.4](ui/cases/event-cards-grouping.4.4.png) <!-- req-gallery:4.4 -->

</td>
<td valign="top">

`4.4` A **single card** — a month with a single showing, or any instance with
no usable date: the **whole card is clickable**. (The image pins its *appearance*
as one whole-surface button; the click itself is verified by `9.1`, and the
resting visual cue is the chevron — see `5.4`. A mouse-cursor / `:hover` state
isn't capturable by the static renderer — see note below the gallery.)

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.5](ui/cases/event-cards-grouping.4.5.png) <!-- req-gallery:4.5 -->

</td>
<td valign="top">

`4.5` A day with **two or more showings** contributes **one button per showing**
to its month's grouped card — it is **not** peeled off into a separate card; the
showings are told apart by their time (→ `5.3`).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.6](ui/cases/event-cards-grouping.4.6.png) <!-- req-gallery:4.6 -->

</td>
<td valign="top">

`4.6` A **month card** (grouped card) — an event with two or more showings in
one month: an **unclickable** container, a title/location header over **one
button per showing**. A month with a single showing is a single card (→ `4.4`).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.7](ui/cases/event-cards-grouping.4.7.png) <!-- req-gallery:4.7 -->

</td>
<td valign="top">

`4.7` A grouped card has no single left calendar icon — its per-showing chip
buttons (→ `5`) are its calendar visuals.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.8](ui/cases/event-cards-grouping.4.8.png) <!-- req-gallery:4.8 -->

</td>
<td valign="top">

`4.8` An event whose **single instance's own start–end crosses several days**
stays one **single card** — it is *not* split into a button per day (only
separate instances ever become multiple buttons). Its chip shows **just the start
day** (today there is **no** date range on the calendar chip) and its line shows
the instance's time (or "All day"), not a per-day breakdown. (Whether a long /
multi-month span *should* show a range is the open question in `4.10`.)

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-grouping.4.9](ui/cases/event-cards-grouping.4.9.png) <!-- req-gallery:4.9 -->

</td>
<td valign="top">

`4.9` Cards are ordered by their **earliest showing's start**, and an event's
showings are ordered within its card — so everything reads chronologically
regardless of the order the page listed it in. (The image shows **both**: cards
sorted across the list, and a grouped card whose shuffled showings render in
order.)

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

⚠️ **TO BE DECIDED** — behavior not yet decided; provisional render of CURRENT behavior: ![event-cards-grouping.4.10](ui/cases/event-cards-grouping.4.10.png) <!-- req-gallery:4.10 -->

</td>
<td valign="top">

`4.10` A single instance spanning **multiple months** (e.g. Jun 28 → Jul 3):
today its chip shows just the **start day** (provisional render at left). Whether a
long or multi-month span should instead show a **date range** on the calendar chip
— and how the span should read on the line — is **to be decided**.

</td>
</tr>
</table>


## 5. Event cards — appearance

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.1](ui/cases/event-cards-appearance.5.1.png) <!-- req-gallery:5.1 -->

</td>
<td valign="top">

`5.1` The **calendar chip** is the popup's single "addable event" motif: a
colored banner (the shared context) over a prominent body (the pick). The same
chip marks an addable event whether it's a single card's left indicator or one
of a grouped card's instance buttons.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.2](ui/cases/event-cards-appearance.5.2.png) <!-- req-gallery:5.2 -->

</td>
<td valign="top">

`5.2` **Day chip** — a month banner over the day-of-month (e.g. JUN / 19). Used
as a single card's left indicator and as a month card's per-day buttons.

</td>
</tr>
</table>

- `5.3` **Time chip** — a full-date banner over the showing's time. Used as a
  same-day card's buttons, and as a month card's buttons when its days carry
  different times (→ `5.7.2`).

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.3.1](ui/cases/event-cards-appearance.5.3.1.png) <!-- req-gallery:5.3.1 -->

</td>
<td valign="top">

`5.3.1` A single-time showing shows just the time (e.g. JUN 19 / 1 PM).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.3.2](ui/cases/event-cards-appearance.5.3.2.png) <!-- req-gallery:5.3.2 -->

</td>
<td valign="top">

`5.3.2` A showing with a start **and** end shows the en-dash time range inside
the button (e.g. JUN 19 / 4:30 PM – 6:18 PM).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.4](ui/cases/event-cards-appearance.5.4.png) <!-- req-gallery:5.4 -->

</td>
<td valign="top">

`5.4` **Single-card weight.** A single card is the heavier element — visibly
elevated and tinted, its whole surface one click target — with a trailing **"›"
chevron** as the resting cue that the card itself is the button.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.5](ui/cases/event-cards-appearance.5.5.png) <!-- req-gallery:5.5 -->

</td>
<td valign="top">

`5.5` **Grouped-card weight.** A grouped card (same-day, month) is lighter and
flat, is **not** itself clickable, and has **no** chevron — you press one of its
inner chip buttons instead.

</td>
</tr>
</table>

- `5.6` **Year pill.** A chip whose date falls outside the current year carries a
  small year pill on the corner of its calendar icon.

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.6.1](ui/cases/event-cards-appearance.5.6.1.png) <!-- req-gallery:5.6.1 -->

</td>
<td valign="top">

`5.6.1` A **past** year shows a **gray** pill.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.6.2](ui/cases/event-cards-appearance.5.6.2.png) <!-- req-gallery:5.6.2 -->

</td>
<td valign="top">

`5.6.2` A **future** year shows a **green** ("upcoming") pill — never red
(a next-year event isn't an error).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.6.3](ui/cases/event-cards-appearance.5.6.3.png) <!-- req-gallery:5.6.3 -->

</td>
<td valign="top">

`5.6.3` The **current** year shows **no** pill.

</td>
</tr>
</table>

- `5.7` **Grouped-card header time.**

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.7.1](ui/cases/event-cards-appearance.5.7.1.png) <!-- req-gallery:5.7.1 -->

</td>
<td valign="top">

`5.7.1` When a month card's days all share one start time, that time leads the
header line ("7 PM · &lt;location&gt;") and the buttons stay bare day chips.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.7.2](ui/cases/event-cards-appearance.5.7.2.png) <!-- req-gallery:5.7.2 -->

</td>
<td valign="top">

`5.7.2` When the days carry **different** times, no shared time is shown, so
each button becomes a **time chip** (its own day's time) so no time is lost,
and the header is location-only.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.7.3](ui/cases/event-cards-appearance.5.7.3.png) <!-- req-gallery:5.7.3 -->

</td>
<td valign="top">

`5.7.3` When a month card's days are **all all-day** (no time), the buttons stay
plain day chips and the header reads **"All day · &lt;location&gt;"** — the "All
day" label beside the location, mirroring a single all-day card's line. (If only
*some* days are all-day, no single time fits, so the header stays location-only.)

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![event-cards-appearance.5.8](ui/cases/event-cards-appearance.5.8.png) <!-- req-gallery:5.8 -->

</td>
<td valign="top">

`5.8` **Truncation never grows the popup.** A title clamps to two lines; the
time/location line is a single line that ellipsizes; the popup's width is fixed.

</td>
</tr>
</table>


## 6. Date & time display

- `6.1` **Round vs. non-round time.**

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.1.1](ui/cases/date-time-display.6.1.1.png) <!-- req-gallery:6.1.1 -->

</td>
<td valign="top">

`6.1.1` A round hour drops its minutes ("10 AM", not "10:00 AM").

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.1.2](ui/cases/date-time-display.6.1.2.png) <!-- req-gallery:6.1.2 -->

</td>
<td valign="top">

`6.1.2` A non-round time keeps its minutes ("6:30 PM").

</td>
</tr>
</table>

- `6.2` **Start with an end.**

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.2.1](ui/cases/date-time-display.6.2.1.png) <!-- req-gallery:6.2.1 -->

</td>
<td valign="top">

`6.2.1` A start with an end shows as a time range joined by an **en dash**
("6:30 PM – 8:30 PM").

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.2.2](ui/cases/date-time-display.6.2.2.png) <!-- req-gallery:6.2.2 -->

</td>
<td valign="top">

`6.2.2` An end that isn't after the start is dropped — the single time is
shown.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.3](ui/cases/date-time-display.6.3.png) <!-- req-gallery:6.3 -->

</td>
<td valign="top">

`6.3` A date with no time reads **"All day"**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.4](ui/cases/date-time-display.6.4.png) <!-- req-gallery:6.4 -->

</td>
<td valign="top">

`6.4` A start that can't be parsed to a date reads **"No date found"**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.5](ui/cases/date-time-display.6.5.png) <!-- req-gallery:6.5 -->

</td>
<td valign="top">

`6.5` A card whose instance has no usable date shows **no** calendar chip — just
the title and the time line.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![date-time-display.6.6](ui/cases/date-time-display.6.6.png) <!-- req-gallery:6.6 -->

</td>
<td valign="top">

`6.6` A card always shows the page's **literal wall-clock** time and day: an
explicit UTC offset or trailing `Z` is stripped for display and **never re-zoned
to the viewer's timezone**. (The underlying instant still drives the Calendar
event — see §12.)

</td>
</tr>
</table>


## 7. List, scrolling & overflow

<table>
<tr>
<td valign="top" width="320">

![list-overflow.7.1](ui/cases/list-overflow.7.1.png) <!-- req-gallery:7.1 -->

</td>
<td valign="top">

`7.1` The event list is height-capped to roughly the first
`cardsVisibleBeforeScroll` rows plus a **peek** of the next card, and scrolls
past that.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![list-overflow.7.2](ui/cases/list-overflow.7.2.png) <!-- req-gallery:7.2 -->

</td>
<td valign="top">

`7.2` At most `maxCardsShown` cards render at first (the cap is on **cards** —
it's a height limit); "show all" (→ `8.5`) expands to `maxCardsExpanded`.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![list-overflow.7.3](ui/cases/list-overflow.7.3.png) <!-- req-gallery:7.3 -->

</td>
<td valign="top">

`7.3` A soft **white fade** appears at the **top** edge once scrolled away from
the top, and at the **bottom** edge while there's more list below — a cue that
there's more in that direction. An edge with nothing beyond it shows no fade.

</td>
</tr>
</table>


## 8. Count label

<table>
<tr>
<td valign="top" width="320">

![count-label.8.1](ui/cases/count-label.8.1.png) <!-- req-gallery:8.1 -->

</td>
<td valign="top">

`8.1` The count label is the **last item inside the scrollable list** (it
scrolls with the cards, so it's seen only once scrolled to the end).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![count-label.8.2](ui/cases/count-label.8.2.png) <!-- req-gallery:8.2 -->

</td>
<td valign="top">

`8.2` It counts **event instances**, not cards (a card can stand for several),
so its numbers can exceed the card count.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![count-label.8.3](ui/cases/count-label.8.3.png) <!-- req-gallery:8.3 -->

</td>
<td valign="top">

`8.3` When the whole list fits unscrolled, there is **no label**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![count-label.8.4](ui/cases/count-label.8.4.png) <!-- req-gallery:8.4 -->

</td>
<td valign="top">

`8.4` When every card is shown but the list is taller than fits: "**N events
showing**" — a scroll cue, with no "out of" and no link.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![count-label.8.5](ui/cases/count-label.8.5.png) <!-- req-gallery:8.5 -->

</td>
<td valign="top">

`8.5` When only a prefix of the cards is shown and the list can still grow:
"**N out of M events showing**" with a right-aligned "**show all**" link that
expands the list to the `maxCardsExpanded` cap.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![count-label.8.6](ui/cases/count-label.8.6.png) <!-- req-gallery:8.6 -->

</td>
<td valign="top">

`8.6` Once the `maxCardsExpanded` cap is reached with more still remaining:
"**N out of M events shown**" with **no** link.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![count-label.8.7](ui/cases/count-label.8.7.png) <!-- req-gallery:8.7 -->

</td>
<td valign="top">

`8.7` The "show all" link's presence keys off the **card** cap, not the event
count.

</td>
</tr>
</table>


## 9. Opening an event

<table>
<tr>
<td valign="top" width="320">

🚩 _Behavior leaf — verified by `dev/requirements/ui/events-view-actions.test.js` (a click a snapshot can't show), not an image._ <!-- req-gallery:9.1 -->

</td>
<td valign="top">

`9.1` Clicking a single card opens that event's prefilled Google
Calendar template in a new browser tab.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🚩 _Behavior leaf — verified by `dev/requirements/ui/events-view-actions.test.js` (a click a snapshot can't show), not an image._ <!-- req-gallery:9.2 -->

</td>
<td valign="top">

`9.2` Clicking a grouped card's instance button opens that
**specific showing's** template in a new tab.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🚩 _Behavior leaf — verified by `dev/requirements/ui/events-view-actions.test.js` (a click a snapshot can't show), not an image._ <!-- req-gallery:9.3 -->

</td>
<td valign="top">

`9.3` A template opens in a tab **adjacent** to the current one,
and the popup then closes.

</td>
</tr>
</table>

## 10. Toolbar icon

The toolbar/extension icon signals how the current page's host is classified —
before the popup is even opened — so the user knows at a glance whether a one-click
extraction is first-class. It reflects the *host's classification*, not whether an
event was found (the icon can't read the page, so a page where the generic fallback
later finds an event still shows the blue icon). When the host is denylisted **or**
supported it would otherwise show two icons; supported wins. These are ordinary
snapshot leaves whose cases set `kind: "icon"`, so their images are rendered by the
real `extension/icon/toolbar-icon.js` in a fake browser rather than the popup (see
"Verification kind" above).

<table>
<tr>
<td valign="top" width="320">

![toolbar-icon.10.1](ui/cases/toolbar-icon.10.1.png) <!-- req-gallery:10.1 -->

</td>
<td valign="top">

`10.1` On a host with a dedicated, first-class extractor (the **supported
list**), the icon is **green**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![toolbar-icon.10.2](ui/cases/toolbar-icon.10.2.png) <!-- req-gallery:10.2 -->

</td>
<td valign="top">

`10.2` On a host on the fallback **denylist** (where we've deliberately
decided not to extract), the icon is **gray**.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

![toolbar-icon.10.3](ui/cases/toolbar-icon.10.3.png) <!-- req-gallery:10.3 -->

</td>
<td valign="top">

`10.3` On any **other** page — neither supported nor denylisted, including
an allowlisted host — the icon stays the manifest default, **blue**.

</td>
</tr>
</table>


## 11. Required explicit support for Extractors

Each host below has **explicit, dedicated extractor support** — a self-contained
source under `extension/event-extractors/custom/` whose `matches(host)` claims the page,
so the toolbar icon goes green and the popup extracts the event from that site's
own markup (not the generic fallback). This section is the **executable
catalogue** of that support: each leaf is one supported host, validated by a
`kind: "extractor"` case (`dev/requirements/ui/cases/extractor-support.<id>.case.js`)
that runs the real extractor against a **real cached page**
(`dev/requirements/data/<page>.html`) and asserts the host is recognized as
supported and yields a complete event (title + location + start) —
`dev/requirements/extractors/extractor-support.test.js`. Adding a new source
(see `dev/procedures/claude/adding-a-source.md`) adds a row here. A bot-blocked host with no
cacheable page (e.g. `facebook.com`) is listed with a `tbd` case — its extractor
is covered by unit tests only.

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `meetup-nyc-tech-mixer` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.1 -->

</td>
<td valign="top">

`11.1` `meetup.com` — extracted by the dedicated source `extension/event-extractors/custom/meetup.js`, validated against the cached `meetup-nyc-tech-mixer` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `eventbrite-games-for-change` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.2 -->

</td>
<td valign="top">

`11.2` `eventbrite.com` — extracted by the dedicated source `extension/event-extractors/custom/eventbrite.js`, validated against the cached `eventbrite-games-for-change` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `edinburghfringe-daniel-sloss` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.3 -->

</td>
<td valign="top">

`11.3` `edfringe.com` — extracted by the dedicated source `extension/event-extractors/custom/edinburghfringe.js`, validated against the cached `edinburghfringe-daniel-sloss` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `telavivcinematheque-sentimental-value` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.4 -->

</td>
<td valign="top">

`11.4` `cinema.co.il` — extracted by the dedicated source `extension/event-extractors/custom/telavivcinematheque.js`, validated against the cached `telavivcinematheque-sentimental-value` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `ticketmaster-ravid-plotnik` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.5 -->

</td>
<td valign="top">

`11.5` `ticketmaster.co.il` — extracted by the dedicated source `extension/event-extractors/custom/ticketmaster.js`, validated against the cached `ticketmaster-ravid-plotnik` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `bandsintown-berry-sakharof` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.6 -->

</td>
<td valign="top">

`11.6` `bandsintown.com` — extracted by the dedicated source `extension/event-extractors/custom/bandsintown.js`, validated against the cached `bandsintown-berry-sakharof` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `barby` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.7 -->

</td>
<td valign="top">

`11.7` `barby.co.il` — extracted by the dedicated source `extension/event-extractors/custom/barby.js`, validated against the cached `barby` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `dash-datadoghq` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.8 -->

</td>
<td valign="top">

`11.8` `dash.datadoghq.com` — extracted by the dedicated source `extension/event-extractors/custom/dash-datadoghq.js`, validated against the cached `dash-datadoghq` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `eventim-co-il-the90sshow` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.9 -->

</td>
<td valign="top">

`11.9` `eventim.co.il` — extracted by the dedicated source `extension/event-extractors/custom/eventim-co-il.js`, validated against the cached `eventim-co-il-the90sshow` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `events-datadoghq` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.10 -->

</td>
<td valign="top">

`11.10` `events.datadoghq.com` — extracted by the dedicated source `extension/event-extractors/custom/events-datadoghq.js`, validated against the cached `events-datadoghq` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `luma-event` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.11 -->

</td>
<td valign="top">

`11.11` `lu.ma` — extracted by the dedicated source `extension/event-extractors/custom/luma.js`, validated against the cached `luma-event` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `secrettelaviv-world-cup-eve` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.12 -->

</td>
<td valign="top">

`11.12` `secrettelaviv.com` — extracted by the dedicated source `extension/event-extractors/custom/secrettelaviv.js`, validated against the cached `secrettelaviv-world-cup-eve` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `tabitisrael` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.13 -->

</td>
<td valign="top">

`11.13` `tabitisrael.co.il` — extracted by the dedicated source `extension/event-extractors/custom/tabitisrael.js`, validated against the cached `tabitisrael` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `thinkdrink-quantum-lecture` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.14 -->

</td>
<td valign="top">

`11.14` `thinkdrink.co.il` — extracted by the dedicated source `extension/event-extractors/custom/thinkdrink.js`, validated against the cached `thinkdrink-quantum-lecture` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — validated against cached page `visit-tel-aviv` by `dev/requirements/extractors/extractor-support.test.js`._ <!-- req-gallery:11.15 -->

</td>
<td valign="top">

`11.15` `visit.tel-aviv.gov.il` — extracted by the dedicated source `extension/event-extractors/custom/visit-tel-aviv.js`, validated against the cached `visit-tel-aviv` page.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🧩 _Extractor leaf — no cached page (bot-blocked) — covered by unit tests only._ <!-- req-gallery:11.16 -->

</td>
<td valign="top">

`11.16` `facebook.com` — extracted by the dedicated source `extension/event-extractors/custom/facebook.js`. No cached live case (bot-blocked); covered by unit tests only.

</td>
</tr>
</table>

## 12. Popup states (what the popup shows)

When opened, the popup lands in one of **five states**, decided by the host's classification and what the extractors found. *Which* state occurs is product/behavior logic (the popup's `chooseContent` + the host classifier); *how* each renders is §1–§3. Most leaves here are tracked but not yet wired into the executable runner (covered today by `extension-test/events-popup/popup.test.js`); the one machine-checkable rule, completeness, is wired.

![Flowchart of the popup's five states](popup-states-flowchart.png)

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/popup.test.js`._ <!-- req-gallery:12.1 -->

</td>
<td valign="top">

`12.1` Supported host shows the dedicated extractor's events; when it finds none, the generic fallback is shown if it yields a complete event (with "Suggest Correction") and the empty state otherwise — the host stays classified supported throughout (icon green).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/popup.test.js`._ <!-- req-gallery:12.2 -->

</td>
<td valign="top">

`12.2` Denylisted host shows nothing and prompts for nothing: no event, no support request, no policy link.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/popup.test.js`._ <!-- req-gallery:12.3 -->

</td>
<td valign="top">

`12.3` Unsupported host with no complete fallback event shows the empty state with a link to the public policy doc.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/popup.test.js`._ <!-- req-gallery:12.4 -->

</td>
<td valign="top">

`12.4` Allowlisted host with an event shows the event and does NOT ask for support (the generic result is already trusted there).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/popup.test.js`._ <!-- req-gallery:12.5 -->

</td>
<td valign="top">

`12.5` Unlisted host with an event shows the event AND offers to request first-class support (a prefilled GitHub issue).

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — verified by `dev/requirements/product-requirements.test.js`._ <!-- req-gallery:12.6 -->

</td>
<td valign="top">

`12.6` A fallback (non-dedicated) event counts as COMPLETE only when it has all three of a title, a location, and a start; anything less is "nothing found".

</td>
</tr>
</table>

## 13. Events model

How distinct events and their showings map onto cards. The exact card grouping, ordering, and appearance are specified visually in §4–§5; the model below is the behavior those renderings encode (covered today by `extension-test/events-popup/events-view.test.js` and the §4 snapshots).

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/events-view.test.js`._ <!-- req-gallery:13.1 -->

</td>
<td valign="top">

`13.1` One card per distinct event on the page: an ordinary event page yields one; a listing or series page (a film week, a festival) yields one card per event.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/events-view.test.js`._ <!-- req-gallery:13.2 -->

</td>
<td valign="top">

`13.2` A multi-instance event folds showings that match on title, location, description, and timezone (differing only in time) into ONE event with several instances; distinct events that merely share a title stay separate.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `dev/requirements/ui/cases/event-cards-grouping.4.2.1.case.js`._ <!-- req-gallery:13.3 -->

</td>
<td valign="top">

`13.3` An event's instances are grouped BY MONTH into one or more cards — a single card for a month with one showing, or a grouped card with a button per showing.

</td>
</tr>
</table>

## 14. Event fields

Field-level rules for the values that land in the Calendar event. Single-line fields are whitespace-collapsed; multi-line description preserves its breaks (see the `clean()` gotcha in `dev/procedures/technicalGotchas.md`).

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/event-extractors/extraction.test.js`._ <!-- req-gallery:14.1 -->

</td>
<td valign="top">

`14.1` Description preserves its line and paragraph breaks into the Calendar details; single-line fields (title, location) are whitespace-collapsed.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — verified by `dev/requirements/product-requirements.test.js`._ <!-- req-gallery:14.2 -->

</td>
<td valign="top">

`14.2` Title falls back to the page/tab title, and then to a configured default (`fallbackEventTitle`) when the page gives none.

</td>
</tr>
</table>

## 15. Dates, times & timezones

The rules that govern the *instant* the Calendar event lands on (how a time is *displayed* on a card is §6). Most timezone rules are tracked but not yet wired (covered today by `extension-test/event-extractors/extraction.test.js`); the all-day and default-duration rules are wired.

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/event-extractors/extraction.test.js`._ <!-- req-gallery:15.1 -->

</td>
<td valign="top">

`15.1` A timed date with NO timezone is a floating local time: the event shows the same wall-clock time the page displayed, wherever the viewer is.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/event-extractors/extraction.test.js`._ <!-- req-gallery:15.2 -->

</td>
<td valign="top">

`15.2` A date with an explicit offset (or trailing `Z`) is an exact instant: the same moment regardless of the viewer's timezone.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/event-extractors/extraction.test.js`._ <!-- req-gallery:15.3 -->

</td>
<td valign="top">

`15.3` A site known to run in a fixed place pins the event to that city's timezone, so the time reads as that city shows it for every viewer.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — verified by `dev/requirements/product-requirements.test.js`._ <!-- req-gallery:15.4 -->

</td>
<td valign="top">

`15.4` A date with NO time becomes an all-day event.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — verified by `dev/requirements/product-requirements.test.js`._ <!-- req-gallery:15.5 -->

</td>
<td valign="top">

`15.5` When the page gives a start but no end, the event is `defaultEventDurationMs` long (2 hours by default); all-day events stay all-day.

</td>
</tr>
</table>

## 16. Requesting support

The "Suggest Correction" flow that turns a missed page into first-class support. The issue-form prefill is covered by `extension-test/events-popup/source-request-view.test.js`; the automation pipeline by the auto-extractor unit tests and `dev/procedures/claude/auto-extractor.md`.

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `extension-test/events-popup/source-request-view.test.js`._ <!-- req-gallery:16.1 -->

</td>
<td valign="top">

`16.1` "Suggest Correction" opens a prefilled GitHub "Event source request" issue.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `dev/tools/test/triage-extractor-request.test.js`._ <!-- req-gallery:16.2 -->

</td>
<td valign="top">

`16.2` Submitting the request kicks off the automated extractor, which implements support for the site and opens a pull request for review.

</td>
</tr>
</table>

<table>
<tr>
<td valign="top" width="320">

🔧 _Logic leaf — **untested here** — currently covered by `dev/tools/test/triage-extractor-request.test.js`._ <!-- req-gallery:16.3 -->

</td>
<td valign="top">

`16.3` A request whose host is already on the allow- or denylist is closed automatically, without a run.

</td>
</tr>
</table>


---

### A note on "clickable" and cursor / hover states

The snapshot renderer (satori → resvg) rasterizes the popup's **DOM**, not a live
browser, so it cannot show an OS **mouse cursor** or a `:hover`/`cursor: pointer`
state — those aren't DOM elements, and satori ignores interaction CSS. So
"clickable" (`4.4`) is not pinned by a cursor in the image. It's covered three
ways instead: the **behavior** (a click opens the event) by `9.1`; the resting
**visual cue** (the elevated surface + "›" chevron) by `5.4`; and, if we want an
explicit assertion that the surface *is* a button, a cheap **DOM check** (the
element is a `<button>` whose computed `cursor` is `pointer`) belongs in a unit
test — not a snapshot. (Tracked alongside the periodic edge-case review.)
