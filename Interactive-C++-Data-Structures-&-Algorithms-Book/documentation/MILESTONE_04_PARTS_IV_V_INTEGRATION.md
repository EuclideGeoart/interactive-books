# Milestone 04 — Parts IV/V integration

Date: 2026-10-04. Canonical scope: Chapters **1–36**. Authority: [master plan](INTERACTIVE_DSA_BOOK_MASTER_PLAN.md), the accepted [Part IV delivery review](../part-iv-delivery/checkout/documentation/PART_IV_REVIEW.md), and [Part V review](PART_V_REVIEW.md). This is file-based additive reconciliation, not a claim of an upstream Git merge.

**Integration accepted:** 4,074 unit/native-parity tests; all 36 canonical and 36 downloaded sanitizer programs; 649 browser passes with two established platform skips; clean strict checks; root and `/book/` builds. All accepted application/C++ source and 252 visual reference images are unchanged.

## 1. Canonical Chapters 1–36 state

| Part | Chapters | Canonical coverage |
| --- | --- | --- |
| I | 01–05 | Linear structures and memory |
| II | 06–09 | Queues and ordered access |
| III | 10–17 | Trees |
| IV | 18–23 | Hashing |
| V | 24–36 | Graphs |

There are exactly 36 registered chapter routes, each with thirteen learning sections, and one landing page. Chapter 23 navigates forward to 24; 24 navigates backward to 23. Chapter 36 is the last implemented chapter. Search contains all 468 chapter sections. Progress remains independently keyed by chapter, while theme and navigation span both Parts. Chapter 0 and Parts VI/VII were not implemented.

## 2. Files and registries reconciled

The accepted implementations were already present together. Inspection confirmed that their shared changes were additive; no directory or shared application file needed wholesale replacement.

| File or area | Reconciliation |
| --- | --- |
| `src/content/book.ts` | Verified exactly 01–36 in numeric order, with no duplicate or missing chapter. |
| `src/components/book/BookNav.astro` | Verified five implemented groups of 5/4/8/6/13 chapters, with later Parts visibly planned. |
| `ChapterPagination.astro`, `BookLayout.astro`, `src/content/search.ts`, `src/scripts/book.ts` | Existing registry-driven pagination/search and chapter-local progress already integrate both Parts; retained. |
| `src/scripts/hash-labs.ts`, `graph-labs.ts`, `chapter-labs.ts`, `tree-labs.ts` | Existing mount boundaries and adapter keys retained. |
| `src/pages/source/[...path].ts` and Chapter 1 source routes | Verified publication through 36, including every dependent header; retained. |
| `scripts/check-cpp.mjs` | Retained the 01–23 runner, tree/hash integration checks and graph-owned 24–36 runner. |
| `README.md` | Updated canonical scope, launcher behavior, frozen regression workflow and report links. |
| `open-book.sh` | Replaced the old tree-only readiness check with checks for both Chapters 23 and 36. Preserved normal invocation and `BOOK_PORT`. |
| `playwright.config.ts` | Added optional `BOOK_TEST_DIST`; a frozen build always gets a test-owned preview server. Existing projects, assertions and tolerances remain unchanged. |
| `documentation/CPP_PREREQUISITE_LEDGER.md` | Preserved all accumulated rows; clarified integration status and Chapter 0 deferral until after Part IX. |
| `tsconfig.json` | Existing exclusions cover both frozen delivery directories; retained. |
| New validation coverage | `parts-iv-v-integration.spec.ts`, `validate-book-deployment.mjs`, `validate-book-launcher.mjs` and `capture-integration.mjs`. |

## 3. Conflicts discovered

The README still described Chapters 1–23 and Part V as concurrent work. The launcher would accept any older book that served Chapter 10, including one missing hashing or graphs. Those two stale integration assumptions were corrected.

No unresolved algorithm conflict, missing accepted file, source-publication conflict, navigation gap or prerequisite loss was found. The Part V source-publication additions already coexist with all Part IV globs. TypeScript already excludes the frozen source copies. No accepted chapter correctness defect required an implementation change.

## 4. Preservation of concurrent work and evidence

