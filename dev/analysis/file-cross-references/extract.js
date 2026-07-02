#!/usr/bin/env node
// Extract cross-file references that live in COMMENTS (and doc prose / @imports /
// html asset refs). An edge A->B is recorded only when a path-like token found in
// A's comment region resolves to a real tracked repo file B. That resolution step
// is the filter that drops URLs, issue numbers (#146), and npm packages.
//
// Usage:  node extract.js [out.json]     (default: refs.json next to this script)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
const trackedSet = new Set(tracked);

// basename -> [full paths]
const byBase = new Map();
for (const f of tracked) {
  const b = path.basename(f);
  if (!byBase.has(b)) byBase.set(b, []);
  byBase.get(b).push(f);
}
// set of tracked directories
const dirSet = new Set();
for (const f of tracked) {
  let d = path.dirname(f);
  while (d && d !== '.') { dirSet.add(d); d = path.dirname(d); }
}

const TEXT_EXT = new Set(['js','md','sh','py','css','html','yml','yaml']);

// Files excluded from the graph entirely (as referrer AND as target). The
// requirements gallery links to all ~120 case snapshots, forming a hub that
// swamps the real code-comment cross-references — excluded for signal.
const EXCLUDE = new Set([
  'dev/requirements/requirements.md',        // links to all ~120 case snapshots
  'dev/procedures/this_project/fileDescriptions.md', // a catalog that names every file
]);
// This analysis's own output is meta (report.md catalogs every reference) — never
// scan it or point edges at it, or it swamps the real repo signal.
const EXCLUDE_PREFIX = ['dev/analysis/'];

// Whole categories dropped from the graph (never a node, either direction):
//  - data/config/markup/image files (json, html, images),
//  - anything inside a testing folder (a path segment named `test`/`tests` or
//    ending in `-test`/`-tests`, e.g. extension-test/, dev/procedures/test/),
//  - per-requirement case files (*.case.js).
const IGNORE_EXT = new Set(['json','html','htm','png','jpg','jpeg','gif','svg','webp','ico','bmp']);
const inTestFolder = f => f.split('/').slice(0, -1).some(seg => seg === 'test' || seg === 'tests' || /-tests?$/.test(seg));
const isCaseFile = f => /\.case\.js$/.test(f);
const isExcluded = f =>
  EXCLUDE.has(f) ||
  EXCLUDE_PREFIX.some(p => f.startsWith(p)) ||
  IGNORE_EXT.has(f.split('.').pop().toLowerCase()) ||
  inTestFolder(f) ||
  isCaseFile(f);

// ---- comment / reference region extraction per file type ----
function commentRegions(file, content) {
  const ext = file.split('.').pop().toLowerCase();
  const regions = [];
  if (ext === 'md') { regions.push(content); return regions; } // whole doc is prose
  if (ext === 'html') {
    // html comments + asset attribute refs (src/href)
    let m;
    const cre = /<!--([\s\S]*?)-->/g;
    while ((m = cre.exec(content))) regions.push(m[1]);
    const are = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
    while ((m = are.exec(content))) regions.push(m[1]);
    return regions;
  }
  if (ext === 'js' || ext === 'css') {
    let m;
    const bre = /\/\*([\s\S]*?)\*\//g;
    while ((m = bre.exec(content))) regions.push(m[1]);
    if (ext === 'js') {
      // line comments: // not preceded by ':' (avoid http://)
      for (const line of content.split('\n')) {
        const idx = line.indexOf('//');
        if (idx >= 0 && line[idx - 1] !== ':') regions.push(line.slice(idx + 2));
      }
    }
    return regions;
  }
  if (ext === 'sh' || ext === 'py' || ext === 'yml' || ext === 'yaml') {
    for (const line of content.split('\n')) {
      const idx = line.indexOf('#');
      if (idx >= 0) regions.push(line.slice(idx + 1));
    }
    return regions;
  }
  return regions;
}

