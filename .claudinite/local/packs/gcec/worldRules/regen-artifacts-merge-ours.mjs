// gcec local check: every artifact `npm run regen` rewrites carries a `merge=ours`
// entry in .gitattributes. The rule this converts is RULES.md's regen bullet —
// the `ours` driver's file set is "kept in sync with `.gitattributes`" — and
// .gitattributes' own header states the mechanism: on a conflicting merge the
// driver keeps one side automatically, you rerun the generator, and there is
// nothing to resolve by hand.
//
// Why a check and not just prose: the set of regen artifacts GROWS ON ITS OWN.
// Requirement kinds are auto-discovered (dev/requirements/shared/kinds.js — "adding
// a kind is a self-contained folder drop"), so a new `image` kind starts committing
// baselines under dev/requirements/<kind>/cases/*.png with nobody editing a list
// anywhere. .gitattributes, meanwhile, names popup/ and icon/ literally. The new
// kind's PNGs are then off the driver, and nothing says so: every suite stays
// green, `npm run regen` keeps working, and the omission only surfaces later as a
// merge conflict on a BINARY file that git cannot 3-way merge at all — the one
// conflict a human genuinely cannot resolve, hit at the worst moment (mid-merge).
// That gap between an auto-discovered producer and a hand-kept list is exactly
// what a static scan is for.
//
// SCOPE, and how it divides with the canon: the canon's basics/generated-merge-driver
// rule already covers files whose name carries `GENERATED` (this repo's
// generic-coverage.baseline.GENERATED.json / generic-coverage.GENERATED.md). It
// matches that marker case-sensitively, so it sees neither this repo's
// lowercase-`.generated.` artifact (load-order.generated.json) nor the snapshot
// PNGs, which carry no marker in their names at all. This check takes exactly that
// remainder — the repo's own regen outputs the canon marker doesn't name — so the
// two never double-report the same file.
//
// Only the "artifact with no entry" direction is checked. A leftover entry for a
// renamed artifact is cosmetic (the renamed file trips this check under its new
// path), and matching globs against a file list would false-positive under a
// --changed run, where that list is narrowed. Under-reporting is the safe error.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'regen-artifacts-merge-ours';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';
const why =
  'a regen artifact off the `ours` driver hits a hand-resolved merge conflict — and the UI ' +
  'baselines are binary PNGs git cannot 3-way merge at all';

// A UI-snapshot baseline: dev/requirements/<kind>/cases/<case>.png, for ANY kind,
// because kinds are auto-discovered and a new image kind must not need this check
// edited to be covered.
const CASE_SNAPSHOT = /^dev\/requirements\/[^/]+\/cases\/[^/]+\.png$/;

// A generated artifact named with the lowercase `.generated.` convention. The
// uppercase GENERATED marker is the canon rule's half of the set, excluded here so
// one file never yields two findings.
function isLowercaseGenerated(file) {
  const base = file.split('/').pop();
  return /\.generated\./.test(base) && !base.includes('GENERATED');
}

// .gitattributes patterns are gitignore-style: `*` and `?` do not cross a `/`,
// `**` does, and a pattern containing no `/` matches by basename at any depth.
function globToRe(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
      } else {
        out += '[^/]*';
      }
      continue;
    }
    if (ch === '?') {
      out += '[^/]';
      continue;
    }
    out += ch.replace(/[.+^${}()|[\]\\]/, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

function oursPatterns(text) {
  return (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && /\bmerge=ours\b/.test(l))
    .map((l) => l.split(/\s+/)[0].replace(/^\/+/, ''))
    .map((pattern) => ({ pattern, re: globToRe(pattern), byBasename: !pattern.includes('/') }));
}

export default {
  id,
  severity,
  description: 'every `npm run regen` artifact has a merge=ours entry in .gitattributes',
  doc,
  why,

  run(ctx) {
    // allFiles, not files: this rule reasons ABOUT generated artifacts, so it must
    // still see them if the repo ever marks them linguist-generated (which the
    // engine otherwise drops from ctx.files) — the same reason the canon's
    // generated-merge-driver reads allFiles. Falls back to ctx.files for a context
    // that doesn't draw the distinction.
    const all = ctx.allFiles || ctx.files || [];
    const artifacts = all.filter((f) => CASE_SNAPSHOT.test(f) || isLowercaseGenerated(f));
    if (!artifacts.length) return [];

    const patterns = oursPatterns(ctx.read('.gitattributes'));

    return artifacts
      .filter((file) => {
        const base = file.split('/').pop();
        return !patterns.some((p) => (p.byBasename ? p.re.test(base) : p.re.test(file)));
      })
      .map((file) => {
        // Suggest the shape the repo already uses: one line per snapshot DIRECTORY,
        // one line per generated file.
        const suggestion = CASE_SNAPSHOT.test(file)
          ? `${file.slice(0, file.lastIndexOf('/'))}/*.png`
          : file;
        return {
          rule: id,
          severity,
          file,
          line: null,
          what: `${file} is regenerated by \`npm run regen\` but has no merge=ours entry in .gitattributes`,
          why,
          fix: `add \`${suggestion} merge=ours\` to .gitattributes (beside the other regen artifacts), so a conflicting merge auto-resolves and you rerun the generator instead of hand-merging`,
          doc,
        };
      });
  },
};
