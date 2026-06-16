// Fallback-vs-custom extraction coverage: measures what the GENERIC fallback
// extractor (pipeline/extract-unsupported.js) recovers on each integration-test
// page, relative to that page's dedicated per-site source (the ground truth).
//
// For every test/integration/cases/*.json page we run GCal.extract() twice
// against the same cached HTML (data/<name>.html):
//   - custom:   the normal pipeline, with the matching site source registered.
//               This is the reviewed-correct extraction (test/integration/
//               live.test.js pins it to the case's `expected`).
//   - fallback: the SAME pipeline with GCal.sources emptied, which forces the
//               unsupported-host path (assemble-events.js -> fallbackEvents),
//               exactly as docs/claude/testing.md describes for inspecting the
//               generic extractor on a supported page.
//
// We then grade, field by field, how close the fallback's PRIMARY event
// (events[0] after the pipeline's own chronological sort) comes to the custom
// primary event, and separately track how many events each found (the fallback
// can't enumerate a listing page the way a dedicated source can). The result
// feeds two consumers: test/integration/fallback-coverage.test.js (the
// high-watermark gate) and the human-readable docs/fallback-coverage.md report.
//
// This file owns the comparison logic only; it reads the same generated
// load-order the popup injects and the harness uses, so it exercises the real,
// unmodified pipeline.
"use strict";

const { readFileSync, readdirSync, existsSync } = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const CASES_DIR = path.join(ROOT, "test/integration/cases");
const DATA_DIR = path.join(ROOT, "data");

// The seven normalized event fields GCal.extract() returns (see
// pipeline/assemble-events.js's norm()). CRITICAL is the subset the popup
// requires before it will surface a fallback event at all (title + location +
// start — see ui/popup.js's chooseContent / config.js).
const ALL_FIELDS = ["title", "start", "end", "location", "ctz", "eventLengthInMinutes", "description"];
const CRITICAL_FIELDS = ["title", "start", "location"];

// Load the pipeline files once, in the generated injection order (the single
// source of truth the popup and harness both read).
const SOURCES = (() => {
  const files = JSON.parse(readFileSync(path.join(ROOT, "pipeline/load-order.generated.json"), "utf8"));
  return files.map((file) => readFileSync(path.join(ROOT, file), "utf8"));
})();

// Run the real pipeline against `html` loaded at `url`. With clearSources the
// site registry is emptied after load so GCal.extract() takes the unsupported
// (fallback) path. Serializes inside the jsdom realm so the caller gets a plain
// object (no cross-realm array surprises).
function runExtract(html, url, clearSources) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  try {
    for (const src of SOURCES) dom.window.eval(src);
    if (clearSources) dom.window.eval("GCal.sources = [];");
    return JSON.parse(dom.window.eval("JSON.stringify(GCal.extract())"));
  } finally {
    dom.window.close();
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "(unknown)";
  }
}

const str = (v) => (v == null ? "" : String(v));

// --- Date equivalence -------------------------------------------------------
// A dedicated source localizes a known-timezone event to a FLOATING wall-clock
// plus a ctz; the fallback (no ctz) keeps the absolute instant. These are the
// same moment in different clothes, and docs/claude/testing.md says not to
// treat that representation gap as a miss. So start/end count as a match when
// EITHER the raw strings are equal (the dedicated source only added a ctz, e.g.
// bandsintown) OR both values resolve to the same absolute instant (e.g.
// "...T09:00:00" + ctz vs "...T09:00:00+03:00"). A fallback value that can't be
// anchored to the custom instant (a floating time read an hour off because the
// page's UTC time was kept unzoned, or a date-only value that lost the time) is
// correctly a miss.
function tzOffsetMs(tz, instant) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(instant));
  } catch (e) {
    return null; // unresolvable zone
  }
  const g = (t) => Number((parts.find((p) => p.type === t) || {}).value);
  const localAsUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return localAsUTC - instant;
}

