# Part VII review — Algorithmic Techniques

Chapters 45–50 are implemented in the shared root checkout. The delivery also
includes the user's subsequent request to fit all graph, tree and heap diagrams
inside their panels by default. Chapter 0 and Part VIII remain unimplemented.

## 1. Chapters completed

| Chapter | Canonical demonstrations | Source |
| --- | --- | --- |
| 45 — Recursion | Factorial, recursive and iterative | `cpp/chapter-45/Recursion.hpp` |
| 46 — Backtracking | Increasing k-subsets with choose, explore, undo and pruning | `cpp/chapter-46/Backtracking.hpp` |
| 47 — Divide and conquer | Stable merge sort, subranges and combine buffers | `cpp/chapter-47/DivideConquer.hpp` |
| 48 — Greedy algorithms | Earliest-finish interval scheduling; largest-first coin counterexample | `cpp/chapter-48/Greedy.hpp` |
| 49 — Dynamic programming | Fibonacci invocation tree → dependency DAG; minimum coin change | `cpp/chapter-49/DynamicProgramming.hpp` |
| 50 — Memoization and tabulation | Two evaluation orders for the same minimum-coin recurrence | `cpp/chapter-50/MemoTabulation.hpp` |

Each chapter has a hero, exactly 13 authored sections, a selectable mental-model
preview, an interactive source-synchronized lab, complexity explanations,
misconceptions, applications, challenges and cross-chapter links. Canonical
listings and downloads come from the actual headers, not copied C++ fences.
All 22 relative links authored in these six chapters resolve to chapter routes.

## 2. Visualization architecture

`src/visualizers/techniques/types.ts` defines a small Part-VII presentation
vocabulary: conceptual frames, positioned decision nodes, cells, dependencies,
execution tables and counters. `recursive.ts` and `optimization.ts` own their
respective semantics and extend that vocabulary. `presentation.ts` draws it;
`adapter.ts` supplies operation controls, sources and invariants.

The implementation reuses `Trace`, `PlaybackController`, `LabAdapter`,
`TraceLab`, `InspectionDiagram` and the existing SVG arrow primitives. It adds
no dependency and no universal interpreter. Reverse playback selects earlier
immutable snapshots rather than attempting inverse operations.

The later fit refinement is shared presentation code in `diagram-fit.ts` and
`diagram-fit.css`. It scales the complete existing SVG viewBox within the
available width and a height capped at `min(520px, 65vh)`. It does not move nodes,
reroute edges, mutate state or change source synchronization. Fit diagram and
Actual size are native keyboard-operable buttons. Non-tree/graph diagrams retain
their existing presentation. Heap sort is recognized through its existing
chapter/preview identity and uses the same fit treatment, including an empty
active heap; its sorting renderer and semantic model are unchanged.

## 3. Recursion and call-stack model

Factorial supports n = 0…8. Each call retains its own argument, pending child,
returned child value and local answer as appropriate. Frames identify a
conceptual resume location and pending/completed return; they invent no native
addresses, registers or ABI frame bytes. The scene combines calls, active stack,
source highlight, counters and result. The iterative variant makes accumulator
updates and its single conceptual frame explicit. Base cases, depth, unwinding
and real stack-overflow risks are explained in prose.

## 4. Backtracking state model

The bounded domain is n = 0…6, k = 0…6. k > n is a valid problem with no solutions;
k = 0 produces the empty combination. Candidates increase, making each subset
unique. Snapshots expose the prefix before choice, after push, throughout child
exploration and after pop. A remaining-candidate bound explicitly prunes branches.
Unexplored, current, accepted, rejected/pruned and completed solution states
have text as well as color. Saved solutions are independent copies.

Stable preorder coordinates preserve identity throughout exploration and undo.
The full search tree fits by default; Actual size and the inspector provide
readable detail when a large bounded example becomes visually dense.

## 5. Divide-and-conquer representation

Merge sort accepts at most eight signed integers in ±1,000,000. Frames and nodes
show half-open ranges, their disjoint children, midpoint and combine work.
Temporary-buffer writes and copy-back appear separately. Equal values select the
left record; original indices make stability observable. Empty and singleton
ranges terminate directly. The text develops levels × work per level, contrasts
independent ranges with overlapping DP states, and links to Part VI through
content routes without importing its implementation.

## 6. Greedy correctness and counterexamples

Interval scheduling sorts by finish time with stable input-order ties, then
commits compatible half-open intervals. The chapter supplies the exchange
argument for maximum cardinality and distinguishes rejection from backtracking.
An independent exhaustive compatible-subset oracle checks small fixtures.

