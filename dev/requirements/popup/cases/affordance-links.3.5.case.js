// State 3, after the user clicks "Disagree?": the explanation expands INLINE in
// place of the link (source-request-view.js buildPolicyPanel). `expandPolicy`
// dispatches the real click, so this snapshot is the shipped render() + handler,
// not a faked panel.
"use strict";

const { expandPolicy } = require("../../shared/render/actions");

module.exports = {
  description: "clicking \"Disagree?\" expands the how-it-works explanation inline in the popup body",
  data: { supported: false, events: [] },
  listing: "none",
  action: expandPolicy,
};
