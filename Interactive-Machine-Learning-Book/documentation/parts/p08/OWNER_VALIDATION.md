# Owner-only validation inventory

No command below was executed by the implementation author. The user's implementation-only policy prohibits author tests, generators, oracle execution, type/content/lint checks, compiles/builds, browsers, captures, benchmarks and exploratory correctness runtimes.

The frozen runner discovers `p08` automatically from its manifest and oracle manifest. The owner alone decides commands and sequencing, using the existing heavy lock. Actual script entry points read from package.json/CHAPTER_AUTHORING:

- `npm run validation:enumerate -- --part p08` (owner may inspect the actual scope).
- `npm run validate:focused -- --part p08` (owner-only focused workflow).
- `npm run validate:milestone` (owner-only all-Part workflow; no invented --part milestone argument).
- `npm run test:oracle -- p08` runs the authored `test_evaluation.py` and `check_fixtures.py --check` manifest entries.
- `npm test -- tests/unit/p08` exercises mathematical boundaries, literal fixtures, immutable traces, MDX/SSR source semantics and actual canonical CLI parity.
- `npm run test:e2e` / `npm run test:e2e:subpath` use the existing production/mount and viewport configurations. The Part tests use relative routes.

Independent oracle uses Fraction counts/Brier/bin membership and transform statistics, closed-form integer LCG states, full fold/group disjointness and an augmented NumPy least-squares system with nλ ridge row. Decimal rationalization and Fraction binary64 rounding check cancellation/nonassociativity/conditioning. Tests execute the actual canonical Python CLI when run by the owner.

Hand-authored `fixtures/p08/evaluation.fixtures.json` is deliberately marked UNVALIDATED. Six literal fixture families cover original metrics, exact four-row leakage, seed-zero folds/draws, binary64 counterexamples, zero true-class probability and log(2) score. No generator was executed; none is pending. No activation or new shared registration is required, but owner stale-literal/oracle/parity runs are required before treating the fixtures as evidence.

Authored browser cases inspect JSON state, exact memberships, CV scores, training/validation curve geometry, reliability geometry, numeric/keyboard seed paths, rejected drafts, test-mutation independence, exact threshold conventions, undefined metrics, transform contamination, immutable replay forks, reset, touch preset paths and corrective exercise feedback. The expanded provenance test opens details with Enter, focuses its named region, uses ArrowDown and conditionally ArrowRight, and checks the complete record. Both-theme chapter cases measure font >=13.99 CSS px and control >=44px targets at the existing three viewport projects; the same suite is suitable for both mounts. The owner additionally requested all-Part captures on every opening Stage; all five chapters have state/SVG markers for those captures.

No captures, hashes, benchmark measurements, passing counts or acceptance classifications are supplied. Native Windows, physical devices, human assistive-technology sessions and deployment generalization are unverified.

Source-only owner corrections incorporated: keyboard-focusable labeled provenance scroll region and its interaction test; sparse tuple-hole construction via normal array cast; Python/oracle UTF-16 group ordering and Unicode canonical/browser parity case. Existing ASCII literals and the selection-reuse curve warning remain intact.
