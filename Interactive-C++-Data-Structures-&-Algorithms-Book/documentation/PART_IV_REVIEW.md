# Part IV — Hashing: consolidated review

Date: 2026-10-04. Scope: Chapters 18–23 on the accepted Chapters 1–17 baseline. Acceptance complete. Chapters 18–23 are implemented and validated; work stops at Chapter 23.

The implementation is present in the shared repository. Because independent Part V development also writes there, the acceptance target is a frozen Chapters 1–23 copy, preserved at `part-iv-delivery/checkout`. The results below apply to that copy, not to unfinished graph integration. No Chapter 0, Part V or Part VI implementation was undertaken by this milestone. This workspace export provides no usable Git history; no upstream commit or merge is claimed.

## 1. Completed chapters

All six chapters have a hero, thirteen learning sections, executable canonical C++ downloads, source-linked interaction, invariants, complexity discussion, controlled failure lessons, engineering tradeoffs and exercises. Navigation, search, reading progress and source publication include Part IV.

| Chapter | Route | Implementation and interaction |
| --- | --- | --- |
| 18 — Hashing fundamentals | `18-hashing-fundamentals` | Byte-by-byte deterministic hashing, full hash versus bucket, independent capacity reduction, explicit collisions and distribution. |
| 19 — Hash tables | `19-hash-tables` | Map operations and load-driven growth; deliberately uses Chapter 20's actual chained map. `HashTable.hpp` is an alias, not a competing implementation. |
| 20 — Separate chaining | `20-separate-chaining` | Bucket selection, key comparisons, owning-link traversal, insert/update, exact detach/reconnect/destroy phases, rehash with old and replacement arrays. |
| 21 — Open addressing | `21-open-addressing` | Linear probing, EMPTY/OCCUPIED/TOMBSTONE, search beyond a remembered tombstone before update or reuse, bounded full-cycle lookup and explicit rehash. |
| 22 — Robin Hood hashing | `22-robin-hood-hashing` | Duplicate preflight, explicit incoming/resident swaps, displaced-entry continuation, distance distribution, early-stop lookup and backward-shift deletion. |
| 23 — `std::unordered_map` | `23-unordered-map` | Public library-call boundaries, membership, bucket lower bounds, reserve/rehash/load hint, saved iterator versus reference, and a custom PointKey hash/equality implication explorer. |

Exports and mount keys are `hashFundamentalsAdapter` / `hash-fundamentals`, `hashTableAdapter` / `hash-table`, `chainingAdapter` / `chaining`, `openAddressingAdapter` / `open-addressing`, `robinHoodAdapter` / `robin-hood`, and `unorderedMapAdapter` / `unordered-map`.

## 2. Hashing interaction architecture

Each domain model builds immutable statement-boundary snapshots. Its adapter projects those states into SVG, inspector fields, text, counters and invariants. `hash-labs.ts` connects adapters to the existing playback and inspection infrastructure. MDX owns the explanation and progression; TypeScript owns browser state; shipped C++ headers remain the executable authority.

Reversing playback selects a prior snapshot. It does not run a reverse C++ operation or restore an invalidated native iterator. Source tags are checked against actual native execution, including nested helper calls and replacement-table work.

## 3. Reused infrastructure

The milestone reuses `LabAdapter`, `TraceLab`, `mountTraceLab`, `InspectionDiagram`, `PlaybackController`, canonical source-region extraction, `SourceCode`, `CanonicalSource`, shared arrow primitives, layout tokens, themes, search, progress and chapter navigation. The generic playback engine, semantic event infrastructure and canonical-source component were not redesigned. Healthy Chapters 6–9 indexed visualizations were not rewritten.

## 4. New Part-IV-local infrastructure

`visualizers/hashing/hash.ts` supplies the common teaching hash and key validation. `presentation.ts` supplies small selectable cell, SVG and inspector markup helpers. `hashing.css` supplies slot statuses, contained scrolling and inspector layout. Topology and geometry remain adapter-owned.

