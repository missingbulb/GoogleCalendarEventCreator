## 2026-06-18 · born · toolbar icon colored via declarativeContent (#363)
- **Reason:** a bare `hostSuffix` matcher also matches a lookalike host, and the real URL-to-icon
  match runs only inside Chrome.
- **Actor:** @missingbulb (owner).
- **Mechanism:** a gotcha in `docs/technicalGotchas.md`, written with the change that introduced the
  matchers.
- **Landed:** #363.

## 2026-07-16 · moved · Restructure local capture into a Claudinite local pack (#680)
- **Source:** the always-`@`-imported `dev/procedures/{workflow,github,testing,technicalGotchas}.md`
  docs, dissolved into this pack.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Fable 5, per the commit trailer.
- **Mechanism:** a RULES.md codebase gotcha, injected at session start.
- **Landed:** #680.

## 2026-07-23 · reworded · Growth dedup: prune gcec local items the canon now covers (#701)
- **Reason:** the canon chrome-extension pack now owns the raw-string `UrlFilter` match and its
  hostEquals + dot-hostSuffix fix (canon #319); kept only that the real match is exercised here
  solely by the CI-only real-Chrome test.
- **Actor:** @missingbulb (owner).
- **Model:** Claude Opus 4.8, per the commit trailer.
- **Landed:** #701 (Refs #685).

## 2026-07-31 · reworded · gcec: growth-dedup (#802)
- **Reason:** the lookalike-hostSuffix rule and its fix are chrome-extension canon; the CI-only
  residue remains.
- **Actor:** @missingbulb (owner).
- **Model:** Claude, per the commit trailer.
- **Landed:** #802 (Refs #798).

## 2026-09-27 · reworded · Claudinite growth: rule revalidation (#1351)
- **Source:** re-running `dev/requirements/heavy/extension-load.chrome.test.js` in a Claude Code
  cloud session with `CHROME_PATH=/opt/pw-browsers/chromium xvfb-run -a node --test …` — it
  passed, exercising the real `declarativeContent` registration and the `iconRulesReady` CDP poll.
- **Reason:** the session's pre-installed Playwright Chromium plus `xvfb-run` satisfy what the test
  needs, so "CI-only" is no longer true; only a Chrome-less checkout still skips it.
- **Actor:** Claudinite rule-revalidation task, run item #1351.
- **Model:** Claude Sonnet 5, per the commit trailer.
- **Retire when:** the test's own header comment stops calling the offline sandbox a skip case, or
  the heavy suite runs by default without manual `CHROME_PATH`/`xvfb-run` setup.
