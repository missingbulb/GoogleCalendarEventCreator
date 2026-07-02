#!/usr/bin/env node
// Turn refs.json (from extract.js) into:
//   - graph.json  : nodes + file-level edges + folder-level aggregated edges
//   - report.md   : the human-readable per-file reference report
//   - graph.html  : the standalone interactive viewer (graph.template.html + data)
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const d = JSON.parse(fs.readFileSync(path.join(DIR, 'refs.json'), 'utf8'));

// cluster label from path
function cluster(f) {
  const p = f.split('/');
  if (p.length === 1) return 'root';
  if (p[0] === 'extension') return p.length > 2 ? `extension/${p[1]}` : 'extension';
  if (p[0] === 'dev') {
    if (p[1] === 'procedures') return `dev/procedures/${p[2] || ''}`.replace(/\/$/,'');
    if (p[1] === 'requirements') return p[2] && p[2] !== 'shared' && !p[2].includes('.') ? `dev/requirements/${p[2]}` : 'dev/requirements';
    return `dev/${p[1]}`;
  }
  if (p[0] === '.github') return '.github';
  if (p[0] === '.claude') return '.claude';
  return p[0];
}

const nodeIds = new Set();
d.edges.forEach(e => { nodeIds.add(e.from); nodeIds.add(e.to); });
const inDeg = {}, outDeg = {};
d.edges.forEach(e => { inDeg[e.to] = (inDeg[e.to]||0)+1; outDeg[e.from]=(outDeg[e.from]||0)+1; });

const nodes = [...nodeIds].map(id => ({
  id, cluster: cluster(id), base: path.basename(id),
  inDeg: inDeg[id]||0, outDeg: outDeg[id]||0, ext: id.split('.').pop().toLowerCase(),
}));

// dedupe edges (from,to)
const emap = new Map();
d.edges.forEach(e => {
  const k = e.from+'|'+e.to;
  if (!emap.has(k)) emap.set(k, { from:e.from, to:e.to, tokens:new Set(), kinds:new Set() });
  emap.get(k).tokens.add(e.token); emap.get(k).kinds.add(e.kind);
});
const edges = [...emap.values()].map(e=>({from:e.from,to:e.to,tokens:[...e.tokens],kinds:[...e.kinds]}));

// folder-level aggregation
const fmap = new Map();
edges.forEach(e => {
  const a = cluster(e.from), b = cluster(e.to);
  if (a===b) return;
  const k=a+'|'+b;
  fmap.set(k,(fmap.get(k)||0)+1);
});
const folderEdges=[...fmap.entries()].map(([k,w])=>{const[from,to]=k.split('|');return{from,to,weight:w};});

fs.writeFileSync(path.join(DIR,'graph.json'), JSON.stringify({nodes,edges,folderEdges}));

// inject data into the template -> standalone graph.html
const tpl = fs.readFileSync(path.join(DIR,'graph.template.html'),'utf8');
const injected = tpl.replace('__DATA__', JSON.stringify({nodes,edges,folderEdges}).replace(/<\/script>/g,'<\\/script>'));
fs.writeFileSync(path.join(DIR,'graph.html'), injected);

// ---- markdown report ----
const scanned = 299; // text files scanned (see extract.js output)
let md = '# File cross-reference report\n\n';
md += `Extracted from **comment regions and doc prose** across all tracked text files. An edge *A → B* means a comment (or doc link / \`@import\` / HTML asset ref) in file **A** names file **B**, and **B** is a real tracked file in the repo. External URLs, issue numbers (\`#146\`), and npm packages are dropped because they don't resolve to a repo file. \`dev/requirements/requirements.md\` is excluded (its ~120 gallery links to case snapshots swamp the real signal — see \`EXCLUDE\` in \`extract.js\`).\n\n`;
md += `## Totals\n\n`;
md += `- Files that reference others: **${Object.keys(d.perFile).length}**\n- Distinct referenced files: **${new Set(edges.map(e=>e.to)).size}**\n- Total reference edges: **${edges.length}** (${d.edges.length} incl. duplicate mentions)\n- Ambiguous basename mentions (unresolved): **${d.ambiguous.length}**\n\n`;

md += `## Most reference-heavy files (out-degree)\n\n| Out | File |\n|----:|------|\n`;
Object.entries(outDeg).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([f,n])=>md+=`| ${n} | \`${f}\` |\n`);
md += `\n## Most referenced files (in-degree)\n\n| In | File |\n|----:|------|\n`;
Object.entries(inDeg).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([f,n])=>md+=`| ${n} | \`${f}\` |\n`);

md += `\n## Folder-to-folder reference flow\n\n| From folder | → | To folder | Edges |\n|---|---|---|---:|\n`;
folderEdges.sort((a,b)=>b.weight-a.weight).slice(0,30).forEach(e=>md+=`| \`${e.from}\` | → | \`${e.to}\` | ${e.weight} |\n`);

md += `\n## Full per-file references\n\nEvery file that names another file in its comments / prose, with each reference target.\n\n`;
Object.keys(d.perFile).sort().forEach(f=>{
  md += `### \`${f}\`\n\n`;
  d.perFile[f].forEach(r=>md+=`- \`${r.token}\` → \`${r.target}\`${r.kind==='base'||r.kind==='suffix'?` _(by name)_`:''}\n`);
  md += '\n';
});
if (d.ambiguous.length){
  md += `## Ambiguous references (basename matches >1 file)\n\n`;
  const seen=new Set();
  d.ambiguous.forEach(a=>{const k=a.from+a.token;if(seen.has(k))return;seen.add(k);md+=`- \`${a.from}\` names \`${a.token}\` → could be: ${a.cands.map(c=>`\`${c}\``).join(', ')}\n`;});
}
fs.writeFileSync(path.join(DIR,'report.md'), md);

console.log(`nodes ${nodes.length}  edges ${edges.length}  clusters ${new Set(nodes.map(n=>n.cluster)).size}  folderEdges ${folderEdges.length}`);
console.log('wrote graph.json, graph.html, report.md');
