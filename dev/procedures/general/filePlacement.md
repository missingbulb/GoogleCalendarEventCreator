# File placement (local working set)

Portable "where a file lives / how it's located" lessons captured here, not yet in
the shared canon
([claude/shared/general/filePlacement.md](../claude/shared/general/filePlacement.md)).
`optimize-procedures` promotes these up and prunes them once the canon absorbs them
(capture is always local — see [this_project/workflow.md](../this_project/workflow.md)).

## When an automated tool can only discriminate files by PATH, encode the distinction in the folder layout

Some tools act on a file purely by **where it lives**, with no finer filter: a
secret-scanner / push-protection allowlist that takes only a path glob, a linter or
formatter with per-directory config, a `CODEOWNERS` rule, a build glob. When you
need such a tool to treat two *kinds* of file differently, don't reach for a
per-file flag or wait for the tool to grow a finer knob it doesn't have — **put the
two kinds in separate folders** so the path itself carries the distinction, and
resolve across the folders in code where the rest of the system shouldn't care
which one a file came from. The folder *is* the control surface.

Two corollaries worth checking before relying on this:

- **Confirm the tool reads the config from where you think.** Some path-scoped
  configs only take effect from the **default branch**, so the rule does nothing on
  a feature branch until merged — verify the scope and the source-of-truth location,
  not just the syntax.
- **Make the folder split fail-safe.** Name the *exempt* (less-protected) folder
  narrowly and keep the protected behavior the default, so a file dropped in the
  wrong place is protected, not silently exempted.

Worked example (#286): recorded test fixtures are split by provenance into
`data/server-fetched/` (pipeline-recorded third-party pages — their only embedded
tokens are the *site's own*, so excluded from GitHub secret scanning / push
protection, which would otherwise wedge the recording pipeline) vs
`data/user-submitted/` (hand-supplied HTML — push protection stays **on**, since a
person could paste in a real secret). GitHub's `secret_scanning.yml` scopes only by
path glob and is read only from the default branch, so the folder is the only lever
— and a small resolver (`data-files.js`) looks a case's page up in either folder so
the test suite doesn't care which provenance it has.
