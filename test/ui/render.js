// Renders an approximation of the popup's UI (see popup.html/popup.js) to a
// PNG, using satori (HTML/CSS-subset -> SVG, no browser) and resvg (SVG ->
// PNG). The element tree below mirrors popup.html's structure and styles, and
// popup.js's per-event button layout, for the fixed fixture data in
// fixture.js.
//
// This is NOT a screenshot of the real popup.html — satori only supports a
// constrained flexbox-based style subset, so this is a best-effort visual
// approximation for catching unintended layout/copy changes. If popup.html's
// markup/CSS or popup.js's rendering changes, update buildTree() to match.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const satori = require("satori").default;
const { Resvg } = require("@resvg/resvg-js");
const { formatWhen, summarize, dateChip } = require("./load-popup");

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
          // Match popup.html: the date/location line stays on one line and
          // ellipsizes, keeping each button ~60px tall.
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
        children: when,
      },
    });
  }

  const row = [];

  // Left date chip (month + day), when we have a usable date.
  const chip = dateChip(event.start);
  if (chip) {
    row.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 44,
          paddingTop: 6,
          paddingBottom: 6,
          color: "#ffffff",
          backgroundColor: "#1a73e8",
          borderRadius: 6,
          lineHeight: 1,
        },
        children: [
          { type: "div", props: { style: { display: "flex", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }, children: chip.month } },
          { type: "div", props: { style: { display: "flex", fontSize: 18, fontWeight: 700 }, children: chip.day } },
        ],
      },
    });
  }

  row.push({
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, flexGrow: 1 },
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
        gap: 12,
        minHeight: 60,
        marginBottom: 8,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 12,
        paddingRight: 12,
        color: "#202124",
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        boxShadow: "0 1px 2px rgba(60, 64, 67, 0.15)",
      },
      children: row,
    },
  };
}

function buildTree(data) {
  const MAX_EVENTS = 7;
  const allEvents = data.events && data.events.length ? data.events : [];
  const events = allEvents.slice(0, MAX_EVENTS);
  const heading = !allEvents.length
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

async function renderPopupPng(data) {
  const svg = await satori(buildTree(data), { width: WIDTH, fonts: FONTS });
  const resvg = new Resvg(svg, { font: { loadSystemFonts: false } });
  return resvg.render().asPng();
}

module.exports = { renderPopupPng, formatWhen };