For coins {1,3,4}, target 6, largest-first chooses 4+1+1 while DP proves the
optimum is two coins. The tests also cover {3,4}, target 6, where greedy gets
stuck despite a valid 3+3 solution. Greedy failure is not reported as a proof of
infeasibility. The chapter links justified greedy graph algorithms rather than
reimplementing them.

## 7. DP states and recurrence

Fibonacci n = 0…6 first exposes distinct invocations of repeated states, then
collapses them to one node per F(i), with dependencies and table writes in valid
order. Coin change provides the substantive optimization example:

`dp[a] = min(1 + dp[a-c])` over available positive coins c ≤ a whose dependencies
are reachable, with `dp[0] = 0`.

The table distinguishes unknown, proven unreachable and resolved numeric
optima. A local best with no reachable candidate yet is distinct from a cache
cell already proved unreachable. Dependencies, candidate reads, selected values
and final writes are visible separately. Positive denominations make all
recurrence dependencies smaller; arithmetic never treats an unreachable sentinel
as a usable optimum. Inputs allow up to six distinct denominations 1…16 and a
target 0…16, including an empty denomination set.

## 8. Memoization versus tabulation

Both operations in Chapter 50 evaluate exactly the same recurrence. Memoization
shows calls, misses, hits, retained best/pending-child locals and cache writes;
a cached unreachable value is still a hit. Unvisited states remain unknown.
Tabulation initializes and resolves the full bounded amount domain in ascending
order. Both distinguish zero target from a positive unreachable target.

The chapter compares evaluated states, transition counts, stack depth, workspace,
order and reconstruction tradeoffs without asserting a universal winner. The
canonical tabulation code is self-contained in Chapter 50's downloaded header.
Optimal counts are implemented; solution reconstruction is discussed, not claimed
as an implemented feature.

## 9. Test totals

Validation logs are under [`validation/part-vii`](validation/part-vii/).

- Part VII unit/integration tests: **142 passed** (82 recursive-family,
  49 optimization-family, 11 shared integration).
- Final shared-root unit suite: **5,887 passed in 43 files**, including
  the concurrent Part VI oracle suite (`final-unit.log`).
- Frozen baseline browser run: **648 passed, 2 existing skips**; one
  timing-sensitive Chapter 23 pause assertion passed its unchanged focused
  rerun (`regression-browser.log`, `regression-recheck.log`).
- Updated visual/Part VII interaction run: **102 passed** (`fit-visual.log`),
  comprising 84 affected chapter-entry/workspace cases and 18 Part VII
  operation/accessibility cases. The three navigation/strategy cases also
  passed, alongside three unobstructed dense-tree captures (`fit-detail.log`).
- Post-fit regression for affected original chapters: **183 passed**,
  including both-theme axe checks, all operations, playback, keyboard focus,
  deep trees and intermediate tree routing (`final-regression.log`).
- Heap-sort fitting follow-up: **15 passed** across all three layouts, including
  fitting after the active heap becomes empty, source/mutation checks, axe and
  refreshed screenshots (`heap-sort-fit.log`).
- Astro check: **329 files, zero errors, warnings or hints** (`final-check.log`).
  Root and `/book/` builds each produced **51 pages**.

The recursive suite compares every tagged native/TypeScript semantic snapshot
for both factorial variants across their full domain, all 49 n/k combinations
and eight merge-sort fixtures. A separate sort oracle covers every ternary array
through length five. The optimization suite compares 42 native execution cases;
independent oracles enumerate interval subsets and use BFS for all subsets of
{1,2,3,4} across targets 0…12 in all three DP strategies. These checks supplement
parity rather than assuming two agreeing implementations must be correct.

Regression assertions cover initial settled-state handling, retained child and
answer locals, memo base best = 0, exact reverse playback, stable positions,
unique canonical source tags, dependency endpoints, malformed inputs and
mutation detection.

## 10. C++ validation

All six new standalone mains passed C++20 compilation with
`-Wall -Wextra -Werror -pedantic`, AddressSanitizer, UndefinedBehaviorSanitizer and
leak detection (`cpp.log`). The full native runner also passed Chapters 1–50
(`full-cpp.log`). The documented `/book/` deployment separately mounted all
50 chapters and 650 sections, verified navigation/search with no runtime errors
or global overflow, published **102 clean source files**, and compiled/executed
all **50 downloaded examples** under warnings-as-errors, ASan, UBSan and leak
detection (`deployment.log`). Launcher cold start, existing-server reuse and
rejection of an older book passed (`launcher.log`); its startup allowance now
accommodates compilation of the complete book. Native observer fixtures compare actual source executions with
TypeScript snapshots, including frame locals, intermediate tables and counters.

