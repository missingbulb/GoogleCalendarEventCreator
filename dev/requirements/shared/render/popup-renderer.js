// Renders a UI test case to a PNG via satori (HTML/CSS-subset -> SVG, no
// browser) and resvg (SVG -> PNG). Unlike a screenshot, this is a faithful,
// deterministic approximation driven by the SHIPPED code and styles — built for
// catching unintended layout/copy changes, not pixel-perfect fidelity.
//
// The key property: the DOM rendered here is the popup's REAL output. Each case
// (dev/requirements/<kind>/cases/<name>.case.js) supplies only fake data — an extraction result,
// a stub tab, a host listing, and an optional DOM action (e.g. "scroll to the
// bottom"). We feed that to events-popup/popup.js's real `render()`, which runs the same
// chooseContent + events-view + source-request-view + truncation code the
// extension runs, into a jsdom document seeded from the real events-popup/popup.html. So
// there is NO hand-maintained copy of the popup markup anywhere: change a view
// and the snapshots move with it.
//
// satori has no CSS engine — it ignores <style>/<link> and reads only inline
// styles — so we keep ONE source of truth for the popup's look (the real
// events-popup/popup.css) and fold the WHOLE stylesheet onto the rendered DOM before
// drawing: parse popup.css into rules, match each against the DOM with jsdom (the
// engine the popup runs in), and inline EVERY declaration. Nothing is
// cherry-picked: satori quietly ignores what it doesn't use (cursor, transition,
// -webkit-* line clamp, …). The only adjustments are satori's one structural
// requirement — an element with >1 child needs an explicit flex/none/contents
// display — plus swapping in the bundled font. Interaction rules (:hover/:active)
// match nothing in a static tree, so they're skipped.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const satori = require("satori").default;
const { Resvg } = require("@resvg/resvg-js");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..", "..", "..", "..");

const FONT_FAMILY = "Liberation Sans"; // metric-compatible stand-in for popup.css's Arial fallback
const FONT_DIR = path.join(__dirname, "fonts");
const FONTS = [
  { name: FONT_FAMILY, data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Regular.ttf")), weight: 400, style: "normal" },
  { name: FONT_FAMILY, data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Bold.ttf")), weight: 700, style: "normal" },
  { name: FONT_FAMILY, data: fs.readFileSync(path.join(FONT_DIR, "LiberationSans-Italic.ttf")), weight: 400, style: "italic" },
];

// popup.css's body is 280px wide + 12px padding each side.
const WIDTH = 304;

// The reference "now" the cases render against. Pinned (not the real clock) so a
// card's corner-pill decision — gray "past" for an event before today, green year
// pill for a future year — and therefore every snapshot is deterministic forever
// instead of rotting as the wall-clock advances. Sourced from the shared
// reference-time module so the popup renderer and the behavior test share one
// pinned instant (see ../reference-time.js); cases dated on/after this day in its
// year stay pill-free.
const { REFERENCE_NOW } = require("../reference-time");

const POPUP_CSS = fs.readFileSync(path.join(ROOT, "extension", "events-popup", "popup.css"), "utf8");
const POPUP_HTML = fs.readFileSync(path.join(ROOT, "extension", "events-popup", "popup.html"), "utf8");
const { loadCases, snapshotPath } = require("../cases");

// Stub tab the cases render against. Only the calendar-URL/link hrefs read it
// (never shown in a snapshot) and the title backstops an event with no title; a
// case can override any field via its `tab`.
const DEFAULT_TAB = { url: "https://example.com/events", title: "Example event page", index: 0 };

// Import the real popup controller's render() once, BEFORE any case installs a
// global `document` — popup.js's init() guard only fires when a document already
// exists, so importing it document-less keeps it side-effect-free.
let renderPromise;
function loadRender() {
  if (!renderPromise) {
    renderPromise = import(pathToFileURL(path.join(ROOT, "extension", "events-popup", "popup.js")).href).then((m) => m.render);
  }
  return renderPromise;
}

// Parse flat CSS into { selector, body } rules (comma-separated selectors split
// out). popup.css has no media queries or nesting, so this stays simple.
function parseCssRules(css) {
  const rules = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]+)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const body = m[2].trim();
    for (const sel of m[1].split(",")) rules.push({ selector: sel.trim(), body });
  }
  return rules;
}

