# Physical viewport validation — ACCEPT

2026-10-13 · integration-owner source `743cc2608d78efbb5ac18fc9bea7b7150c9bd1df`. Original foundation freeze remains unchanged. This changes two shared browser assertions only.

Independent Part II visual capture at source `2cff99bd3844b62cdeb60321c9b3e73f7ac08d24` found a real 390px layout expanding to 524px: the control fieldset retained its default intrinsic minimum. Mobile Chrome enlarged `innerWidth`, so comparing document width against that enlarged width falsely passed. The preserved counterexample identifies the 500px fieldset, legend and descendants. The Part II author is correcting owned layout/point-label source separately; this record does not accept that Part.

Shared publication and Part-navigation checks now bound both document width and `innerWidth` against Playwright’s configured physical viewport. Scrollable mathematical tables retain their own overflow regions. No CSS hiding or viewport scaling is used to pass the check.

Executed `flock /tmp/interactive-books-heavy-gate.lock -c 'npm run validate:milestone > artifacts/integrator-viewport-guard-validation.log 2>&1'` on the frozen foundation with this guard. All nine gates passed: Astro zero errors/warnings/hints; 57 units in six files; three real oracle commands with 15 NumPy tests and seven reference fixtures; root/subpath builds and audits; 48+48 executed browser cases, zero failed/skipped/flaky. Signature `9480ed591de7a9c9875051608d8372ebd201fe3540bb4da3df83564cc7e89cb9`. Raw manifest, log, both browser reports and counterexample are versioned under `validation/VIEWPORT_GUARD_*`. All 13 reference hashes and Books I/II trees remain unchanged.

Part focused runs retain their approved source base; their owned viewport checks are strengthened too. The combined Wave A milestone must include this accepted shared check before freeze. No Part is accepted by this correction, and no push or deployment occurred. Native Windows, real hardware and human screen-reader checks remain unperformed.
