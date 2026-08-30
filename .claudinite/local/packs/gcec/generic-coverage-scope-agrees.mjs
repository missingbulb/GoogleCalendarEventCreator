// gcec local check: the generic-coverage routine's file scope is spelled the same
// in the two places that enforce it.
//
// THE TWO PLACES, and why the copy is forced. The routine may leave exactly four
// paths changed (the generic extractor, its helpers, the covering test, the
// regenerated generic-coverage artifacts), and two independent gates hold it to
// that set:
//
//   tasks/generic-extractor-improvements/postconditions.sh — `allowed=`, an ERE
//     the run itself executes before it may open a PR. Bash, run in the checkout.
//   merge-rules.json — `generic-coverage-scope`'s `pathMatching`, which the
//     canon's auto-merge policy engine re-measures against the pushed diff before
//     the queued merge fires. JSON data, read by the engine.
//
// A shell literal and a JSON regex string cannot share a constant, and neither
// gate may import the other: the postcondition runs where no engine is loaded,
// and the policy engine judges a branch it never checked out. So the literal is
// written twice, byte-for-byte, and this check is what keeps the two honest — a
// scope widened in one place and not the other silently lets a diff the routine's
// own postcondition rejects sail through the merge gate, or park a diff it
// accepted.
//
// Only the PATH SET is compared. `changeKinds` deliberately omits `deleted`: the
// postcondition tolerates a deletion inside the scope, the merge policy does not,
// and that asymmetry is a decision (an unreviewed deletion parks) rather than
// drift.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'generic-coverage-scope-agrees';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';
const why =
  'the two gates that hold the generic-coverage routine to its file scope read separate copies of ' +
  'the same pattern — one widened alone silently lets an out-of-scope diff auto-merge';

const RULES_FILE = '.claudinite/local/packs/gcec/merge-rules.json';
const POSTCONDITIONS = '.claudinite/local/packs/gcec/tasks/generic-extractor-improvements/postconditions.sh';
const RULE_NAME = 'generic-coverage-scope';

// The `/body/flags` form the policy engine parses, reduced to its body. Greedy on
// purpose: the delimiter is the LAST slash, so an unescaped `/` inside the pattern
// (which is what makes the body comparable to the shell's) is not a delimiter.
const regexBody = (raw) => (/^\/(.*)\/([a-z]*)$/s.exec(String(raw ?? ''))?.[1] ?? null);

export default {
  id,
  severity,
  description: "the generic-coverage routine's scope pattern is identical in postconditions.sh and merge-rules.json",
  doc,
  why,

  run(ctx) {
    const rulesText = ctx.read(RULES_FILE);
    const shellText = ctx.read(POSTCONDITIONS);
    // Neither file present is not this check's business: a repo that carries no
    // routine has no scope to agree on, and a half-present pair is reported by
    // whichever gate is missing its own file.
    if (!rulesText || !shellText) return [];

    let declared = null;
    try {
      declared = (JSON.parse(rulesText) ?? []).find((r) => r?.name === RULE_NAME) ?? null;
    } catch {
      // A broken merge-rules.json fails every policy that names its rules, loudly,
      // where the policy is evaluated. Nothing to add here.
      return [];
    }
    if (!declared) return [];

    const fromRules = regexBody(declared.pathMatching);
    const fromShell = /^allowed='(.*)'$/m.exec(shellText)?.[1] ?? null;
    if (fromShell === null) {
      return [{
        rule: id, severity, file: POSTCONDITIONS, line: null,
        what: `${POSTCONDITIONS} declares no single-line \`allowed='…'\` scope pattern for this check to compare`,
        why,
        fix: `keep the scope pattern on one \`allowed='…'\` line, so ${RULES_FILE}'s copy can be checked against it`,
        doc,
      }];
    }
    if (fromRules === fromShell) return [];

    return [{
      rule: id, severity, file: RULES_FILE, line: null,
      what: `${RULE_NAME}'s pathMatching and ${POSTCONDITIONS}'s \`allowed=\` describe different file sets`,
      why,
      fix: `make the two literals identical — ${RULE_NAME}.pathMatching is \`/\` + the \`allowed=\` value + \`/\`.\n`
        + `  postconditions.sh: ${fromShell}\n`
        + `  merge-rules.json:  ${fromRules ?? '(not a /pattern/ regex string)'}`,
      doc,
    }];
  },
};