function toInstant(value, ctz) {
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  // Floating wall-clock: only anchorable to an instant if we know the zone.
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m || !ctz) return null;
  const asUTC = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  const off = tzOffsetMs(ctz, asUTC);
  return off == null ? null : asUTC - off;
}

function datesMatch(customVal, customCtz, fbVal, fbCtz) {
  if (customVal === fbVal) return true;
  const ci = toInstant(customVal, customCtz);
  const fi = toInstant(fbVal, fbCtz);
  return ci != null && fi != null && ci === fi;
}

// Grade one field of the custom primary event against the fallback primary
// event. Returns "match" | "diff" | "miss"; only "match" counts as a hit.
// (The caller decides gradeability: a field the custom event left empty is
// not graded at all.)
function gradeField(field, customEvent, fallbackEvent) {
  const cv = str(customEvent[field]);
  const fv = str(fallbackEvent ? fallbackEvent[field] : "");
  if (!fv) return "miss";
  const ok =
    field === "start" || field === "end"
      ? datesMatch(cv, str(customEvent.ctz), fv, str(fallbackEvent.ctz))
      : cv === fv;
  return ok ? "match" : "diff";
}

// --- Coverage computation ---------------------------------------------------
function computeCoverage() {
  const caseFiles = readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const cases = [];
  for (const file of caseFiles) {
    const name = path.basename(file, ".json");
    const urlPath = path.join(DATA_DIR, `${name}.url`);
    const htmlPath = path.join(DATA_DIR, `${name}.html`);
    if (!existsSync(urlPath) || !existsSync(htmlPath)) continue;
    const url = readFileSync(urlPath, "utf8").trim();
    const html = readFileSync(htmlPath, "utf8");

    const custom = runExtract(html, url, false);
    const fallback = runExtract(html, url, true);
    const c0 = (custom.events || [])[0] || {};
    const f0 = (fallback.events || [])[0] || null;

    const cells = {};
    let criticalHits = 0;
    let criticalGradeable = 0;
    let allHits = 0;
    let allGradeable = 0;
    for (const field of ALL_FIELDS) {
      const gradeable = Boolean(str(c0[field]));
      const state = gradeable ? gradeField(field, c0, f0) : "na";
      cells[field] = { state, custom: str(c0[field]), fallback: str(f0 ? f0[field] : "") };
      if (gradeable) {
        allGradeable++;
        if (state === "match") allHits++;
        if (CRITICAL_FIELDS.includes(field)) {
          criticalGradeable++;
          if (state === "match") criticalHits++;
        }
      }
    }

    const customCount = (custom.events || []).length;
    const fallbackCount = (fallback.events || []).length;
    cases.push({
      name,
      host: hostOf(url),
      url,
      customCount,
      fallbackCount,
      eventsCovered: Math.min(fallbackCount, customCount),
      cells,
      criticalHits,
      criticalGradeable,
      allHits,
      allGradeable,
    });
  }

  // Aggregate by field type (which fields the fallback reproduces well/poorly).
  const byField = {};
  for (const field of ALL_FIELDS) {
    byField[field] = { field, gradeable: 0, match: 0, diff: 0, miss: 0 };
  }
  for (const c of cases) {
    for (const field of ALL_FIELDS) {
      const state = c.cells[field].state;
      if (state === "na") continue;
      byField[field].gradeable++;
      byField[field][state]++;
    }
  }

  // Aggregate by host and overall.
  const hosts = {};
  const totals = {
    criticalHits: 0,
    criticalGradeable: 0,
    allHits: 0,
    allGradeable: 0,
    customEvents: 0,
    eventsCovered: 0,
  };
  for (const c of cases) {
    const h = (hosts[c.host] = hosts[c.host] || {
      host: c.host,
      caseCount: 0,
      criticalHits: 0,
      criticalGradeable: 0,
      allHits: 0,
      allGradeable: 0,
      customEvents: 0,
      eventsCovered: 0,
    });
    for (const key of ["criticalHits", "criticalGradeable", "allHits", "allGradeable"]) {
      h[key] += c[key];
      totals[key] += c[key];
    }
    h.caseCount++;
    h.customEvents += c.customCount;
    h.eventsCovered += c.eventsCovered;
    totals.customEvents += c.customCount;
    totals.eventsCovered += c.eventsCovered;
  }

  const scores = {
    criticalFieldsPct: pct(totals.criticalHits, totals.criticalGradeable),
    allFieldsPct: pct(totals.allHits, totals.allGradeable),
    eventCoveragePct: pct(totals.eventsCovered, totals.customEvents),
  };

  return { cases, hosts, byField, totals, scores };
}

