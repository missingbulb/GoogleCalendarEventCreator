// Field-by-field merge of partial event objects: the first source with a
// non-empty value for a field wins. The whole three-layer extraction (site →
// JSON-LD → generic) composes through this.
//
// Augments globalThis.GCal (never replaces it) so load order can't clobber
// another file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  function merge(...sources) {
    const out = {};
    for (const key of ["title", "start", "end", "location", "description", "ctz"]) {
      for (const src of sources) {
        if (src && src[key]) {
          out[key] = src[key];
          break;
        }
      }
    }
    return out;
  }

  return { merge };
})());
