# Chrome Web Store listing — copy-paste answers

Everything the developer dashboard asks for, pre-written — the repo-side source of truth for
the listing, used the same way for a resubmission (a permission change, a listing refresh) as
for an initial submission. The extension is live at
<https://chromewebstore.google.com/detail/google-calendar-event-cre/illegojjeehdmfpgnhnehjjhlghapacc>.
Keep this file current: a PR that changes the manifest's permissions updates the justification
table below in the same PR (canon release guide, "When a change touches the extension's
permissions").

## Store listing tab

**Name** (from the uploaded manifest): `Google Calendar Event Creator`

**Summary** (from the manifest `description`, ≤132 chars):

> Extracts event details (name, date/time, location, description) from the current page and opens a pre-filled Google Calendar event.

**Detailed description / category / language:** the live dashboard text predates this file and
is currently the only copy — backfill it here on the next dashboard visit (issue #627) so
future resubmissions read from the repo, not the dashboard.

**Graphic assets:** store icon (128×128) = `extension/icon/images/chromeStoreIcon.png`
(uploaded by hand); screenshot = `chrome-store-screenshot-1280x800.png` (beside this file).
Generation and the full asset map: [README.md](README.md).

**Additional fields:**

- Official URL / homepage: `https://github.com/missingbulb/GoogleCalendarEventCreator`
- Support URL: `https://github.com/missingbulb/GoogleCalendarEventCreator/issues`

## Privacy practices tab

**Single purpose description:**

> Reads event details (name, date/time, location, description) from the web page the user is
> viewing and opens a pre-filled Google Calendar event-creation screen for the user to review
> and save.

**Permission justifications:**

| Permission | Justification to paste |
|---|---|
| `activeTab` | Grants access to the current page only when the user clicks the extension's toolbar button; the extension reads that page's event details at that moment and sends nothing anywhere. |
| `scripting` | Injects the extension's own packaged extraction scripts into the active tab on the button click, to read the page's event markup (JSON-LD / DOM). Used only together with activeTab — never on a page the user didn't invoke it on. |
| `declarativeContent` | Lets the browser itself color the toolbar icon by host (green where a site-specific extractor exists, gray on unsupported news-type sites, default elsewhere). The URL matching runs inside Chrome, which is exactly why the extension requests no "tabs"/browsing-history access. |

**Remote code use:** No — all code is packaged in the extension.

**Data usage — what user data do you plan to collect?** Check **nothing**. All processing
happens locally; the extension makes no network requests of its own — it only opens a
`calendar.google.com/calendar/render` URL in a new tab for the user to review and save. Check
the three certifications (no selling, no unrelated use, no creditworthiness use).

**Privacy policy URL:**

```
https://missingbulb.github.io/GoogleCalendarEventCreator/privacy/
```