The Part IV manifest contains **575 files**. Its frozen checkout matches every recorded SHA-256 value. Every corresponding file exists in the canonical root. Before integration, only six differ: README, prerequisite ledger, native runner, navigation, chapter registry and source route. Their differences are documented in [delivery-comparison.json](validation/milestone-04/delivery-comparison.json); the five code/ledger differences are the expected additive graph integration.

The integration records [source-before.json](validation/milestone-04/source-before.json) and a final [integrity audit](validation/milestone-04/integrity.json). **All existing application files under `src/`, all canonical C++ under `cpp/`, all accepted tests, and all 252 screenshot baselines remain byte-for-byte unchanged.** Only four pre-existing files were edited: README, the ledger's final scope note, the launcher and Playwright configuration. New tests/tools and evidence were added separately.

Neither `part-iii-delivery/` nor `part-iv-delivery/` was deleted or edited. These are retained acceptance artifacts, not duplicate application roots. No hashing model was copied into graph state; no graph event entered the global memory reducer.

## 5. Shared architecture ruling

**No new shared abstraction is promoted.** Existing `LabAdapter`, `TraceLab`, `InspectionDiagram`, `PlaybackController`, source extraction, arrow/escaping primitives, book tokens, search and progress already provide the reusable layer.

| Required question | Evidence and ruling |
| --- | --- |
| Did IV/V prove another reusable abstraction? | Their reusable execution/inspection contracts already exist. Hash status/ownership and graph adjacency/algorithm arrays do not have equivalent state semantics. Keep domain-owned projections and invariants. |
| Is shared scroll-to-active/selected justified now? | `tree-labs.ts` follows active state on step changes and falls back to the root; `hash-labs.ts` also implements ordered slot Home/End/arrows and active/selected preference; `graph-labs.ts` reveals focused vertices/edges. Only the rectangle-centering arithmetic is identical. A configurable common controller would move domain policy without simplifying it. Defer. |
| Is tree/graph focus management identical enough? | Tree controls are in the pre-canvas reference strip, and its auxiliary lists are noninteractive. Graph tables are moved after the canvas and distinguish matrix, adjacency, array and inspector controls that share a vertex/edge ID. Graph restoration needs both selection key and control origin, including focus already restored into the new panel. Keep these policies local. |
| Is a generic focusable mobile source region justified? | Keyboard access to overflow is a sound shared authoring rule. The synchronized source region is already focusable in `TraceLab`; graphs additionally make their long mobile statement echo focusable. The custom-key source panel has its own established region. There is no repeated new implementation requiring a helper; retain the working local behavior rather than add universal tab stops during integration. |
| Can Chapters 6–9 and hashing promote indexed cells? | Queue/ring cells distinguish live storage from membership and physical versus logical indices; heaps use one index in two simultaneous representations. Hash cells encode EMPTY/OCCUPIED/TOMBSTONE and key/hash/displacement fields, while chaining and `unordered_map` have different ownership/contract views. Their shared rectangle is not a shared model. Keep `hashCell` hashing-local. |
| Is any promotion necessary before VI/VII? | No. The existing snapshot, adapter, source-tag and invariant contracts support later work. Reconsider only when new consumers demonstrate identical policies and a smaller implementation. |

This ruling follows the user's default against speculative promotion. The evidence comes from the actual mounts, `visualizers/tree/diagram.ts`, `visualizers/hashing/presentation.ts`, queue/ring adapters, graph renderer and `TraceLab.astro`.

## 6. Deliberately deferred proposals

Defer a shared reveal helper, auxiliary-panel/focus controller, generic indexed-cell model, global graph events and a universal scene graph. Revisit a small pure geometry helper only when another caller needs exactly the same geometry and preserves its own target-selection policy. Revisit mobile statement focus in the existing component only if additional actual overflowing consumers justify that shared behavior. No architectural prerequisite blocks later Parts.

## 7. Combined unit, semantic and native-parity validation

**4,074 tests passed in 33 files**, with no hashing or graph exclusion: 2,799 accepted Chapters 1–17 tests + 641 hashing tests + 634 graph tests. Existing assertions and source/native parity remain intact. The combined suite includes independent set/map/partition/shortest-path/spanning-forest oracles as well as statement-state parity. [Unit log](validation/milestone-04/unit.log).

The final strict Astro/TypeScript check reports **270 files, zero errors, zero warnings and zero hints**. Frozen delivery copies remain excluded. [Check log](validation/milestone-04/check.log).

