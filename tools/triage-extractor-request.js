// Pre-flight triage for the Auto-implement-extractor workflow
// (.github/workflows/auto-implement-extractor.yml). Before spending an agent
// run, decide whether the requested host was already triaged — i.e. it's on
// config.js's sourceFallbackAllowlist or sourceFallbackDenylist. If so, the
// workflow closes the issue and skips the agent entirely.
//
// Reuses fallback-policy.js's classifyHost (the same classifier the popup uses),
// so the workflow and the popup can never disagree about a host's listing —
// config.js's lists stay the single source of truth.
//
// As a script (run by the workflow):
//   in  (env): ISSUE_BODY, ISSUE_TITLE  — the issue's raw body/title
//   out (GITHUB_OUTPUT): hostInAllowList=true|false, hostInDenyList=true|false
//   out (file, when either is true): /tmp/triage-message.md — the closing comment
// As a module (the tests): exports firstUrl() and runTriage().
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const MESSAGE_PATH = "/tmp/triage-message.md";

// The first http(s) URL in some text. The request form makes the URL field
// required and lists it first, so the first URL in the body is the event page.
function firstUrl(text) {
  const m = (text || "").match(/https?:\/\/[^\s<>)"'\]]+/);
  return m ? m[0] : "";
}

function closingComment(host, listing) {
  const reason =
    listing === "deny"
      ? `\`${host}\` is on the fallback **denylist** — we deliberately don't extract events there, ` +
        `so a custom source won't be added.`
      : `\`${host}\` is on the fallback **allowlist** — the generic extractor already handles it, ` +
        `so a custom source isn't needed.`;
  return (
    `This request was auto-triaged and closed without an agent run: ${reason}\n\n` +
    `See the host classifier in \`config.js\` and the policy in \`docs/extraction-policy.md\`. ` +
    `If you think this is wrong, comment and a maintainer can revisit.`
  );
}

// Decide whether a request is already handled by the allow/deny lists. `lists`
// defaults (via classifyHost) to the shipped config; tests pass their own.
async function runTriage({ body = "", title = "" } = {}, lists) {
  const { classifyHost } = await import(
    pathToFileURL(path.join(__dirname, "..", "fallback-policy.js"))
  );

  const url = firstUrl(body) || firstUrl(title);
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    /* no/!http(s) URL — leave host empty */
  }

  const listing = classifyHost(url, lists); // "allow" | "deny" | "none"
  const triaged = listing === "allow" || listing === "deny";
  return { url, host, listing, triaged, message: triaged ? closingComment(host, listing) : "" };
}

module.exports = { firstUrl, runTriage };

// CLI: read the issue from the env, emit the decision for the workflow. Fails
// OPEN — any error proceeds to the agent rather than silently dropping a real
// request.
if (require.main === module) {
  (async () => {
    const res = await runTriage({ body: process.env.ISSUE_BODY, title: process.env.ISSUE_TITLE });
    if (res.triaged) {
      fs.writeFileSync(MESSAGE_PATH, res.message);
      console.log(`Auto-triaged: ${res.host} is on the ${res.listing}list — skipping the agent run.`);
    } else {
      console.log(
        res.url
          ? `No triage match for ${res.host || res.url} — proceeding to the agent.`
          : "No URL found in the issue — proceeding to the agent."
      );
    }
    writeOutputs({ hostInAllowList: res.listing === "allow", hostInDenyList: res.listing === "deny" });
  })().catch((e) => {
    console.error("Triage check errored — proceeding to the agent (fail open):", e);
    writeOutputs({ hostInAllowList: false, hostInDenyList: false });
  });

  function writeOutputs(outputs) {
    if (!process.env.GITHUB_OUTPUT) return;
    const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v}`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
  }
}
