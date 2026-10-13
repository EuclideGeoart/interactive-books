# Shared trace correction — ACCEPT

2026-10-13 · integrator-owned correction after the original foundation freeze. Accepted source: `add0994468839619c9d2bc79046c821272494137`; delivery tag: `book-iii-wave-a-trace-keys-20261013`. The original foundation tag and its evidence remain immutable.

Independent Part I review supplied a concrete counterexample: IDs `__proto__`, `a`, `b` form a valid seeded three-way split, but the initial immutable replay frame dropped `assignments.__proto__`. Ordinary assignment invoked JavaScript's inherited prototype setter while copying that plain-data map. The trace copier now defines enumerable data properties directly. Its public state/trace contract and prototypes are unchanged; keys and detached frozen values are preserved. A focused platform regression covers both `__proto__` and `constructor`. No Part agent edited shared code.

Exact run: `flock /tmp/interactive-books-heavy-gate.lock -c 'npm run validate:milestone > artifacts/trace-keys-validation.log 2>&1'`, from Book III. Source signature `ce9149996956967df25cd13d3e0d54fda0f0456adf0e2ca923a4fd2aabc424c6`; original evidence `validation-results/milestone-2026-10-13T14-53-31-438Z/manifest.json`; versioned evidence `validation/TRACE_KEYS_*` includes the original Part I failure, milestone, full log and raw mount reports.

All nine gates passed with unchanged sources: Astro 0 errors/warnings/hints, 57 units in six files, 15 NumPy tests, three oracle/freshness commands, root/subpath production audits, and 48+48 actual browser passes with no failed/skipped/flaky results. The existing 13 reference hashes and required oracle entries passed. This changes data copying only; prior captured layouts remain representative. Native Windows/hardware/screen-reader limitations are unchanged.

Integration owner synchronizes this accepted correction into the two existing D-volume Part branches before their focused gates. Exact Part ownership diffs are then reviewed against that synchronized base. This is a narrow bug correction, not acceptance of an unfinished Part. Books I/II, their release/baseline trees and both publication-audit worktrees are untouched. No push or deployment is authorized.
