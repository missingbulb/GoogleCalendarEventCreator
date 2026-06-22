// The single place that turns an issue's event URL (+ number) into every name the
// auto-implement-extractor pipeline uses — for BOTH modes. Shared by the triage
// (prepare workflow) and derive-names (finalize workflow) so the two can't drift.
//
// Two modes, decided by one authority — does an EXISTING source already handle the
// host? (resolve-source.js, the sources' own matches(), run against the committed
// tree):
//   "new"       — no source matches yet. Scaffold a brand-new source; the slug
//                 names the source file, the branch, AND the (single) case.
//   "supported" — a source already matches. Don't add a source; add a fresh
//                 integration case to that existing source, hardening it against a
//                 second real page. The case/branch are keyed by the EXISTING
//                 source's file name + the issue number (NOT the slug — cinema.co.il
//                 is served by telavivcinematheque.js), so repeated requests for a
//                 supported host each get their own unique case + branch.
//
// Why this is recomputable from the issue alone in every environment (triage, the
// web agent, finalize) without passing state around: a new-mode source exists only
// on the feature branch, never on `main`, so resolve-source against the
// default-branch tree returns "" for new mode and the real base for supported mode.
// Run it on `main` (the default checkout) and the mode is unambiguous.
//
//   in : url (event URL), issueNumber
//   out: { host, slug, mode, sourceBase, caseName, branch, sourcePath, casePath, matchesRegex }
"use strict";

const { namesFor } = require("./extractor-naming");
const { resolveSourceBaseName } = require("./resolve-source");

function planNames(url, issueNumber) {
  const { host, slug, caseName: newCase, matchesRegex } = namesFor(url);

  // The authority on "is this host already supported": an existing source's
  // matches(). "" => new mode.
  const existingBase = slug ? resolveSourceBaseName(url) : "";
  const mode = existingBase ? "supported" : "new";

  const sourceBase = existingBase || slug;
  // Supported-mode cases must be uniquely named per request (the host's first
  // case already owns the slug name); the issue number is the stable, unique key.
  const caseName =
    mode === "supported" ? `${sourceBase}-${issueNumber}` : newCase;

  const branch = sourceBase ? `claude/extractor/${caseName}` : "";
  const sourcePath = sourceBase ? `extension/event-extractors/custom/${sourceBase}.js` : "";
  const casePath = caseName ? `dev/requirements/extractor/expected/${caseName}.json` : "";

  return { host, slug, mode, sourceBase, caseName, branch, sourcePath, casePath, matchesRegex };
}

module.exports = { planNames };
