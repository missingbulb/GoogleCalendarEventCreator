// Pre-flight triage for the Auto-implement-extractor workflow
// (.github/workflows/auto-implement-extractor.yml). Before spending an agent
// run, decide how to handle the request. The host's situation sorts it into one
// of these:
//   "supported" — the host already has a dedicated source. We DON'T close it any
//                 more: the pipeline runs in **supported mode** and adds a fresh
//                 integration case to that existing source (hardening it against a
//                 second real page) instead of scaffolding a new one. plan-names.js
//                 resolves which existing source via the sources' own matches().
//   "deny"      — the host is on the fallback denylist.            } these three
//   "allow"     — the host is on the fallback allowlist (generic   } still CLOSE
//                 extractor already handles it).                    } the request
//   "sample"    — another OPEN extractor-request issue already targets this host
//                 (a request whose PR is still in review keeps its issue open).
//                 The lowest issue number wins; the newer request's URL is folded
//                 into the leader issue as an extra sample page.
// deny / allow / sample close the issue and skip the agent (skipAgent=true);
// supported and "no match" both PROCEED (skipAgent=false) — supported in supported
// mode, no-match in new-source mode.
//
// Reuses fallback-policy.js (the popup's host classifier) for deny/allow and
// resolve-source.js (the sources' matches()) for supported, so the workflow and
// the popup can never disagree about a host.
//
// As a script (run by the workflow):
//   in  (env):  ISSUE_BODY, ISSUE_TITLE, ISSUE_NUMBER — the issue's raw fields
//   in  (file): $OPEN_REQUESTS_FILE (default /tmp/open-requests.json) — the
//               `gh issue list --json number,title,body` array of OTHER open
//               extractor-request issues (the workflow gathers it; this script
//               never touches the network, so the unit tests stay offline)
//   out (GITHUB_OUTPUT): skipAgent, reason, mode, url, host, slug, sourceBase,
//                        caseName, branch, sourcePath, casePath; plus leader=<#>
//                        when reason="sample" (the URL to fold into that leader
//                        issue is the emitted `url`)
//   out (file, when skipping): /tmp/triage-message.md — the closing comment
// As a module (the tests): exports firstUrl() and runTriage().
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { planNames } = require("./plan-names");

const MESSAGE_PATH = "/tmp/triage-message.md";
const OPEN_REQUESTS_PATH = process.env.OPEN_REQUESTS_FILE || "/tmp/open-requests.json";

// The first http(s) URL in some text. The request form makes the URL field
// required and lists it first, so the first URL in the body is the event page.
function firstUrl(text) {
  const m = (text || "").match(/https?:\/\/[^\s<>)"'\]]+/);
  return m ? m[0] : "";
}

// The value of a GitHub issue-form field from the rendered issue body. A form
// renders each answer as "### <label>\n\n<value>" up to the next "### " heading;
// an empty field renders the literal "_No response_". Returns the trimmed value,
// or "" when the section is missing or empty.
function fieldValue(body, label) {
  const lines = String(body || "").split(/\r?\n/);
  const i = lines.findIndex((l) => l.trim() === `### ${label}`);
  if (i < 0) return "";
  const out = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^### /.test(lines[j])) break;
    out.push(lines[j]);
  }
  const val = out.join("\n").trim();
  return val === "_No response_" ? "" : val;
}