The hashing mount adds arrow/Home/End slot navigation and reveals the active or keyboard-selected object within the scrollport. Probe metadata, the incoming Robin Hood record and public-contract summaries remain outside that scrollport. No universal indexed-container model, generic grid engine or graph router was introduced.

## 5. Hashing and ownership policies

The teaching hash is polynomial-31 over 1–12 lowercase ASCII letters with unsigned 32-bit wrapping. TypeScript uses `Math.imul` and unsigned conversion; C++ uses `std::uint32_t`. Bucket reduction is separate modulo arithmetic. The chapters distinguish deterministic teaching hashing from cryptographic hashing and from implementation-selected `std::hash` behavior.

Chaining owns nodes through `unique_ptr` bucket heads and next links. It grows at its stated load threshold, remaps stored full hashes, preserves live node addresses across rehash, disables copying/moving and destroys long chains iteratively. A fresh node and replacement array are allocated before membership is changed; allocation failure preserves membership and capacity, although diagnostic comparisons are not rolled back.

Open addressing keeps inline slots, uses tombstones and requires an explicit rehash to grow or clean storage. Insertion searches for an existing key before reusing its remembered tombstone. Robin Hood keeps inline slots with exact displacement distances and repairs deletion by shifting backward; it never uses tombstones. Both native tables define independent copies with copy-and-swap assignment and delete moves to preserve positive capacity. Their replacement-table rehash commits only after successful construction. Full-table insertion reports no insertion; lookup terminates after bounded inspection.

Probe counters count actual inspected slots, including Robin Hood's duplicate lookup and placement passes. For `a,i,q`, capacity 8 to 8 costs six replacement inspections in ordinary probing and twelve in Robin Hood. Rehash counters measure replacement probe work, not the separate linear scan of old storage. Chaining counters count actual full-key comparisons.

