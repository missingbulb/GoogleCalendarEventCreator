// extractor-pipeline run_daily task: create-extractor — implement site support for
// each open `extractor-request` issue (the issue form applies the label). Worker:
// the co-located routine spec, addressed pack-relative — the engine resolves a
// local pack's worker path against the pack's own directory in the member repo
// (canon tasks address theirs canon-root-relative instead). This gate is what
// wires the routine to the fleet daily schedule; before this pack the launch was
// out-of-repo (an owner-side Claude routine watching the label).
//
// Label state isn't in the standard signal bundle, so the gate reads the open
// labelled issues through the injected gh reader (gates receive it as the third
// argument). No full mode — an issue either awaits implementation or doesn't.
export default {
  id: 'create-extractor',
  worker: 'run_daily/create-extractor/routine.md',
  order: null,
  full_sweep_supported: false,
  smarts: 'high', // implementing a site extractor end to end is judgment-heavy

  async gate(repo, signals, gh) {
    const full = repo.fullName ?? repo.full_name;
    const { status, json } = await gh(
      `/repos/${full}/issues?labels=extractor-request&state=open&per_page=100`,
    );
    if (status !== 200 || !Array.isArray(json) || json.length === 0) {
      return { run: false };
    }
    return {
      run: true,
      targets: { issues: json.map((issue) => issue.number) },
      reason: `${json.length} open extractor-request issue(s)`,
    };
  },
};
