# Part III — Trees: integrated review

Date: 2026-10-04. Scope: Chapters 10–17. No Chapter 0, Part II, or Part IV implementation is included. Nothing was deployed externally.

The supplied workspace had no usable Git history. Its accepted Milestone 2 files were snapshotted as `de7c087f8b7458a6987c246a69d167762ba8845e`; implementation was isolated on `part-iii-trees` in `/tmp/interactive-dsa-part-iii`. This commit identifies the supplied export, not an upstream canonical HEAD. The original source workspace was not edited. A delivery bundle contains the isolated history; `part-iii-delivery/checkout` is a durable independent checkout of that branch for review and integration.

## 1. Chapters completed

Each chapter has a registered route, hero, thirteen teaching sections, structure preview, interactive operations, complete downloadable C++20, source synchronization, invariant explanation, complexity explorer, engineering discussion, exercises, and reading progress.

| Chapter | Interactive scope | Canonical implementation |
| --- | --- | --- |
| 10 — Binary trees | A–E hierarchy, actual integer fields, subtree selection, complete-shape append, iterative clear | `chapter-10/BinaryTree.hpp` |
| 11 — Binary search trees | Insert/search/min/max/strict predecessor/successor/erase/clear; every path decision; duplicate rejection | `chapter-11/BinarySearchTree.hpp`, reusing Chapter 10 |
| 12 — Tree traversal | Preorder, inorder, postorder with actual recursive frames; BFS with FIFO queue; complete or BST shape | `chapter-12/Traversal.hpp`, observing Chapter 10 nodes |
| 13 — Mutation mechanics | Leaf, one-child, and successor-copy two-child erase; owning slots, bypass, destruction/freeing | Actual Chapter 11 implementation; `chapter-13/Mutation.hpp` is an alias/example |
| 14 — AVL trees | Insert/erase/search; LL/RR/LR/RL; nonempty middle-subtree transfer and ordered height repair | `chapter-14/AvlTree.hpp` |
| 15 — Red-black trees | Insert/search, P/U/G relationships, recoloring, rotations, four controlled invariant faults | `chapter-15/RedBlackTree.hpp`, including complete native deletion/fixup |
| 16 — B/B+ trees | Two independent labs: search/insertion/splits; B+ linked-leaf range scan | `chapter-16/BTree.hpp` and `BPlusTree.hpp`, both including native erase |
| 17 — Tries | Insert, complete-word search, prefix search, unmark/prune, empty word | `chapter-17/Trie.hpp` |

Numeric ordered trees consistently reject duplicate keys. Fundamental heights count edges, with empty height −1 and leaf height 0. AVL's actual stored convention is explicitly different: null 0, leaf 1. A–E are explained as display labels for actual integer values 65–69.

## 2. Interaction systems

All labs use the accepted operation form, previous/next, play/pause, speed, reset, scrubber, before/after views, line-number seeking, mobile source echo, text fallback, and logical/memory inspection. Allocation identities persist through individual link edits. Reversal selects retained snapshots; it does not claim native undo or resurrection.

BST deletion separates successor payload copy, owning-slot bypass, destruction, and freeing. AVL exposes pivot/transfer locals, child reassignment, height writes, and caller publication. RB shows real parent fields and separately observable recoloring/rotation writes. B-tree promotion removes a median record; B+ leaf promotion copies a separator while retaining the record in a leaf. Trie membership remains distinct from path presence.

DFS displays suspended callers and null calls; BFS exposes its actual pending FIFO. Chapter 12 links to Stack and explicitly explains Queue/Deque's unmerged Part II status without a broken chapter dependency.

## 3. Tree architecture and dedicated review

All families genuinely share ordered hierarchy placement, stable selection, edge routing, variable-width boxes, allocation view, live-field inspection, named references, auxiliary-state display, and text descriptions. `TreeScene` is a read-only presentation projection, not a global graph representation or algorithm reducer.

Chapters 10–13 share their actual binary node/model/ownership representation. Left/right vacancy placement and binary depth/height measurements remain binary-specific. BST ordering and owning-slot semantics are not imposed on B-tree pages or Trie character maps.

