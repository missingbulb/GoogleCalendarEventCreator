// Produces the EXACT toolbar icon the extension would paint for a given tab URL,
// by running the extension's own icon pipeline — not by re-reading an asset.
//
// How the real extension colors its icon (ui/toolbar-icon.js):
//   buildRules() fetches the host lists, decodes the packaged icon PNGs into
//   ImageData via fetch -> createImageBitmap -> OffscreenCanvas.getImageData, and
//   bakes that ImageData into chrome.declarativeContent SetIcon rules keyed by host
//   pattern. At runtime the BROWSER matches the active tab's URL to a rule and
//   paints that rule's ImageData (or, if no rule matches, the manifest
//   default_icon).
//
// This module reproduces that offline so a test can assert the real bytes:
//   1. Boot the actual ui/toolbar-icon.js in a vm, with ONLY its boundaries
//      supplied — a fetch that serves FAKE host lists + the REAL icon files, and a
//      createImageBitmap/OffscreenCanvas backed by pngjs so the decode produces
//      genuine RGBA pixels. So buildRules() is the shipped function, and the
//      ImageData it bakes is decoded from the shipped icon art.
//   2. Match the faked tab URL against the rules' conditions exactly as Chrome's
//      PageStateMatcher does (host equals the apex, or ends with the leading-dot
//      suffix, on an http/https scheme). This host match is Chrome's job, so it is
//      the one piece reproduced here; the icon PIXELS are the extension's own.
//   3. Return the matched rule's ImageData (or the manifest default_icon when no
//      rule matches), encoded back to a PNG — the artifact Chrome would show.
//
// The toolbar action only generates the 16 and 32 px sizes (that is all
// buildRules() decodes), so the most detailed icon the extension actually produces
// for the toolbar is 32 px — that is what we assert.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { PNG } = require("pngjs");

const ROOT = path.join(__dirname, "..", "..");
const WORKER = path.join(ROOT, "ui/toolbar-icon.js");
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

const ASSERT_SIZE = 32; // the most detailed size the toolbar-action pipeline generates

// The browser-side boundaries ui/toolbar-icon.js depends on, supplied so the REAL
// worker code runs unmodified: the host-list fetch returns the FAKE lists, the icon
// fetch returns the REAL packaged PNG bytes, and createImageBitmap/OffscreenCanvas
// decode them to genuine RGBA via pngjs. The worker draws each icon at its native
// size (drawImage(bitmap, 0, 0, size, size) over a size×size source), so the canvas
// just holds the decoded bitmap and hands its pixels back — no scaling needed.
function bootWorker(fakeLists) {
  const sandbox = {
    URL,
    fetch: async (url) => {
      const p = String(url);
      if (p.endsWith(".json")) return { json: async () => fakeLists };
      const bytes = fs.readFileSync(path.join(ROOT, p)); // the real icon file
      return { blob: async () => ({ __bytes: bytes }) };
    },
    createImageBitmap: async (blob) => {
      const png = PNG.sync.read(blob.__bytes);
      return { width: png.width, height: png.height, data: png.data };
    },
    OffscreenCanvas: class {
      constructor(w, h) { this.width = w; this.height = h; }
      getContext() {
        const canvas = this;
        return {
          drawImage(bitmap) { canvas.__img = bitmap; },
          getImageData() { return canvas.__img; },
        };
      }
    },
    chrome: {
      declarativeContent: {
        PageStateMatcher: class { constructor(a) { Object.assign(this, a); } },
        SetIcon: class { constructor(a) { Object.assign(this, a); } },
        onPageChanged: { removeRules(_, cb) { if (typeof cb === "function") cb(); }, addRules() {} },
      },
      runtime: { onInstalled: { addListener() {} }, getURL: (p) => p },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(WORKER, "utf8"), sandbox);
  return sandbox; // exposes the real buildRules()
}

// Does a tab URL satisfy one declarativeContent condition? Reproduces the subset
// of chrome.declarativeContent.PageStateMatcher.pageUrl semantics the worker uses.
function urlMatches(url, condition) {
  const f = (condition.pageUrl) || {};
  const u = new URL(url);
  const scheme = u.protocol.replace(/:$/, "");
  if (f.schemes && !f.schemes.includes(scheme)) return false;
  if (f.hostEquals) return u.hostname === f.hostEquals;
  if (f.hostSuffix) return u.hostname.endsWith(f.hostSuffix);
  return false;
}

// The ImageData the extension would paint for `url`: the first matching rule's
// SetIcon ImageData, or the manifest default_icon when nothing matches.
async function imageDataForUrl(url, fakeLists) {
  const sandbox = bootWorker(fakeLists);
  const rules = await sandbox.buildRules();
  for (const rule of rules) {
    if (rule.conditions.some((c) => urlMatches(url, c))) {
      return rule.actions[0].imageData[ASSERT_SIZE];
    }
  }
  // No rule matched -> Chrome shows action.default_icon (the blue icon).
  const defaultIconPath = MANIFEST.action.default_icon[String(ASSERT_SIZE)];
  return PNG.sync.read(fs.readFileSync(path.join(ROOT, defaultIconPath)));
}

function encodePng(imageData) {
  const png = new PNG({ width: imageData.width, height: imageData.height });
  Buffer.from(imageData.data).copy(png.data);
  return PNG.sync.write(png);
}

// The PNG the extension's toolbar icon would be for the given tab URL.
async function iconPngForUrl(url, fakeLists) {
  return encodePng(await imageDataForUrl(url, fakeLists));
}

module.exports = { iconPngForUrl, ASSERT_SIZE };
