# Text and file manipulation

Nuances of bulk textual editing — the non-obvious ways a mechanical
find-and-replace or path rewrite across the repo corrupts content it looks like
it should leave alone. Recorded so they bite only once.

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
  leaves the `[display text]` stale.** `` [`old/path.md`](old/path.md) `` has the path in
  both the bracket label and the parenthesized target; a rewrite anchored on the
  link target (`s#](old/path.md)#](new/path.md)#`) updates the href but leaves the
  visible label reading `old/path.md`, so the rendered doc points right but *reads*
  wrong. After an href-only sweep, also rewrite the display-text form (both the
  plain `[old/path.md]` and the backticked `` [`old/path.md`] ``), then grep for the old
  string to catch the labels the href rule didn't touch.
- **To exclude a directory's own files from a reference search, filter by file PATH,
  not by `grep -v` on the line content.** Counting references to `foo/bar/`, a
  `grep -rn foo/bar | grep -v foo/bar/` (meant to drop the directory's own files)
  *also* drops every legitimate reference elsewhere that spells the full path
  `foo/bar/…` — silently undercounting. Exclude by **pathspec** instead
  (`git grep -n foo/bar -- . ':(exclude)foo/bar'`), which filters on which file is
  being searched, not on what each matching line happens to contain.