Balanced trees justify reusable diagram mechanics and rotation validation, but not one semantic rotation function. AVL returns a subtree root and publishes through `Node*&`; RB updates actual parent links and potentially the owner's root during rotation. Combining those algorithms would obscure their canonical statement order. Their model-local rotation helpers therefore remain separate.

B/B+ pages and Trie maps demonstrate the limit of binary abstractions: arbitrary ordered child counts, variable labels, copied separators, non-owning leaf links, and character edges must remain expressible without invented left/right or parent fields.

The hierarchy algorithm measures subtree widths and reserves binary null slots. Defensive identity sets render cycles, shared links, detached allocations, and tombstones without hanging. Stable identities and explicit snapshots preserve the meaning of rotations; movement is discrete, not a cosmetic morph that hides intermediate writes. Outside lanes handle non-hierarchy edges. Browser path sampling and 127-node geometry tests support this bounded teaching use. This is not a general graph layout solver.

## 4. Reused shared infrastructure

The generic engine, `LabAdapter`, `PlaybackController`, `TraceLab`, `InspectionDiagram`, source-region parser/highlighter, SVG primitives, lifetime vocabulary, navigation/search/progress, and theme tokens were reused. No generic playback or original chapter model was rewritten. No runtime dependency was added.

The only ordinary global edits register chapters/downloads, identify Part III accurately in the shared hero, describe the expanded search scope, and include the new C++ examples in validation.

## 5. New tree-local infrastructure

`src/visualizers/tree/` owns projection types, layout/routing, drawing, inspection, and explanatory complexity calculations. `src/scripts/tree-labs.ts` mounts chapter adapters and follows selected/active nodes within the diagram's own scrollport. References and auxiliary panels stay outside that scrollport; keyboard focus survives panel replacement. `src/styles/trees.css` extends the existing visual vocabulary only for trees.

`TreeComplexity.astro` uses deterministic evidence: actual median-first versus sorted BST search paths, the AVL minimum-node recurrence, the RB black-height bound, full-page capacity growth, and Trie character transitions. Bounds, idealized packed occupancy, and actual lab counts are clearly distinguished. Sparse-map Trie work is O(L log σ), summarized as O(L) only because σ ≤ 26 is fixed.

## 6. Invariant architecture

Each family supplies its own named invariant results. Foundations check ownership, acyclicity, unique parents, live targets, and strict order where appropriate. AVL adds cached heights and balance; RB adds colors, real parent reciprocity, and equal black height; page trees add capacity, arity, key ranges, uniform leaf depth and B+ separator/leaf-chain rules; Trie adds valid edge characters, unique paths, terminal membership and pruning.

Settled invariants may be pending during precise intermediate mutation states. They must pass at successful operation boundaries. Controlled foundation and RB fault widgets deliberately break and restore model snapshots; they never execute unsafe native C++ on corrupt pointers. Ended lifetimes expose no readable fields. Derived height/path/count/balance values are labeled as derived rather than invented object members.

## 7. C++ and semantic validation

Full Vitest result: **2,204 passing tests across 17 files**. This includes all **738 original tests**, **426 foundation tests**, **998 specialized tests**, **32 shared layout tests**, and **10 dedicated rotation tests**.

Foundation parity has 365 native cases. Instrumented copies of the shipped headers compare every tagged root/node topology and value, actual local `Node*` values, addressed `Node**` fields, output, queue/worklist cursor, actual recursive frames including null calls, and return results. Its remaining 61 tests cover scopes, reversal, source regions, faults, inputs and mutation oracles.

Specialized parity has 986 native cases comparing every tagged node/page/graph field and B+ range output. Twelve additional tests cover semantic scope restoration and native core behavior. Specialized temporary references and helper/block scopes are checked semantically, **not by native-local pointer parity**. This distinction is intentional and not hidden by the test total.

All thirteen chapter examples (1–5 and 10–17) pass `g++ -std=c++20 -Wall -Wextra -Werror -pedantic` with ASan, UBSan and leak detection. The integrated oracle adds 12,000 deterministic mixed operations, integer extremes, erase-to-empty, noncopyable/nonmovable assertions, and allocation-free cleanup of a 4,096-node skewed BST. Specialized validation also runs 60 × 350 mixed operations per numeric family, allocation budgets 0–29 at multiple tree sizes, deeper split failures, B+ rebuilding-erase failures, and Trie node/map allocation rollback during a partial word.

