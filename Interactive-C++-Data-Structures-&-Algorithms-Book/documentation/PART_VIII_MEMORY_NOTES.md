# Part VIII memory and identity implementation notes

Implemented directly in the shared canonical checkout. This contribution owns
Chapters 51, 52, 53 and 55 only. It does not edit registry/navigation, route
wrappers, source publication, global CSS, shared checks, or concurrent Part IX.

## Integration contract

| Chapter | MDX slug | Canonical header | Lab/preview kind | Main API |
| --- | --- | --- | --- | --- |
| 51 | `51-free-lists` | `cpp/chapter-51/FreeListStorage.hpp` | `free-list` | `chapter51::FreeListStorage<N>`: `acquire`, `release`, `storage`, `snapshot` |
| 52 | `52-arena-allocators` | `cpp/chapter-52/ByteArena.hpp` | `arena` | `chapter52::ByteArena`: `allocate`, `reset`, `snapshot` |
| 53 | `53-object-pools` | `cpp/chapter-53/ObjectPool.hpp` | `object-pool` | `chapter53::ObjectPool<T,N>`: `reserve`, `construct`, `get`, `destroy`, `return_slot`, `snapshot` |
| 55 | `55-generational-handles` | `cpp/chapter-55/HandleRegistry.hpp` | `handles` | `chapter55::HandleRegistry<N>`: `create`, `contains`, `get`, `destroy`, `snapshot` |

All four directories include standalone `main.cpp` validation examples. Each MDX
has a hero and the standard 13 numbered sections, including canonical source,
chapter-specific mental model, operations, exact source trace, invariants,
complexity experiments, active safe Break-It scenarios, engineering and exercises.

`SystemsMemoryLab.astro` and `SystemsMemoryPreview.astro` take only the `kind`
prop and import their own `systems-memory.css` and `systems-memory-labs.ts`.
The script mounts existing `mountTraceLab` and `InspectionDiagram`. The adapter
uses the existing `LabAdapter`, `Trace`, source regions and tags. Semantic models
are separate files; no generic engine-container state reducer is introduced.

All SVGs have `sm-svg systems-diagram` classes with fixed geometry/viewBoxes,
for the primary's Fit / Actual Size selector integration. Browser selectors:

- `[data-systems-memory-lab="free-list|arena|object-pool|handles"]`
- `[data-chapter-lab="systems-memory-free-list|systems-memory-arena|systems-memory-object-pool|systems-memory-handles"]`
- `[data-systems-memory-preview="free-list|arena|object-pool|handles"]`
- `[data-node="slot:0"]`, arena `[data-node="byte:0"]`
- Retained handle buttons use `[data-inspect="handle:0"]`.

Operation identifiers live in `memoryOperations` in the owned adapter. Default
inputs are count 3, slot index 0, value 42, generation 1, arena requests
`5:1,8:4,7:8`, free-list corruption `cycle`. All runs start from a fresh bounded
fixture; before/after, reverse and playback use immutable snapshots. Invalid
slot indices 6–8 are intentionally accepted by the form to exercise guarded
native errors. Fractional/out-of-form-range input is rejected by the model.

## Storage, lifetime and identity decisions

**Free list.** Six default 32-byte payload slots, aligned to `max_align_t`.
Embedded free-link indices are read/written by `memcpy`; a bitmap rejects
invalid/immediate double return. Acquired bytes do not expose their old link.
A temporary detached slot is tracked during head rewiring. This raw storage
owner neither constructs nor destroys client objects. Diagrams distinguish
physical order and linked order with stable positions. The free bitmap cannot
detect stale raw indices after a slot has been reused; prose explicitly says so.

**Arena.** 64 bytes aligned to 16, positive-size reservations with power-of-two
alignment <= 16. Subtraction-based bounds checks avoid size-addition overflow.
Returned byte spans are nonowning. Reset invalidates reservations by contract
and never invokes a client destructor. The teaching ledger pre-reserves 64
records; its bookkeeping/snapshot overhead is distinguished from core O(1)
bump work. Reset clears that ledger as well as the offset. Nested markers are
discussed as an extension, not represented as an implemented operation.

**Typed pool.** Fixed nonmovable `alignas(T)` byte slots, with FREE / RESERVED /
LIVE / DESTROYED states. The pointer returned by `construct_at` is retained.
A throwing constructor returns its slot without calling T's destructor. Only
LIVE exposes a value; `destroy_at` precedes returning its storage. Pool teardown
destroys remaining LIVE objects, never RESERVED or DESTROYED storage. T must
have a nonthrowing destructor. Raw addresses/indices remain nonowning and can
become stale; no hidden identity solution is claimed here.

**Handles.** Bounds + alive + generation equality; fixed integer payload
registry, separate from pool lifetime semantics. `get` returns a value copy.
Destroy removes the value before advancing generation and returning storage.
At the configured limit a slot retires permanently. The default limit is
`uint32_t` max; the lab uses 3. Finite capacity and finite identities per registry
are explicit, as are cross-registry ambiguity and concurrency limits. No packing,
reference counting, lock-free reclamation, or automatic ownership is implied.

All owners delete copy and move. Observer callbacks must be nonthrowing,
nonreentrant and copy snapshots if retaining them. Pool teardown does not call
observers. The implementation is single-threaded.

## Break-It safety and source synchronization

Break-It changes TypeScript snapshot metadata only, never native object bytes or
forged pointers. Its injection step has no source tag; all ordinary executed
steps resolve uniquely to canonical `@trace` annotations inside `@begin/@end`
regions. A broken state is expected to fail an invariant:

- Free list: self-cycle, used-slot reference, lost free slot, invalid index,
  unchecked duplicate return. Traversal checks bounds and visited indices.