Canonical code bounds inputs before tracing, terminates recursive calls,
restores mutable search state and guards sentinel arithmetic. Observer callbacks
are optional, nonmutating and nonreentrant. Prose distinguishes core algorithm
workspace from retained teaching metadata, history and snapshot-copy costs.

## 11. Browser and accessibility results

The browser matrix is 1440×1000, 1024×900 and 390×844, with light/dark checks,
keyboard inspection, source jumps, every operation, playback, reverse, scrub,
speed, mobile controls, search, navigation and downloads. New HTML tables have
captions and row/column headers. Preview and lab landmarks are uniquely named.

The dedicated fit suite passed **84 distinct checks** (81 in `fit-browser.log`,
plus the three heap-sort cases in `heap-sort-fit.log`): every eligible chapter in both
views, initial and intermediate states, keyboard selection, stable geometry,
mode persistence and absence of diagram scrolling on either axis. The full SVG
viewBox is checked after screen transformation, so hiding overflow alone cannot
satisfy the test. A maximum-domain Fibonacci fixture verifies whole-tree fitting
and restoration of actual-size scrolling.

## 12. Visual review

The user explicitly superseded the initial default-scrolling requirement with
whole-diagram fitting. The fit applies to Chapters 9–17, 24–36, 43, 45–47 and the
Fibonacci view in 49, including their previews and labs. Tables and stack lists
keep independent contained scrolling. Controls are hidden when no eligible
diagram is present, including coin-only views.

Affected screenshots are updated for this requested visual change. Original
algorithm sources, routing geometry, playback semantics and unaffected baseline
screenshots remain the regression floor. New Part VII screenshots cover all six
labs at all three sizes in both themes, plus chapter entry and initial-workspace
views. All 36 Part VII midpoint captures were visually reviewed, together with
representative original heap, binary/page-tree and graph layouts. Hash checks
confirm **179 protected algorithm, engine, canonical C++ and authored chapter
files unchanged**; **87 original screenshots** changed only in the authorized
fit scope, with all other baseline screenshots unchanged (`integrity.json`).
Dense trees retain their full topology; labels can become small in fit
mode, with Actual size and full-size inspection as the explicit detail paths.

## 13. Prerequisite additions

[`CPP_PREREQUISITE_LEDGER.md`](CPP_PREREQUISITE_LEDGER.md) records actual uses of
recursive functions, continuation locals, mutable reference parameters,
`push_back`/`pop_back`, copied solutions, half-open ranges, vector invalidation,
`std::move`, `std::iota`, stable sorting, generic self-recursive lambdas,
`std::optional<int>`, numeric sentinels and observer snapshots. Validation-only
oracles and sanitizer techniques are identified separately. Existing milestone
records and the concurrent Part VI section are preserved.

## 14. Known limitations

Educational inputs are deliberately bounded. Exponential call/search trees,
metadata and full snapshot history are not suitable for unbounded production
inputs. The browser illustrates canonical C++ execution; it does not compile
arbitrary input programs or model allocation failures, native stack layout or
elapsed CPU time. Dense fit views favor complete topology; Actual size is needed
for direct reading of very small labels. Counts and source events describe the
chosen implementations, including their teaching instrumentation.

## 15. Proposed reusable abstractions

Keep the frame/cell/dependency presentation local to Part VII. Future reuse
should follow matching semantics, not similar rectangles. Shared playback,
inspection, canonical source extraction, SVG primitives and diagram fitting
already cover the demonstrated common needs. No symbolic executor or generic
recurrence engine is proposed.

## 16. Part VI integration considerations

Part VI was developed concurrently in the same checkout. Its files, registry
entries, source routes and ledger section are retained. Part VII imports no
unfinished Part VI semantic code or comparison/swap primitives. Content links
connect related examples without implementation coupling.

The integrated build exposes Chapters 1–50, 650 authored sections and additive
navigation/search/source endpoints. A frozen Chapters 1–36 plus Part VII build
was also used to verify the original regression floor independently of Part VI.
This review reports shared integration checks; it does not replace Part VI's
separate acceptance review. Any abstraction reconciliation should wait until
both Parts are accepted.

## 17. Recommendation for Part VIII

Proceed only when the user authorizes the next milestone. Keep engine/systems
ownership, allocation and storage invariants chapter-owned; reuse the established
inspection and playback infrastructure where semantics agree. Begin from the
master plan's Chapter 51 scope and preserve the now-integrated regression floor.
No Chapter 0 or Part VIII implementation is included in this delivery.
