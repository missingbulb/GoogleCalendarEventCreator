// The toolbar icon reflects whether a page has a site-specific source: supported
// hosts get the green tile, fallback-denylisted hosts the gray tile, everything
// else the default blue tile (the manifest default_icon, so it needs no rule).
//
// The worker no longer reads tab URLs — it registers chrome.declarativeContent
// rules and the BROWSER matches them (so no "tabs" permission / no "Read your
// browsing history" prompt). The real URL→icon match therefore happens inside
// Chrome and is exercised by the real-Chrome test (dev/requirements/heavy/
// extension-load.chrome.test.js). Here we test the layer we own: that buildRules()
// maps each supported host to the green icon and each denied host to the gray
// icon, with apex + subdomain matchers (and unknown hosts to neither).
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const EXT = path.join(ROOT, "extension"); // the extension root; worker + lists are relative to it
const WORKER = path.join(EXT, "icon/toolbar-icon.js");
const LISTS = JSON.parse(fs.readFileSync(path.join(EXT, "fallback-lists.json"), "utf8"));

// Boot the worker with the external boundaries stubbed: the host-list/icon
// fetches, the OffscreenCanvas decode (no DOM in a worker), and the
// declarativeContent rule classes. The icon "ImageData" is tagged with the path
// it was decoded from so a rule's icon variant is identifiable.
function buildRules() {
  const sandbox = {
    URL,
    fetch: async (url) => ({
      json: async () => LISTS,
      blob: async () => ({ __path: String(url) }),
    }),
    createImageBitmap: async (blob) => blob,
    OffscreenCanvas: class {
      getContext() {
        return { drawImage(bitmap) { this.__bitmap = bitmap; }, getImageData() { return { __path: this.__bitmap?.__path }; } };
      }
    },
    chrome: {
      declarativeContent: {
        PageStateMatcher: class { constructor(arg) { Object.assign(this, arg); } },
        SetIcon: class { constructor(arg) { Object.assign(this, arg); } },
        onPageChanged: { removeRules() {}, addRules() {} },
      },
      runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getURL: (p) => p },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(WORKER, "utf8"), sandbox);
  return sandbox.buildRules();
}

// The icon-variant suffix ("-supported" / "-denied" / "") a rule's SetIcon action
// paints, read off the tagged ImageData.
function ruleSuffix(rule) {
  const p = rule.actions[0].imageData[16].__path;
  if (p.includes("-supported")) return "-supported";
  if (p.includes("-denied")) return "-denied";
  return "";
}

// The apex hosts a rule matches (the hostEquals matchers).
function ruleHosts(rule) {
  return rule.conditions.filter((c) => c.pageUrl.hostEquals).map((c) => c.pageUrl.hostEquals);
}

let rules;
before(async () => {
  rules = await buildRules();
});

test("every supported host maps to the green (supported) icon", () => {
  const greenHosts = rules.filter((r) => ruleSuffix(r) === "-supported").flatMap(ruleHosts);
  for (const host of LISTS.supportedDomains) {
    assert.ok(greenHosts.includes(host), `${host} must use the green icon`);
  }
});

test("every denied host maps to the gray (denied) icon", () => {
  const grayHosts = rules.filter((r) => ruleSuffix(r) === "-denied").flatMap(ruleHosts);
  for (const host of LISTS.denylist) {
    assert.ok(grayHosts.includes(host), `${host} must use the gray icon`);
  }
});

test("each host is matched at the apex AND any subdomain, but not as a bare suffix", () => {
  // meetup.com → hostEquals "meetup.com" (apex/www handled by Chrome's host
  // canonicalization) + hostSuffix ".meetup.com" (subdomains), so "evilmeetup.com"
  // (which a bare hostSuffix:"meetup.com" would wrongly match) is excluded.
  const supported = rules.find((r) => ruleSuffix(r) === "-supported");
  const meetup = supported.conditions.filter(
    (c) => c.pageUrl.hostEquals === "meetup.com" || c.pageUrl.hostSuffix === ".meetup.com"
  );
  assert.equal(meetup.length, 2, "a supported host needs both an apex and a leading-dot subdomain matcher");
  assert.ok(
    !supported.conditions.some((c) => c.pageUrl.hostSuffix === "meetup.com"),
    "must not use a bare hostSuffix that would also match evilmeetup.com"
  );
});

test("an unknown host (example.com) is in no rule, so it keeps the default blue icon", () => {
  const allHosts = rules.flatMap(ruleHosts);
  assert.ok(!allHosts.includes("example.com"), "example.com must match no rule (default blue icon)");
});
