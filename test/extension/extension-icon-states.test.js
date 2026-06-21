// The extension's toolbar icon changes color to tell the user, at a glance, how
// the current page's host is classified — BEFORE they click. Each classification
// is its own sub-requirement in docs/productRequirements.md, and this test pins
// every one of them by driving the extension's REAL icon pipeline:
//
//   * The only thing faked per scenario is the active tab's URL. The host lists are
//     faked ONCE (below) so the test doesn't depend on which real sites are
//     supported/denied today.
//   * For each scenario we run the shipped ui/toolbar-icon.js buildRules(), let it
//     decode the shipped icon art into the ImageData it bakes into its SetIcon
//     rules, match the faked URL to a rule the way Chrome would, and pull out the
//     resulting icon — see extension-icon-for-url.js. The asserted PNG is the
//     extension's OWN output, not a re-read asset.
//   * That PNG is written to docs/extension-icon-<state>.png and embedded under the
//     state's section, so a human reviews exactly what Chrome paints.
//
// Because the asserted bytes come from the real pipeline, this one comparison
// catches BOTH a classification regression (a host stops matching -> wrong icon ->
// PNG differs) and an art change. Regenerate after an intentional change with:
//   REFRESH_ICON_STATES=1 node --test test/extension/extension-icon-states.test.js
// (then review and commit the PNGs).
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { iconPngForUrl } = require("./extension-icon-for-url");

const DOCS = path.join(__dirname, "..", "..", "docs");
const imagePath = (state) => path.join(DOCS, `extension-icon-${state.id}.png`);

// Faked host lists — the same shape as pipeline/fallback-lists.json — so each
// scenario's host is fixed and independent of the real, evolving lists. (The icon
// pipeline keys only off supportedDomains + denylist; allowlist is included to
// prove that being merely allowlisted does NOT turn the icon green.)
const FAKE_LISTS = {
  supportedDomains: ["supported.test"],
  denylist: ["denied.test"],
  allowlist: ["allowed.test"],
};

// One state per sub-requirement. Each reads as a sentence: "A tab on <tabUrl>,
// whose host is in the <list>, shows the <color> icon."
const STATES = [
  {
    id: "supported",
    color: "green",
    list: "supported list (a dedicated, first-class extractor)",
    tabUrl: "https://supported.test/some-event",
  },
  {
    id: "denylisted",
    color: "gray",
    list: "denylist (we've deliberately decided not to extract there)",
    tabUrl: "https://denied.test/an-article",
  },
  {
    id: "default",
    color: "blue",
    list: "allowlist — which, unlike the supported list, leaves the icon at the default",
    tabUrl: "https://allowed.test/a-page",
  },
];

for (const state of STATES) {
  test(`A tab on a host in the ${state.list} shows the ${state.color} icon (docs/extension-icon-${state.id}.png)`, async () => {
    // Run the extension's real icon pipeline for this tab URL + faked lists.
    const rendered = await iconPngForUrl(state.tabUrl, FAKE_LISTS);
    const file = imagePath(state);

    if (process.env.REFRESH_ICON_STATES) {
      fs.writeFileSync(file, rendered);
      return;
    }

    assert.ok(fs.existsSync(file), `missing baseline — run REFRESH_ICON_STATES=1 to create ${path.relative(process.cwd(), file)}`);
    assert.deepEqual(
      rendered,
      fs.readFileSync(file),
      `the ${state.color} icon the extension generates for ${state.tabUrl} differs from the committed image — ` +
        `review the change, then REFRESH_ICON_STATES=1 to accept it`
    );
  });
}
