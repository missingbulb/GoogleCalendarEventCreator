// Pre-flight triage for the Auto-implement-extractor workflow
// (.github/workflows/auto-implement-extractor.yml). Before spending an agent
// run, decide whether the request should be closed without one. Four reasons:
//   "supported" — the host already has a dedicated source (config.js's
//                 supportedDomains), so a custom extractor isn't needed.
//   "deny"      — the host is on the fallback denylist.
//   "allow"     — the host is on the fallback allowlist (generic extractor
//                 already handles it).
//   "sample"    — another OPEN extractor-request issue already targets this
//                 host (a request whose PR is still in review keeps its issue
//                 open, since the PR only `Closes #N` on merge). The lowest
//                 issue number wins, so two near-simultaneous requests resolve
//                 to exactly one agent run. Rather than discard the newer
//                 request's URL, the workflow folds it into the leader issue as
//                 an extra sample page (a second real event page is useful raw
//                 material for a more robust extractor); this script names the
//                 leader + emits the URL for the workflow to attach.
// Any of these closes the issue and skips the agent.
//
// Reuses fallback-policy.js (the same classifier the popup uses) so the workflow
// and the popup can never disagree about a host — config.js's lists stay the
// single source of truth.
//
// As a script (run by the workflow):
//   in  (env):  ISSUE_BODY, ISSUE_TITLE, ISSUE_NUMBER — the issue's raw fields
//   in  (file): $OPEN_REQUESTS_FILE (default /tmp/open-requests.json) — the
//               `gh issue list --json number,title,body` array of OTHER open
//               extractor-request issues (the workflow gathers it; this script
//               never touches the network, so the unit tests stay offline)
//   out (GITHUB_OUTPUT): skipAgent, reason, url, host, slug, caseName; plus
//                        leader=<#> when reason="sample" (the URL to fold into
//                        that leader issue is the emitted `url`)
//   out (file, when skipping): /tmp/triage-message.md — the closing comment
// As a module (the tests): exports firstUrl() and runTriage().
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { namesFor } = require("./extractor-naming");

const MESSAGE_PATH = "/tmp/triage-message.md";
const OPEN_REQUESTS_PATH = process.env.OPEN_REQUESTS_FILE || "/tmp/open-requests.json";

// The first http(s) URL in some text. The request form makes the URL field
// required and lists it first, so the first URL in the body is the event page.
function firstUrl(text) {
  const m = (text || "").match(/https?:\/\/[^\s<>)"'\]]+/);
  return m ? m[0] : "";
}

// The www-stripped host of the first URL in an issue's body (or title), or ""
// when there's no parseable URL.
function hostOf({ body = "", title = "" } = {}) {
  try {
    return new URL(firstUrl(body) || firstUrl(title)).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

// The lowest-numbered OPEN request that targets `host`, other than the current
// issue. Returns its number, or null when there's no in-flight duplicate. The
// caller decides whether the CURRENT issue defers to it: it does unless the
// current issue is itself the lowest (the elder always proceeds, so exactly one
// of a set of same-host requests runs the agent).
function earlierDuplicate(host, currentNumber, openRequests) {
  // Without the current number we can't tell whether we're the elder, so fail
  // open (don't dedupe) rather than risk closing the wrong one.
  if (!host || !Number.isInteger(currentNumber) || !Array.isArray(openRequests)) return null;
  const sameHost = openRequests
    .filter((r) => r && Number(r.number) !== currentNumber && hostOf(r) === host)
    .map((r) => Number(r.number))
    .filter((n) => Number.isInteger(n));
  if (!sameHost.length) return null;
  const lowest = Math.min(...sameHost);
  // The current issue defers only when an EARLIER (lower-numbered) request
  // exists. If every same-host peer is newer, the current issue is the elder
  // and proceeds — those peers will defer to it when their own triage runs.
  return currentNumber < lowest ? null : lowest;
}

function skipMessage(reason, { host, duplicateOf }) {
  switch (reason) {
    case "supported":
      return (
        `This request was auto-triaged and closed without an agent run: \`${host}\` already has a ` +
        `dedicated extractor (\`pipeline/sources/\`), so a custom source isn't needed.\n\n` +
        `If extraction on this site is actually broken, please open a bug report instead.`
      );
    case "deny":
      return (
        `This request was auto-triaged and closed without an agent run: \`${host}\` is on the ` +
        `fallback **denylist** — we deliberately don't extract events there, so a custom source ` +
        `won't be added.\n\n` +
        `See the host classifier in \`config.js\` and the policy in \`docs/extraction-policy.md\`. ` +
        `If you think this is wrong, comment and a maintainer can revisit.`
      );
    case "allow":
      return (
        `This request was auto-triaged and closed without an agent run: \`${host}\` is on the ` +
        `fallback **allowlist** — the generic extractor already handles it, so a custom source ` +
        `isn't needed.\n\n` +
        `See the host classifier in \`config.js\` and the policy in \`docs/extraction-policy.md\`. ` +
        `If you think this is wrong, comment and a maintainer can revisit.`
      );
    case "sample":
      return (
        `This request was auto-triaged and closed in favour of #${duplicateOf}, which already ` +
        `covers \`${host}\` and is in progress (its pull request may still be in review).\n\n` +
        `Your event page wasn't wasted: it's been attached to #${duplicateOf} as an **additional ` +
        `sample page**, so the extractor there can pick up a second real integration case from it.\n\n` +
        `Follow #${duplicateOf} for the extractor. If that request stalls, reopen this one.`
      );
    default:
      return "";
  }
}

// Decide whether a request should be closed without an agent run, and why.
// `lists` defaults (via fallback-policy.js) to the shipped config; tests pass
// their own. `openRequests` is the array of OTHER open extractor-request issues
// (for the duplicate check); omit it to skip that check.
async function runTriage({ body = "", title = "", number } = {}, lists, openRequests = []) {
  const { classifyHost, isSupportedDomain } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "fallback-policy.js"))
  );

  const url = firstUrl(body) || firstUrl(title);
  const host = hostOf({ body, title });
  const currentNumber = Number.isInteger(Number(number)) ? Number(number) : undefined;

  // Precedence: an already-supported or listed host is a settled decision;
  // the duplicate check only matters for a host that would otherwise proceed.
  const listing = classifyHost(url, lists); // "allow" | "deny" | "none"
  let reason = "";
  let duplicateOf = null;
  if (isSupportedDomain(url, lists)) reason = "supported";
  else if (listing === "deny") reason = "deny";
  else if (listing === "allow") reason = "allow";
  else if ((duplicateOf = earlierDuplicate(host, currentNumber, openRequests))) reason = "sample";

  const triaged = reason !== "";
  // Deterministic branch/cache names the workflow uses when it proceeds (does
  // Phase 1 itself). Derived here so the URL is parsed once, in one place.
  const { slug, caseName } = namesFor(url);
  return {
    url,
    host,
    slug,
    caseName,
    listing,
    reason,
    duplicateOf,
    triaged,
    message: triaged ? skipMessage(reason, { host, duplicateOf }) : "",
  };
}

