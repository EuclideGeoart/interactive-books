# P04 sparse-input guard correction

Status: source-ready correction, pending fresh owner nine-gate validation and production captures. No acceptance or freeze is claimed.

## Source and previous owner run

- Held source reviewed: `cccfd3fdf2961e6105fa2bff94e0bff2d178ee2b`.
- Accepted compatibility base already merged by owner: `d2be911c407dde5949ad71757da8853128d3d8b5`.
- Correction source commit: `d98ca403fb1381559bbf28d855cce3eb8bd336bf`.
- Only runtime file changed: `src/parts/p04/model/tree.ts`.
- Owned boundary tests changed: `tests/unit/p04/tree.test.ts` and `oracle/p04/test_trees.py`.

The owner completed all nine focused gates at cccfd3f: actual CLI exit 0, 75 units, 12 Python tests, two oracle commands/23 fresh cases, root 162 passed and subpath 162 passed, zero failures/skips/flakes and source unchanged. Those results apply to that source, not this correction. They confirm the earlier scroll/prose containment corrections. The owner then proved three uncovered sparse-input failures, which require fresh validation before acceptance.

Read-only owner archive in the foundation Book: `documentation/validation/wave-b/p04/review-cccfd3f/`. Preserved SHA256 values:

| Archive file | SHA256 |
| --- | --- |
| BROWSER_ROOT.json | 00cc934e3b376fbc6c0feffbb4e28bf0787098c935510fda13ebae4b7be8a053 |
| BROWSER_SUBPATH.json | e2729d7919e5d026ef4a72cf0faa9aa9f1a1165fa7281ae5b2f9310ce111b382 |
| FOCUSED_MANIFEST.json | cacf2c0427ac6f36caf752a2869d544ad05503ba01742b5a974885a81f133c8f |
| FOCUSED_VALIDATION.log | 35603efd885e8d207a4fe347f547b828cad68e7b9777fee6a8459ed1213ea678 |
| REVIEW_STATUS.md | 6102a994000c049db1a9c1902028cf655f4f60d77331cf9dd356484614ab6ee3 |
| RUNNER_EXIT.txt | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |
| SCOPE_PREFLIGHT.json | fcb3df7d54b596ee84fb95797cf2fb0bc9f0c55942ca3d27a43cc88ba7b0071c |

The owner's original failing proof is `artifacts/integrator-wave-b-p04-sparse-before-fix.log` in the foundation Book, SHA256 `4c75ff504481fb6dbabb0f5fe6fbd557a62dbd7db0d20e395e3baa331f1e803a`. It reports 3 failures / 11 skipped of 14 independent challenges. Neither that log/test nor any owner validation artifact was edited or committed here.

## Failure and minimal correction

The three reproducers preserve array length while deleting an element:

1. Copy CLASS_ROWS and delete the second feature of the first row; terminal training with maxDepth=0 incorrectly succeeds.
2. Predict with `[1,,]` on a terminal two-feature tree; missing query component incorrectly succeeds.
3. Compute `finiteMean([1,,1], 'mean')`; missing observation incorrectly produces 1.

Array forEach/every skip holes. The three boundary guards now visit every index: declared row dimensions, declared query dimensions and all mean observations. The existing finite-number check rejects undefined before a stopping leaf, branch traversal, constant-mean shortcut or summation. The every/reduce arithmetic is unchanged after validation.

No numerical algorithm, dense output, cost, tolerance, missing-value policy, API, canonical Python implementation, golden fixture, UI, replay/state, prose lesson, shared file or dependency changed. Feature validation uses indexed access with the existing declared Row type; no loose-any annotation or compiler relaxation is introduced.

## Actual caller audit and coverage

A repository source/test/Python/oracle search located all callers:

- validateRows feeds stats, evaluateSplit, candidates, trainTree, bootstrap, bagging/forest and boosting.
- predict feeds ensemble training/OOB votes, boosting fitted corrections and lesson row/query projections.
- finiteMean feeds regression leaf means, the boosting baseline and eligible ensemble averages.

All callers retain their existing API and boundary routing. The three new TS cases cover deleted first/last feature slots, terminal/pure/empty/grown query trees, and deleted first/middle/last mean observations in constant and varying data. Row callers include zero draws/trees/stages so no early return can bypass validation. They also verify JSON-serialized holes become null and are rejected without filling the original holes.

Three new canonical Python checks test the corresponding None/null contracts with the actual imported `code/python/p04/trees_ensembles.py`. Row/query tests also run the real piped CLI subprocess, requiring exit 2 and an error-only JSON object. Mean tests call the actual canonical finite_mean on JSON-decoded null observations. Python already rejects these values; no Python engine change is needed.

## Real light checks

Before the runtime correction, the new owned TS regressions independently reproduced all three failures:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/p04/tree.test.ts --maxWorkers=1 -t 'rejects missing'
```

Actual exit 1: 3 failed, 13 intentionally unselected/skipped. Retained proof: [sparse-guard-before.log](./sparse-guard-before.log). Git whitespace checking caught six trailing spaces emitted on Vitest diff headings; only those spaces were trimmed. Failure details and the original owner proof are unchanged.

After the correction:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/p04/tree.test.ts tests/unit/p04/parity.test.ts --maxWorkers=1
.venv/bin/python -B oracle/p04/test_trees.py IndependentTreeChecks.test_missing_row_features_rejected_by_training_and_serialized_cli IndependentTreeChecks.test_missing_query_features_rejected_at_terminal_leaves_and_serialized_cli IndependentTreeChecks.test_missing_mean_observations_rejected_before_constant_shortcut IndependentTreeChecks.test_exact_decimal_constant_mean_ensemble_oob_and_boosting
```

- TS: **42 passed / 2 files**, consisting of 16 kernel/boundary cases and 26 existing parity cases.
- Python: **4 passed**: three invalid-input checks plus the existing exact decimal mean/SSE/boosting/ensemble/OOB/close-but-distinct test.
- Both actual CLI exits 0. Raw output and exact commands: [light-sparse-guards.log](./light-sparse-guards.log).
- Diff/staged whitespace, one-time owned-path scope, locked worktree/canonical common Git directory and all 13 frozen reference hashes checked.

No full Python sweep, fresh fixture generation, full type check, production build/audit, Playwright, capture or focused runner was run by the author for this correction. Numeric tolerances remain the documented 2e-12 absolute-plus-relative mathematical comparison and separately justified painted geometry tolerance. Boundary rejection is exact.

## Handoff

The source payload is followed only by owned documentation/evidence. The final clean delivery SHA is supplied with HANDOFF.md in the handoff message. Hold all source/docs/tests after that delivery for the owner's fresh full nine-gate run and captures. No new shared integration request is needed; accepted publication-budget compatibility is already present.