- Arena: forged unaligned reservation; no C++ object is constructed there.
- Pool: live slot placed on a cyclic free chain.
- Handles: rewound generation makes a revoked token alias the replacement;
  an independent revoked-token check catches the false acceptance.

Guarded double release/return/destroy operations remain separate from corruption
experiments and leave canonical data unchanged on rejection.

## Focused validation

Passed on this contribution before the reconnect/build-serialization constraint
was introduced (historical results; not rerun during the final status review):

```sh
node node_modules/vitest/vitest.mjs run tests/unit/systems-memory.test.ts tests/unit/systems-memory-native.test.ts
# 2 files, 60 tests passed (40 model/source/render/reverse tests; 20 native parity tests).

node scripts/systems-memory-fixture.mjs --sanitize
# All four standalone mains compiled with C++20, Wall/Wextra/Werror/pedantic,
# ASan + UBSan, and passed.

npx tsc --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable src/visualizers/systems-memory/*.ts src/scripts/systems-memory-labs.ts
# Passed, no diagnostics.
```

Owned Astro components were compiled using `@astrojs/compiler.transform`; all
four MDX files were compiled using `@mdx-js/mdx.compile` and verified to have 13
sections. The JSON preview script is explicitly inline.

The native fixture executes canonical code and compares every emitted source tag
and all native snapshot fields with the TypeScript trace. It covers each ordinary
operation plus varied occupancies, invalid slot transitions, bad alignment,
exhaustion, reset, retirement and external invalid handles. It cleans up its
own temporary build directory after successful test use.

Independent native checks supplement parity:

- Chapter 51: 1,000 deterministic transitions against a separate stack and set
  oracle; acquired bytes overwritten; exhaustion, singleton, bounds and duplicate
  return checks.
- Chapter 52: 160 alignment cases using a byte-by-byte oracle; actual pointer
  alignment, zero/invalid/over-aligned requests, huge-size overflow safety,
  exhaustion, reset/reuse and explicit client destructor count.
- Chapter 53: over-aligned T, throwing constructor, rollback, every key invalid
  lifetime transition, exact constructor/destructor counts, stable storage and
  owner teardown.
- Chapter 55: independent issued-pair history, stale lookups, duplicate destroy,
  invalid indices/generations, exact retirement and exhausted capacity.

Native tests require escalated execution in this environment because sandboxed
Node subprocess creation reports `spawnSync g++ EPERM`; the successful sanitizer
and native-parity commands were run escalated. This is an environment limitation,
not a skipped native check. No shared validation script was changed.

## Primary-owned remaining integration/acceptance

The primary reports that chapter registration, route wrappers, navigation,
source publication and Fit/Actual Size integration have been added. Verify those
against the current shared root; this note does not claim to have authored them.
Publish each header and `main.cpp`, retain all concurrent Part IX entries, and add
actual prerequisites to the shared ledger: `alignas`, `alignof`, `max_align_t`,
`std::byte`, `std::memcpy`, nonowning `std::span`, `construct_at`, `destroy_at`,
perfect forwarding, nonthrowing destruction constraint, optional value presence,
and fixed-width generation counters. No bit packing or atomic usage is added by
these four chapters.

On the final reconnect status request, the primary reported that all browser
cases for these four chapters passed. This is a primary-reported result; this
contribution did not rerun or independently recapture those cases. Detailed
viewport/theme, keyboard/touch, source-sync, playback, Fit/Actual Size,
overflow/accessibility and download evidence belongs in the primary's browser
artifacts and consolidated Part VIII review.

No known implementation gap remains in the four owned chapters. The remaining
acceptance work is the primary's serialized full current-root validation and
consolidated review, including reconciliation of the prerequisite list above.
Documented scope limits remain intentional: bounded single-threaded examples,
raw-byte arena reset without destruction, nonowning raw pool references,
registry-scoped handles, finite retirement capacity, and nonthrowing/nonreentrant
observer callbacks.

The final status review changed this notes file only. No checks, builds, native
compilation or test processes were started. The primary owns build scheduling;
any future native run must first inspect active compiler/test/build processes
and avoid overlap with build work.

## Owned file inventory

- `cpp/chapter-51/FreeListStorage.hpp`, `cpp/chapter-51/main.cpp`
- `cpp/chapter-52/ByteArena.hpp`, `cpp/chapter-52/main.cpp`
- `cpp/chapter-53/ObjectPool.hpp`, `cpp/chapter-53/main.cpp`
- `cpp/chapter-55/HandleRegistry.hpp`, `cpp/chapter-55/main.cpp`
- `src/content/chapters/51-free-lists.mdx`
- `src/content/chapters/52-arena-allocators.mdx`
- `src/content/chapters/53-object-pools.mdx`
- `src/content/chapters/55-generational-handles.mdx`
- `src/visualizers/systems-memory/adapter.ts`
- `src/visualizers/systems-memory/trace.ts`
- `src/visualizers/systems-memory/free-list.ts`
- `src/visualizers/systems-memory/arena.ts`
- `src/visualizers/systems-memory/object-pool.ts`
- `src/visualizers/systems-memory/handles.ts`
- `src/visualizers/systems-memory/presentation.ts`
- `src/components/visualizers/SystemsMemoryLab.astro`
- `src/components/visualizers/SystemsMemoryPreview.astro`
- `src/scripts/systems-memory-labs.ts`
- `src/styles/systems-memory.css`
- `tests/unit/systems-memory.test.ts`
- `tests/unit/systems-memory-native.test.ts`
- `scripts/systems-memory-fixture.mjs`
- `documentation/PART_VIII_MEMORY_NOTES.md`