// The CSS selector the extension derived from the live page (the form's
// "Wait-for selector" field, #603), handed to ScraperAPI as wait_for_selector when
// the pipeline re-records the page. A selector is one line; take only the first,
// strip an accidental surrounding code span, and bound the length so a pasted
// paragraph or a hostile issue body can't feed a giant value into the fetch URL
// (scraperapi_fetch url-encodes it regardless).
function waitSelectorOf(body) {
  const first = fieldValue(body, "Wait-for selector").split(/\r?\n/)[0].trim();
  return first.replace(/^`+|`+$/g, "").trim().slice(0, 200);
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
    case "deny":
      return (
        `This request was auto-triaged and closed without an agent run: \`${host}\` is on the ` +
        `fallback **denylist** — we deliberately don't extract events there, so a custom source ` +
        `won't be added.\n\n` +
        `See the host classifier in \`extension/config.js\`. ` +
        `If you think this is wrong, comment and a maintainer can revisit.`
      );
    case "allow":
      return (
        `This request was auto-triaged and closed without an agent run: \`${host}\` is on the ` +
        `fallback **allowlist** — the generic extractor already handles it, so a custom source ` +
        `isn't needed.\n\n` +
        `See the host classifier in \`extension/config.js\`. ` +
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

// Decide how a request should be handled, and why. `lists` defaults (via the
// fallback policy) to the shipped config; tests pass their own.
// `openRequests` is the array of OTHER open extractor-request issues (for the
// duplicate check); omit it to skip that check.
async function runTriage({ body = "", title = "", number } = {}, lists, openRequests = []) {
  const { classifyHost } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "fallback-policy.js"))
  );

  const url = firstUrl(body) || firstUrl(title);
  const host = hostOf({ body, title });
  const waitSelector = waitSelectorOf(body);
  const currentNumber = Number.isInteger(Number(number)) ? Number(number) : undefined;

  // All the mode-aware names in one place. `mode === "supported"` means an
  // existing source already handles the host (resolve-source) — that's the top
  // precedence: we add a case to it rather than weigh allow/deny/dup at all.
  const names = planNames(url, currentNumber);

  const listing = classifyHost(url, lists); // "allow" | "deny" | "none"
  let reason = "";
  let duplicateOf = null;
  if (names.mode === "supported") reason = "supported";
  else if (listing === "deny") reason = "deny";
  else if (listing === "allow") reason = "allow";
  else if ((duplicateOf = earlierDuplicate(host, currentNumber, openRequests))) reason = "sample";

  // deny / allow / sample CLOSE the request; supported and no-match PROCEED to the
  // probe + Phase 1 (supported mode adds a case, no-match scaffolds a new source).
  const skipAgent = reason === "deny" || reason === "allow" || reason === "sample";

  return {
    url,
    host,
    waitSelector,
    slug: names.slug,
    mode: names.mode,
    sourceBase: names.sourceBase,
    caseName: names.caseName,
    branch: names.branch,
    sourcePath: names.sourcePath,
    casePath: names.casePath,
    listing,
    reason,
    duplicateOf,
    skipAgent,
    message: skipAgent ? skipMessage(reason, { host, duplicateOf }) : "",
  };
}

module.exports = { firstUrl, waitSelectorOf, runTriage };

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
    if (res.skipAgent) {
      fs.writeFileSync(MESSAGE_PATH, res.message);
      const detail =
        res.reason === "sample" ? `extra sample for #${res.duplicateOf}` : `on the ${res.reason}list`;
      console.log(`Auto-triaged: ${res.host || res.url} (${detail}) — closing, no agent run.`);
    } else {
      console.log(
        res.url
          ? `Proceeding for ${res.host || res.url} in ${res.mode} mode (case ${res.caseName}).`
          : "No URL found in the issue — proceeding to the agent."
      );
    }
    // When it proceeds (skipAgent=false), the mode-aware names feed the probe +
    // Phase-1 steps: `mode` (new|supported) decides whether Phase 1 scaffolds a
    // new source or just a case; `sourcePath`/`casePath`/`branch`/`caseName` name
    // the files. Empty when the body had no parseable URL — the probe step then
    // stops the run. `leader` is the issue a "sample" defers to (else "").
    writeOutputs({
      skipAgent: res.skipAgent,
      reason: res.reason,
      mode: res.mode,
      url: res.url,
      host: res.host,
      waitSelector: res.waitSelector,
      slug: res.slug,
      sourceBase: res.sourceBase,
      caseName: res.caseName,
      branch: res.branch,
      sourcePath: res.sourcePath,
      casePath: res.casePath,
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
