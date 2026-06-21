// Generate the PNG the extension's toolbar icon would be for a given tab URL, by
// loading the REAL extension/ui/toolbar-icon.js into a fake browser (fake-chrome.js),
// letting it register its declarativeContent rules through the worker's own
// installRules() path, then asking the fake what icon it would paint at that URL.
//
// So the icon's variant + pixels are produced by the shipped worker decoding the
// shipped art; only the surrounding browser (the chrome.* APIs, the URL→rule match,
// the default-icon fallback) is faked. The toolbar action only generates 16/32 px
// (all buildRules() decodes), so we assert the most detailed of those, 32.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const { FakeBrowser } = require("./fake-chrome");

// The shipped extension lives under extension/; the worker's own fetch paths
// ("pipeline/…", "icons/…") are extension-root-relative, so the fake browser reads
// from EXT_ROOT.
const EXT_ROOT = path.join(__dirname, "..", "..", "extension");
const WORKER = path.join(EXT_ROOT, "ui/toolbar-icon.js");
const MANIFEST = JSON.parse(fs.readFileSync(path.join(EXT_ROOT, "manifest.json"), "utf8"));

const ASSERT_SIZE = 32;

function encodePng(imageData) {
  const png = new PNG({ width: imageData.width, height: imageData.height });
  Buffer.from(imageData.data).copy(png.data);
  return PNG.sync.write(png);
}

async function iconPngForUrl(url, lists) {
  const browser = await new FakeBrowser({
    root: EXT_ROOT,
    lists,
    defaultIcon: MANIFEST.action.default_icon,
  }).loadWorker(WORKER);
  return encodePng(browser.iconAt(url, ASSERT_SIZE));
}

module.exports = { iconPngForUrl, ASSERT_SIZE };
