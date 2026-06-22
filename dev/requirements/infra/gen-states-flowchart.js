#!/usr/bin/env node
// Regenerates dev/requirements/popup-states-flowchart.png — a flowchart of the states the
// popup can render (issue #192; State 1b added in #456). It mirrors the decision
// events-popup/popup.js's chooseContent makes (see dev/requirements/requirements.md §12–§16): a
// supported host shows its dedicated extractor's events (State 1), or — when that
// extractor finds nothing — falls back to the generic one and shows its events
// with a "Suggest Correction" link (State 1b); an unsupported host runs the
// denylist / fallback / allowlist chain (States 2–5).
//
//   node dev/requirements/infra/gen-states-flowchart.js
//
// Authors an SVG by hand and rasterizes it with @resvg/resvg-js (already a dev
// dependency) — no browser, no graphviz, deterministic. Fonts come from the
// bundled Liberation Sans in dev/requirements/ui/fonts so text renders without system fonts.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");

const ROOT = path.join(__dirname, "..", "..", "..");
const W = 1320;
const H = 700;

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

const parts = [];

// Title
parts.push(
  `<text x="${W / 2}" y="30" font-family="Liberation Sans, sans-serif" font-size="16" font-weight="700" fill="#202124" text-anchor="middle">How the popup decides what to show</text>`
);

// The flow forks at the top: a SUPPORTED host (left column, spine x=SUP) runs the
// dedicated source then a fallback; an UNSUPPORTED host (right column, spine
// x=UNS) runs the denylist / fallback / allowlist chain. Terminal state boxes
// hang off each spine — left of SUP, right of UNS.
const SUP = 500; // supported-column decision spine
const UNS = 820; // unsupported-column decision spine
const LBOX = 180; // center x of the left (supported) state boxes
const RBOX = 1140; // center x of the right (unsupported) state boxes
const MID = (SUP + UNS) / 2; // start box / first diamond center

// Start
parts.push(box(MID, 64, 240, 40, ["Popup opens on a page"], { fill: "#fff", stroke: "#dadce0", weight: 600 }));
parts.push(line(MID, 84, MID, 109));

// Fork: per-site source? -> left (supported) / right (unsupported)
parts.push(diamond(MID, 152, 250, 86, ["Page host has a", "per-site source?"]));
parts.push(line(MID - 125, 152, SUP, 224));
parts.push(tag(MID - 150, 178, "yes"));
parts.push(line(MID + 125, 152, UNS, 224));
parts.push(tag(MID + 150, 178, "no"));

// --- Supported column (left) ---

// Did the dedicated source find events? -> State 1
parts.push(diamond(SUP, 270, 220, 92, ["Dedicated source", "found events?"]));
parts.push(line(SUP - 110, 270, LBOX + 150, 270));
parts.push(tag(SUP - 140, 261, "yes"));
parts.push(box(LBOX, 270, 300, 54, ["State 1 — supported host", "Show the extractor’s events"], SHOW));
parts.push(line(SUP, 316, SUP, 374));
parts.push(tag(SUP - 20, 347, "no"));

// Dedicated source empty -> generic fallback finds a complete event? -> State 1b
parts.push(diamond(SUP, 412, 250, 100, ["Generic fallback finds", "a complete event?", "(title + location + start)"]));
parts.push(line(SUP - 125, 412, LBOX + 150, 412));
parts.push(tag(SUP - 152, 403, "yes"));
parts.push(box(LBOX, 412, 300, 56, ["State 1b — supported (fallback)", "Show event + “Suggest Correction”"], SHOW));
parts.push(line(SUP, 462, SUP, 552));
parts.push(tag(SUP - 20, 510, "no"));
parts.push(box(SUP, 580, 320, 56, ["Supported host, nothing found", "“No events found” (no prompt)"], NONE));

// --- Unsupported column (right) ---

// On the denylist? -> State 2 (no event, no prompt)
parts.push(diamond(UNS, 270, 220, 86, ["Host on the", "denylist?"]));
parts.push(line(UNS + 110, 270, RBOX - 150, 270));
parts.push(tag(UNS + 140, 261, "yes"));
parts.push(box(RBOX, 270, 300, 54, ["State 2 — denylisted", "“No events found” (no prompt)"], NONE));
parts.push(line(UNS, 313, UNS, 374));
parts.push(tag(UNS + 20, 347, "no"));

// Fallback found a complete event? -> State 3 (no)
parts.push(diamond(UNS, 412, 250, 100, ["Generic fallback finds", "a complete event?", "(title + location + start)"]));
parts.push(line(UNS + 125, 412, RBOX - 150, 412));
parts.push(tag(UNS + 152, 403, "no"));
parts.push(box(RBOX, 412, 300, 56, ["State 3 — nothing found", "“No events found” + “Disagree?”"], NONE));
parts.push(line(UNS, 462, UNS, 520));
parts.push(tag(UNS + 20, 494, "yes"));

// On the allowlist? -> State 4 (yes) / State 5 (no)
parts.push(diamond(UNS, 558, 220, 86, ["Host on the", "allowlist?"]));
parts.push(line(UNS + 110, 558, RBOX - 150, 540));
parts.push(tag(UNS + 140, 532, "yes"));
parts.push(box(RBOX, 540, 300, 54, ["State 4 — allowlisted", "Show the event (no support ask)"], SHOW));
parts.push(line(UNS + 110, 558, RBOX - 150, 632));
parts.push(tag(UNS + 140, 616, "no"));
parts.push(box(RBOX, 632, 300, 56, ["State 5 — unlisted", "Show event + “Suggest Correction”"], SHOW));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#5f6368"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${parts.join("\n  ")}
</svg>`;

const FONT_DIR = path.join(__dirname, "..", "ui", "fonts");
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

const outPath = path.join(__dirname, "..", "popup-states-flowchart.png");
fs.writeFileSync(outPath, resvg.render().asPng());
console.log(`Wrote ${path.relative(ROOT, outPath)}`);
