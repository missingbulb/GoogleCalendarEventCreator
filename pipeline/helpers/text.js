// Rich-text helpers: turn a page element's markup into the plain/HTML text the
// Calendar details field should show. This is the generic machinery that used
// to live, reimplemented, inside individual sources — a source now only says
// WHICH element (and whether to keep bold), and these own HOW it renders:
// <br> becomes a newline, and (optionally) <strong>/<b> runs are kept as <b>…</b>
// so a heading stays bold in the Calendar details (which render as HTML); every
// other element contributes its text only.
//
// Uses GCal.clean at call time. Augments globalThis.GCal (never replaces it) so
// load order can't clobber another file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  // Serialize `el`'s content to text. `el` may be an Element or a CSS selector
  // (resolved against `root`, default document); a missing element yields "".
  // With { bold: true }, <strong>/<b> runs survive as <b>…</b>; otherwise only
  // their text is kept. No whitespace normalization is applied here — compose
  // with normalizeBlock (or your own per-line cleanup) when you need it.
  function richText(el, opts = {}, root) {
    if (typeof el === "string") el = (root || document).querySelector(el);
    if (!el) return "";
    let out = "";
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        out += node.textContent;
      } else if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === "br") out += "\n";
        else if (opts.bold && (tag === "strong" || tag === "b")) out += `<b>${GCal.clean(node.textContent)}</b>`;
        else out += richText(node, opts);
      }
    }
    return out;
  }

  // Tidy a rendered block: collapse horizontal whitespace (incl. &nbsp;) within
  // a line to single spaces, collapse runs of blank lines to a single blank
  // line, and trim. Newlines (e.g. from <br>) are preserved so the author's
  // line and paragraph breaks carry through to the Calendar details.
  function normalizeBlock(s) {
    return (s || "")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // The common case: render an element/selector and tidy it in one call.
  function blockText(el, opts, root) {
    return normalizeBlock(richText(el, opts, root));
  }

  return { richText, normalizeBlock, blockText };
})());