module.exports = { firstUrl, runTriage };

// CLI: read the issue + the gathered open requests, emit the decision for the
// workflow. Fails OPEN — any error proceeds to the agent rather than silently
// dropping a real request.
if (require.main === module) {
  (async () => {
    const openRequests = readOpenRequests();
    const res = await runTriage(
      {
        body: process.env.ISSUE_BODY,
        title: process.env.ISSUE_TITLE,
        number: process.env.ISSUE_NUMBER,
      },
      undefined,
      openRequests
    );
    if (res.triaged) {
      fs.writeFileSync(MESSAGE_PATH, res.message);
      const detail =
        res.reason === "sample"
          ? `extra sample for #${res.duplicateOf}`
          : res.reason === "supported"
            ? "already supported"
            : `on the ${res.reason}list`;
      console.log(`Auto-triaged: ${res.host || res.url} (${detail}) — skipping the agent run.`);
    } else {
      console.log(
        res.url
          ? `No triage match for ${res.host || res.url} — proceeding to the agent.`
          : "No URL found in the issue — proceeding to the agent."
      );
    }
    // url/host/slug/caseName feed the workflow's probe + Phase-1 steps when it
    // proceeds (skipAgent=false). Empty when the body had no parseable URL — the
    // probe step then stops the run with a "no event URL" message. `leader` is
    // the issue this defers to in the "sample" case (else ""), so the workflow
    // can fold the emitted `url` into that leader before closing this one.
    writeOutputs({
      skipAgent: res.triaged,
      reason: res.reason,
      url: res.url,
      host: res.host,
      slug: res.slug,
      caseName: res.caseName,
      leader: res.duplicateOf ?? "",
    });
  })().catch((e) => {
    console.error("Triage check errored — proceeding to the agent (fail open):", e);
    writeOutputs({ skipAgent: false, reason: "" });
  });

  // The OTHER open extractor-request issues, gathered by the workflow via `gh`.
  // Missing/unreadable file -> [] (fail open: the duplicate check is skipped).
  function readOpenRequests() {
    try {
      const parsed = JSON.parse(fs.readFileSync(OPEN_REQUESTS_PATH, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeOutputs(outputs) {
    if (!process.env.GITHUB_OUTPUT) return;
    const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v}`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
  }
}
