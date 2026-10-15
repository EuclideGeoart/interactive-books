# Wave B — ACCEPT / FREEZE

Independent integration-owner acceptance on **2026-10-14**. Wave B adds III-17–25; III-01–25 are now published. Validated combined source: `06529c0c52215555bcc1a53d80f2bd8dc977bbce`. Local immutable delivery tag: **`book-iii-wave-b-freeze-20261014`**. The delivery commit includes these final records and evidence without changing the validated executable source or configuration; resolve its exact SHA with `git rev-parse book-iii-wave-b-freeze-20261014^{}`. The exact resolved delivery SHA is also returned in the final owner response.

**Stopping condition: Wave B is complete. Wave C is not started.** No Parts V–IX implementation, new Wave C agent/worktree, push, deployment or canonical-main promotion is included.

## Branches, decisions and provenance

| Role | Verified source / commit | Decision |
| --- | --- | --- |
| Starting integration / canonical main | `d2be911c407dde5949ad71757da8853128d3d8b5` | Preserved compatibility baseline |
| Part III branch | `93d6eb37c1889acacf3cf329cb21db832beb5c2e` | Mathematical ACCEPT; technical ACCEPT |
| Original Part IV handoff | `72a7a1df85d3e5870e1d6b223d84691a768adbb6` | CORRECTION REQUIRED by independent lesson-query review |
| Corrected Part IV branch | `976a8dd8db5dcd0261e0bf6cd1df32fec431bc6b` | Mathematical ACCEPT; technical ACCEPT |
| Independent acceptance record, before merges | `8a124a3b2b1d9200addc4f8ee5608aa28f831f7f` | Both Part decisions and retained evidence committed |
| Part III owner merge | `ac5e515423fbdec48bea7ef673dfe806b4d20b8d` | Accepted exact source, 38 owned paths |
| Part IV owner merge / combined source | `06529c0c52215555bcc1a53d80f2bd8dc977bbce` | Accepted exact corrected source, 35 owned paths |
| Wave B delivery | `book-iii-wave-b-freeze-20261014` | FREEZE |

Branches remain `feature/book-iii-foundation`, `feature/book-iii-part-iii-instance-probabilistic` and `feature/book-iii-part-iv-trees-ensembles` in their existing locked D-volume worktrees. Both merges preserve history and author provenance. Their merged owned payloads exactly match the independently accepted Part sources. Canonical `main` remains at d2be911. Detailed decisions are [Part III](WAVE_B_P03_ACCEPTANCE.md) and [Part IV](WAVE_B_P04_ACCEPTANCE.md); full changed-path provenance is in [MERGES.json](validation/wave-b/continuation-owner/MERGES.json).

## Actual nine-gate results

| Gate | Corrected P03 | Corrected P04 | Combined Wave B |
| --- | --- | --- | --- |
| Type/content | 0 errors/warnings/hints | 0 errors/warnings/hints | 0 errors/warnings/hints, 95 files |
| Unit/parity | 62 / 6 files, including 45 Part units | 79 / 7 files, including 62 Part units | 275 / 16 files |
| Oracles/freshness | 3 commands; 22 Python tests; 6 literal groups | 2 commands; 15 Python tests; 23 fresh cases | 14 commands / 4 Parts; 78 Python tests; all registered fixtures fresh |
| Root production/offline build | 31 pages | 34 pages | 37 pages |
| `/machine-learning/` build | 31 pages | 34 pages | 37 pages |
| Root production audit | 19 published chapter routes pass | 22 published chapter routes pass | All 25 routes, internal links/assets and PWA paths pass |
| Subpath production audit | Pass | Pass | Pass |
| Root real browser | 102 pass | 162 pass | 303 pass |
| Subpath real browser | 102 pass | 162 pass | 303 pass |

Every accepted runner exits **0**, and every gate records unchanged sources. Each raw browser report has **zero unexpected failures, skipped cases, flakes and report errors**. Both themes retain complete page accessibility scans and physical viewport assertions. The existing scan time budget and all numerical/accessibility/geometry assertions are preserved.

The actual core commands are `npm run validate:focused -- --part p03`, `npm run validate:focused -- --part p04`, and `npm run validate:milestone`, executed from the corresponding Book directories. Current continuation jobs run through the owner wrapper under `flock /tmp/interactive-books-heavy-gate.lock`; its exact child argv, cwd, source SHA, signatures, exit and artifact hashes are in the respective `RUN.json`. The runner's actual per-gate argv are in each manifest. The P03 corrected-source owner run was discovered after the handoff timestamps and reused after confirming its raw exit, source signature and final source. The earlier c0962c9 and cccfd3f passing runs are separately retained historical evidence.

| Scope | Validation signature | Source-bound evidence |
| --- | --- | --- |
| P03 | `240aab9e0a654d9eea48fb62b698b0e46132074530b565f9c2fbbcf485a9700a` | [Manifest](validation/wave-b/continuation-owner/p03/FOCUSED_MANIFEST.json), raw log/exit/browser reports beside it |
| P04 | `1ba7edcadaa95e91eb7d715c3b995e8e792f84bf9475d005418845cf24e792ff` | [Manifest](validation/wave-b/continuation-owner/p04-corrected/FOCUSED_MANIFEST.json), RUN.json/log/exit/browser reports beside it |
| Combined | `7c0c8208935ee18e796dafa13536f984d5e6f1cababa68c0af2f62e0d07afd44` | [Milestone manifest](validation/wave-b/continuation-owner/combined/MILESTONE_MANIFEST.json), RUN.json/log/exit/browser reports beside it |

