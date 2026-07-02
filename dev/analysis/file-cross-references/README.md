# File cross-reference graph

A one-off analysis of **how much this repo's files point at each other from inside
comments** (and doc prose, `@import` lines, and HTML asset refs). Built to answer:
"how eager are we about referencing other files in comments, and what does that web
look like?"

## What counts as an edge

An edge **A → B** means: a *comment region* of file **A** names a token that
resolves to a real tracked file **B** in the repo. The resolution step is the
whole filter — a token only becomes an edge if it maps to an actual file — so
external URLs, issue numbers (`#146`), and npm package names never appear.

Comment regions by file type: `//` and `/* */` (js/css), `#` lines (sh/py/yml),
`<!-- -->` + `src`/`href` (html), and the whole document for Markdown (prose links
+ `@import`). Resolution handles full paths, `../`-relative paths, path suffixes,
and bare basenames (unique, or disambiguated by same-directory); ambiguous
basenames that match >1 file are reported separately, not drawn.

Two hub files are **excluded** as noise (see `EXCLUDE` in `extract.js`):
`dev/requirements/requirements.md` (links every case snapshot) and
`dev/procedures/this_project/fileDescriptions.md` (a catalog that names every file).
This analysis's own folder (`dev/analysis/`) is excluded too, so it never scans its
own generated report.

Whole categories are dropped from the graph entirely — never a node in either
direction (see `IGNORE_EXT` / `inTestFolder` / `isCaseFile` in `extract.js`):
**json, html, and image files**; anything inside a **testing folder** (a path
segment named `test`/`tests` or ending `-test`/`-tests`, e.g. `extension-test/`,
`dev/procedures/test/`); and **`*.case.js`** requirement-case files. (Note: a
`*.test.js` file that lives *outside* a test folder is still included — only
folder-based test exclusion is applied.)

**Immediate parent↔subfolder edges are omitted** (`isImmediateParentChild`): a file
directly in folder `P` and a file directly in an *immediate* subfolder of `P` never
link, in either direction — one level only. Same-folder, sibling, and
grandchild-or-deeper references are kept. (Example: `a/c ↔ a/b/d` is dropped;
`a/c ↔ a/b/e/d` is kept.)

## Files

| File | What it is |
|------|------------|
| `extract.js` | Scans every tracked text file, emits `refs.json` (edges + per-file refs + ambiguous). |
| `build-graph.js` | Turns `refs.json` into `graph.json`, `report.md`, and the standalone `graph.html`. |
| `graph.template.html` | The interactive viewer (canvas force-graph); `__DATA__` is replaced with the graph JSON. |
| `graph.html` | **Generated** — the standalone viewer with data baked in. Open in a browser. |
| `report.md` | **Generated** — human-readable per-file reference report + degree/flow tables. |
| `build.sh` | Regenerate everything from the current repo state. |

`refs.json` and `graph.json` are intermediate build outputs (gitignored).

## Regenerate

```sh
./build.sh          # runs extract.js then build-graph.js
```

## The viewer

- **files** view: every referencing/referenced file, node color = top-level folder
  group, node size = total references (in + out).
- **folders** view: the same edges aggregated to folder-to-folder flow.
- Arrows point **from the commenting file to the file it names**. Hover a node to
  isolate its edges; click to pin its in/out references in the side panel. Click a
  legend chip to isolate one folder group; type in the filter box to spotlight
  files by path.
