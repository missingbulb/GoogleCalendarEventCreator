// Resolve which EXISTING per-site source handles a host — the deterministic
// lookup the auto-implement-extractor pipeline needs for its "supported" mode
// (a request whose host already has a dedicated extractor: instead of closing it,
// the pipeline adds a fresh integration case for the submitted page, hardening the
// existing source). See auto-extractor.md.
//
// The crux: a source's file name is NOT derivable from the host (cinema.co.il is
// handled by telavivcinematheque.js, slug "cinema" ≠ basename
// "telavivcinematheque"). The only authority on "which source owns this host" is
// the sources' own matches() — exactly what the orchestrator uses to pick the
// extractor. So we LOAD each source and ask it, attributing each matcher to the
// file that pushed it.
//
// DOM-free, pure Node vm — the same boot as the supported-domains and
// extension-loads integration tests: registry.js sets globalThis.GCal,
// each source pushes its matcher onto GCal.sources, and only matches() (a pure
// host regex) runs here. We load sources ONE AT A TIME so a newly-pushed matcher
// can be attributed to the file that added it.
//
// As a module (tests + derive-names/triage): exports resolveSourceBaseName().
// As a script (the workflows):
//   node dev/create-extractor/resolve-source.js <event-url-or-host>
//   prints the basename (e.g. "telavivcinematheque") to stdout, or exits 1 when
//   no source matches.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");

// The www-stripped, lowercased host of a URL — or the input itself when it's
// already a bare host (no scheme). "" when it can't be parsed.
function hostOf(urlOrHost) {
  const s = (urlOrHost || "").trim();
  if (!s) return "";
  try {
    return new URL(s).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // Already a bare host? Accept it if it looks like one (has a dot, no spaces).
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s) ? s.toLowerCase().replace(/^www\./, "") : "";
  }
}

// The basename (no ".js") of the source whose matches() accepts `host`, or "" if
// none does. Loads registry.js then each source file in turn, attributing the
// matcher(s) a file pushes to that file.
function resolveSourceBaseName(urlOrHost) {
  const host = hostOf(urlOrHost);
  if (!host) return "";

  const sandbox = { URL };
  vm.createContext(sandbox);
  const run = (rel) =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });

  run("extension/event-extractors/registry.js");
  const files = fs
    .readdirSync(path.join(ROOT, "extension/event-extractors/custom"))
    .filter((f) => f.endsWith(".js"))
    .sort();

  for (const f of files) {
    const before = sandbox.GCal.sources.length;
    run(`extension/event-extractors/custom/${f}`);
    const added = sandbox.GCal.sources.slice(before);
    if (added.some((s) => typeof s.matches === "function" && s.matches(host))) {
      return f.replace(/\.js$/, "");
    }
  }
  return "";
}

module.exports = { hostOf, resolveSourceBaseName };

if (require.main === module) {
  const base = resolveSourceBaseName(process.argv[2]);
  if (!base) {
    console.error(`resolve-source: no existing source matches "${process.argv[2]}"`);
    process.exit(1);
  }
  process.stdout.write(base);
}
