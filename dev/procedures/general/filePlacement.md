# File placement (local working set)

Portable "where a file lives / how it's located" lessons captured here (capture is
always local — see [this_project/workflow.md](../this_project/workflow.md)).

## Encode act-on-able distinctions in the folder layout, not in per-file metadata

A file's path is an interface: not only people navigate by it — automated processes
(build globs, linters, ownership and access rules) often act on a file by its
**location alone**. So when two kinds of file must be treated differently by
something that only reads paths, make the distinction **structural** — give each
kind its own folder so the path itself carries it, and let code that shouldn't care
resolve across folders. Where the reference-distance rule asks *what a file depends
on*, this asks *what acts on the file*; both want the tree to encode the real
relationship rather than leave it implicit in metadata a path-scoped tool can't see.

Keep such a split **fail-safe**: name the narrower / less-protected folder
explicitly and let the safer behavior be the default, so a misplaced file lands on
the safe side.
