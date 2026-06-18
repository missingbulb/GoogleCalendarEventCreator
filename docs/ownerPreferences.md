# Owner interaction preferences

Personal preferences from the repo owner for how the assistant should
interact — tone, summary style, end-of-turn conventions. These are **not**
project conventions (those live in the other `docs/` files); they're how the
owner likes to be worked with.

**Temporary home.** This file lives in the repo only because Claude Code Web
sessions are ephemeral — the container (and `~/.claude`) is reclaimed after each
session, so a user-level `~/.claude/CLAUDE.md` doesn't persist. The repo is the
only durable store here. The intent is to move these preferences out to the
owner's own environment once that exists; until then, this is the home. Keep it
separate from the project-convention docs so the two never muddy each other.

## Preferences

- **When there's nothing left to do, say so boldly at the end of the
  conversation.** Don't bury a "this is complete / I'm blocked / nothing further
  to do" behind hedging — make the terminal state unmistakable.
