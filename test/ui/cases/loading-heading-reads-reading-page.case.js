// The popup's very first paint, before extraction returns: the shipped
// ui/popup.html as-is, with its heading reading "Reading page…" (1.1) over an
// empty body. `skipRender` tells the renderer NOT to call render() (which would
// replace the heading and fill the list), so the snapshot is the inert initial
// shell — the one state render() never produces.
"use strict";

module.exports = {
  description: "Initial load, before extraction returns: the heading reads 'Reading page…' over an empty body",
  requirements: {
    "1.1": "the initial shell, before extraction returns, reads \"Reading page…\"",
  },
  skipRender: true,
};