// ---- token resolution ----
function cleanToken(t) {
  return t
    .replace(/^[`'"(<\[]+/, '')
    .replace(/[`'")>\].,;:!?]+$/, '')
    .replace(/#.*$/, '')      // strip #anchor
    .replace(/\)$/, '')
    .trim();
}

function resolveToken(raw, referrer) {
  let t = cleanToken(raw);
  if (!t) return null;
  const refDir = path.dirname(referrer);
  const stripGlob = t.replace(/\/\*+$/, '').replace(/\/\*+\.\w+$/, '');

  // directory glob like custom/* or dir reference
  if (/\/\*+(\.\w+)?$/.test(t) || (!/\.\w+$/.test(t) && t.includes('/'))) {
    for (const cand of [path.normalize(path.join(refDir, stripGlob)), path.normalize(stripGlob)]) {
      const c = cand.replace(/^\.\//,'');
      if (dirSet.has(c)) return { target: c, kind: 'dir' };
    }
  }

  if (!/\.\w{1,6}$/.test(t)) return null; // must end in an extension to be a file ref

  // has slash -> path based
  if (t.includes('/')) {
    const cands = [
      path.normalize(path.join(refDir, t)),
      path.normalize(t.replace(/^\.\//, '')),
    ].map(c => c.replace(/^\.\//, ''));
    for (const c of cands) if (trackedSet.has(c)) return { target: c, kind: 'path' };
    // suffix match (unique)
    const suf = tracked.filter(f => f === t || f.endsWith('/' + t));
    if (suf.length === 1) return { target: suf[0], kind: 'suffix' };
    if (suf.length > 1) return { target: null, kind: 'ambiguous', cands: suf };
    return null;
  }

  // bare basename
  if (byBase.has(t)) {
    const cands = byBase.get(t);
    if (cands.length === 1) return { target: cands[0], kind: 'base' };
    // prefer same dir
    const same = cands.filter(c => path.dirname(c) === refDir);
    if (same.length === 1) return { target: same[0], kind: 'base-samedir' };
    return { target: null, kind: 'ambiguous', cands };
  }
  return null;
}

// Drop an edge when the two files sit in an immediate parent/child folder pair —
// one file directly in folder P, the other directly in an immediate subfolder of
// P (in either direction). Only ONE level: same-folder, sibling, and
// grandchild-or-deeper references are kept. (A file's folder is dirname(file);
// a root file's folder is ".".)
function isImmediateParentChild(from, to) {
  const df = path.dirname(from), dt = path.dirname(to);
  if (df === dt) return false;                 // same folder — keep
  return path.dirname(df) === dt || path.dirname(dt) === df;
}

const TOKEN_RE = /@?[\w][\w./-]*\.\w{1,6}\*?|@?[\w][\w./-]*\/\*+/g;

const edges = [];        // {from,to,kind,token}
const perFile = {};      // file -> [{token,target,kind}]
const ambiguous = [];    // {from,token,cands}

for (const file of tracked) {
  const ext = file.split('.').pop().toLowerCase();
  if (!TEXT_EXT.has(ext)) continue;
  if (isExcluded(file)) continue;
  let content;
  try { content = fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { continue; }
  const regions = commentRegions(file, content);
  const seen = new Set();
  const refs = [];
  for (const region of regions) {
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(region))) {
      const raw = m[0].replace(/^@/, '');
      const res = resolveToken(raw, file);
      if (!res) continue;
      if (res.kind === 'ambiguous') { ambiguous.push({ from: file, token: raw, cands: res.cands }); continue; }
      if (!res.target || res.target === file || isExcluded(res.target)) continue;
      if (isImmediateParentChild(file, res.target)) continue;
      const key = res.target + '|' + res.kind;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ token: raw, target: res.target, kind: res.kind });
      edges.push({ from: file, to: res.target, kind: res.kind, token: raw });
    }
  }
  if (refs.length) perFile[file] = refs;
}

const scanned = tracked.filter(f => TEXT_EXT.has(f.split('.').pop().toLowerCase()) && !isExcluded(f)).length;
const out = { scanned, edges, perFile, ambiguous };
const outPath = process.argv[2] || path.join(__dirname, 'refs.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

// ---- summary ----
const textCount = scanned;
const inDeg = {};
for (const e of edges) inDeg[e.to] = (inDeg[e.to] || 0) + 1;
console.log(`Text files scanned: ${textCount}`);
console.log(`Files that reference others: ${Object.keys(perFile).length}`);
console.log(`Total edges: ${edges.length}`);
console.log(`Distinct target files: ${Object.keys(inDeg).length}`);
console.log(`Ambiguous mentions: ${ambiguous.length}`);
console.log(`Wrote ${outPath}`);
