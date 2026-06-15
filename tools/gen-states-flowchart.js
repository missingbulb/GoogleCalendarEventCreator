#!/usr/bin/env node
// Regenerates docs/popup-states-flowchart.png — a simple flowchart of the five
// states the popup can render (issue #192; the same decision ui/popup.js's
// chooseContent makes, see docs/highLevelDesign.md).
//
//   node tools/gen-states-flowchart.js
//
// Authors an SVG by hand and rasterizes it with @resvg/resvg-js (already a dev
// dependency) — no browser, no graphviz, deterministic. Fonts come from the
// bundled Liberation Sans in test/ui/fonts so text renders without system fonts.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");

const ROOT = path.join(__dirname, "..");
const W = 960;
const H = 790;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Multi-line, horizontally centered text. resvg's dominant-baseline support is
// spotty, so the baseline is positioned manually (≈0.34·size below the middle).
function text(cx, cy, lines, { size = 14, weight = 400, fill = "#202124", lh = 17 } = {}) {
  const first = cy - ((lines.length - 1) * lh) / 2 + size * 0.34;
  const tspans = lines
    .map((l, i) => `<tspan x="${cx}" ${i === 0 ? `y="${first}"` : `dy="${lh}"`}>${esc(l)}</tspan>`)
    .join("");
  return `<text x="${cx}" font-family="Liberation Sans, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle">${tspans}</text>`;
}

function box(cx, cy, w, h, lines, { fill = "#e8f0fe", stroke = "#aecbfa", size = 13, weight = 600 } = {}) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>` +
    text(cx, cy, lines, { size, weight, lh: 17 })
  );
}

function diamond(cx, cy, w, h, lines) {
  const pts = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;
  return (
    `<polygon points="${pts}" fill="#fff7e6" stroke="#f0c36d" stroke-width="1.5"/>` +
    text(cx, cy, lines, { size: 13, weight: 600, lh: 16 })
  );
}

const line = (x1, y1, x2, y2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5f6368" stroke-width="1.5" marker-end="url(#arrow)"/>`;

const tag = (x, y, t) =>
  `<text x="${x}" y="${y}" font-family="Liberation Sans, sans-serif" font-size="11" font-weight="600" fill="#5f6368" text-anchor="middle">${esc(t)}</text>`;

// Palette: blue = an event is shown; grey = "no events found".
const SHOW = { fill: "#e8f0fe", stroke: "#aecbfa" };
const NONE = { fill: "#f1f3f4", stroke: "#cfd4d9" };

const SPINE = 250; // x of the start box + decision diamonds
const parts = [];

// Title
parts.push(
  `<text x="${W / 2}" y="30" font-family="Liberation Sans, sans-serif" font-size="16" font-weight="700" fill="#202124" text-anchor="middle">How the popup decides what to show</text>`
);

const STATEX = 710; // center of the right-hand state boxes
const SW = 400;
const SLEFT = STATEX - SW / 2; // left edge the arrows point at

// Start
parts.push(box(SPINE, 70, 220, 40, ["Popup opens on a page"], { fill: "#fff", stroke: "#dadce0", weight: 600 }));
parts.push(line(SPINE, 90, SPINE, 121));

// 1. Per-site source? -> State 1
parts.push(diamond(SPINE, 165, 210, 84, ["Page host has a", "per-site source?"]));
parts.push(line(355, 165, SLEFT, 165));
parts.push(tag(437, 156, "yes"));
parts.push(box(STATEX, 165, SW, 52, ["State 1 — supported host", "Show the extractor’s events"], SHOW));
parts.push(line(SPINE, 207, SPINE, 270));
parts.push(tag(266, 240, "no"));

// 2. On the denylist? -> State 2 (no event, no prompt)
parts.push(diamond(SPINE, 313, 210, 84, ["Host on the", "denylist?"]));
parts.push(line(355, 313, SLEFT, 313));
parts.push(tag(437, 304, "yes"));
parts.push(box(STATEX, 313, SW, 52, ["State 2 — denylisted", "“No events found” (no prompt)"], NONE));
parts.push(line(SPINE, 355, SPINE, 421));
parts.push(tag(266, 390, "no"));

// 3. Fallback found a complete event? -> State 3 (no)
parts.push(diamond(SPINE, 472, 250, 100, ["Fallback finds a", "complete event?", "(title + location + start)"]));
parts.push(line(375, 472, SLEFT, 472));
parts.push(tag(447, 463, "no"));
parts.push(box(STATEX, 472, SW, 52, ["State 3 — nothing found", "“No events found” + “Disagree?” link"], NONE));
parts.push(line(SPINE, 522, SPINE, 607));
parts.push(tag(266, 566, "yes"));

// 4. On the allowlist? -> State 4 (yes) / State 5 (no)
parts.push(diamond(SPINE, 650, 210, 84, ["Host on the", "allowlist?"]));
parts.push(line(355, 650, SLEFT, 612));
parts.push(tag(444, 618, "yes"));
parts.push(box(STATEX, 610, SW, 52, ["State 4 — allowlisted", "Show the event (no support ask)"], SHOW));
parts.push(line(355, 650, SLEFT, 715));
parts.push(tag(444, 700, "no"));
parts.push(box(STATEX, 715, SW, 56, ["State 5 — unlisted", "Show the event + “Suggest Correction”"], SHOW));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#5f6368"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${parts.join("\n  ")}
</svg>`;

const FONT_DIR = path.join(ROOT, "test", "ui", "fonts");
const resvg = new Resvg(svg, {
  fitTo: { mode: "zoom", value: 2 }, // 2× for a crisp raster
  font: {
    fontFiles: [
      path.join(FONT_DIR, "LiberationSans-Regular.ttf"),
      path.join(FONT_DIR, "LiberationSans-Bold.ttf"),
    ],
    loadSystemFonts: false,
    defaultFontFamily: "Liberation Sans",
  },
});

const outPath = path.join(ROOT, "docs", "popup-states-flowchart.png");
fs.writeFileSync(outPath, resvg.render().asPng());
console.log(`Wrote ${path.relative(ROOT, outPath)}`);
