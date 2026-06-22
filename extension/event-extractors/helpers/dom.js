// DOM-reading helpers shared by the extract layers and per-source extractors:
// whitespace-normalized text from a selector, the first non-empty of several
// selectors, meta-tag content, the page's body text, and the parsed JSON of an
// embedded <script> (e.g. Next.js's #__NEXT_DATA__ state blob).
//
// Augments globalThis.GCal (never replaces it) so load order can't clobber
// another file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  function clean(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function text(sel, root) {
    const el = (root || document).querySelector(sel);
    return el ? clean(el.textContent) : "";
  }

  function firstText(selectors, root) {
    for (const sel of selectors) {
      const t = text(sel, root);
      if (t) return t;
    }
    return "";
  }

  function meta(nameOrProp) {
    const el = document.querySelector(
      `meta[property="${nameOrProp}"], meta[name="${nameOrProp}"], meta[itemprop="${nameOrProp}"]`
    );
    return el ? clean(el.getAttribute("content")) : "";
  }

  function bodyText() {
    const body = document.body;
    if (!body) return "";
    return body.innerText || body.textContent || "";
  }

  // Parse the JSON content of the <script> matching `selector` (e.g. an id like
  // "#__NEXT_DATA__" or '[type="application/json"]'). Returns the parsed value,
  // or null when the script is absent or its content isn't valid JSON — so
  // callers can navigate the result with plain `&&` guards instead of each
  // wrapping its own getElementById + JSON.parse + try/catch.
  function jsonScript(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return null;
    }
  }

  return { clean, text, firstText, meta, bodyText, jsonScript };
})());
