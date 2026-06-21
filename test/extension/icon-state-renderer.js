// Renders the toolbar/extension icon for ONE classification state into a clean,
// label-free PNG — the reviewable companion to that state's sub-requirement in
// docs/productRequirements.md. One image per state (supported / denylisted /
// default), not a combined gallery, so each requirement section owns its own
// picture and carries its own prose description.
//
// Two properties keep each image honest — it shows what the extension ACTUALLY
// paints, not a hand-drawn mock-up:
//
//   1. The picture is the REAL shipped artifact — the most detailed shipped icon,
//      icons/icon128<variant>.png (the same art Chrome scales down to the toolbar),
//      embedded as-is and never redrawn.
//   2. WHICH variant a state gets is decided by the REAL ui/toolbar-icon.js
//      buildRules() (resolveIconVariant below), the same code that registers the
//      browser's declarativeContent rules — so the image can't drift from the
//      extension's own classification.
//
// satori (HTML/CSS-subset -> SVG) + resvg (SVG -> PNG) only frame the icon on a
// white, padded canvas — there is NO text, so no color word can go stale (the
// color is described in the requirement's prose, not baked into the picture).
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const satori = require("satori").default;
const { Resvg } = require("@resvg/resvg-js");

const ROOT = path.join(__dirname, "..", "..");
const WORKER = path.join(ROOT, "ui/toolbar-icon.js");
const LISTS = JSON.parse(fs.readFileSync(path.join(ROOT, "pipeline/fallback-lists.json"), "utf8"));

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
// leading-dot suffix — the same semantics ui/toolbar-icon.js builds. The variant
// is read off any size the rule baked (size-independent — it's a tag, not the art).
async function resolveIconVariant(host) {
  const rules = await buildRealRules();
  const matches = (cond) => {
    const u = cond.pageUrl || {};
    return u.hostEquals === host || (u.hostSuffix && host.endsWith(u.hostSuffix));
  };
  for (const rule of rules) {
    if (!rule.conditions.some(matches)) continue;
    const p = Object.values(rule.actions[0].imageData)[0].__path;
    if (p.includes("-supported")) return "-supported";
    if (p.includes("-denied")) return "-denied";
  }
  return "";
}

// --- One state's image ----------------------------------------------------
// The most detailed shipped icon (128px), drawn at native resolution so it stays
// crisp, framed on a white square with padding to read as an intentional figure.
const ICON_PX = 128;
const PAD = 24;

function iconDataUri(variant) {
  const buf = fs.readFileSync(path.join(ROOT, `icons/icon128${variant}.png`));
  return "data:image/png;base64," + buf.toString("base64");
}

// Render the icon for one variant ("" | "-supported" | "-denied") to a PNG buffer.
async function renderStatePng(variant) {
  const tree = {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: ICON_PX + PAD * 2,
        height: ICON_PX + PAD * 2,
        backgroundColor: "#fff",
      },
      children: { type: "img", props: { src: iconDataUri(variant), width: ICON_PX, height: ICON_PX } },
    },
  };
  const svg = await satori(tree, { width: ICON_PX + PAD * 2, height: ICON_PX + PAD * 2, fonts: [] });
  return new Resvg(svg, { font: { loadSystemFonts: false }, background: "#ffffff" }).render().asPng();
}

module.exports = { resolveIconVariant, renderStatePng };
