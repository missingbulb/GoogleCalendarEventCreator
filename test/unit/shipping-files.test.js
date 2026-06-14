// Guards the release zip's contents (tools/shipping-files.js) against drift:
// every file the extension actually loads at runtime must be in the shipping
// set, and dev/test-only files must stay out. If this fails, the built zip is
// either missing a runtime file or carrying dead weight into the Web Store.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { SHIPPING_PATHS } = require("../../tools/shipping-files");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// True when `file` ships: either listed directly, or living under a listed dir.
function isShipped(file) {
  return SHIPPING_PATHS.some((p) => file === p || file.startsWith(p + "/"));
}

test("every shipping path exists", () => {
  for (const p of SHIPPING_PATHS) {
    assert.ok(fs.existsSync(path.join(ROOT, p)), `shipping path missing: ${p}`);
  }
});

test("manifest-referenced files ship", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const refs = new Set([
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons),
  ]);
  for (const ref of refs) {
    assert.ok(isShipped(ref), `manifest references ${ref}, but it is not in the shipping set`);
  }
});

test("every injected extractor file ships", () => {
  // pipeline/load-order.generated.json is the list popup.js injects into the page.
  const files = JSON.parse(read("pipeline/load-order.generated.json"));
  assert.ok(files.length > 0, "load-order.generated.json lists no files");
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), `load order lists ${f}, which does not exist`);
    assert.ok(isShipped(f), `load order lists ${f}, but it is not in the shipping set`);
  }
});

test("popup's module script and stylesheet ship", () => {
  const html = read("ui/popup.html");
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ["popup.js"]); // a single ES-module controller; views load via import()
  const styles = [...html.matchAll(/<link[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(styles, ["popup.css"]);
  // Both are relative to ui/popup.html.
  for (const ref of [...scripts, ...styles]) {
    assert.ok(isShipped(`ui/${ref}`), `popup loads ${ref}, but ui/${ref} is not in the shipping set`);
  }
});

test("the service worker's importScripts targets ship", () => {
  const block = read("ui/toolbar-icon.js").match(/importScripts\(([^)]*)\)/s);
  assert.ok(block, "toolbar-icon.js must call importScripts");
  // Strip the leading slash on the worker's root-relative paths.
  const imports = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/^\//, ""));
  assert.ok(imports.length > 0, "no importScripts targets found in toolbar-icon.js");
  for (const i of imports) assert.ok(isShipped(i), `toolbar-icon.js imports /${i}, but it is not in the shipping set`);
});

test("dev/test-only paths do not ship", () => {
  for (const p of ["test", "data", "tools", "package.json", "package-lock.json", "README.md", ".github"]) {
    assert.ok(!isShipped(p), `${p} should not be in the shipping set`);
  }
});
