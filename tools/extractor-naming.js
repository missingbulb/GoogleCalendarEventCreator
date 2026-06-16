// Deterministic branch / cache-file names for the auto-implement-extractor
// workflow, derived purely from the event URL's host. The workflow does Phase 1
// (branch + cache the page) before the agent runs, so these names can't be the
// agent's judgement call any more — they have to be reproducible from the URL
// alone. Pure (no I/O), so it's unit-tested (test/unit/extractor-naming.test.js)
// and the workflow and triage agree on the names.
//
//   slug      — host, www-stripped, a common public suffix removed, dots → "-":
//                 axs.com               -> axs
//                 visit.tel-aviv.gov.il -> visit-tel-aviv
//                 events.datadoghq.com  -> events-datadoghq
//                 dice.fm               -> dice
//               Used for the branch (claude/extractor/<slug>) and the source
//               file (pipeline/sources/<slug>.js).
//   caseName  — the fixture / integration-case identifier
//               (data/<caseName>.{url,html}, test/extractors/custom/<caseName>.json).
//               Equal to the slug for the first, auto-recorded case; additional
//               cases for the same host are added by hand later with their own
//               descriptive names.
"use strict";

// Multi-label public suffixes we'd otherwise mistake for "name + TLD". Not a
// full public-suffix list — just the ones this project's requests actually hit;
// the slug is only an identifier, so an imperfect strip is cosmetic, not a bug.
const COMPOUND_SUFFIXES = [
  "co.il", "org.il", "gov.il", "ac.il", "muni.il",
  "co.uk", "org.uk", "gov.uk", "ac.uk",
  "com.au", "co.jp", "co.nz",
];

// The www-stripped, lowercased hostname of a URL, or "" when it doesn't parse.
function hostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Drop a trailing public suffix from a host, leaving the registrable-name
// labels: "visit.tel-aviv.gov.il" -> ["visit","tel-aviv"], "axs.com" -> ["axs"].
function nameLabels(host) {
  for (const suffix of COMPOUND_SUFFIXES) {
    if (host.endsWith("." + suffix)) {
      return host.slice(0, -(suffix.length + 1)).split(".");
    }
  }
  const labels = host.split(".");
  // Drop the single TLD label (".com", ".fm", …) when there's a name in front.
  return labels.length > 1 ? labels.slice(0, -1) : labels;
}

// filesystem-/branch-safe: lowercase, only [a-z0-9-], no leading/trailing or
// doubled hyphens.
function sanitize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function slugFor(url) {
  const host = hostname(url);
  if (!host) return "";
  return sanitize(nameLabels(host).join("-"));
}

// { host, slug, caseName } for a URL; all "" when the URL doesn't parse.
function namesFor(url) {
  const host = hostname(url);
  const slug = slugFor(url);
  return { host, slug, caseName: slug };
}

module.exports = { hostname, slugFor, namesFor };