// Percentage rounded to one decimal. Used for both display and the gate, so the
// stored watermark and the asserted value round identically.
function pct(hits, gradeable) {
  if (!gradeable) return 0;
  return Math.round((hits / gradeable) * 1000) / 10;
}

// --- Markdown report --------------------------------------------------------
// Short, single-line column labels for the per-exemplar matrix.
const FIELD_LABELS = {
  title: "title",
  start: "start",
  end: "end",
  location: "loc",
  ctz: "ctz",
  eventLengthInMinutes: "len",
  description: "desc",
};
const STATE_SYMBOL = { match: "✓", diff: "~", miss: "✗", na: "—" };

// One-line, table-safe rendering of a field value (collapse newlines, escape
// pipes, truncate). Used only in the human-readable report.
function cell(value, max = 48) {
  let s = str(value).replace(/\s*\n\s*/g, " ⏎ ").replace(/\|/g, "\\|").trim();
  if (s.length > max) s = s.slice(0, max - 1) + "…";
  return s || "—";
}

function renderMarkdown(cov, watermark) {
  const L = [];
  L.push("# Fallback extractor coverage");
  L.push("");
  L.push(
    "> **Auto-generated** by `test/integration/fallback-coverage.test.js` " +
      "(logic in `test/fallback-coverage.js`). Do not hand-edit — it is rewritten " +
      "whenever the tests run locally. See `docs/claude/testing.md`."
  );
  L.push("");
  L.push(
    "What the generic **fallback** extractor (`pipeline/extract-unsupported.js`) " +
      "recovers on each integration-test page, compared to that page's **dedicated " +
      "per-site source** — the reviewed-correct extraction the live test pins down. " +
      "For every `test/integration/cases/*.json` page, `GCal.extract()` is run twice " +
      "on the same cached HTML: once normally (custom) and once with the site " +
      "registry emptied (fallback). We grade the fallback's **primary event** " +
      "(`events[0]` after the chronological sort) field-by-field against the custom " +
      "primary event, counting a field only when the custom event filled it."
  );
  L.push("");
  L.push(
    "`start`/`end` count as a match when the values are byte-identical **or** resolve " +
      "to the same absolute instant — a dedicated source localizing to a floating " +
      "time via its `ctz` is the same moment as the fallback's offset-bearing time, " +
      "not a miss (see `docs/claude/testing.md`). A floating time read an hour off, " +
      "or a date that dropped its time, is a real miss."
  );
  L.push("");

  // Score / gate
  L.push("## Score");
  L.push("");
  L.push("| Metric | Coverage | Hits / gradeable | Watermark (gate) |");
  L.push("| --- | --: | --: | --: |");
  L.push(
    `| **Critical fields** (title + start + location) | **${cov.scores.criticalFieldsPct}%** | ` +
      `${cov.totals.criticalHits} / ${cov.totals.criticalGradeable} | ${fmtWm(watermark, "criticalFieldsPct")} |`
  );
  L.push(
    `| **All fields** | **${cov.scores.allFieldsPct}%** | ${cov.totals.allHits} / ${cov.totals.allGradeable} | ` +
      `${fmtWm(watermark, "allFieldsPct")} |`
  );
  L.push(
    `| Event coverage *(informational)* | ${cov.scores.eventCoveragePct}% | ${cov.totals.eventsCovered} / ${cov.totals.customEvents} | — |`
  );
  L.push("");
  L.push(
    "The two **field** percentages are gated by " +
      "`test/integration/fallback-coverage.baseline.json`: the test fails if either " +
      "drops below its stored high-watermark, and ratchets the watermark up (locally) " +
      "when it improves. Event coverage — events the fallback found vs. the dedicated " +
      "source — is reported but not gated; it is dominated by a few listing pages the " +
      "fallback can't enumerate."
  );
  L.push("");

  // By field type
  L.push("## By field type");
  L.push("");
  L.push("| Field | Gradeable | ✓ match | ~ diff | ✗ miss | Match % |");
  L.push("| --- | --: | --: | --: | --: | --: |");
  for (const field of ALL_FIELDS) {
    const f = cov.byField[field];
    const crit = CRITICAL_FIELDS.includes(field) ? " **(critical)**" : "";
    L.push(
      `| \`${field}\`${crit} | ${f.gradeable} | ${f.match} | ${f.diff} | ${f.miss} | ${pct(f.match, f.gradeable)}% |`
    );
  }
  L.push("");

  // By host
  L.push("## By host");
  L.push("");
  L.push("| Host | Cases | Events found (fb/custom) | Critical % | All % |");
  L.push("| --- | --: | --: | --: | --: |");
  for (const h of Object.values(cov.hosts).sort((a, b) => a.host.localeCompare(b.host))) {
    L.push(
      `| \`${h.host}\` | ${h.caseCount} | ${h.eventsCovered}/${h.customEvents} | ` +
        `${pct(h.criticalHits, h.criticalGradeable)}% | ${pct(h.allHits, h.allGradeable)}% |`
    );
  }
  L.push("");

  // By exemplar (matrix)
  L.push("## By exemplar");
  L.push("");
  L.push("Legend: ✓ match · ~ different value · ✗ missing (source had it, fallback didn't) · — source left it empty");
  L.push("");
  const head = ["Case", "Events fb/custom", ...ALL_FIELDS.map((f) => FIELD_LABELS[f])];
  L.push(`| ${head.join(" | ")} |`);
  L.push(`| ${head.map((_, i) => (i < 2 ? "---" : ":-:")).join(" | ")} |`);
  for (const c of cov.cases) {
    const row = [`\`${c.name}\``, `${c.fallbackCount}/${c.customCount}`];
    for (const field of ALL_FIELDS) row.push(STATE_SYMBOL[c.cells[field].state]);
    L.push(`| ${row.join(" | ")} |`);
  }
  L.push("");

  // Notable differences (the "summary of differences" the report is for)
  L.push("## Notable differences");
  L.push("");
  L.push(
    "Fields where the fallback produced a value that **differs** from the dedicated " +
      "source (a wrong/weaker value, not merely a missing one) — the cases worth a look:"
  );
  L.push("");
  let any = false;
  for (const c of cov.cases) {
    const diffs = ALL_FIELDS.filter((f) => c.cells[f].state === "diff");
    if (!diffs.length) continue;
    any = true;
    L.push(`- **\`${c.name}\`**`);
    for (const f of diffs) {
      L.push(`  - \`${f}\` — custom: \`${cell(c.cells[f].custom)}\` · fallback: \`${cell(c.cells[f].fallback)}\``);
    }
  }
  if (!any) L.push("_None._");
  L.push("");

  return L.join("\n");
}

function fmtWm(watermark, key) {
  return watermark && typeof watermark[key] === "number" ? `${watermark[key]}%` : "—";
}

module.exports = { computeCoverage, renderMarkdown, ALL_FIELDS, CRITICAL_FIELDS, pct };
