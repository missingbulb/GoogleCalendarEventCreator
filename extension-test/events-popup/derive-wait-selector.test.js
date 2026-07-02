// Unit tests for deriveWaitSelector (extension/events-popup/derive-wait-selector.js):
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
// deriveWaitSelector is a self-contained ES-module function (so popup.js can inject
// it whole via chrome.scripting.executeScript). Each case calls it directly with a
// jsdom document; the eventer end-to-end check runs the real extractor (via the
// harness) to get the event, then derives against the same fixture DOM.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { extractFromHtml } = require("../harness.js");

const EXT = path.join(__dirname, "..", "..", "extension");
const DATA = path.join(EXT, "..", "dev/requirements/extractor/data/server-fetched");

let deriveWaitSelector;
before(async () => {
  ({ deriveWaitSelector } = await import(
    path.join(EXT, "events-popup/derive-wait-selector.js")
  ));
});

// Run deriveWaitSelector against a body-HTML snippet with a given event.
function derive(bodyHtml, event) {
  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`);
  try {
    return deriveWaitSelector(event, dom.window.document);
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
  assert.equal(sel, ".descriptionHeader");
});

test("never emits a bare structural tag for a bare content element", () => {
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
  const html = readFileSync(path.join(DATA, "eventer.html"), "utf8");
  const url = readFileSync(path.join(DATA, "eventer.url"), "utf8").trim();
  const res = extractFromHtml(html, url);
  assert.ok(res.events.length, "expected the eventer extractor to find an event");

  const dom = new JSDOM(html, { url });
  try {
    const sel = deriveWaitSelector(res.events[0], dom.window.document);
    assert.ok(sel, "expected a non-empty wait selector for eventer");
    const matched = dom.window.document.querySelectorAll(sel);
    assert.equal(matched.length, 1, `selector ${sel} must match exactly one element`);
    const descStart = res.events[0].description.replace(/\s+/g, " ").trim().slice(0, 40).toLowerCase();
    const elText = matched[0].textContent.replace(/\s+/g, " ").trim().toLowerCase();
    assert.ok(elText.includes(descStart), `selector ${sel} must wrap the event content`);
  } finally {
    dom.window.close();
  }
});
