// DOM-reading helpers shared by the extract layers and per-source extractors:
// whitespace-normalized text from a selector, the first non-empty of several
// selectors, meta-tag content, and the page's body text.
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

  return { clean, text, firstText, meta, bodyText };
})());
