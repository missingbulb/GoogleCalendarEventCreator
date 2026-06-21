// The extension's toolbar icon changes color to tell the user, at a glance, how
// the current page's host is classified — BEFORE they click. Each classification
// is its own sub-requirement in docs/productRequirements.md, and this test pins
// every one of them two ways at once:
//
//   * as an ASSERTION — for each state, the real ui/toolbar-icon.js resolves the
//     example host to the icon variant that state's requirement says it should; and
//   * as a reviewable IMAGE — docs/extension-icon-<state>.png, the real shipped
//     128px icon for that state, embedded under that state's section so a human can
//     eyeball "yes, this is the icon, and it looks right".
//
// Each image is the SHIPPED icon, with its variant chosen by the SAME buildRules()
// the extension registers — so it can't drift from what Chrome paints. The images
// carry no text, so no caption can go stale; the color and meaning are described in
// the requirement's prose. Regenerate after an intentional icon change with:
//   REFRESH_ICON_STATES=1 node --test test/extension/extension-icon-states.test.js
// (then commit the PNGs).
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveIconVariant, renderStatePng } = require("./icon-state-renderer");

const DOCS = path.join(__dirname, "..", "..", "docs");
const imagePath = (state) => path.join(DOCS, `extension-icon-${state.id}.png`);

// The states, written as the user experiences them — one per sub-requirement.
// Each line reads as a sentence: "On <exampleHost> — <when> — the icon is <color>."
// `variant` is the on-disk icon suffix that color corresponds to; `id` names the
// per-state image (docs/extension-icon-<id>.png).
const STATES = [
  {
    id: "supported",
    color: "green",
    when: "the host has a dedicated, first-class extractor",
    exampleHost: "bandsintown.com",
    variant: "-supported",
  },
  {
    id: "denylisted",
    color: "gray",
    when: "the host is on the fallback denylist (we've decided not to guess events there)",
    exampleHost: "cnn.com",
    variant: "-denied",
  },
  {
    id: "default",
    color: "blue",
    when: "the host is neither supported nor denylisted",
    exampleHost: "example.com",
    variant: "", // no rule matches -> Chrome shows the manifest default_icon (blue)
  },
];

// --- Correctness: each state resolves to the icon its requirement claims -------
// Reading these three assertions IS reading the spec: on a supported host the icon
// is green, on a denylisted host gray, on anything else the default blue.
for (const state of STATES) {
  test(`On ${state.exampleHost}, where ${state.when}, the icon is ${state.color}`, async () => {
    const variant = await resolveIconVariant(state.exampleHost);
    assert.equal(
      variant,
      state.variant,
      `expected the ${state.color} icon (icon128${state.variant || ""}.png) on ${state.exampleHost}`
    );
  });
}

// --- The reviewable per-state images ------------------------------------------
// Refresh-on-demand locally; read-only assertion in CI (and by default) — same
// discipline as the popup snapshots: a human approves the pixels, CI only guards
// them. A drift here means the icon art changed; re-review the image rather than
// blindly regenerating.
for (const state of STATES) {
  test(`the ${state.id} icon image matches the one embedded in productRequirements.md`, async () => {
    const rendered = await renderStatePng(state.variant);
    const file = imagePath(state);

    if (process.env.REFRESH_ICON_STATES) {
      fs.writeFileSync(file, rendered);
      return;
    }

    assert.ok(fs.existsSync(file), `missing baseline — run REFRESH_ICON_STATES=1 to create ${path.relative(process.cwd(), file)}`);
    assert.deepEqual(
      rendered,
      fs.readFileSync(file),
      `the rendered ${state.id} icon differs from the committed image — review the change, then REFRESH_ICON_STATES=1 to accept it`
    );
  });
}
