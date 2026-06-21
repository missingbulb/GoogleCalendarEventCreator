// Renders the toolbar/extension icon in each of its scenarios into a single
// labeled gallery PNG (docs/extension-icon-states.png), the reviewable companion
// to the prose "Toolbar icon" requirement in docs/productRequirements.md.
//
// Two properties keep the gallery honest — it shows what the extension ACTUALLY
// does, not a hand-drawn mock-up:
//
//   1. The image of each scenario is the REAL shipped artifact — icons/icon128
//      <variant>.png, the same PNG Chrome paints — embedded as-is, never redrawn.
//   2. WHICH variant a scenario gets is decided by the REAL ui/toolbar-icon.js
//      buildRules() (resolveIconVariant below), the same code that registers the
//      browser's declarativeContent rules. So "meetup.com → green" in the gallery
//      is the extension's own classification, computed live, not a literal we typed.
//
// satori (HTML/CSS-subset -> SVG) + resvg (SVG -> PNG) lay out the labels — the
// same offline, browser-less rasterizer stack the popup snapshots use, reused here
// only for the captions around the real icons.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const satori = require("satori").default;
const { Resvg } = require("@resvg/resvg-js");

const ROOT = path.join(__dirname, "..", "..");
const WORKER = path.join(ROOT, "ui/toolbar-icon.js");
const LISTS = JSON.parse(fs.readFileSync(path.join(ROOT, "pipeline/fallback-lists.json"), "utf8"));

const FONT_DIR = path.join(ROOT, "test/ui/fonts");
const FONTS = [
  { name: "Liberation Sans", data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Regular.ttf")), weight: 400, style: "normal" },
  { name: "Liberation Sans", data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Bold.ttf")), weight: 700, style: "normal" },
];

// --- The extension's own classification, run live -------------------------
// Boot ui/toolbar-icon.js with its external boundaries stubbed (the host-list /
// icon fetches, the DOM-less OffscreenCanvas decode, the declarativeContent rule
// classes), exactly as test/extension/toolbar-icon-state.test.js does, and read
// back the rules. The decoded "ImageData" is tagged with the icon path it came
// from, so each rule reveals the variant it paints.
function buildRealRules() {
  const sandbox = {
    URL,
    fetch: async (url) => ({ json: async () => LISTS, blob: async () => ({ __path: String(url) }) }),
    createImageBitmap: async (blob) => blob,
    OffscreenCanvas: class {
      getContext() {
        return { drawImage(b) { this.__b = b; }, getImageData() { return { __path: this.__b?.__path }; } };
      }
    },
    chrome: {
      declarativeContent: {
        PageStateMatcher: class { constructor(a) { Object.assign(this, a); } },
        SetIcon: class { constructor(a) { Object.assign(this, a); } },
        onPageChanged: { removeRules() {}, addRules() {} },
      },
      runtime: { onInstalled: { addListener() {} }, getURL: (p) => p },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(WORKER, "utf8"), sandbox);
  return sandbox.buildRules();
}

// host -> the icon-variant suffix the extension would show on it: "-supported"
// (green), "-denied" (gray), or "" (the manifest default blue, when no rule
// matches). A PageStateMatcher matches if host equals the apex or ends with the
// leading-dot suffix — the same semantics ui/toolbar-icon.js builds.
async function resolveIconVariant(host) {
  const rules = await buildRealRules();
  const matches = (cond) => {
    const u = cond.pageUrl || {};
    return u.hostEquals === host || (u.hostSuffix && host.endsWith(u.hostSuffix));
  };
  for (const rule of rules) {
    if (!rule.conditions.some(matches)) continue;
    const p = rule.actions[0].imageData[16].__path;
    if (p.includes("-supported")) return "-supported";
    if (p.includes("-denied")) return "-denied";
  }
  return "";
}

// --- The gallery image ----------------------------------------------------
const ICON_PX = 96; // the shipped icon128 variant, drawn at a legible size
const dataUri = (suffix) =>
  "data:image/png;base64," +
  fs.readFileSync(path.join(ROOT, `icons/icon128${suffix}.png`)).toString("base64");

// One scenario -> a satori column: the real icon above its caption.
function column(scenario, variant) {
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", alignItems: "center", width: 200, padding: 16 },
      children: [
        { type: "img", props: { src: dataUri(variant), width: ICON_PX, height: ICON_PX } },
        { type: "div", props: { style: { marginTop: 14, fontSize: 17, fontWeight: 700, color: scenario.color }, children: scenario.color.toUpperCase() } },
        { type: "div", props: { style: { marginTop: 4, fontSize: 14, fontWeight: 700, color: "#202124" }, children: scenario.name } },
        { type: "div", props: { style: { marginTop: 2, fontSize: 12, color: "#5f6368" }, children: scenario.exampleHost } },
      ],
    },
  };
}

// Render the whole gallery (all scenarios side by side) to a PNG buffer, looking
// up each scenario's variant from the real buildRules() so the picture matches
// the extension's runtime behavior.
async function renderGalleryPng(scenarios) {
  const columns = [];
  for (const s of scenarios) columns.push(column(s, await resolveIconVariant(s.exampleHost)));
  const tree = {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "row", backgroundColor: "#fff", fontFamily: "Liberation Sans", padding: 12 },
      children: columns,
    },
  };
  const svg = await satori(tree, { width: 200 * scenarios.length + 24, fonts: FONTS });
  return new Resvg(svg, { font: { loadSystemFonts: false }, background: "#ffffff" }).render().asPng();
}

module.exports = { resolveIconVariant, renderGalleryPng };
