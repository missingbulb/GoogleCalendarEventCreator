## 2026-06-24 · born · delegate all page fetching to ScraperAPI (#518)
- **Reason:** CI and sandbox IPs are bot-blocked; one rendered, proxied fetch replaced the
  SPA-render, refresh-cache and probe machinery.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a gotcha in the always-imported docs.
- **Landed:** #518.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a rule in RULES.md's "Extractor pipeline" section, injected at session start.
- **Landed:** #680.

## 2026-07-26 · reworded · Port what the create-extractor rewrite dropped (#761)
- **Reason:** `scraperapi.mjs` moved into the create-extractor task, its one remaining caller.
- **Actor:** @missingbulb (owner).
- **Landed:** #761.

## 2026-07-28 · reworded · Growth dedup: prune gcec local items the canon now covers (#775)
- **Reason:** the `required_secrets` wiring and the no-workflow-just-to-hold-a-secret rule are the
  canon's; kept the one fetch surface and the no-local-fetch rule.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #775 (Refs #772, #685).
