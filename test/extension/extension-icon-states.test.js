// The extension's toolbar icon changes color to tell the user, at a glance, how
// the current page's host is classified — BEFORE they click. This test pins that
// behavior two ways at once:
//
//   * as ASSERTIONS — for each scenario, the real ui/toolbar-icon.js resolves the
//     example host to the color this test says it should; and
//   * as a reviewable IMAGE — docs/extension-icon-states.png, the three real
//     shipped icons side by side under their captions, embedded next to the prose
//     "Toolbar icon" requirement in docs/productRequirements.md so a human can
//     eyeball "yes, green/gray/blue look right and mean what we say".
//
// The image is generated from the SHIPPED icon PNGs, with each scenario's color
// chosen by the SAME buildRules() the extension registers — so it can't drift from
// what Chrome actually paints (see icon-states-gallery.js). Regenerate after an
// intentional icon/scenario change with:  REFRESH_ICON_GALLERY=1 node --test \
//   test/extension/extension-icon-states.test.js   (then commit the PNG).
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveIconVariant, renderGalleryPng } = require("./icon-states-gallery");

const BASELINE = path.join(__dirname, "..", "..", "docs", "extension-icon-states.png");

// The scenarios, written as the user experiences them. Each line is meant to read
// as a sentence: "On <exampleHost> — <when> — the icon is <color>." `variant` is
// the on-disk icon suffix that color corresponds to; `color` is the caption.
const SCENARIOS = [
  {
    name: "Supported host",
    when: "the host has a dedicated, first-class extractor",
    exampleHost: "bandsintown.com",
    color: "green",
    variant: "-supported",
  },
  {
    name: "Denylisted host",
    when: "the host is on the fallback denylist (we've decided not to guess events there)",
    exampleHost: "cnn.com",
    color: "gray",
    variant: "-denied",
  },
  {
    name: "Any other page",
    when: "the host is neither supported nor denylisted",
    exampleHost: "example.com",
    color: "blue",
    variant: "", // no rule matches -> Chrome shows the manifest default_icon (blue)
  },
];

// --- Correctness: each scenario resolves to the color this test claims ---------
// Reading these three assertions IS reading the spec: on a supported host the icon
// is green, on a denylisted host gray, on anything else the default blue.
for (const scenario of SCENARIOS) {
  test(`On ${scenario.exampleHost}, where ${scenario.when}, the icon is ${scenario.color}`, async () => {
    const variant = await resolveIconVariant(scenario.exampleHost);
    assert.equal(
      variant,
      scenario.variant,
      `expected the ${scenario.color} icon (icon128${scenario.variant || ""}.png) on ${scenario.exampleHost}`
    );
  });
}

// --- The reviewable gallery image ---------------------------------------------
// Refresh-on-demand locally; read-only assertion in CI (and by default) — same
// discipline as the popup snapshots: a human approves the pixels, CI only guards
// them. A drift here means the icon art or a scenario's classification changed;
// re-review the image rather than blindly regenerating.
test("the extension-icon gallery matches the committed image in productRequirements.md", async () => {
  const rendered = await renderGalleryPng(SCENARIOS);

  if (process.env.REFRESH_ICON_GALLERY) {
    fs.writeFileSync(BASELINE, rendered);
    return;
  }

  assert.ok(fs.existsSync(BASELINE), `missing baseline — run REFRESH_ICON_GALLERY=1 to create ${path.relative(process.cwd(), BASELINE)}`);
  assert.deepEqual(
    rendered,
    fs.readFileSync(BASELINE),
    "the rendered icon gallery differs from the committed image — review the change, then REFRESH_ICON_GALLERY=1 to accept it"
  );
});