## 8. Native C++ validation

All **36 canonical `main.cpp` examples** compile and run with C++20, `-Wall -Wextra -Werror -pedantic`, ASan, UBSan and leak detection. The established tree integration program and hashing integration program also pass; the latter exercises 20,000 mixed oracle operations and ownership/copy/capacity policies. [Canonical native log](validation/milestone-04/cpp.log).

The deployment validator separately downloads **73 canonical source files**, preserves their directory structure, checks every quoted include and compiles/runs all **36 downloaded examples** with the same flags and sanitizers. This verifies actual published dependencies, including Chapter 19 → ChainedMap → TeachingHash, Chapters 20–23 → TeachingHash, and Chapter 29 → Chapter 30 Kahn. Test fixtures remain unpublished. [Downloaded native log](validation/milestone-04/deployment-prefix.log).

## 9. Combined browser regression

The complete suite runs against a frozen root production build, with both hashing and graph tests enabled in the same run. No grep exclusion, assertion weakening or snapshot update is used. Final total: **649 passed, two established non-mobile skips, zero failures; 651 scheduled cases**. The mobile-only sticky-playback case passes on mobile. [Full browser log](validation/milestone-04/browser.log).

Coverage includes all three accepted viewport projects (1440×1000, 1024×900, 390×844), both themes, all operation tabs, playback/pause/reset, reverse snapshots, source jumps, inspectors, invariants, keyboard selection, mobile interaction, downloads, search, progress, runtime errors and page overflow. New integration cases verify exact chapter/Part/search membership, the 23↔24 boundary, progress isolation and persistence, shared theme, cross-Part search and the Chapter 36 endpoint.

## 10. Accessibility results

The combined run retains established axe and keyboard checks in every Part, including full Part V chapter scans in both themes at every width. Hashing Home/End/arrows, graph node/edge selection, matrix/adjacency/array focus retention, scrolling regions, synchronized source and mobile controls remain covered. **Every established axe/keyboard assertion passes with zero reported axe violations**, including the 78 full Part V chapter scans.

Fresh cross-book captures also assert keyboard focus retention and global page containment in **84 selected mutation-state/view/theme combinations**, with no runtime errors. This preserves the accepted accessibility floor; it is not a new claim of comprehensive assistive-technology certification.

## 11. Root/prefixed deployment and launcher

Both production builds succeed with **37 pages** (landing page plus Chapters 1–36). The root output is frozen outside `dist/` for the full browser regression. The `/book/` validator visits all 36 chapters at mobile width and verifies 468 sections, mounted labs, complete adjacent navigation, all-chapter search, prefixed internal links, no global overflow and no browser errors. [Root build](validation/milestone-04/build-root.log), [prefixed build](validation/milestone-04/build-prefix.log), [deployment results](validation/milestone-04/deployment-prefix.log).

The real `./open-book.sh` passes new-server startup, `BOOK_PORT` override, Chapters 1/23/36 readiness, correct URL opening and existing-server reuse. An earlier book exposing Chapter 23 but missing 36 is rejected. The test substitutes only `xdg-open` with a URL recorder so automated validation does not open desktop tabs; it starts the real Astro development server and stops only its own process group. [Launcher log](validation/milestone-04/launcher.log). No separate Part launcher was created.

## 12. Cross-book visual consistency

Reviewed **84 fresh captures** across 14 representative chapters, all three sizes, light/logical and dark/storage views, with selected objects and intermediate statement states. The [capture manifest](../tests/visual/milestone-04/manifest.json) lists each exact state and image.

| Representation | Reviewed chapters |
| --- | --- |
| Bidirectional pointers and pool lifetime | 03, 04 |
| Physical/logical ring and simultaneous heap tree/array | 07, 09 |
| AVL, B-tree and Trie | 14, 16, 17 |
| Chained ownership, tombstones and Robin Hood displacement | 20, 21, 22 |
| Graph drawing/list/matrix, Kahn, Dijkstra and DSU parent forest | 25, 30, 33, 36 |

