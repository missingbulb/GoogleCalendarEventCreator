// Fold a deferred extractor request's event URL into the LEADER issue's body as
// an extra "sample page" (see triage-extractor-request.js's "sample" disposition
// and auto-extractor.md). Two same-host requests can't run the agent
// concurrently, but the newer one's URL is a second real event page — useful raw
// material for a more robust extractor. So instead of discarding it, the prepare
// workflow records it on the leader issue as a checklist item a maintainer (the
// one reviewing the leader's PR) can turn into an extra integration case.
//
// The list lives as a marked block in the leader's issue body so the edit is
// idempotent: re-running with the same URL is a no-op, and a ticked box
// (- [ ] -> - [x]) isn't re-added. A marker block (not an append-only comment)
// is what lets us de-dupe.
//
// Pure/offline by design — the network read/write (gh issue view/edit) lives in
// the workflow, so this stays unit-testable with no I/O (same split as the
// triage script).
//
// As a module (the tests): exports addSample().
// As a script (the workflow):
//   in  (env):  ISSUE_BODY (leader's current body), SAMPLE_URL (URL to add)
//   out (stdout): the updated body, to pipe into `gh issue edit --body-file -`
"use strict";

const START = "<!-- additional-samples:start -->";
const END = "<!-- additional-samples:end -->";

const HEADING =
  "### Additional sample pages\n\n" +
  "Event pages from duplicate requests for this same site, folded in so the " +
  "extractor gets a second real integration case from each. Add one " +
  "`dev/requirements/extractor/expected/` case per URL, then tick it off:";

// A URL already listed in the block, on either a `- [ ]` or `- [x]` line, so a
// re-submission (or a re-run) doesn't double it.
function blockHasUrl(block, url) {
  return block.split("\n").some((line) => {
    const m = line.match(/^\s*-\s*\[[ xX]\]\s*(\S+)/);
    return m && m[1] === url;
  });
}

// Return `body` with `url` recorded in the additional-samples block, adding the
// block if it's absent. Idempotent: a URL already present (checked or not) is
// left as-is. A blank/missing url returns the body unchanged.
function addSample(body, url) {
  const base = typeof body === "string" ? body : "";
  if (!url) return base;

  const startAt = base.indexOf(START);
  const endAt = base.indexOf(END);

  // No block yet: append a fresh one with this URL as the first item.
  if (startAt === -1 || endAt === -1 || endAt < startAt) {
    const block = `${START}\n${HEADING}\n\n- [ ] ${url}\n${END}`;
    const sep = base && !base.endsWith("\n") ? "\n\n" : base ? "\n" : "";
    return `${base}${sep}${block}\n`;
  }

  // Block exists: de-dupe, else insert the new item just before the end marker.
  const block = base.slice(startAt, endAt);
  if (blockHasUrl(block, url)) return base;
  const before = base.slice(0, endAt).replace(/\n*$/, "\n");
  return `${before}- [ ] ${url}\n${base.slice(endAt)}`;
}

module.exports = { addSample };

if (require.main === module) {
  process.stdout.write(addSample(process.env.ISSUE_BODY || "", process.env.SAMPLE_URL || ""));
}
