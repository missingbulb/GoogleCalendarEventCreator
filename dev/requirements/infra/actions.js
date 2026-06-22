// Reusable "user actions" a UI case (dev/requirements/ui/cases/*.case.js) can apply to the
// rendered popup DOM before it's snapshotted — the gesture half of a case; the
// data half is the case's plain fields. An action is just `(document) => void`
// that mutates the jsdom tree, so a case can also write its own inline; these
// are the common gestures, named once.
//
// satori is a static layout engine with no scrolling, so a "scroll" is expressed
// as layout, not behavior: the popup's #events box is height-capped with
// overflow hidden, so pinning its content to the end (justify-content: flex-end)
// makes satori clip the TOP and paint the bottom — exactly the "scrolled all the
// way down" view, which is the only way to see the count label that lives as the
// list's last item. (satori behavior is verified by rendering, not reasoned
// about — see dev/procedures/claude/testing.md.)
//
// The same staticness applies to the edge fades (popup.css's .scroll-fade): the
// real popup toggles them from live scroll metrics (popup.js), which read 0 under
// jsdom, so a case's action sets the fade state explicitly to match the scroll it
// simulates — the gesture half, just like the scroll itself.
"use strict";

// Reveal/hide the top and bottom edge fades to match a simulated scroll position.
// Sets INLINE opacity rather than toggling the popup's `.show` class: the snapshot
// renderer inlines popup.css with no selector specificity (last-declared-in-file
// wins), so the base `.scroll-fade { opacity: 0 }` would override `.show`'s
// `opacity: 1` and the fade would render invisible — i.e. as the very "hard cut"
// the fade exists to soften. An element's own inline style is applied last by the
// inliner, so an inline opacity here actually takes effect. (The live popup still
// toggles the class for its CSS transition; this is the static-snapshot stand-in,
// like the justify-content the scroll actions set.)
function setFades(doc, { top, bottom }) {
  const t = doc.querySelector(".scroll-fade.top");
  const b = doc.querySelector(".scroll-fade.bottom");
  if (t) t.style.opacity = top ? "1" : "0";
  if (b) b.style.opacity = bottom ? "1" : "0";
}

// At rest at the top of an overflowing list: only the bottom fade (more below).
function restAtTop(doc) {
  setFades(doc, { top: false, bottom: true });
}

// Show the very bottom of the (overflowing, height-capped) event list, as if the
// user scrolled to the end: pin content to the end and show only the top fade
// (there's nothing more below).
function scrollToBottom(doc) {
  const events = doc.getElementById("events");
  if (events) events.style.justifyContent = "flex-end";
  setFades(doc, { top: true, bottom: false });
}

// Show the middle of a long list, as if scrolled partway: keep a middle window of
// rows (satori can't scroll, and resvg panics on a too-tall SVG — same bound as
// the renderer's clampOverflowingList) with the top row cropped so it bleeds
// under the top fade, and show both fades (more list either way).
function scrollToMiddle(doc) {
  const events = doc.getElementById("events");
  if (events) {
    const rows = [...events.children];
    const windowRows = 11; // > the ~8 rows that fill the 500px viewport (>=60px/row)
    const start = Math.max(0, Math.floor((rows.length - windowRows) / 2));
    rows.forEach((row, i) => {
      if (i < start || i >= start + windowRows) events.removeChild(row);
    });
    if (events.firstChild) events.firstChild.style.marginTop = "-30px";
  }
  setFades(doc, { top: true, bottom: true });
}

module.exports = { setFades, restAtTop, scrollToBottom, scrollToMiddle };
