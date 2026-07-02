// Unit tests for GCal.deriveWaitSelector (extension/event-extractors/derive-wait-selector.js):
// from a hydrated DOM + the extracted event, pick a robust CSS selector for
// ScraperAPI's wait_for_selector (#603). The rules under test:
//   - anchor to the element the event's content lives in, richest field first
//     (description > location > title);
//   - prefer a unique, sane id, then a unique, sane class selector, tightest
//     wrapper first;
//   - reject junk idents (hash-like, ALL-CAPS constants, ng-/sc-/css- framework
//     classes) and any non-unique selector; never emit a bare structural tag;
//   - fall back to a schema.org Event JSON-LD <script>; else "".
//
// deriveWaitSelector is self-contained (no other GCal helper), so each case evals
// just registry.js (which creates GCal) + derive-wait-selector.js into a jsdom and
// calls it directly. The eventer end-to-end check goes through the real harness.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { extractFromHtml } = require("../harness.js");

const EXT = path.join(__dirname, "..", "..", "extension");
const REGISTRY = readFileSync(path.join(EXT, "event-extractors/registry.js"), "utf8");
const DERIVE = readFileSync(path.join(EXT, "event-extractors/derive-wait-selector.js"), "utf8");

// Run deriveWaitSelector against a body-HTML snippet with a given event.
function derive(bodyHtml, event) {
  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`, {
    runScripts: "outside-only",
  });
  try {
    dom.window.eval(REGISTRY);
    dom.window.eval(DERIVE);
    dom.window.__event = event;
    return dom.window.eval("GCal.deriveWaitSelector(window.__event, document)");
  } finally {
    dom.window.close();
  }
}

const ev = (fields) => ({ title: "", description: "", times: [{}], ...fields });

test("prefers a unique, sane id on the content element", () => {
  const sel = derive(
    `<div class="wrap"><p id="eventDescription">A long enough event description here</p></div>`,
    ev({ description: "A long enough event description here" })
  );
  assert.equal(sel, "#eventDescription");
});

test("skips a hash-like id and falls to a unique class", () => {
  const sel = derive(
    `<section class="details"><p id="C6AG5T8N3BRG7LOIR9N0">A long enough event description here</p></section>`,
    ev({ description: "A long enough event description here" })
  );
  // The id is junk (many digits); the content is pinned by a class instead.
  assert.ok(sel && sel !== "#C6AG5T8N3BRG7LOIR9N0", sel);
  assert.match(sel, /details|wrap|section/);
});

test("skips an ALL-CAPS constant id", () => {
  const sel = derive(
    `<div class="body-copy"><p id="STARTING_DATE">A long enough event description here</p></div>`,
    ev({ description: "A long enough event description here" })
  );
  assert.notEqual(sel, "#STARTING_DATE");
});

test("rejects framework classes (ng-binding) and a non-unique tag, using a unique class", () => {
  const sel = derive(
    `<h1 class="ng-binding">Other heading</h1>
     <h1 class="ng-binding descriptionHeader">My Event Title</h1>`,
    ev({ title: "My Event Title" })
  );
  // Two <h1>s => bare h1 is ambiguous; ng-binding is framework noise and repeated.
  assert.equal(sel, ".descriptionHeader");
});

test("never emits a bare structural tag for a bare content element", () => {
  // The content sits in a class-less <div>; no id, no class => no clean content
  // selector, so it falls back to the JSON-LD Event block.
  const sel = derive(
    `<div>A long enough event description here</div>
     <script type="application/ld+json">{"@type":"Event","name":"x"}</script>`,
    ev({ description: "A long enough event description here" })
  );
  assert.equal(sel, 'script[type="application/ld+json"]');
});

test("richest field wins: description's id beats a matchable title", () => {
  const sel = derive(
    `<h1 id="title">My Event Title</h1>
     <div id="desc">A long enough event description here</div>`,
    ev({ title: "My Event Title", description: "A long enough event description here" })
  );
  assert.equal(sel, "#desc");
});

test("returns '' when nothing anchors and there is no JSON-LD", () => {
  const sel = derive(`<div>unrelated chrome</div>`, ev({ description: "content not on the page" }));
  assert.equal(sel, "");
});

test("a non-Event JSON-LD block is not used as a fallback", () => {
  const sel = derive(
    `<div>A long enough event description here</div>
     <script type="application/ld+json">{"@type":"BreadcrumbList"}</script>`,
    ev({ description: "A long enough event description here" })
  );
  assert.equal(sel, "");
});

// End-to-end against the committed eventer fixture (the #603 SPA that motivated
// this). The exact class is intentionally NOT pinned (it can move with the
// fixture); we assert the contract: a unique selector anchored on real content.
test("eventer fixture: yields a unique selector anchored on the event's content", () => {
  const html = readFileSync(
    path.join(EXT, "..", "dev/requirements/extractor/data/server-fetched/eventer.html"),
    "utf8"
  );
  const url = readFileSync(
    path.join(EXT, "..", "dev/requirements/extractor/data/server-fetched/eventer.url"),
    "utf8"
  ).trim();
  const res = extractFromHtml(html, url);
  assert.ok(res.waitSelector, "expected a non-empty wait selector for eventer");

  // The selector must uniquely resolve, and its element must actually carry the
  // extracted description — i.e. it's a real content anchor, not a stray match.
  const dom = new JSDOM(html, { url });
  try {
    const matched = dom.window.document.querySelectorAll(res.waitSelector);
    assert.equal(matched.length, 1, `selector ${res.waitSelector} must match exactly one element`);
    const descStart = res.events[0].description.replace(/\s+/g, " ").trim().slice(0, 40).toLowerCase();
    const elText = matched[0].textContent.replace(/\s+/g, " ").trim().toLowerCase();
    assert.ok(elText.includes(descStart), `selector ${res.waitSelector} must wrap the event content`);
  } finally {
    dom.window.close();
  }
});
