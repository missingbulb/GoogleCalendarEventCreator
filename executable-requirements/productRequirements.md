# Product requirements (feature overview)

A **feature-level** narrative of what the extension does, as user-facing behavior
— independent of how it's built (that's
[highLevelDesign.md](../docs/highLevelDesign.md) and the per-file map in
[fileDescriptions.md](../docs/fileDescriptions.md)). The tunable values it refers
to (default duration, the events cap, fallback copy, the host allow/denylist) live
in `extension/config.js`.

> **The numbered, testable product requirements now live in
> [Requirements.md](Requirements.md).** This refactor converted the detailed
> sections that used to live here into **executable requirements** with a case
> each: the five popup states, the events model, the field rules, the
> date/time/timezone rules, and the support-request flow are **§12–§16** there
> (`kind: "logic"` leaves — some wired to an executable `verify()`, the rest
> tracked as `tbd`/untested with a pointer to the unit test that covers them
> today). The popup's exact rendering is **§1–§10**, the toolbar icon **§10**, and
> the extractor-support catalogue **§11**. This file is the readable overview; that
> file is the contract.

## Purpose

Turn the event on the current web page into a pre-filled Google Calendar event,
opened in a new tab, in one click.

## What the popup shows

When opened, the popup lands in one of **five states** — the *what and why* below;
*which* state occurs and *how* each renders are specified, with a case each, in
[Requirements.md](Requirements.md) (§12 for the routing, §1–§3 for the rendering).

![Flowchart of the popup's five states](popup-states-flowchart.png)

1. **Supported host** — show the events the dedicated extractor found; if it finds
   none, fall back to the generic extractor (offering "Suggest Correction" when
   that yields a complete event), else the empty state. The host stays *supported*
   (icon green) throughout.
2. **Denylisted host** — show nothing and prompt for nothing.
3. **Unsupported, nothing found** — the empty state with a link to the public
   policy doc ([extraction-policy.md](../docs/extraction-policy.md)).
4. **Allowlisted, event found** — show the event; don't ask for support.
5. **Unlisted, event found** — show the event **and** offer to request first-class
   support for the site (a prefilled "Event source request" GitHub issue).

A fallback (non-dedicated) event counts as **complete** only when it has all three
of a title, a location, and a start time; anything less is "nothing found"
(Requirements.md §12.6).
