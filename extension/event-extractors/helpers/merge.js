// Field-by-field merge of partial event objects: the first source with a
// non-empty value for a field wins. The two-layer extraction composes through
// this — assemble-events.js merges a site source's overrides over the core
// generic extractor's base event, so a source states only the fields it gets
// better and the base fills the rest.
//
// Augments globalThis.GCal (never replaces it) so load order can't clobber
// another file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  function merge(...sources) {
    const out = {};
    for (const key of ["title", "start", "end", "location", "description", "ctz", "eventLengthInMinutes"]) {
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
