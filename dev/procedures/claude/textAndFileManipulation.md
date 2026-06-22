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
