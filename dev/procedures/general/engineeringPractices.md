# Engineering practices (local working set)

General engineering-practice lessons captured here, not yet in the shared canon
([claude/shared/tasks/engineeringPractices.md](../claude/shared/tasks/engineeringPractices.md)).
`optimize-procedures` promotes these up (via a `claudinite-lesson` issue) and
prunes them once the canon absorbs them (capture is always local — see
[this_project/workflow.md](../this_project/workflow.md)).

- **Automated / CI environments are often bot-blocked from fetching target sites — the block is the datacenter IP, not the User-Agent.** A live fetch that works on your machine can fail from CI or a sandbox (HTTP 403/400, a CAPTCHA wall) no matter how browser-like the headers are, because the *IP* is what's blocked. Route the fetch through a residential-proxy service (these usually also render JS, so a single-page-app records real content) rather than tweaking headers. Some hard sites stay blocked even through a proxy — treat those as un-cacheable.

- **Collapse parallel classifiers to one, and prefer a structural classifier the code can't desync from over a hand-set field.** When the same property is tagged in more than one place (a spec tag, a side manifest, a per-item field), the copies drift — fold them into a single source of truth. Best of all is a *structural* classifier that derives the category from where something lives (its folder or path), so there's no field to forget to update and no way for the classifier to desync from the item it classifies.

- **A setup script may start in the repo's parent directory, not the checkout — `cd` into the checkout first.** A root or cloud setup script can begin a level above the repo, where a bare `npm ci` / build finds no `package.json` and silently does nothing — surfacing much later as a confusing mid-session install or a missing-deps error. Make the setup script `cd` into the checkout before it runs anything.

- **A "cannot find module" / missing-dependency error on a fresh checkout means the deps aren't installed, not a code bug.** `node_modules` (or any vendored dependency dir) starts empty on a fresh clone and on an ephemeral CI/sandbox checkout, so a `Cannot find module …` for a declared dependency is almost always "install hasn't run here yet." Run the install and re-run before hunting for a code-level cause.

- **Avoid default values — be explicit.** A default buys a little less typing at the price of a hidden rule: the real value moves into a fallback (`x || DEFAULT`) plus a comment documenting it — two things that drift, neither visible at the call site. Require the value explicitly, or make it *structural* (derived from where the thing lives); then delete the fallback and the comment that explained it. Don't document an implicit value — eliminate it. (Why: stating the value is nearly free, so the trade never pays; a value encoded only in a prose comment is neither executed nor tested, so it rots.)
