// gcec local check: the shared extraction pipeline never names a site. The core
// generic extractor, the orchestrator, the registry and the shared helpers —
// everything under extension/event-extractors/ that is NOT custom/ — run on every
// page, so none of them may carry knowledge of one specific site. The rule this
// converts is RULES.md's "Architecture rules of the road": the generic extractor
// is the base layer of every extraction and "may never know about a specific
// site"; custom/ is the one place per-site knowledge lives (guarded from the
// other side by custom-sources-flat).
//
// Why a check and not just prose: a host-gated special case in shared code fails
// SILENTLY in the one place this repo automates a decision. The site it patches
// works, every suite stays green — and the generic-coverage gate then reports
// that site as gap-free, because the gap was hardcoded away rather than closed
// generically. RULES.md reads a no-gap site as "a candidate for deleting the
// per-site source and listing the host in supportedDomains", so the erosion
// doesn't just sit there: it feeds a wrong answer into the next decision, with
// nothing red anywhere. It also quietly ends the property the architecture is
// built to keep — adding a host is a single-file change.
//
// SCOPE, stated honestly: this catches the obvious carrier, a supported host
// named in shipped code. A site-specific hack keyed on something else (a
// selector only one site uses) is not detectable statically and stays the
// reader's job — which is why the architecture bullet in RULES.md stays whole
// beside this check rather than being deleted.
//
// The host list is READ from the repo, never hardcoded: extension/host-lists.json's
// `supportedDomains` is the one declaration of the hosts we claim (RULES.md:
// "Being supported is DECLARED"), so the check follows that list around instead
// of pinning a copy that would drift.
//
// COMMENTS ARE SKIPPED, deliberately. Naming the site where a generic pattern was
// observed is exactly how this codebase documents evidence — generic-extractor.js
// cites stubhub.com for a venue heuristic, derive-timezone.js cites eventer.co.il
// and visit.tel-aviv.gov.il, embedded-events.js cites livenation.de. Those are
// rationale, not site knowledge. Comments are blanked by a small scanner (not a
// regex) that tracks string literals, so a host inside a 'https://…' string is
// still code and still found.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'pipeline-site-agnostic';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';
const why =
  'the shared pipeline runs on every page — a host-gated special case there makes the ' +
  'generic-coverage gate report that site as gap-free when the gap was only hardcoded ' +
  'away, and every suite stays green while it happens';

const DIR = 'extension/event-extractors/';
const CUSTOM_DIR = `${DIR}custom/`;
const HOST_LIST = 'extension/host-lists.json';

// Blank every comment, keeping the file's exact length and line breaks so line
// numbers stay true. A hand-rolled scanner rather than a regex because `//`
// inside a string ('https://…') is not a comment and must not swallow the rest
// of the line — that is precisely where a host literal would hide.
function blankComments(src) {
  const out = [];
  let i = 0;
  const keep = (ch) => out.push(ch);
  const blank = (ch) => out.push(ch === '\n' ? '\n' : ' ');
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') blank(src[i++]);
      continue;
    }
    if (ch === '/' && next === '*') {
      blank(src[i++]);
      blank(src[i++]);
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) blank(src[i++]);
      if (i < src.length) {
        blank(src[i++]);
        blank(src[i++]);
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      keep(src[i++]);
      while (i < src.length) {
        if (src[i] === '\\') {
          keep(src[i++]);
          if (i < src.length) keep(src[i++]);
          continue;
        }
        if (src[i] === quote) {
          keep(src[i++]);
          break;
        }
        keep(src[i++]);
      }
      continue;
    }
    keep(src[i++]);
  }
  return out.join('');
}

// A host counts only as a whole label run: "notstubhub.com" is not stubhub.com,
// and inside "visit.tel-aviv.gov.il" the shorter "tel-aviv.gov.il" doesn't match
// on its own (the longer entry in the list does, and is reported instead).
const HOST_CHAR = /[A-Za-z0-9.-]/;
function namesHost(line, host) {
  let from = 0;
  for (;;) {
    const at = line.indexOf(host, from);
    if (at === -1) return false;
    const before = at === 0 ? '' : line[at - 1];
    const afterIndex = at + host.length;
    const after = afterIndex >= line.length ? '' : line[afterIndex];
    if (!HOST_CHAR.test(before) && !HOST_CHAR.test(after)) return true;
    from = at + 1;
  }
}

export default {
  id,
  severity,
  description: "the shared extraction pipeline names no supported site — per-site knowledge lives only in custom/",
  doc,
  why,

  run(ctx) {
    const raw = ctx.read(HOST_LIST);
    if (!raw) return [];
    let hosts;
    try {
      hosts = JSON.parse(raw).supportedDomains;
    } catch {
      return []; // a malformed host list breaks the extension's own tests first
    }
    if (!Array.isArray(hosts) || !hosts.length) return [];
    // Longest first, so a finding names visit.tel-aviv.gov.il rather than the
    // shorter entry it contains.
    const ordered = [...hosts].filter((h) => typeof h === 'string' && h).sort((a, b) => b.length - a.length);

    const findings = [];
    // ctx.files is the whole repo under the engine's default `all` sweep; a
    // --changed run narrows it, which only ever under-reports.
    for (const file of ctx.files) {
      if (!file.startsWith(DIR) || file.startsWith(CUSTOM_DIR)) continue;
      if (!file.endsWith('.js')) continue;
      const src = ctx.read(file);
      if (!src) continue;
      const lines = blankComments(src).split('\n');
      lines.forEach((line, index) => {
        const host = ordered.find((h) => namesHost(line, h));
        if (!host) return;
        findings.push({
          rule: id,
          severity,
          file,
          line: index + 1,
          what: `${file} names the supported site ${host} in shipped code`,
          why,
          fix:
            `move the ${host}-specific handling into extension/event-extractors/custom/<site>.js ` +
            '(the one extensibility point), or generalize it so the pipeline reads what the page ' +
            'says about itself with no host in the condition — citing a site in a COMMENT as ' +
            'evidence for a generic rule is fine and is not what this flags',
          doc,
        });
      });
    }
    return findings;
  },
};
