# Chapter 02 — Stack implementation notes

## Delivered teaching contract

The ADT is introduced before storage. The lab switches between an owning fixed array of five int objects and an owning linked chain, with push/pop/top/empty/clear, custom and edge-case starting values, exact source stepping, reverse, reset, logical/memory views, pointer/storage inspection and invariants. Empty/full failures preserve state. Array membership is distinct from the lifetime of its five int objects; raw storage reveals popped values. The linked model separates allocation/construction and destruction/freeing.

The comparison explorer accepts 0–1024 values and counts bounded work without snapshots. It compares contiguous storage, capacity, pointer overhead, assignments, allocations, releases and locality. It explicitly identifies illustrative ABI assumptions and separates fixed-capacity O(1) pushes from the conceptual amortized behavior of a growable vector. No timing benchmark or claim of universal linked-list superiority is made.

The MDX contains all 13 reference sections, full canonical code, complete examples, ownership policies, allocation failure explanation, boundary experiments, exercises with reasoning, completion control and base-aware navigation. Its mental-model preview renders the real adapter state before prose.

## Implementation and reuse

- `src/visualizers/stack/adapter.ts` exports `stackAdapter`, key `stack`, implementing the parent-owned LabAdapter contract.
- The linked stack reuses Chapter 1's actual node layout, SVG primitives, lifetime reducer, list topology/invariants and pointer inspector. The entry point is presented as topNode, including assignment highlighting.
- Array storage/index events remain local to `src/visualizers/stack/model.ts`; there are no array events in the shared reducer.
- Linked allocation addresses sort after existing initial addresses to keep Chapter 1's memory-layout slots fixed during insertion, including the full-five-node preset.
- Top/pop include the actual tagged empty helper before their caller condition. The adapter exposes both source regions. Clear removes its local oldTop at each loop-body scope boundary.
- The canonical linked owner deletes copy and move and uses iterative destruction. The value-semantic array owns its complete storage directly.
- Parent-owned TraceLab, StructurePreview, ChapterHero, CanonicalSource, ChapterPagination and BookLayout supply presentation and integration. No shared files or Chapter 1 files were edited by this implementation.

## Native parity and verification

`tests/unit/stack-native.test.ts` has 60 actual C++ parity cases over both implementations, all operations, empty/single/duplicate/full/negative inputs. `scripts/linear-fixture.mjs` instruments temporary copies of the actual header. Conditions evaluate nested helper calls before the caller tag. It compares every executed tag plus the complete raw array/index or all registered live/deleted nodes and their next links at every statement boundary. Detached nodes are included, not merely the reachable chain. Allocation/delete semantic substeps collapse to their native expression boundary; dedicated semantic tests retain the intermediate lifetime checks. Every event source must occur in an adapter-visible source region.

`tests/unit/stack.test.ts` verifies 45 semantic cases: operation boundaries, exact reverse playback, raw storage retention, increment-before-write, unlink-before-delete, dangling locals, bounded input, complexity counts, stable memory slots, and active topNode arrows.

Executed validation:

- 105 stack semantic/native tests passed with g++ C++20, Wall/Wextra/Werror for the fixture.
- `cpp/chapter-02/main.cpp` passed C++20 warnings-as-errors and address/undefined sanitizers with ASAN_OPTIONS=detect_leaks=1.
- Focused stack browser flow passed at 1440, 1024 and 390 touch/mobile: exact source, previous/reset, raw values, keyboard inspection, helper region and ended lifetimes.
- Production build succeeded. The final collected Astro check reported zero errors, warnings or hints across 90 files. Earlier pool-test errors were resolved by their owner.
- Desktop/tablet/mobile screenshots captured to `/tmp/linear-stack-{width}-{mental,lab}.png`; desktop dark to `/tmp/linear-stack-dark.png`. Reviewed actual rendered diagrams; nonmember cells use the existing surface-subtle token.

Parent owns the full Chapter 1 regression run, cross-chapter accessibility and final integration review. Its baseline remained unchanged. Browser/native subprocess EPERM required escalation; no tests were weakened or skipped to conceal it.

## Prerequisite suggestions for the parent ledger

Actually used: Stack ADT/LIFO; std::array; integer indexing and the −1 empty sentinel; capacity versus logical size; value initialization; constexpr capacity; contiguous int objects; exceptions (overflow_error/underflow_error); class access control; const/noexcept observers; pointers and new/delete; object lifetime versus membership; owning entry points and borrowed locals; deleted copy/move; destructor cleanup; std::vector result values; assert/static_assert/type traits; iterator ranges; lambdas in the test driver. std::vector growth/amortization is explained conceptually rather than implemented as a third stack.

## Deliberate limits

At most five starting values and one insertion in an interactive experiment. New loads are independent, not an implicit sequence. Native allocator failure, native addresses, ABI sizes, allocator metadata and elapsed timings are not simulated. All array elements are int; general nontrivial element lifetime and exception guarantees are not claimed. Browser checks use installed Chromium on Linux. No Chapter 0, Chapter 6+, deployment, framework or store was introduced.

## Files created or edited within Chapter 2 scope

- `src/visualizers/stack/model.ts`
- `src/visualizers/stack/diagram.ts`
- `src/visualizers/stack/adapter.ts`
- `src/visualizers/stack/comparison.ts`
- `src/components/visualizers/StackLab.astro`
- `src/components/visualizers/StackComparison.astro`
- `src/content/chapters/02-stack.mdx`
- `src/pages/chapters/02-stack.astro`
- `tests/unit/stack.test.ts`
- `tests/unit/stack-native.test.ts`
- `tests/e2e/linear-chapters.spec.ts` (both chapters)
- `scripts/linear-fixture.mjs` (both chapters)
- `documentation/CHAPTER_02_NOTES.md`

The pre-existing `cpp/chapter-02/Stack.hpp` and `main.cpp` were inspected and validated unchanged.

## Final handoff verification

All 307 focused chapter tests passed (87 semantic and 220 actual native parity cases); both canonical examples passed ASan/UBSan and leak detection. All 12 focused browser checks passed at 1440/1024/390 against an isolated server serving the existing production build. An intervening development-server run had two desktop state resets during concurrent HMR; the unchanged tests passed against the static build. No test was relaxed. Final collected Astro check: zero errors/warnings/hints. Parent owns the final consolidated production and regression run.