const RULES = parseCssRules(POPUP_CSS);
const BODY_RULE = RULES.find((r) => r.selector === "body");

// Fold popup.css onto the popup's <body> subtree as inline styles. The element's
// own inline style is appended last so it wins (so a case's action that sets an
// inline style — e.g. scroll-to-bottom — overrides the stylesheet).
function inlinePopupCss(bodyEl) {
  for (const { selector, body } of RULES) {
    if (selector === "body") continue;
    let matched;
    try {
      matched = bodyEl.querySelectorAll(selector);
    } catch (e) {
      continue; // a selector jsdom can't evaluate (e.g. some pseudo) — skip
    }
    for (const el of matched) el.setAttribute("style", `${body};${el.getAttribute("style") || ""}`);
  }
  if (BODY_RULE) bodyEl.setAttribute("style", `${BODY_RULE.body};${bodyEl.getAttribute("style") || ""}`);
}

const camel = (p) => p.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function coerceValue(v) {
  v = v.trim();
  if (/^-?\d+(\.\d+)?px$/.test(v)) return parseFloat(v);
  if (/^-?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  return v;
}

// satori validates `display` against a fixed set and rejects anything else
// (e.g. inline-block). Drop an unsupported value so the box falls back to its
// default; the >1-child rule below still forces flex where it's structurally
// required.
const SATORI_DISPLAY = new Set(["flex", "block", "contents", "none", "-webkit-box"]);

// Inline style string -> satori style object: camelCase the keys and coerce
// px/number values. Every declaration is kept (satori ignores what it doesn't
// use) except a `display` value satori would reject.
function styleObject(styleAttr) {
  const out = {};
  for (const decl of (styleAttr || "").split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!prop || !value) continue;
    const key = camel(prop);
    if (key === "display" && !SATORI_DISPLAY.has(value)) continue;
    out[key] = coerceValue(value);
  }
  return out;
}

// The popup's #events box is height-capped (popup.css) and clips its overflow,
// so a long list's off-screen rows never show — but satori still draws every one
// into the SVG, and resvg panics rasterizing the resulting huge SVG (~20+ event
// cards). Drop the rows that fall outside the visible window before rendering:
// purely a rasterization bound, the painted result is identical because the
// dropped rows are clipped anyway. A card is >= its 52px min-height + 8px margin
// = 60px, so this many rows always more than fills (and overflows) the cap.
const EVENTS_VIEWPORT_PX = 500; // mirrors #events max-height in events-popup/popup.css
const MIN_ROW_PX = 60;
const visibleRowsFor = (viewportPx) => Math.ceil(viewportPx / MIN_ROW_PX) + 3; // + safety/peek

// A case may shrink the #events viewport so a tiny event list still overflows —
// paired with shrunken config (`configurationOverrides`) it pins an overflow
// requirement (7.x/8.x) with a fraction of the cards/pixels (issue #439). The
// viewport is NOT a config.js value (it mirrors a renderer constant), so it
// lives under `nonConfigurableUiSettingsOverrides`, apart from the GCalConfig
// overrides. Both the inlined max-height and the rasterization clamp follow it.
const viewportFor = (testCase) =>
  (testCase.nonConfigurableUiSettingsOverrides && testCase.nonConfigurableUiSettingsOverrides.viewportPx) || EVENTS_VIEWPORT_PX;

// Override the inlined #events max-height with the case's shrunken viewport, so
// satori clips a short list to it (the append wins — same property, last-declared).
function applyViewportOverride(doc, viewportPx) {
  if (viewportPx === EVENTS_VIEWPORT_PX) return;
  const events = doc.getElementById("events");
  if (events) events.setAttribute("style", `${events.getAttribute("style") || ""};max-height:${viewportPx}px`);
}

// Keep only the rows in the visible window of an overflowing #events list,
// anchored to wherever the list is scrolled: the tail when an action pinned it to
// the bottom (justify-content: flex-end), otherwise the head. No-op for a list
// that already fits.
function clampOverflowingList(doc, visibleRows) {
  const events = doc.getElementById("events");
  if (!events) return;
  const rows = [...events.children];
  if (rows.length <= visibleRows) return;
  const pinnedToBottom = /flex-end/.test(events.getAttribute("style") || "");
  const keep = new Set(pinnedToBottom ? rows.slice(-visibleRows) : rows.slice(0, visibleRows));
  for (const row of rows) if (!keep.has(row)) events.removeChild(row);
}

