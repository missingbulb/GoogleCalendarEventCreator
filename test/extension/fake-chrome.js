// A minimal FAKE of the browser environment ui/toolbar-icon.js runs in: the
// chrome.* extension APIs it calls, plus the few web-platform globals it uses
// (fetch, createImageBitmap, OffscreenCanvas). It lets a test load the REAL worker
// unmodified, have it register its declarativeContent rules exactly as in
// production, and then ask: "what icon would you paint at this tab URL?"
//
// The fake owns the one decision that is genuinely Chrome's job, NOT the worker's:
// matching a tab URL against a PageStateMatcher, applying the matching rules'
// SetIcon actions (last wins, as Chrome does), and falling back to the manifest
// default_icon when nothing matches. The worker itself contains no URL-matching
// code — it hands matchers to the browser — so this is a faithful model of Chrome's
// documented semantics, not a copy of worker logic. It runs offline, so it
// validates our model of Chrome, not Chrome itself (only the e2e test does that).
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { PNG } = require("pngjs");

const decodeBitmap = (bytes) => {
  const p = PNG.sync.read(bytes);
  return { width: p.width, height: p.height, data: p.data };
};

class FakeBrowser {
  // root: repo root the worker's fetch() paths resolve against.
  // lists: the object served for the host-list fetch (pipeline/fallback-lists.json).
  // defaultIcon: manifest action.default_icon, { "16": path, "32": path, ... }, shown
  //   when no rule matches (Chrome's behavior).
  constructor({ root, lists, defaultIcon }) {
    this.root = root;
    this.lists = lists;
    this.defaultIcon = defaultIcon;
    this.rules = [];
    this.sandbox = this._buildEnv();
  }

  _buildEnv() {
    const self = this;
    return {
      URL,
      // The worker fetches the host lists (.json) and the packaged icon PNGs.
      fetch: async (url) => {
        const p = String(url);
        if (p.endsWith(".json")) return { json: async () => self.lists };
        return { blob: async () => ({ __bytes: fs.readFileSync(path.join(self.root, p)) }) };
      },
      createImageBitmap: async (blob) => decodeBitmap(blob.__bytes),
      // The worker draws each icon at its native size, so the canvas just holds the
      // decoded bitmap and hands its pixels back.
      OffscreenCanvas: class {
        constructor(w, h) { this.width = w; this.height = h; }
        getContext() {
          const canvas = this;
          return { drawImage(bitmap) { canvas.__img = bitmap; }, getImageData() { return canvas.__img; } };
        }
      },
      chrome: {
        declarativeContent: {
          // A real, evaluable matcher: .matches(url) reproduces the subset of
          // PageStateMatcher.pageUrl semantics the worker relies on.
          PageStateMatcher: class {
            constructor({ pageUrl } = {}) { this.pageUrl = pageUrl || {}; }
            matches(url) {
              const f = this.pageUrl;
              const u = new URL(url);
              if (f.schemes && !f.schemes.includes(u.protocol.replace(/:$/, ""))) return false;
              if (f.hostEquals) return u.hostname === f.hostEquals;
              if (f.hostSuffix) return u.hostname.endsWith(f.hostSuffix);
              return false;
            }
          },
          SetIcon: class { constructor({ imageData } = {}) { this.imageData = imageData; } },
          onPageChanged: {
            removeRules: (_ids, cb) => { self.rules = []; if (typeof cb === "function") cb(); },
            addRules: (rules) => { self.rules.push(...rules); },
          },
        },
        runtime: { onInstalled: { addListener() {} }, getURL: (p) => p },
      },
    };
  }

  // Load and run the REAL worker source in this fake environment. Its top level
  // calls installRules(), which registers rules through our onPageChanged; await the
  // worker's own iconRulesReady promise so registration is complete before we query.
  async loadWorker(workerPath) {
    vm.createContext(this.sandbox);
    vm.runInContext(fs.readFileSync(workerPath, "utf8"), this.sandbox);
    await this.sandbox.iconRulesReady;
    return this;
  }

  // The ImageData this fake browser would paint at `url`, at `size`: apply every
  // matching rule's SetIcon (last wins), else the manifest default_icon.
  iconAt(url, size) {
    let icon = null;
    for (const rule of this.rules) {
      if (rule.conditions.some((c) => c.matches(url))) {
        for (const action of rule.actions) if (action.imageData) icon = action.imageData;
      }
    }
    if (icon) return icon[size];
    return decodeBitmap(fs.readFileSync(path.join(this.root, this.defaultIcon[String(size)])));
  }
}

module.exports = { FakeBrowser };
