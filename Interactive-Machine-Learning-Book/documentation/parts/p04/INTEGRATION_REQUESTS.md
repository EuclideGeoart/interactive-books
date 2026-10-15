# P04 integration requests

## WB-P04-01 · measured shared publication-test scan budget

Status: owner-only compatibility correction ACCEPTED/FROZEN at `d2be911c407dde5949ad71757da8853128d3d8b5`, tag `book-iii-wave-b-publication-budget-20261013`. Owner reports all 16 existing chapters passed the nine-gate regression (168 units, 41 Python cases, 171+171 browser). Pending owner merge into this branch; author has not synchronized or changed shared files.

Owner-owned paths: `tests/e2e/platform/book.spec.ts` and shared browser validation/config. No shared change was implemented by the Part author.

Retained failing fixture: production source `6312c583b81f2ccbbe0df63b21f6281ec416aa4f`, root browser run with the existing two workers, mobile 390px project and default 30-second test limit. The per-chapter test `III-24 publication, hydration, exercises, both-theme accessibility and narrow layout` times out while it performs both full-page Axe scans and publication checks; concurrently scheduled III-25 also exercises this larger-page workload. The retained report has seven shared publication timeouts (III-24/25 tablet; III-20..24 mobile). The full root result is 121 passed / 23 failed, actual CLI exit 1; subpath was not run.

Evidence: `artifacts/integrator-focused-validation-6312c58.log`, `artifacts/browser-root.json`, and `artifacts/integrator-browser-diagnosis-6312c58.json`, preserved read-only. The measured page has 4551 DOM nodes / 281327 HTML characters. Single-worker light/dark Axe durations are 6675.239984/6412.163992 ms with zero violations. Owner reported numeric commits 34 ms and page load 192 ms. Concurrent scan timing is separate from interactive UI responsiveness.

Original request: owner select a measured validation-budget/scheduling correction preserving both-theme scans, strict physical viewport checks and mobile coverage. Owner has completed and approved that compatibility work. The author leaves its merge and exactdiff validation to the owner.

Separate retained issue: III-25 mobile's shared publication result is `failed`, at `book.spec.ts:58`'s physical-width guard (20534 ms), rather than a timeout. Owner source/failure-image inspection identifies the unwrapped III-25 worked-stage prose table. The separately authorized Part correction wraps all five prose tables with the shared accessible scroll pattern, preserving every table line. Fresh production/browser/capture confirmation is still required; a budget increase does not hide this physical-width guard.

## Part-local correction and remaining gates

The owned native-table keyboard test now polls real scrollLeft after focus/ArrowRight, matching the owner's observed immediate 0 → 40 after 250 ms. No redundant keyboard behavior or skip was added. The additional authorized prose containment uses shared overflow-dependent role/tabindex semantics and six bounded per-chapter physical-width browser cases. Mathematical/widget state and fixtures remain unchanged.

The six chapter/two oracle manifests, controls, seed generator, immutable traces, prerequisite resolver and shell retain the accepted contracts. No shared mathematical/platform request is open. Owner-controlled corrected root/subpath browser and visual acceptance remain pending; see HANDOFF.md, BROWSER_SCROLL_CORRECTION.md and PROSE_TABLE_CORRECTION.md.
