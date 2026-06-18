// Background service worker: colors the toolbar icon to signal page support —
// green tile on a host with a site-specific extractor, gray on a fallback-
// denylisted host, blue (the manifest default_icon) everywhere else.
//
// It does this with chrome.declarativeContent, NOT by reading tab URLs. The
// browser matches the rules' URL patterns itself and swaps the icon; the
// extension never sees any tab's URL, so the extension needs no "tabs"
// permission and the install prompt no longer says "Read your browsing
// history". (The old design listened to chrome.tabs.onActivated/onUpdated and
// read tab.url for every tab, which is exactly what required "tabs".)
//
// The host lists come from pipeline/fallback-lists.json — the same single
// source of truth the popup's classifier (config.js / fallback-policy.js) reads.
// `supportedDomains` is the static mirror of the sources' own matches() (kept
// honest by test/unit/supported-domains.test.js); the icon decides at host
// granularity, exactly as the old GCal.isSupportedHost/isDeniedHost did, so the
// declarative host patterns reproduce the previous behavior.

// declarativeContent.SetIcon documents a `path` option, but in practice the
// `path` form is unreliable (it silently leaves the icon unset / "Could not load
// icon"); imageData is the robust route. And an MV3 service worker has no DOM —
// no <img>/<canvas> — so we decode the packaged PNGs into ImageData via
// fetch -> createImageBitmap -> OffscreenCanvas. (Same DOM-less-worker trap as
// the old chrome.action.setIcon path, #204; see docs/technicalGotchas.md.)
async function loadImageData(iconPath, size) {
  const blob = await fetch(chrome.runtime.getURL(iconPath)).then((r) => r.blob());
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

// The { size -> ImageData } map for one icon variant ("" blue, "-supported"
// green, "-denied" gray). 16 and 32 are the toolbar-action sizes.
async function iconImageData(suffix) {
  const [px16, px32] = await Promise.all([
    loadImageData(`icons/icon16${suffix}.png`, 16),
    loadImageData(`icons/icon32${suffix}.png`, 32),
  ]);
  return { 16: px16, 32: px32 };
}

// Two PageStateMatchers per host so "example.com" means the apex OR any
// subdomain — but NOT "evilexample.com". A bare hostSuffix:"example.com" would
// match "evilexample.com", so the apex is matched with hostEquals and subdomains
// with a leading-dot hostSuffix. Mirrors the runtime's
// `host === entry || host.endsWith("." + entry)` semantics.
function hostMatchers(host) {
  const schemes = ["http", "https"];
  return [
    new chrome.declarativeContent.PageStateMatcher({ pageUrl: { hostEquals: host, schemes } }),
    new chrome.declarativeContent.PageStateMatcher({ pageUrl: { hostSuffix: "." + host, schemes } }),
  ];
}

// Build the declarativeContent rules from the host lists. No rule is needed for
// the blue default — when no rule matches, Chrome shows the manifest default_icon.
// Denied is listed before supported so that if a host ever appeared on both, the
// later (supported/green) action would win; today the lists don't overlap.
async function buildRules() {
  const lists = await fetch(chrome.runtime.getURL("pipeline/fallback-lists.json")).then((r) => r.json());
  const green = await iconImageData("-supported");
  const gray = await iconImageData("-denied");

  const rules = [];
  const denied = (lists.denylist || []).flatMap(hostMatchers);
  if (denied.length) {
    rules.push({ conditions: denied, actions: [new chrome.declarativeContent.SetIcon({ imageData: gray })] });
  }
  const supported = (lists.supportedDomains || []).flatMap(hostMatchers);
  if (supported.length) {
    rules.push({ conditions: supported, actions: [new chrome.declarativeContent.SetIcon({ imageData: green })] });
  }
  return rules;
}

// Replace any existing rules with a freshly-built set and return how many were
// registered. removeRules-then-addRules makes it idempotent, so re-running can't
// stack duplicates. We don't await the addRules callback: the awaited work is
// buildRules() (the fetch + OffscreenCanvas decode, which can actually fail);
// handing the rules to Chrome is fire-and-forget.
async function installRules() {
  const rules = await buildRules();
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules(rules);
  });
  return rules.length;
}

// Register whenever the worker runs its top level — that covers install, update,
// and browser launch (declarativeContent rules also persist across restarts, so a
// launch that never wakes the worker keeps them). `iconRulesReady` is the
// readiness promise (resolving to the rule count); the CI smoke test awaits it to
// confirm the startup path ran end to end. onInstalled refreshes the rules after
// an extension update even if the worker was already alive.
globalThis.iconRulesReady = installRules();
chrome.runtime.onInstalled.addListener(installRules);
