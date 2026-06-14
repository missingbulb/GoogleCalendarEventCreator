// Renders an approximation of the popup's UI (see ui/popup.html + ui/popup.css
// and ui/views/events-view.js) to a PNG, using satori (HTML/CSS-subset -> SVG,
// no browser) and resvg (SVG -> PNG). The element tree below mirrors
// ui/popup.css's styles and the events-view per-event button layout, for the
// fixed fixture data in fixture.js.
//
// This is NOT a screenshot of the real popup — satori only supports a
// constrained flexbox-based style subset, so this is a best-effort visual
// approximation for catching unintended layout/copy changes. If the popup's
// markup/CSS or the events-view rendering changes, update buildTree() to match.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const satori = require("satori").default;
const { Resvg } = require("@resvg/resvg-js");
const loadPopupHelpers = require("./load-popup");

// The popup's pure display helpers, imported (async) from the events-view ES
// module on first render and reused thereafter.
let summarize, dateChip;
async function ensureHelpers() {
  if (!summarize) ({ summarize, dateChip } = await loadPopupHelpers());
}

const FONT_FAMILY = "Liberation Sans"; // metric-compatible stand-in for popup.html's Arial fallback
const FONT_DIR = path.join(__dirname, "fonts");
const FONTS = [
  { name: FONT_FAMILY, data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Regular.ttf")), weight: 400, style: "normal" },
  { name: FONT_FAMILY, data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Bold.ttf")), weight: 700, style: "normal" },
  { name: FONT_FAMILY, data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Italic.ttf")), weight: 400, style: "italic" },
];

// Total rendered width: popup.html's body is 280px wide with 12px padding on
// each side.
const WIDTH = 304;

function eventButton(event) {
  // Right column: title over the muted date/time line.
  const bodyChildren = [
    {
      type: "div",
      props: {
        style: { display: "flex", fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: "#202124" },
        children: event.title,
      },
    },
  ];
  const when = summarize(event);
  if (when) {
    bodyChildren.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: 11,
          color: "#5f6368",
          // Match popup.html: the time/location line stays on one line and
          // ellipsizes, keeping each button compact.
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
        children: when,
      },
    });
  }

  const row = [];

  // Left date chip, styled like a calendar icon: a blue month banner over the
  // day-of-month on a white "page" (matches popup.html's .e-date).
  const chip = dateChip(event.start);
  if (chip) {
    row.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          flexShrink: 0,
          width: 38,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid #c6dafc",
          borderRadius: 5,
        },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", justifyContent: "center", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: "#ffffff", backgroundColor: "#1a73e8", paddingTop: 2, paddingBottom: 2 },
              children: chip.month,
            },
          },
          {
            type: "div",
            props: {
              style: { display: "flex", justifyContent: "center", fontSize: 16, fontWeight: 700, lineHeight: 1.1, color: "#1a73e8", paddingTop: 2, paddingBottom: 3 },
              children: chip.day,
            },
          },
        ],
      },
    });
  }

  row.push({
    type: "div",
    props: {
      // flexBasis:0 + minWidth:0 + overflow:hidden pin this column to the
      // leftover row width so the nowrap "when" line ellipsizes (matches
      // popup.html's .e-body) instead of overflowing the card.
      style: { display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, overflow: "hidden" },
      children: bodyChildren,
    },
  });

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 52,
        marginBottom: 8,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 10,
        paddingRight: 10,
        color: "#202124",
        backgroundColor: "#e8f0fe",
        border: "1px solid #d2e3fc",
        borderRadius: 8,
        boxShadow: "0 1px 2px rgba(60, 64, 67, 0.15)",
      },
      children: row,
    },
  };
}

// The "request this source" button shown on an unsupported page (popup.js's
// makeSourceRequestButton): an event-style card with a title over a muted
// subtitle, and no date chip. Opens a prefilled GitHub issue in the real
// popup.
function sourceRequestButton() {
  const body = {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, overflow: "hidden" },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: "#202124" },
            children: "Request support for this site",
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: 11, color: "#5f6368", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
            children: "Opens a prefilled GitHub issue",
          },
        },
      ],
    },
  };

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 52,
        marginBottom: 8,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 10,
        paddingRight: 10,
        color: "#202124",
        backgroundColor: "#e8f0fe",
        border: "1px solid #d2e3fc",
        borderRadius: 8,
        boxShadow: "0 1px 2px rgba(60, 64, 67, 0.15)",
      },
      children: [body],
    },
  };
}

function buildTree(data, opts = {}) {
  const MAX_EVENTS = 7;
  const allEvents = data.events && data.events.length ? data.events : [];
  const events = allEvents.slice(0, MAX_EVENTS);
  const heading = opts.sourceRequestForm
    ? "Add support for this site"
    : !allEvents.length
      ? "No events found on this page"
      : allEvents.length > 1
        ? `${allEvents.length} events on this page`
        : "Add to Google Calendar";
  const truncated = allEvents.length > MAX_EVENTS;

  const children = [
    {
      type: "div",
      props: {
        style: { display: "flex", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#5f6368" },
        children: heading,
      },
    },
  ];

  if (truncated) {
    children.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: 11,
          color: "#7d5500",
          backgroundColor: "#fef3c7",
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 8,
          paddingRight: 8,
          borderRadius: 4,
          marginBottom: 8,
        },
        children: `Showing first ${MAX_EVENTS} of ${allEvents.length}`,
      },
    });
  }

  if (opts.sourceRequestForm) {
    children.push(sourceRequestButton());
  }

  children.push(...events.map(eventButton));

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: WIDTH,
        padding: 12,
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#202124",
        fontFamily: FONT_FAMILY,
      },
      children,
    },
  };
}

async function renderPopupPng(data, opts = {}) {
  await ensureHelpers();
  const svg = await satori(buildTree(data, opts), { width: WIDTH, fonts: FONTS });
  const resvg = new Resvg(svg, { font: { loadSystemFonts: false } });
  return resvg.render().asPng();
}

module.exports = { renderPopupPng };
