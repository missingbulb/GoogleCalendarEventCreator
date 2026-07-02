// deriveWaitSelector(event, doc) — pick a single CSS selector for ScraperAPI's
// `wait_for_selector=` from a page the popup just extracted an event from.
//
// WHY THIS EXISTS. The auto-extractor pipeline re-fetches a requested event page
// server-side through ScraperAPI (render=true). For a JS single-page-app the
// render is flaky: ScraperAPI can snapshot the page before its data has hydrated,
// recording an empty shell (#587 eventer). A blind fixed `wait` was tried and
// reverted (#595) — it overrides ScraperAPI's adaptive network-idle wait and
// fires too early. `wait_for_selector` is the right lever: it waits for a REAL
// readiness signal (a specific element appearing) instead of a guessed delay.
// ScraperAPI support confirmed `render=true&wait_for_selector=#eventDescription`
// renders eventer reliably.
//
// WHERE THE SELECTOR COMES FROM. The extension runs on the user's LIVE, already
// hydrated DOM — the SPA has finished rendering in their browser — so it doesn't
// have to guess which element appears late. It anchors to the element the popup's
// own extraction just read the event out of: that element is proof the content
// exists, and on a client-rendered app the whole content subtree is absent from
// the pre-hydration shell, so any content selector is inherently hydration-gated.
//
// THE RANKING (see issue #603 for the full derivation). Given the event and the
// live doc, for each field richest-first (description → location → title):
//   1. Find every element whose visible text carries the field's distinctive
//      prefix — the id'd content wrapper, its parents, and its leaf spans all
//      qualify; we rank by selector quality, not by which we hit first.
//   2. Prefer a unique, SANE id (`#eventDescription`) — tightest one wins — then
//      a unique, sane class/tag selector. Reject junk ids/classes (hash-like,
//      all-caps constants) and any selector matching more than one element, and
//      never emit a bare structural tag (`h1`, `body`) that pre-exists empty in
//      the shell — that's the trap that makes `wait_for_selector=h1` fire early.
// The first field that yields a passing selector wins. If none does, fall back to
// a schema.org Event JSON-LD `<script>` (many SPAs inject it only after data
// loads). If even that's absent, return "" — a wrong selector is worse than none
// (it times out or matches too early), and the pipeline's standard-tier re-fetch
// net (#599) still covers a missed hint.
//
// LIMITATION. From a single hydrated snapshot we can't PROVE an element was
// absent from the shell; anchoring only to extracted-content elements makes it
// true in the common (client-rendered) case, but on a server-rendered page the
// selector may match immediately (a harmless no-op). It's a strong hint, not a
// guarantee.
(() => {
  // Elements that never hold visible event content — skip them when scanning for
  // a text anchor (their textContent is markup/metadata, not the rendered page).
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "META", "LINK",
  ]);

  // Collapse whitespace and lowercase, so an extracted value (already
  // whitespace-normalized by the helpers) compares against raw DOM textContent.
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  // The distinctive leading slice of a field value to anchor on. Long enough to
  // be specific (a whole short title, or the first ~80 chars of a description);
  // "" when the value is too short to distinguish an element from page chrome.
  function distinctivePrefix(value) {
    const n = norm(value);
    if (n.length < 4) return "";
    return n.slice(0, 80);
  }

  // A CSS ident (id or class) is usable only if it's a plain [A-Za-z0-9_-] token
  // (so it needs no escaping) AND looks human-authored rather than machine-
  // generated. Rejected: over-long tokens, ALL-CAPS constants (STARTING_DATE,
  // ADDRESS — usually template placeholders), and hash-like tokens (a run of
  // digits, or a long low-vowel string like C6AG5T8N3BRG7LOIR9N0 / a styled-
  // components hash). Kept: word / camelCase / kebab-case names (eventDescription,
  // locationDescription, event-description).
  function saneIdent(tok) {
    if (!tok) return false;
    if (tok.length > 40) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(tok)) return false;
    if (/^[A-Z0-9_]+$/.test(tok)) return false; // ALL-CAPS constant
    if (/^(ng|sc|css|jsx)-/.test(tok)) return false; // framework-added, unstable
    const digits = (tok.match(/\d/g) || []).length;
    if (digits >= 4) return false; // hash-like
    const letters = tok.replace(/[^A-Za-z]/g, "");
    const vowels = (tok.match(/[aeiou]/gi) || []).length;
    if (letters.length >= 8 && vowels / letters.length < 0.2) return false; // low-vowel hash
    return true;
  }

  // Does `selector` match exactly one element? An invalid selector counts as
  // non-unique (never emitted). Used to guarantee ScraperAPI waits on a single,
  // unambiguous element.
  function isUnique(selector, doc) {
    try {
      return doc.querySelectorAll(selector).length === 1;
    } catch (e) {
      return false;
    }
  }

  // The sane classes on an element, longest-first (a longer class name tends to
  // be the more specific, content-bearing one).
  function saneClasses(el) {
    return (el.getAttribute("class") || "")
      .split(/\s+/)
      .filter(saneIdent)
      .sort((a, b) => b.length - a.length);
  }

  // Best class-based selector for one element: a single unique sane class, else a
  // unique tag.class, else a unique compound of its two most specific classes.
  // Never a bare structural tag alone — every candidate carries at least one
  // class, so it can't fire on an empty shell placeholder.
  function classSelector(el, doc) {
    const tag = el.tagName.toLowerCase();
    const classes = saneClasses(el);
    if (!classes.length) return "";
    for (const c of classes) {
      if (isUnique(`.${c}`, doc)) return `.${c}`;
    }
    for (const c of classes) {
      if (isUnique(`${tag}.${c}`, doc)) return `${tag}.${c}`;
    }
    if (classes.length >= 2) {
      const compound = `${tag}.${classes[0]}.${classes[1]}`;
      if (isUnique(compound, doc)) return compound;
    }
    return "";
  }

  // The best selector for one element: a unique sane id, else a unique sane
  // class/tag selector. "" when the element can't be pinned unambiguously (a bare
  // leaf `<span>` with no id/class, a shell placeholder) — its parent gets tried
  // next.
  function bestSelectorFor(el, doc) {
    const id = el.getAttribute("id");
    if (saneIdent(id) && isUnique(`#${id}`, doc)) return `#${id}`;
    return classSelector(el, doc);
  }

  // The selector for one field value, or "". Gathers every content element whose
  // text carries the value's distinctive prefix, then walks them TIGHTEST-first
  // and returns the first that yields a selector — so the innermost pinnable
  // wrapper of the content wins (an id on it preferred), never a huge outer
  // container that merely happens to have an id.
  function selectorForValue(value, doc) {
    const needle = distinctivePrefix(value);
    if (!needle) return "";

    const matches = [];
    for (const el of doc.body.querySelectorAll("*")) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      if (norm(el.textContent).includes(needle)) matches.push(el);
    }
    if (!matches.length) return "";
    // Tightest wrapper first: by visible-text length, and — when a parent and its
    // only child tie on text — the deeper (descendant) element wins, so its own
    // id/class is tried before the outer wrapper's.
    matches.sort((a, b) => {
      const la = norm(a.textContent).length;
      const lb = norm(b.textContent).length;
      if (la !== lb) return la - lb;
      if (a.contains(b)) return 1;
      if (b.contains(a)) return -1;
      return 0;
    });

    for (const el of matches) {
      const sel = bestSelectorFor(el, doc);
      if (sel) return sel;
    }
    return "";
  }

  // A schema.org Event JSON-LD block, if the page carries one — a decent
  // hydration signal (many SPAs inject it only after their data loads) when no
  // content element yielded a clean selector.
  function jsonLdEventSelector(doc) {
    const sel = 'script[type="application/ld+json"]';
    for (const s of doc.querySelectorAll(sel)) {
      try {
        const json = JSON.parse(s.textContent);
        const types = []
          .concat(json, json && json["@graph"])
          .filter(Boolean)
          .flatMap((n) => [].concat(n["@type"] || []));
        if (types.some((t) => String(t).toLowerCase() === "event")) return sel;
      } catch (e) {
        // Not parseable JSON — ignore this block.
      }
    }
    return "";
  }

  // The event's location lives on its first instance (the multi-instance model);
  // tolerate a flat event-level location too.
  function firstLocation(event) {
    const inst = (event.times && event.times[0]) || event;
    return inst.location || event.location || "";
  }

  function deriveWaitSelector(event, doc) {
    if (!event || !doc || !doc.body) return "";
    const fields = [event.description, firstLocation(event), event.title];
    for (const value of fields) {
      const sel = selectorForValue(value, doc);
      if (sel) return sel;
    }
    return jsonLdEventSelector(doc);
  }

  GCal.deriveWaitSelector = deriveWaitSelector;
})();
