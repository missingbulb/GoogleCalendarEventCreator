## 2026-06-15 · born · auto-implement extractors via a Claude agent (#164)
- **Actor:** @missingbulb (owner).
- **Mechanism:** a standing owner instruction in CLAUDE.md.
- **Landed:** #164 (Closes #155).

## 2026-06-29 · strengthened · "bump version" made an end-to-end release command (#577)
- **Reason:** reporting at merge time races the async release build, so a follow-up deploy would
  ship the previous version's artifact.
- **Actor:** @missingbulb (owner).
- **Landed:** #577.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md owner command, injected at session start.
- **Landed:** #680.

## 2026-07-28 · reworded · Growth dedup: prune gcec local items the canon now covers (#775)
- **Reason:** the bump mechanics are the canon bump-version skill's; kept the end-to-end semantics,
  the explicit target or level, the merge authorization and the wait for the published zip.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #775 (Refs #772, #685).

## 2026-08-11 · reworded · Growth dedup: prune three canon-covered local-pack items (#830)
- **Reason:** the why-poll-to-the-release rationale is the canon unattended-agents skill's.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #830 (Refs #818).