Chapter 23 sorts cards for display only. It does not invent native slots, bucket numbers, exact growth, iteration order or library probe counts. The maximum-load setter is a hint; the model does not assert an unobserved accepted value. Capacity information is a justified lower bound, and load-factor upper bounds use exact fractions. The contract review is grounded in the [C++ unordered associative requirements](https://eel.is/c++draft/unord.req).

## 6. Invariant architecture

Invariants stay with their domain models. Hashing checks deterministic prefix arithmetic and valid reduction. Chaining checks unique acyclic ownership, key uniqueness, owning-array bucket placement, reachability and size. Intermediate snapshots include old/replacement bucket arrays and live local owners, including simultaneous `fresh` and `entry` roots during insertion-triggered rehash. Destroyed nodes expose no readable payload.

Open addressing checks uniqueness and lookup reachability before an EMPTY slot. Robin Hood checks exact modular distance, uniqueness across resident/incoming records, and early-stop reachability. During explicit backward-shift repair only reachability can be pending; incorrect distance or duplicate keys still fail. Controlled Break-It states show failures rather than normalizing corrupted state.

The PointKey explorer tests `equal ⇒ equal hash` outside any native map. Its broken x-only equality fails for `(1,2)` and `(1,3)`; correct coordinate equality permits the collision between `(1,2)` and `(0,33)`.

## 7. Test totals

| Acceptance check | Result |
| --- | --- |
| Accepted Chapters 1–17 unit baseline | 2,799 passing tests in 22 files |
| Integrated Chapters 1–23 unit/native parity | 3,440 passing tests in 26 files |
| Added Part IV tests | 641: 619 canonical native parity cases and 22 focused model tests |
| Foundations/chaining subset | 205: 193 native parity plus 12 model tests |
| Probing/standard-map subset | 436: 426 native parity plus 10 model tests |
| Astro/strict TypeScript check | 224 files; zero errors, warnings or hints |
| Full browser regression | 463 passed; 2 existing non-mobile skips (465 scheduled) |
| Dedicated hashing browser cases | 54 across the three viewport projects, included in the full run |
| Existing screenshot baselines | 119 files preserved byte-for-byte |
| New Part IV screenshot baselines | 42 files across 18 visual tests |
| Static build | 24 pages: landing page and Chapters 1–23 |

Coverage includes invalid keys/capacities, deterministic wrap, collisions, duplicate updates, missing keys, chain ownership transitions, full tables, tombstone search/reuse, remapping, displacement, backward shifts, distance corruption, load factors, native tag order and snapshots, exact previous/reset playback and source synchronization. Part IV assertions were added without relaxing the existing screenshot tolerance or deleting baseline tests.

## 8. Native C++ validation

All 23 canonical `main.cpp` programs compiled with C++20, `-Wall -Wextra -Werror -pedantic`, AddressSanitizer and UndefinedBehaviorSanitizer, then ran with leak detection enabled. The unchanged tree integration validation also passed. A new independent `std::map` oracle exercises 20,000 mixed hashing operations plus copy isolation, capacity-one/full-table behavior, rehashing, load, stable chained-node addresses and ownership policies.

Fixtures instrument the shipped headers rather than separately reimplementing their algorithms. Foundations/chaining parity compares tags, values, counters, both bucket arrays and local ownership. Probing parity includes the actual nested replacement locate/insert calls and Robin Hood swaps. Standard-map parity compares membership at public wrapper boundaries, not unspecified native bucket layout.

The `/book/` deployment check downloads all six headers and six mains, keeps their relative directory structure, and compiles/runs those downloaded examples with the same warning and sanitizer flags. Chapter 19 links both its ChainedMap and TeachingHash dependencies; Chapters 20–23 link TeachingHash. Test fixtures are not published as canonical downloads.

Native child processes and LeakSanitizer required approved execution outside the sandbox because of process/ptrace restrictions. Browser launches used the existing `/opt/google/chrome/chrome`; no browser installation was needed. No check was omitted to work around these restrictions.

## 9. Browser, accessibility and deployment

The full suite covers 1440×1000, 1024×900 and 390×844. It exercises logical/memory views, all operation tabs, keyboard inspection, focus retention, Home/End/arrows, exact highlighted C++ lines, reverse playback, light/dark themes, search/progress/navigation and global horizontal containment. Axe WCAG 2 A/AA and 2.1 AA scans are included for every new chapter in both themes at all three widths.

Specialized cases cover every long-chain insert/erase/rehash snapshot in both views, default tombstone update and reuse, broken lookup/restoration, Robin Hood displacement and two-step backward repair, replacement-probe counts, full-table misses, standard-map handle guidance, and custom equality. Chapter 23's PointKey source now uses the established dark code panel and keyboard-scrollable source region after the first complete scan caught a contrast failure.

Both root and `/book/` static builds pass. The prefix check confirms six mounted labs, 78 sections, correctly prefixed internal links, no browser errors, no mobile page overflow and functioning dependent C++ downloads. The accepted `open-book.sh` remains unchanged.

## 10. Visual review

Reviewed the compact 670×380 fundamentals diagram, chained ownership and external link lanes, occupied/empty/tombstone distinctions, replacement tables, displaced incoming records, deletion holes/shifts, distant-slot keyboard inspection and standard-map membership/handle panels. Label sizes and cell widths remain readable; no shrink-to-fit text was introduced. Capacity enters the bucket through its own clear lane. Selectable next links reuse existing hover/focus strokes.

The artifact set contains 54 chapter overview/light/dark captures and 33 mutation/inspection captures under `tests/visual/hashing`, in addition to the 42 new regression baselines. Representative captures were inspected at all three widths and both themes. Large structures deliberately scroll within their diagram: not every bucket and node fits at once. Active/selected targets are revealed without moving the page sideways, and metadata remains visible outside the scroll area. Tablet inspector columns were corrected so numeric hashes do not split across lines.

## 11. Prerequisite ledger

`CPP_PREREQUISITE_LEDGER.md` records only concepts actually used: wrapping unsigned hashing, modulo guards, aliases/ADT versus representation, unique ownership and owning-field pointers, optional lookup results, replacement construction and allocation guarantees, slot enums, explicit copy/move policy, modular displacement/backward shifts, functors and equality, custom keys/defaulted equality, immutable map keys, bucket/load APIs and iterator/reference invalidation. Validation-only oracle/instrumentation techniques are identified separately. Chapter 0 remains deferred.

## 12. Known limits

- These are bounded teaching containers, not generic production map templates. Browser values are small integers, keys have 1–12 lowercase letters, chaining accepts at most eight starting entries, and probing displays capacities 1–32. Native probing capacity is capped at 4096. Standard-map requests are bounded for explanation.
- The deterministic polynomial is deliberately inspectable and is not a security or distribution guarantee for arbitrary input. Complexity descriptions retain expected/average versus worst-case qualifications and hashing cost.
- Browser snapshots illustrate successful execution and guard failures; they do not simulate every allocator failure or prove exception guarantees. Native checks and code review support the documented ownership/failure policies, without exhaustive allocation-failure injection for every Part IV path.
- Illustrative addresses are not actual native addresses or ABI byte offsets. Standard-map cards reveal no implementation layout. Actual bucket counts and iterator traversal are excluded from deterministic parity by design.
- Chrome is the verified browser. Axe and keyboard/visual review do not constitute a complete assistive-technology audit. The two existing non-mobile skips belong to a mobile-only baseline test.
- The shared root contains independent Part V work. Only the frozen Chapters 1–23 delivery is covered by these acceptance results.

## 13. Possible shared abstractions

No cross-Part promotion is required. A future common scroll-to-active/selected helper may be justified by the existing tree and hashing mounts if their semantics converge. Indexed cell frames may be compared with Chapters 6–9 only when actual duplication merits it. Chained ownership, contiguous probing and standard-library contract state must remain distinct.

## 14. Part V integration considerations

Preserve graph-owned files. Merge completed chapter entries in numeric order in `src/content/book.ts`, navigation, source-download publication, C++ validation scripts, README and the prerequisite ledger. Do not replace those shared files wholesale from the isolated delivery. Search and progress tests derive chapter counts from registration; the Part IV end-navigation assertion also accepts a registered successor when a later Part is integrated.

Re-run the combined build, unit/native and full browser suites after Part V is independently accepted. The current report provides no acceptance claim for Chapters 24 onward. `tsconfig.json` excludes the frozen delivery directories to avoid checking duplicate source trees.

## 15. Recommendation for Part VI

Finish independent Part V acceptance and merge the shared registration/documentation changes before starting Part VI. For searching and sorting, reuse immutable playback, canonical-source tags and native parity. Keep comparison/swap policies and stability invariants algorithm-owned; promote an indexed view only after concrete implementations demonstrate shared semantics. No Part VI implementation is included here.

## Evidence and reproduction

The delivery contains source, canonical C++, unchanged baseline tests, new tests and screenshots, a root deployment build, this report and validation transcripts. `part-iv-delivery/README.md` explains the isolated acceptance boundary and how to run it. `SOURCE_SHA256.json` records the accepted source and asset contents.

```sh
cd part-iv-delivery/checkout
ASTRO_TELEMETRY_DISABLED=1 npm run check
npm test
npm run test:cpp
ASTRO_TELEMETRY_DISABLED=1 npm run build
BOOK_TEST_PORT=45641 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome npm run test:e2e
```

Use an available preview port and a compatible installed browser on another machine. Run `npm ci` if dependencies are absent. The decisive logs are `check.log`, `unit.log`, `cpp.log`, `build.log`, `e2e-full.log`, `build-prefix.log`, `deployment.log` and `baseline-integrity.log` in the delivery's `validation/` directory. Earlier failure logs are retained separately as diagnostic history, not accepted results.