The same typography, dark source surfaces, restrained green/blue/amber/red language, inspector framing, visible focus and valid/pending/broken invariant presentation remain coherent. Mobile stacks the code and controls; wide diagrams and matrices retain readable cells through contained scrolling. Graph worklists remain outside diagram panning. Differences in storage/lifetime/ownership semantics remain intentional. Chapter 3's `[prev | data | next]` convention and exact topology are preserved. No cosmetic redesign or reference-image replacement was needed.

Representative native-size captures: [pool lifetime](../tests/visual/milestone-04/04-memory-pool-1440-light-logical.png), [chained ownership](../tests/visual/milestone-04/20-separate-chaining-1024-dark-memory.png), [mobile tombstones](../tests/visual/milestone-04/21-open-addressing-390-dark-memory.png), [mobile Kahn](../tests/visual/milestone-04/30-topological-sort-390-dark-memory.png), [Dijkstra](../tests/visual/milestone-04/33-dijkstra-1440-light-logical.png), [DSU](../tests/visual/milestone-04/36-union-find-390-dark-memory.png).

## 13. Prerequisite-ledger reconciliation

Every accepted Part IV row is preserved, including unsigned wrapping/hash reduction, unique ownership, owning links, optional results, replacement construction, slot enums, copy/move policy, displacement, hash/equality functors, custom keys and invalidation contracts. Every Part V row is preserved, including nested adjacency, continuation frames, deque worklists, optional distances, guarded arithmetic, priority ordering, sorting, DSU metadata/compression and observer instrumentation.

No prerequisite was added merely for integration tooling. The final note now explicitly defers Chapter 0 until **after Part IX** and explains that earlier scope notes refer to their original deliveries. [Reconciled ledger](CPP_PREREQUISITE_LEDGER.md).

## 14. Remaining limitations

Accepted chapter limits remain unchanged: bounded educational inputs; Chrome as the verified browser; no claim that illustrative addresses or indices are ABI layouts; standard-library contract cards deliberately avoid unspecified implementation details. Hashing retains its documented expected/worst-case and allocation-test limits. Graphs retain their eight-vertex UI/simple-pair policy, deterministic tie rules, conservative Bellman–Ford negative-cycle handling, size-only Kruskal helper and snapshot-overhead distinctions. Large diagrams require contained panning. The accepted Part reports give the complete domain-specific limits.

The two desktop/tablet skips in the full browser suite belong to one mobile-only sticky-playback check. Delivery directories remain historical evidence. No remote deployment, Git history merge or new chapter implementation is claimed.

## 15. Readiness for concurrent Parts VI and VII

The integrated regression is green. The canonical root is ready as the shared Chapters 1–36 baseline for Parts VI and VII. No abstraction promotion or further reconciliation is required first. Give each future worker disjoint chapter/model/test ownership and one integrator ownership of shared registration, navigation, source publication, validation and ledger reconciliation. Preserve this combined regression floor and frozen-build validation. Chapter 0 remains deferred until after Part IX.

Stop at Chapter 36. Parts VI and VII are not begun by this milestone.

## Reproduction

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
npm test
npm run test:cpp
ASTRO_TELEMETRY_DISABLED=1 npm run build
mkdir -p /tmp/dsa-milestone04-root
cp -a dist/. /tmp/dsa-milestone04-root/
BOOK_TEST_DIST=/tmp/dsa-milestone04-root BOOK_TEST_PORT=4361 \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  npm run test:e2e
```

For the prefixed deployment, build and start its preview in a separate terminal, then validate:

```sh
ASTRO_TELEMETRY_DISABLED=1 BOOK_BASE=/book/ \
  npm run build -- --outDir /tmp/dsa-milestone04-prefix
ASTRO_TELEMETRY_DISABLED=1 BOOK_BASE=/book/ \
  npm run preview -- --host 127.0.0.1 --port 4362 --outDir /tmp/dsa-milestone04-prefix
# In another terminal:
BOOK_DEPLOYMENT_URL=http://127.0.0.1:4362/book \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  node scripts/validate-book-deployment.mjs
node scripts/validate-book-launcher.mjs
```

The browser executable override is workstation-specific; omit it when Playwright's Chromium is installed. The review capture script uses `BOOK_CAPTURE_URL` and an already running frozen root preview. Native validation requires a compatible sanitizer toolchain; restricted execution environments may require approval for compiler/browser subprocesses and LeakSanitizer.
