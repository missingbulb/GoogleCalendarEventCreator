## 2026-06-12 · born · live tests driven from CI-refreshed HTML snapshots (c6635f1)
- **Source:** GitHub Actions runners got HTTP 400 from facebook.com, so no snapshot could be cached.
- **Actor:** a Claude session for @missingbulb (owner).
- **Mechanism:** a line in the testing doc, always imported through CLAUDE.md.
- **Landed:** commit c6635f1.

## 2026-06-24 · reworded · delegate all page fetching to ScraperAPI (#518)
- **Reason:** facebook still returns a hard 400 through the proxy.
- **Actor:** @missingbulb (owner).
- **Landed:** #518.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section, injected at session start.
- **Landed:** #680.
