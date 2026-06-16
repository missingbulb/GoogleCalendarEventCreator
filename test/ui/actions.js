// Reusable "user actions" a UI case (test/ui/cases/*.case.js) can apply to the
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
// about — see docs/claude/testing.md.)
"use strict";

// Show the very bottom of the (overflowing, height-capped) event list, as if the
// user scrolled to the end.
function scrollToBottom(doc) {
  const events = doc.getElementById("events");
  if (events) events.style.justifyContent = "flex-end";
}

module.exports = { scrollToBottom };
