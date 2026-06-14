# Privacy Policy — Google Calendar Event Creator

_Last updated: 2026-06-14_

Google Calendar Event Creator ("the extension") is a browser extension that
extracts event details (name, date/time, location, description) from the page
you are currently viewing and opens a pre-filled Google Calendar event in a new
browser tab.

## Summary

**The extension does not collect, store, transmit, sell, or share any personal
or user data.** All processing happens locally, in your browser, on the page
you choose.

## What the extension does with data

- When you click the extension on an event page, it reads the content of that
  page (its DOM) to find event details such as the title, date and time,
  location, and description.
- It uses those details to build a Google Calendar "create event" URL
  (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`) entirely
  on your device.
- It opens that URL in a new tab. The event details are passed to Google
  Calendar **by your own browser navigating to that URL** — the same as if you
  had typed the link yourself. You then review and choose whether to save the
  event.

The extracted details exist only in your browser's memory while the extension
popup is open and are discarded afterwards.

## What the extension does NOT do

- It does **not** send any data to the developer or to any third-party server.
- It makes **no** network requests of its own. (It loads only resources bundled
  inside the extension package.)
- It does **not** use cookies, `localStorage`, `chrome.storage`, or any other
  persistent storage. Nothing is saved between uses.
- It does **not** include any analytics, advertising, tracking, or third-party
  SDKs.
- It does **not** collect personally identifiable information, authentication
  credentials, browsing history, or location data.

## Permissions

The extension requests only the minimum permissions needed to work:

- `activeTab` and `scripting` — to read the content of the current tab **only
  when you explicitly click the extension**, so it can extract the event
  details from that page.
- `tabs` — to open the pre-filled Google Calendar event in a new tab and to
  update the toolbar icon to indicate whether the current page is supported.

These permissions are used solely for the functionality described above.

## Third-party services

Opening the generated link sends the event details to Google Calendar through
your own browser session. Your use of Google Calendar is governed by
[Google's Privacy Policy](https://policies.google.com/privacy). This extension
is not affiliated with or endorsed by Google.

## Changes to this policy

If the extension's data practices ever change, this policy will be updated and
the "Last updated" date above will be revised.

## Contact

Questions about this privacy policy can be sent to: arielra@gmail.com