Page constructors reserve bounded vector capacity. Splits allocate siblings before rewiring and publish guarded roots only after successful splitting. A later failed allocation may leave completed splits in place but preserves membership and validity. Trie rollback removes newly unused suffixes while preserving prior words. Native examples validate canonical behavior beyond the browser's teaching bounds.

Formatting uncovered a whitespace-sensitive constructor hook in the foundation fixture; it now accepts canonical whitespace and fails explicitly if required constructor/DFS instrumentation anchors disappear. Full native parity passed after that correction.

## 8. Browser and deployment validation

Astro/TypeScript: **142 files, zero errors, warnings or hints**. Production builds produce **14 pages**: the entry route plus thirteen implemented chapters. Both `/` and `/book/` builds are validated. The prefixed deployment mounts all eight tree chapters, checks their thirteen section anchors and local links, and downloads all seventeen tree source files. All eight downloaded examples compile and execute with the real relative folder layout intact.

Final Playwright acceptance: **283 passed, 2 skipped** across desktop/tablet/mobile, with normal screenshot comparison and no baseline updates during the run. The two skips are the unchanged Chapter 1 mobile-only dock test in desktop/tablet projects. The suite retains all original chapter assertions and adds operation-specific tree checks, malformed/empty/duplicate inputs, all four AVL cases, RB recoloring/rotation/faults, B/B+ splitting/range, Trie prefix versus terminal/pruning, ended-lifetime inspection, source downloads, deep-tree following, focus retention, and shared playback/theme behavior.

Routing checks sample actual Chromium SVG paths in logical and memory views for balanced, skewed, cyclic and wide-page fixtures, and every distinct topology in representative successor deletion, AVL single/double rotations, RB parent repair, B/B+ splits and Trie pruning.

### One proven baseline artifact correction

The original Chapter 3 mobile lab image depicted `data / prev / next`, while the unchanged accepted renderer produces `prev / data / next`. The untouched baseline snapshot was built and served separately, then its original screenshot test was run without changes. It failed identically. The baseline build and Part III build produced byte-identical actual screenshots (SHA-256 `40d3580e8147749f3500638dd328dfad9223f324e72047d6aaff4cb51165036c`). Only `03-doubly-linked-list-lab-mobile-linux.png` was corrected from that baseline output. No Chapter 1–5 implementation, assertion, tolerance, or other accepted image was changed. This is the concrete correctness exception to the immutable regression floor.

Initial tree baseline creation generated 56 new images; those were visually reviewed before the normal comparison run. Earlier temporary 404 failures were traced to overlapping builds replacing `dist`, and eliminated by serving a stable production build during acceptance.

## 9. Visual and responsive review

Reviewed all eight chapter entries/workspaces at 1440×1000, 1024×900 and 390×844, plus dark desktop workspaces. The original navy/green engineering visual language, numbered teaching rhythm and source panel are preserved. Compact badges avoid collisions; wide pages and character edges use appropriate labels. RB color is also written as text.

Large diagrams pan inside their panels rather than widening the page. An active node at depth 14 stays visible on mobile; references and auxiliary state remain readable while the tree scrolls. Source code has its own horizontal/vertical scrolling. Selection highlights a subtree and exposes real links. No subtree-collapse feature was needed for the bounded experiments.

Supplementary evidence is under `tests/visual/trees/`: 56 entry/workspace images plus 22 mechanically significant state captures. `scripts/capture-trees.mjs` and `scripts/capture-tree-states.mjs` reproduce them. State review includes successor bypass, DFS frames, BFS queue, nonempty AVL transfer, restored double rotation, RB recolor, B/B+ promotion, B+ range output, Trie unmark, and deep skewed search.

## 10. Accessibility

