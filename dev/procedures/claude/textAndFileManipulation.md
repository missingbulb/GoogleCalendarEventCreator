# Text and file manipulation

Nuances of bulk textual editing — the non-obvious ways a mechanical
find-and-replace or path rewrite across the repo corrupts content it looks like
it should leave alone. Recorded so they bite only once.

- **A global string-replace of a path prefix corrupts in two non-obvious ways:
  double-prefix on files already under the target namespace, and mangled external
  URLs.** When renaming `foo/` → `bar/foo/`, a naive repo-wide replace of `foo/` →
  `bar/foo/` turns `bar/foo/file.js` (already correct) into `bar/bar/foo/file.js`;
  it also rewrites any external URL that happens to contain the string `foo/`
  (e.g. `https://example.com/docs/foo/` becomes
  `https://example.com/docs/bar/foo/`). Scope the replace to the internal path
  strings that need it (not external URLs, not files already under the target), or
  apply it then do a targeted post-pass reverting any match that lives inside a
  URL or that doubled the prefix.
- **Deleting (or renaming) a file isn't done until you've grepped the repo for
  inbound references to it.** A removed doc/module leaves dangling links, imports,
  or index entries behind that no test necessarily catches (a README docs-index
  link to a deleted `dev/procedures/*.md` stays green). Right after the removal,
  `grep` the whole tree for the old path/filename and fix every hit in the same
  change — don't wait to be told the link is broken.
- **A path rewrite silently MISSES references that aren't one contiguous
  slash-joined string.** The grep/sed that finds `extension/ui/popup.js` won't
  match the same path built from `path.join` **segment arrays**
  (`path.join(__dirname, "..", "extension", "ui", "popup.js")`) or one **wrapped
  across a line** in a comment, so it survives the rewrite and breaks only at run
  time — a directory move passed every path-string grep yet produced a wave of
  `ERR_MODULE_NOT_FOUND` (dynamic `import()` of moved modules) caught only when
  the tests ran. After the mechanical pass, also search the segment tokens (e.g.
  `"ui", "popup`) and **run the test suite** — it, not the grep, is what surfaces
  a missed reference.
