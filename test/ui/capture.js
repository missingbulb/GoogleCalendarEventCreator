// Renders popup.html in headless Chromium with a stubbed extension `chrome`
// API returning fixed fixture data, and returns a PNG screenshot buffer of
// the popup once it has finished loading. Shared by the snapshot test and
// the refresh script so both render exactly the same way.
"use strict";

const path = require("node:path");
const { chromium } = require("playwright");
const { EXTRACTED_DATA, TAB } = require("./fixture");

const POPUP_PATH = path.join(__dirname, "..", "..", "popup.html");

async function capturePopupScreenshot() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 480 } });

    // Runs before popup.html's own scripts, so chrome.* is defined by the
    // time popup.js's top-level IIFE executes.
    await page.addInitScript(
      ({ data, tab }) => {
        window.chrome = {
          tabs: {
            query: async () => [tab],
            create: async () => {},
          },
          scripting: {
            executeScript: async () => [{ result: data }],
          },
        };
      },
      { data: EXTRACTED_DATA, tab: TAB }
    );

    await page.goto(`file://${POPUP_PATH}`);
    await page.waitForSelector("#create-btn:not([disabled])");

    return await page.locator("body").screenshot();
  } finally {
    await browser.close();
  }
}

module.exports = { capturePopupScreenshot };
