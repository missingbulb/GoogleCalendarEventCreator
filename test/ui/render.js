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
const { formatWhen, summarize } = require("./load-popup");

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
  const children = [
    {
      type: "div",
      props: {
        style: { display: "flex", fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: "#ffffff" },
        children: event.title,
      },
    },
  ];
  const when = summarize(event);
  if (when) {
    children.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: 11,
          color: "#ffffff",
          opacity: 0.9,
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
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
        minHeight: 60,
        marginBottom: 8,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: "#1a73e8",
        borderRadius: 6,
      },
      children,
    },
  };
}

function buildTree(data) {
  const MAX_EVENTS = 7;
  const allEvents = data.events && data.events.length ? data.events : [];
  const events = allEvents.length ? allEvents.slice(0, MAX_EVENTS) : [{ title: data.title || "New event" }];
  const heading = allEvents.length > 1 ? `${allEvents.length} events on this page` : "Add to Google Calendar";
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
