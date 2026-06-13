// Renders an approximation of the popup's UI (see popup.html/popup.css) to a
// PNG, using satori (HTML/CSS-subset -> SVG, no browser) and resvg (SVG ->
// PNG). The element tree below mirrors popup.html's structure and styles for
// the fixed fixture data in fixture.js.
//
// This is NOT a screenshot of the real popup.html — satori only supports a
// constrained flexbox-based style subset, so this is a best-effort visual
// approximation for catching unintended layout/copy changes. If popup.html's
// markup or CSS changes, update buildTree() to match.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const satori = require("satori").default;
const { Resvg } = require("@resvg/resvg-js");
const { EXTRACTED_DATA, TAB } = require("./fixture");
const { formatWhen } = require("./load-popup");

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

function field(label, value) {
  return {
    type: "div",
    props: {
      style: { display: "flex", fontSize: 12, lineHeight: 1.4, marginBottom: 6 },
      children: [
        { type: "span", props: { style: { color: "#5f6368", fontWeight: 500, marginRight: 4 }, children: `${label}:` } },
        { type: "span", props: { style: { color: "#202124" }, children: value } },
      ],
    },
  };
}

function buildTree(data, tab) {
  const children = [
    {
      type: "div",
      props: {
        style: { display: "flex", fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#202124" },
        children: data.title || tab.title || "New event",
      },
    },
    field("When", formatWhen(data.start, data.end)),
  ];

  if (data.location) {
    children.push(field("Where", data.location));
  }

  if (data.multipleEvents) {
    children.push({
      type: "div",
      props: {
        style: { display: "flex", fontSize: 11, fontStyle: "italic", color: "#80868b", marginBottom: 6 },
        children: "First of several events found on this page.",
      },
    });
  }

  children.push({
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "center",
        marginTop: 8,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 13,
        fontWeight: 500,
        color: "#ffffff",
        backgroundColor: "#1a73e8",
        borderRadius: 4,
      },
      children: "Add to Google Calendar",
    },
  });

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

async function renderPopupPng() {
  const svg = await satori(buildTree(EXTRACTED_DATA, TAB), { width: WIDTH, fonts: FONTS });
  const resvg = new Resvg(svg, { font: { loadSystemFonts: false } });
  return resvg.render().asPng();
}

module.exports = { renderPopupPng };