The combined run started `2026-10-13T22:14:54.194Z` and finished `22:30:01.666Z` (2026-10-14 in Europe/Berlin). Root browser duration was 443.234 seconds; subpath was 432.512 seconds. The inspected runner selected every registered Part, with no Part-only milestone label. Execution used native Linux Node 24.18.0, Python 3.12.3, NumPy 2.5.3 and Google Chrome 155.0.8059.39 through the existing dependency overlays. No dependencies were installed or replaced.

## Independent numerical review and necessary correction

The continuation passed **38 owner TypeScript challenges** (19 per Part) and **29 additional actual canonical Python assertions** (11 P03, 18 P04). [The mathematical review](validation/wave-b/continuation-owner/MATHEMATICAL_REVIEW.md) records independent methods, exact challenge inputs, results and retained failures. Exhaustive subsets/partitions, Fraction moments/products/residual stages, Decimal norms/entropy and closed-form integer seed states remain separate from canonical NumPy and browser algorithms.

P03 meets sparse observation/replay rejection, stable duplicate identities, exact computed distance/vote ties, k>n undefined outputs, supplied-scale validation, binary64 quantity interpretation, retained dimensional prefixes, normalized tiny summaries, exact Bayes decisions, impossible evidence, unavailable estimates and output-underflow contracts. Its corrected undefined explanations describe the active reason.

P04 meets legal weighted split selection and threshold ordering, actual mean/SSE and root-normalized pruning, exact constant-decimal behavior, disjoint reserved random streams, per-node feature subsets, actual OOB predictions/evaluation, sequential residual fitting and half-MSE conventions. Kernel sparse rows, terminal queries and means reject missing values before early returns.

Fresh owner review additionally reproduced sparse lesson queries accepted with zero trees/stages, yielding NaN geometry. Original delivery 72a7a1d was held as CORRECTION REQUIRED. The owner retained the failing test and cancelled its partial run after seven passing gates (subprocess SIGTERM return -15; shell 241), then committed the minimal query guard, one owned regression and correction note as 976a8dd. The subsequent complete nine-gate run accepts that exact corrected source. The cancelled run's cached old browser JSON is explicitly historical, never a current pass.

An initial owner challenge had an incorrect expectation about identical floating posterior bits; its failure and test source remain retained, followed by a mathematically appropriate coincident-posterior fixture. Capture-only failures also remain: an extra exact-font assertion and a Distribution selector timeout were corrected using the existing measurement bound and already-passing combobox locator. These corrections changed no book tolerance, oracle or product behavior. Original raw logs retain their whitespace; the raw-log whitespace check is recorded, while source/prose whitespace checks pass.

## Actual visual, responsive and accessibility acceptance

All **104 Part production image hashes** verify (37 P03, 67 P04). They cover every Wave B chapter, 1440×900 desktop, 820×1180 tablet, 390×844 mobile, both themes, both mounts, chapter openings and meaningful edge states. The owner actually reviewed all 54 canonical root layouts in nine contact sheets and the explicitly listed original/detail views. Hash/DOM checks for remaining captures are distinguished from pixel inspection in [VISUAL_REVIEW.json](validation/wave-b/continuation-owner/VISUAL_REVIEW.json).

Controls, fieldset legends, formulas and inspectors remain contained and readable. Plots preserve class shapes, query/threshold/prediction roles and declared scales. Undefined k-NN/Bayes states explain their reason; pruned regression and zero-stage boosting expose their actual values. Wide stage ledgers and all five P04 prose tables scroll within bounded accessible wrappers. Real keyboard scrolling, pointer/numeric/focus/reset/replay behavior, painted geometry and both-theme full-page physical widths pass at both production mounts. The minimum recorded plot font measurement is 13.99998375 CSS pixels, reflecting projection quantization within P03's existing 13.99 measurement bound; P04 retains its existing >=14 check. No threshold was widened.

An additional **24 combined navigation hashes** verify. Source-bound production captures confirm 25/41 available chapters, nine Part rows, three accepted P03 chapter links and six P04 links. The owner viewed the desktop light home, tablet dark P03 index and mobile light P04 index originals; exact coverage is in [NAVIGATION_INVENTORY.json](validation/wave-b/continuation-owner/combined-navigation/captures/NAVIGATION_INVENTORY.json). The combined browser suites independently exercise all registered navigation and chapter routes, accessibility, offline reload and strict production serving.

## Preservation, status and remaining limits

All **13 III-07 reference hashes and required oracle registrations**, every accepted fixture, original freeze tag and all **74 pre-existing Wave B evidence files** remain unchanged. All **798 accepted baseline paths in each of the three checkouts** verify (2394 hash comparisons); no blanket regeneration occurred. Book I tree remains `96aaf3a70b3d21c2f736c20509af20426c01a22f`; Book II remains `0e1121b8121dfac9d41af8df45573d07ca15e87a`. Original foundation/reference and Wave A acceptance are preserved, with earlier Parts covered only as part of the required combined milestone.

Pre/post-merge and final preservation records live under `validation/wave-b/continuation-owner/`. At completion, all three worktrees are clean in tracked and nonignored untracked state; only ignored build/cache/artifact outputs remain. Their Linux-only administrative locks are retained. Canonical main is clean and unchanged at d2be911. No Git lock or owner validation process remains active.

Acceptance is within the required native Linux Chromium scope. Native Windows, other engines, physical hardware, human screen-reader sessions and deployed Book II prerequisite destinations remain unverified. Educational algorithm/data bounds and explicit binary64/underflow limits remain documented per Part. Wave B has no unresolved blocker within its acceptance scope.

The separate conversation handoff is [WAVE_C_OWNER_HANDOFF.md](WAVE_C_OWNER_HANDOFF.md). This session stops after the Wave B freeze.
