# Text and file manipulation

Nuances of bulk textual editing — the non-obvious ways a mechanical
find-and-replace or path rewrite across the repo corrupts content it looks like
it should leave alone. Recorded so they bite only once.

This doc is about *rewriting* references when a path moves; the complementary
concern — not writing **brittle, redundant references into comments** in the first
place, so a move costs less churn — is in
[code-comments.md](code-comments.md) (read it when writing or reviewing comments).

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
- **An ordered specific→catch-all path rewrite half-converts a bare-directory
  reference the specific rule's trailing slash missed.** Renaming `old/sub/` →
  `new/leaf/` with sed, the specific rule is anchored on a trailing slash
  (`s#old/sub/#new/leaf/#`) while a catch-all handles the parent (`s#old/#new/#`). A
  reference *without* the trailing slash — `path.join(root, "old/sub")`, a
  `git add old/sub`, a prose mention — escapes the specific rule; the catch-all then
  rewrites only its **parent** (`old/sub` → `new/sub`, not `new/leaf`), a
  half-converted path that fails at *run time*, not at the rewrite. Match both the
  slashed and the bare form, then after the sweep grep the bare-dir form (at a
  quote / paren / line-end) and run the tests.
- **A Markdown link carries its path TWICE — a sed that rewrites only the `](href)`
  leaves the `[display text]` stale.** `[`old/path.md`](old/path.md)` has the path in
  both the bracket label and the parenthesized target; a rewrite anchored on the
  link target (`s#](old/path.md)#](new/path.md)#`) updates the href but leaves the
  visible label reading `old/path.md`, so the rendered doc points right but *reads*
  wrong. After an href-only sweep, also rewrite the display-text form (both the
  plain `[old/path.md]` and the backticked `[`old/path.md`]`), then grep for the old
  string to catch the labels the href rule didn't touch.
- **To exclude a directory's own files from a reference search, filter by file PATH,
  not by `grep -v` on the line content.** Counting references to `foo/bar/`, a
  `grep -rn foo/bar | grep -v foo/bar/` (meant to drop the directory's own files)
  *also* drops every legitimate reference elsewhere that spells the full path
  `foo/bar/…` — silently undercounting. Exclude by **pathspec** instead
  (`git grep -n foo/bar -- . ':(exclude)foo/bar'`), which filters on which file is
  being searched, not on what each matching line happens to contain.