The shared browser suite runs axe WCAG 2 A/AA and WCAG 2.1 AA checks in light and dark themes at each viewport. Keyboard Enter/Space selection, real buttons for references, focus restoration, named links/regions, text descriptions, explicit color labels, mobile inspector disclosure and the playback dock remain available. Page overflow and browser runtime errors are checked. Automated axe coverage is not a claim of a full assistive-technology certification.

## 11. Prerequisite ledger

`CPP_PREREQUISITE_LEDGER.md` now records only actual uses: recursive data/calls, `Node**` and `Node*&`, helper/frame scope, private inheritance and `using`, virtual cleanup, deleted ownership copies/moves, vector/queue worklists, cached heights, bool color, real parent pointers, reserved nested vectors, iterator/range operations, exception guards/rollback, non-owning leaf links, string views, lowercase validation, sparse maps and structured bindings. Test-only RAII watchers, allocation injection and oracles are distinguished from canonical APIs. No comparator-concept syllabus or Chapter 0 was added.

## 12. Known limitations and explicit choices

- Browser experiments are bounded: foundations allow at most 15 initial/16 live integer nodes; specialized numeric inputs allow at most 24 initial integers; values are within ±999. Trie allows eight initial words of up to twelve lowercase ASCII characters; canonical Trie words are bounded to 64. Native numeric APIs accept the full `int` range.
- RB's main browser lab covers insertion/search. Full native deletion is implemented and validated, but is not presented as a simplified animated algorithm. B/B+ browser labs similarly concentrate on insertion/search/splits/range, with native deletion coverage supplied separately.
- B+ erase deliberately rebuilds in O(n log n) time and O(n) temporary storage. It is not an in-place logarithmic borrow/merge implementation. The chapter and source state this directly.
- Recursive DFS can exhaust the native call stack on an arbitrarily deep unbalanced tree. Foundation destruction is iterative; valid AVL/RB/page owners have bounded height; Trie validates maximum word length.
- Teaching addresses are illustrative stable identities, not measured native addresses or byte-contiguous allocation claims. Browser snapshots do not simulate native address reuse. Foundation allocation failures are not injected; specialized native tests do inject failures. Browser exception traces do not animate allocator internals, `std::map` internals, or vector reallocation.
- The layout is deliberately tree-local and supports the supplied finite experiments; it does not promise optimal edge routing, graph cycles as a data structure, arbitrary million-node rendering, or smooth geometric tweening.
- Complexity bars are explanatory model counts and bounds, not wall-clock benchmarks. Browser counters count tagged teaching events rather than all machine instructions or internal standard-library comparisons.

## 13. Proposed global abstractions

No promotion is required now. The only generic strain was keeping auxiliary panels visible during two-dimensional diagram scrolling and retaining focus when those panels are replaced. A future optional diagram-panel hook could be useful if Part II independently needs it, but this milestone solves it in the tree mount. Keep hierarchy/routing, subtree selection, tree invariants, rotations, and page/Trie projections tree-local. Do not introduce a universal graph scene, global rotation API, or shared semantic model.

## 14. Concurrent Part II integration

This branch depends only on the supplied Milestone 2 export. Integrate against Part II's accepted canonical HEAD before considering cross-part promotion. Preserve Part II additions when merging `src/content/book.ts`, `BookNav.astro`, `ChapterHero.astro`, `BookLayout.astro`, source download registration, `scripts/check-cpp.mjs`, README and the ledger. Navigation should list all actually integrated chapters in numeric order; Part II needs its own hero label and should replace the planned queue callout only when its routes exist. Preserve header download directories because Chapters 11–13 include sibling chapter paths. There are no dependency/version changes to reconcile.

Carry forward the documented stale-image correction separately from tree implementation if needed. Re-run the combined chapter, source, search, prefix-hosting, sanitizer and visual suites after merging; do not wholesale regenerate existing screenshot baselines.

## 15. Recommendation for Part IV

Part III supplies sufficient local architecture for the implemented trees. Before beginning hashing, integrate/review Part II and Part III against the accepted canonical repository and preserve their regression floors. Hash tables should justify their own representation and probes rather than inherit tree hierarchy semantics. Continue the prerequisite ledger from concrete code. **Stop here: Part IV has not been started.**
