// gcec local check: the project's one page-fetching surface (scraperapi.mjs) is
// usable only from a task's `agent_preprocessing` worker, and the task that uses
// it must NAME the secret that surface needs. The rule this converts is
// RULES.md's "Extractor pipeline" bullet: "All page fetching goes through
// scraperapi.mjs, from a task's preprocessing worker and nowhere else … the
// escape hatch is the SCRAPER_API_KEY GitHub Actions secret, named in both
// tasks' required_secrets — never a local fetch (this sandbox is bot-blocked),
// and never an agent session."
//
// Why a check and not just prose: this is a two-files-must-agree invariant whose
// halves sit in different files and whose breakage is invisible until it runs in
// Actions, hours later. A worker imports the surface; the SECRET that makes the
// surface work is declared in the task's OWN task.mjs (`required_secrets`), and
// only from there does the wiring converge stamp it into the scheduler workflow.
// Import without declaring and everything looks fine — the module loads, the unit
// tests pass, the precondition is green — and then the scheduled run dies on
// `SCRAPER_API_KEY is not set` in a worker nobody is watching. The same silence
// covers the other direction: an importer OUTSIDE a task directory (a dev script,
// an agent session's helper) can never hold a repo secret at all, and this sandbox
// is bot-blocked, so a "local fetch" fails for two reasons at once and looks like
// a broken page rather than a broken place to fetch from.
//
// RULES.md's own claim that the secret is "named in both tasks' required_secrets"
// was already drifting when this check landed — only create-extractor declares it,
// because only create-extractor still fetches. That drift is exactly the reason
// the invariant belongs in a mechanism instead of a sentence: the check follows
// the importers around instead of asserting a count that ages.
//
// A TASK IS FOUND BY ITS DECLARATION, never by a hardcoded pack path: an importer's
// owning task is the nearest ancestor directory holding a `task.mjs`
// (per-project-scheduling §1's shape). So this keeps working if the pack, or the
// tasks/ tree inside it, is ever moved.
//
// SCOPE, stated honestly: this catches use of the DECLARED surface — a file that
// imports `scraperapi.mjs`. A hand-rolled `fetch()` of an event page straight to
// some other vendor is not detectable statically (a page URL looks like any other
// URL), and stays the reader's job — which is why the RULES.md bullet stays whole
// beside this check rather than being deleted: it also carries the render=true
// requirement, the wait-for-selector aid, the bot-blocking rationale, and the
// instruction to swap the vendor inside that one module.
//
// TESTS ARE EXEMPT. The surface's own test imports it to exercise the URL builder
// and never fetches, so a `test/` file neither needs a secret nor implies its task
// does.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'page-fetch-worker-only';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';
const why =
  'the page-fetching surface needs the SCRAPER_API_KEY Actions secret, which reaches a ' +
  "task's preprocessing worker and nothing else — an undeclared secret, or an importer " +
  'outside a task, fails only at run time in Actions with nobody watching';

// The one declared page-fetching module, matched by basename so it is found
// through any relative specifier. Swapping the vendor edits this module's
// contents and keeps its name (RULES.md: "swap the vendor in that one module").
const SURFACE = 'scraperapi.mjs';
const SECRET = 'SCRAPER_API_KEY';
const TASK_DECL = 'task.mjs';

const CODE = /\.(mjs|cjs|js)$/;
const isTest = (p) => p.includes('/test/') || /\.test\.(mjs|cjs|js)$/.test(p);

// Import/require SPECIFIERS only — the structural spot the rule means. Grepping
// the file's text for "scraperapi.mjs" would also hit every comment that cites
// the module by name (prepare.mjs has one), which is documentation, not use.
const SPECIFIER = /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)(['"])([^'"\n]+)\1/g;

function importsSurface(src) {
  SPECIFIER.lastIndex = 0;
  for (let m = SPECIFIER.exec(src); m; m = SPECIFIER.exec(src)) {
    if (m[2].split('/').pop() === SURFACE) return m[2];
  }
  return null;
}

// The nearest ancestor directory that declares a task. Probed with ctx.exists so a
// --changed run (where ctx.files holds only the changed files) still resolves it.
function owningTaskDecl(file, ctx) {
  const parts = file.split('/');
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const decl = `${parts.slice(0, i).join('/')}/${TASK_DECL}`;
    if (ctx.exists(decl)) return decl;
  }
  return null;
}

// A scoped parse of the declaration object rather than a text grep: both keys are
// matched only as a real key at the start of a line, so a `//` comment that talks
// ABOUT required_secrets (create-extractor's task.mjs has a five-line one) can
// never answer for the declaration itself.
const declares = (src, key) => new RegExp(`^\\s*${key}\\s*:`, 'm').test(src);
function requiredSecrets(src) {
  const m = /^\s*required_secrets\s*:\s*\[([^\]]*)\]/m.exec(src);
  return m ? m[1] : null;
}

export default {
  id,
  severity,
  description: 'the page-fetching surface is imported only by a task preprocessing worker whose task declares SCRAPER_API_KEY',
  doc,
  why,

  run(ctx) {
    const findings = [];
    const reported = new Set(); // one finding per task declaration, not per importer
    // ctx.files is the whole repo under the engine's default `all` sweep; a
    // --changed run narrows it, which only ever under-reports.
    for (const file of ctx.files) {
      if (!CODE.test(file) || isTest(file)) continue;
      if (file.split('/').pop() === SURFACE) continue; // the surface itself
      const src = ctx.read(file);
      if (!src) continue;
      const spec = importsSurface(src);
      if (!spec) continue;

      const decl = owningTaskDecl(file, ctx);
      if (!decl) {
        findings.push({
          rule: id, severity, file, line: null,
          what: `${file} imports the page-fetching surface (${spec}) from outside any task directory`,
          why,
          fix:
            `move the fetch into a task's \`agent_preprocessing\` worker (a directory with a ${TASK_DECL} ` +
            `beside it) — ${SECRET} is a repo Actions secret that reaches a worker and nothing else, so a ` +
            'local script or an agent session has no key, and this sandbox is bot-blocked besides',
          doc,
        });
        continue;
      }

      const declSrc = ctx.read(decl);
      if (!declSrc) continue; // unreadable declaration — the scheduler's own schema check owns that

      if (!declares(declSrc, 'agent_preprocessing') && !reported.has(`pre:${decl}`)) {
        reported.add(`pre:${decl}`);
        findings.push({
          rule: id, severity, file: decl, line: null,
          what: `${file} imports the page-fetching surface, but ${decl} declares no agent_preprocessing worker`,
          why,
          fix:
            `declare \`agent_preprocessing: '<worker>'\` in ${decl} so the fetch runs Action-side, or move the ` +
            'fetch into a task that has one — the agent stage and the precondition may never fetch a page',
          doc,
        });
      }

      const secrets = requiredSecrets(declSrc);
      if ((secrets === null || !secrets.includes(SECRET)) && !reported.has(`sec:${decl}`)) {
        reported.add(`sec:${decl}`);
        findings.push({
          rule: id, severity, file: decl, line: null,
          what: `${file} imports the page-fetching surface, but ${decl} does not name ${SECRET} in required_secrets`,
          why,
          fix:
            `add '${SECRET}' to required_secrets in ${decl} — the wiring converge stamps a DECLARED secret into ` +
            `the scheduler workflow, and only then does the worker read it; undeclared, the run dies on ` +
            `"${SECRET} is not set" in Actions`,
          doc,
        });
      }
    }
    return findings;
  },
};
