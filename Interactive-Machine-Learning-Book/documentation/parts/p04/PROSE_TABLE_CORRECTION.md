# P04 prose-table containment correction

Source correction: `3e30f7af2c5f17af850bef5223e882dac0c04883`. Product mathematical state, kernels, Python, fixtures, widget controls, fonts and shared styles are unchanged.

## Retained failure and root-cause evidence

Owner root run at `6312c583b81f2ccbbe0df63b21f6281ec416aa4f`: 121 passed / 23 failed of 144; actual CLI exit 1. Failures classify as 15 owned immediate-scroll assertions, seven shared publication timeouts, and one III-25 mobile physical-width failure at `tests/e2e/platform/book.spec.ts:58`. Subpath was not run.

Owner source/image inspection identifies the five-column III-25 worked-stage Markdown table outside the experiment sheet as uncontained. Long unbroken vectors create intrinsic width; the header looked normal while this table below the viewport enlarged the page. The original log/report/exit/diagnosis/PNGs remain untouched. See BROWSER_SCROLL_CORRECTION.md for retained artifact hashes.

## Minimal product correction and review scope

Every original Markdown table line is byte-for-byte unchanged. Review found five prose tables needing the accepted shared `.table-scroll` wrapper:

| Chapter | Stable region ID | Table |
| --- | --- | --- |
| III-20 | iii20-worked-samples | Six hand-authored observations |
| III-21 | iii21-worked-entropy | Weighted entropy/gain comparison |
| III-22 | iii22-worked-pruning | Cost-complexity subtree comparison |
| III-24 | iii24-worked-bootstrap | Bootstrap branch memberships/counts |
| III-25 | iii25-worked-stages | Four worked boosting stages, five columns |

III-23 has no prose Markdown table. Stage tables already have their Part-owned bounded wrappers.

Authored wrappers use the frozen reference's labelled/focusable scroll pattern with an explicit unique `data-scrollable` name. The actual shared BaseLayout/syncScrollable contract controls runtime semantics: `scrollWidth > clientWidth + 1` gives role=region, tabindex=0 and the name; a fitting wrapper has tabindex=-1 and no role/aria-label. No custom scroll/keyboard handler, CSS, font reduction, overflow hiding, assertion removal or snapshot change was introduced.

## Meaningful checks

Author ran only:

```text
node node_modules/vitest/vitest.mjs run tests/unit/p04/lessons.test.ts --maxWorkers=1
19 tests in one file PASS (21:32:23 local, duration 556 ms)
```

The new light case renders the actual trusted MDX/GFM table fragments through the provisioned Preact runtime, checks five unique stable labels/IDs, table/thead/tbody semantics, exact column/row/cell counts and the literal III-25 vectors/loss. A pre/post source comparison separately confirms every table line is unchanged and the prose diffs are wrapper-only.

The initial new check incorrectly expected the right-aligned Half MSE header to serialize without an attribute. Its failure log is retained in `light-prose-tables-initial-failure.log`; the corrected assertion accepts the original GFM alignment while preserving the header text/count. Successful output is retained in `light-prose-tables.log`. This was a test serialization correction, not a product/math change.

Six independent owned browser cases are authored, one per chapter. Each waits for fonts and checks full-document scrollWidth AND innerWidth against page.viewportSize().width in both themes on all three existing viewport projects. They visit every prose table, assert exact header/body/cell counts, contain wrapper bounds, test native focus/ArrowRight/positive scroll via polling only when the wrapper overflows, and assert the accepted non-scroll state when it fits. The III-25 case also checks the exact five headers/final worked row. They have not been run by the author.

## Compatibility and pending acceptance

Owner-only compatibility correction `d2be911c407dde5949ad71757da8853128d3d8b5`, tag `book-iii-wave-b-publication-budget-20261013`, was reported accepted/frozen with all 16 existing chapters' nine gates, 168 units, 41 Python tests, 171+171 browsers, reference hashes/protected trees passing. Original Wave A `911539e3` and its tag remain immutable.

The author did not merge/synchronize d2be911 or change main/shared files. The author branch still derives from the Wave A base; the owner will merge compatibility and audit exact scope against d2be911. No author heavy/type/build/browser/capture job ran.

Actual fresh root/subpath production browser tests and matching mobile captures are still required to confirm this root cause and correction. P04 remains runtime CORRECTION REQUIRED pending those owner results; no acceptance/freeze is claimed.