const FLEXY_DISPLAY = ["flex", "none", "contents"];

// jsdom element -> satori element tree. Tag is irrelevant to satori (it lays out
// boxes from styles), so everything becomes a div; text nodes become string
// children (whitespace collapsed).
function toVDom(el) {
  const style = styleObject(el.getAttribute("style"));
  const children = [];
  for (const node of el.childNodes) {
    if (node.nodeType === 3) {
      const t = node.textContent.replace(/\s+/g, " ").trim();
      if (t) children.push(t);
    } else if (node.nodeType === 1) {
      children.push(toVDom(node));
    }
  }
  // satori's one structural requirement: any box that lays out child BOXES (an
  // element child, or more than one child) needs an explicit flex/none/contents
  // display — only a lone text child is exempt. The popup stacks vertically, so
  // default those to a column flex; popup.css's own flex rules (e.g. .event-btn
  // { display: flex; flex-direction: row }) already satisfy it and are left as-is.
  const loneTextChild = children.length === 1 && typeof children[0] === "string";
  if (children.length > 0 && !loneTextChild && !FLEXY_DISPLAY.includes(style.display)) {
    style.display = "flex";
    if (!style.flexDirection) style.flexDirection = "column";
  }
  // Pass a lone child unwrapped and an empty element no children at all: satori
  // treats a children *array* (even length 0 or 1) as needing an explicit
  // display, which an empty container (e.g. an events list with nothing in it)
  // shouldn't.
  const childProp = children.length === 0 ? undefined : children.length === 1 ? children[0] : children;
  return { type: "div", props: { style, children: childProp } };
}

// Build one case's popup DOM with the REAL render(), apply its optional action,
// and rasterize the <body> to a PNG buffer. Cases run one at a time (the views
// build into the global `document`), so the global swap is restored in finally.
async function renderCasePng(testCase) {
  const render = await loadRender(); // imported while document-less (no init())

  const tab = { ...DEFAULT_TAB, ...(testCase.tab || {}) };
  const dom = new JSDOM(POPUP_HTML, { url: tab.url });
  const doc = dom.window.document;
  // The shell's inert <script src="popup.js"> never runs under jsdom, but strip
  // it so it isn't laid out as a stray empty box.
  for (const s of doc.querySelectorAll("script")) s.remove();

  const prevDoc = global.document;
  const prevWin = global.window;
  global.document = doc;
  global.window = dom.window;
  try {
    // A `skipRender` case snapshots the inert initial popup.html shell (the
    // "Reading page…" state render() never produces); everything else runs the
    // real render() and any DOM action on top of it.
    if (!testCase.skipRender) {
      await render({ data: testCase.data, tab, listing: testCase.listing, now: REFERENCE_NOW, configurationOverrides: testCase.configurationOverrides });
      if (testCase.action) testCase.action(doc);
    }

    inlinePopupCss(doc.body);
    const viewportPx = viewportFor(testCase);
    applyViewportOverride(doc, viewportPx);
    clampOverflowingList(doc, visibleRowsFor(viewportPx)); // after styling, so :last-child etc. reflect the true list
    const vdom = toVDom(doc.body);
    // Root scaffolding: fixed popup width, and the bundled font (the CSS
    // font-family stack was dropped so satori uses the one we loaded).
    Object.assign(vdom.props.style, {
      width: WIDTH,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT_FAMILY,
      // The popup body has no explicit background, so it's white (and square) in
      // Chrome. satori would otherwise leave the box transparent — making the PNG
      // look like rounded cards floating on nothing — so paint it white here to
      // match the browser. A test-only choice; it doesn't touch events-popup/popup.html.
      backgroundColor: "#fff",
    });
    const svg = await satori(vdom, { width: WIDTH, fonts: FONTS });
    // background fills any canvas the satori box doesn't cover, so the PNG has no
    // transparent pixels at all (square white corners, like the popup window).
    return new Resvg(svg, { font: { loadSystemFonts: false }, background: "#ffffff" }).render().asPng();
  } finally {
    global.document = prevDoc;
    global.window = prevWin;
    dom.window.close();
  }
}

// loadCases/snapshotPath live in ../cases (kept free of the rendering stack);
// re-exported here so the renderer's existing callers import them from one place.
module.exports = { renderCasePng, loadCases, snapshotPath };
