# Part VIII — Engine & Systems Data Structures review

Implemented in the canonical shared checkout on 2026-10-04. This review accepts
only Chapters 51–59. Chapters 1–50 remain the regression floor; concurrent Part IX
content is preserved and included in current-root validation. No Chapter 0,
delivery checkout, import bundle, or later chapter was implemented by this work.

**Part VIII is complete and accepted.** Current-root evidence covers 6,262 unit
tests, all 66 native examples, 1,060 passing browser cases with two intentional
viewport skips, both deployment modes and the launcher. Earlier interrupted runs
are diagnostic evidence. Final validation was consolidated in this chat at the
user's request; the Part IX implementer confirmed completion and stopped work.

## 1. Chapters completed

| Chapter | Executable teaching scope |
| --- | --- |
| 51 — Free Lists | Embedded free-link indices, head pop/push, physical versus linked order, exhaustion, guarded double release and bounded metadata faults. |
| 52 — Arena Allocators | Aligned byte reservations, visible padding, exhaustion, bulk reset and explicit client destruction responsibilities. |
| 53 — Object Pools | Reserved raw storage, construction, live values, destruction, return, constructor rollback and teardown. |
| 54 — Sparse Sets | Round-trip membership, insert, contains, dense iteration and separate swap/move, pop and inverse-map repair. |
| 55 — Generational Handles | Index/generation validation, lifetime end, reuse, stale rejection and retirement instead of generation wrap. |
| 56 — ECS Storage Patterns | Entity identity, independent Position/Velocity pools, ID-based joins, component addition/removal and stale identity rejection. |
| 57 — Dirty Sets / Work Lists | Per-wave deduplication, frozen current traversal, next-wave re-dirty, stable promotion and bounded processing. |
| 58 — Command Buffers | Owned intent records, deferred ordered mutation, execution-time validation, best-effort reports and deterministic replay. |
| 59 — Lock-Free Structures Introduction | Bounded SPSC ring, both release/acquire handoffs, full/empty/wrap, scalar CAS and bounded ABA demonstrations. |

Each chapter has the established hero and thirteen learning sections, logical
and memory/storage views, canonical C++20 header and main, source-linked trace,
inspection, invariants, mechanical counters, failure experiments, engineering
tradeoffs and exercises. Operations rebuild a bounded fixture; they do not edit
a hidden persistent native container. The story connects allocation, lifetime,
identity, membership, scheduling and concurrency without merging their contracts.

## 2. Memory and lifetime architecture

The implementation reuses `Trace`, `PlaybackController`, `LabAdapter`, `TraceLab`,
`mountTraceLab`, `InspectionDiagram`, source rendering, SVG primitives and Fit /
Actual Size. Chapter-owned models define mutations and invariants. The memory
family shares slot presentation; the organization family shares indexed cells;
SPSC retains thread-owned indices and publication semantics separately.

Raw storage, reserved storage, a live object, a destroyed object, a reusable slot,
a valid handle and a stale handle are distinct states. Destruction removes
readable values before returning storage. Entity metadata does not own component
storage. SPSC's fixed integer objects remain alive when queue membership changes.
Reverse playback reads immutable prior snapshots; it does not resurrect native
objects. Diagrams show teaching indices, not C++ ABI offsets.

Canonical owners delete copying and moving. Bounded vector reservations are
made at construction, so a copy cannot silently lose the no-reallocation
assumption. Observers are nonthrowing and nonreentrant by contract; retaining
state requires a copy. The architecture decisions and alternatives are recorded
in [the architecture note](PART_VIII_ARCHITECTURE.md).

## 3. Free-list, arena and pool designs

Chapter 51 owns six default 32-byte slots aligned to `max_align_t`. Free indices
are embedded using `memcpy`. Acquired storage hides its old free link. A bitmap
rejects immediate duplicate returns, while a pending slot exposes incomplete
head rewiring. The allocator neither constructs nor destroys client objects.
It cannot detect a stale raw index after reuse. LIFO order, physical fragmentation
and the relation to Chapter 4 are explicit.

Chapter 52 owns 64 bytes aligned to 16. Requests have positive size and a power-of-two
alignment no greater than 16. Bounds use subtraction before addition. Returned
byte spans borrow storage; reset invalidates reservations by contract and runs no
client destructor. A pre-reserved teaching ledger exposes padding and allocation
history. Ledger/snapshot costs are distinguished from bump-pointer work.

Chapter 53 owns `alignas(T)` byte slots with FREE, RESERVED, LIVE and DESTROYED
states. `construct_at` begins lifetime and its returned pointer is retained.
Constructor failure returns reserved storage without calling a destructor.
`destroy_at` ends lifetime before `return_slot`; owner teardown destroys remaining
live objects. T must have nonthrowing destruction. Raw references are nonowning;
generation-based identity belongs to Chapter 55.

## 4. Sparse sets and generational handles

Sparse IDs are bounded to 0–15. Membership validates the ID, then requires a
nonnegative candidate below dense size and `dense[candidate] == id`. An absent
ID may retain stale sparse metadata safely. Erase copies the final ID into the
hole, pops the tail, repairs the moved ID's inverse mapping and settles. Temporary
duplicate/mapping states are shown as pending. Dense order is unstable.

Invariant cards remain pending until the explicit stable-boundary event, even
when an individual condition already holds during repair. This is distinct from
a failed stable-state check; the source step and arrays show the current facts.

Chapter 55 validates bounds, liveness and generation equality before returning
a value copy. Destroy removes the value, advances the generation, then returns
the slot. At its configured limit the slot retires permanently. The native
default is `uint32_t` maximum; the lab uses three to expose retirement. Finite
identity space consumes capacity; cross-registry handle ambiguity remains a
documented limitation. Handles are not ownership or memory reclamation.

## 5. ECS scope and storage decision

The canonical ECS is a bounded registry with sparse-set Position and Velocity
pools. Owner IDs and values move/pop together. A system iterates Velocity and
looks up Position by entity ID, not equal dense positions. Removing a component
changes only its pool. Destroying an entity removes all components before
invalidating identity. Eight slots use generation 65535 as a retirement sentinel;
that terminal generation is never issued as a live handle.

Archetype/chunk storage is a conceptual comparison: cheaper matching iteration
can trade against structural migration and layout complexity. No production ECS,
automatic scheduler, borrowed component lifetime guarantee or concurrency is
claimed. Scalar update overflow is checked; preceding updates are not rolled back.

## 6. Dirty/work-list semantics

CURRENT and NEXT each own a vector and membership flags. At `begin_wave`, CURRENT
is frozen and its flags remain set through processing. Every mark while processing
targets NEXT, including marks for IDs still pending in CURRENT. Dedupe is per wave.
The explicit boundary promotes NEXT and clears its old flags. Clear is idle-only.

A caller-supplied wave budget keeps self-requeue inspectable. Deduplication does
not prove convergence, dependency order or DAG structure. IDs do not own external
objects. Safe Break-It operations expose duplicates and premature flag clearing
without native iterator invalidation.

## 7. Command-buffer policy

Records own a typed command kind, a handle and scalar payload. Recording changes
only the buffer. Flush attempts each record once in append order, validates a
target immediately before mutation and records success, stale target, full world
or arithmetic overflow. Failures continue; earlier successful changes remain.
Records are consumed; reports describe the latest flush and counters accumulate.

Deletion ends value lifetime before generation advancement. The eight-slot world
uses the same retirement sentinel policy as the ECS. Creation selects the lowest
free nonretired slot. Replay requires the same initial world, generations, log
and allocation rule. Fixture-predicted creation handles are not a general
symbolic-ID protocol. Transactions, undo, GPU submission and events are compared
without claiming they share this API or failure policy.

## 8. Lock-free scope and memory ordering

The canonical SPSC ring owns N integer objects and has N−1 usable positions. One
producer owns `write`; one consumer owns `read`. Each loads its own index relaxed
and acquires the peer index. Payload write precedes release publication of write;
payload copy precedes release publication of read. A corresponding acquire that
observes the release establishes visibility and prevents premature slot reuse.
The second handoff matters as much as publishing a new item.

Construction precedes thread startup; destruction follows joins. There is no
concurrent reset, payload inspector or dynamic reclamation API. The visual model
enumerates selected source-statement interleavings, not all weak-memory executions.
Break-It is a synthetic invalid publication and never fabricates a defined value
for a native data race.

CAS demonstrates expected-value replacement on mismatch. ABA uses scalar states
A → B → A before a successful comparison; no unsafe linked stack is implemented.
Hazard pointers, epochs and tagged references are advanced concepts with limits.
Bounded source work does not establish portable wait-freedom: atomic operations
may use locks, and C++ provides no universal bounded-latency guarantee. The native
driver reports atomic lock-freedom; its retry loops are separate from try operations.

## 9. Test totals

The full current-root run passed **6,262 tests in 51 files**, including all current
Part IX files. The four Part VIII suites contribute 113 cases (40 memory model,
20 memory native parity, 31 organization and 22 SPSC). The shared source-region
regression is also included. Native event/state parity supplements independent
set, FIFO, lifecycle, alignment, identity and scheduling oracles.

Astro checked **397 files with zero errors, warnings or hints**. The production
build generated **67 pages**. These results were adopted from the concurrent
session only after all **609 entries** in its validated source/test/config
manifest matched the current checkout, including the latest ECS/source fixes.
Copied logs and the manifest are retained under `validation/part-viii/adopted-*`
and `validated-source.json`; `reused-validation.json` records provenance. The
queued duplicate builds were cancelled before starting. Later changes are limited
to browser-test timeouts/captures/dismissal and the concurrent shared Escape
handler; native and model sources remain identical. A fresh final check again
passed all 397 files, and the final production build includes the handler.
`accepted-source.json` records the final 609 source/test/config hashes.

The full broad browser run completed **1,026 cases: 990 passed, 34 failed and
2 intentionally skipped**. Thirty failures were new missing baselines, two were
loaded-host timeouts and two were the old search-dismissal expectation. All
failures were resolved by explicit focused reruns and reviewed new baselines.
The final spatial suite passed **33 cases**, the shared/search/timeout rerun
passed **15**, and Part IX's chapter-entry rerun passed **21**. Three new
Escape-handler cases bring the current inventory to **1,062**: **1,060 distinct
passing cases and two intentional skips**, with no uncovered case. The skips
are an existing mobile-only playback test on desktop/tablet; its mobile case
passed. This is reconciled evidence across the broad run and focused reruns,
not a claim that the first broad run was failure-free. The case-to-log mapping
is saved in `validation/part-viii/browser-coverage.json`.

## 10. C++ validation

The hash-matched full current-root native validation passed all **66 standalone
chapters**, integrated tree/hash/graph/sorting/technique checks and the concurrent
spatial oracles under the existing C++20 warnings-as-errors and ASan/UBSan/leak
configuration. This includes all nine Part VIII mains after the final owner,
signed-index, payload-copy and retirement assertions were added.

Chapter 59 passed two forced publication/reuse schedules and a real
**100,000-value producer/consumer FIFO test under ThreadSanitizer** on this host.
Atomic `size_t` lock-freedom was reported as true. Downloaded-source deployment
checks also passed independently for **both `/` and `/book/`**: each mode mounted
all 66 chapters and 858 sections, checked navigation/search/runtime/overflow,
published 134 source files and compiled/executed all 66 downloaded mains with
warnings-as-errors, ASan/UBSan and leak detection.

The prefix build uses the documented `BOOK_BASE=/book/` setting. An earlier
attempt omitted its trailing slash and failed an existing relative dependency
URL; that setup diagnostic is retained separately. The corrected prefix build
and complete downloaded-source validation passed. The later shared Escape-handler
change does not change any published C++ or chapter route. The refreshed final
prefix build passed 12 additional checks across Chapters 1/51/59/66 and all three
viewports, including populated-query Escape, focus restoration, Ctrl+K, section
mounting and overflow/runtime checks. All 134 served prefix sources are
byte-for-byte identical to the already sanitizer-validated root sources.

Neither sanitizer success nor selected schedules prove race freedom. The source
ordering argument and single-producer/single-consumer ownership contract remain
necessary. Native fixture parity executes the canonical annotated statements;
ordinary model agreement alone would not establish native lifetime correctness.

## 11. Browser and accessibility results

All **90 distinct Part VIII browser cases** have passing evidence: the final
focused run passed 88, then the three navigation cases passed after correcting
the dialog-dismissal test (one mobile case overlaps). Desktop/tablet use the
book's explicit Ctrl+K toggle; mobile uses the visible close control. This is a
test correction. The concurrent owner subsequently added a shared Escape-close
handler and focused regression; all three viewport cases now pass against the
final build. The additional **27 chapter-entry/workspace visual cases** passed
across all three viewports.
The full current-root regression has completed; final focused reconciliation is
described in the test totals above.

An earlier run exposed a shared source-region prefix collision (`ecs` matched
`ecs-remove`). Extraction now matches the complete name, and unit checks cover
this case and each organization trace's actually visible regions. Interrupted
runs and failures are retained as diagnostics rather than counted as passes.

Coverage includes 1440×1000, 1024×900 and 390×844, both themes/views, keyboard/touch
inspection, source/mobile caption synchronization, reverse/seek/playback, actual
size persistence, fit bounds, no page overflow, axe WCAG A/AA checks, navigation,
cross-book search, independent reading progress and source downloads.

The launcher acceptance passed normal startup, `BOOK_PORT`, the browser URL,
readiness through Chapters 59 and 66, existing-server reuse and rejection of an
older book occupying the port. Its temporary server was cleaned up and the
pre-existing book server on port 4323 was resumed.

## 12. Visual review

Default operation screenshots cover all nine chapters in both views/themes at
all three viewports. Additional canonical-line captures target embedded-link
rewiring, aligned padding, destroyed pool storage, sparse move/pop/repair,
replacement identity rejecting an old handle, ECS move/pop/repair, NEXT-wave
marking, stale command failure and both SPSC handoff boundaries.

Fit shows bounded topology; Actual size and keyboard/touch inspection expose
small slot details without global overflow. Stable cell positions preserve
mutation context. An absent sparse reference arrow during a failed temporary
round trip does not erase the visible stale metadata. No new bidirectional node
layout changes Chapter 3's `[prev | data | next]` convention.

There are **276 Part VIII lab baselines** (108 default view/theme/viewport
captures and 168 critical-state captures), plus **63 chapter-entry/workspace
baselines**. Manual inspection sampled every chapter's critical teaching state
across desktop/tablet, then mobile destroyed pool storage, sparse pop, ECS repair,
stale command failure and both SPSC handoffs. The Chapter 51 desktop overview and
Chapter 59 workspace were also inspected. These samples keep destroyed fields
unreadable, show pending metadata explicitly and distinguish written/unpublished
payload from consumed/unreleased storage. Small mobile cells remain inspectable
through Actual Size, tap/keyboard selection and the text representation.

The final preservation comparison confirms all **1,369 pre-existing review and
active regression PNGs** unchanged, including the 386 active e2e baselines.

## 13. Prerequisite-ledger additions

The [ledger](CPP_PREREQUISITE_LEDGER.md) records actual use of alignment,
`max_align_t`, byte storage, `memcpy`, nonowning spans, construction/destruction,
perfect forwarding, nonthrowing destruction constraints, optionals, fixed-width
generations, dense/sparse indices, owned enum command records, atomics and memory
ordering, `jthread`, and the validation harness's semaphore handoffs. Locality is
distinguished from asymptotic complexity. No unused bit packing, type-erased
command hierarchy or Chapter 0 lesson was introduced.

## 14. Known limitations

These are bounded teaching implementations. The single-threaded owners do not
provide production allocation policies, persistent multi-operation editing,
arbitrary payload serialization, transactions, dependency convergence or safe
concurrent reclamation. Observer exceptions/reentrancy violate the documented
contract. Diagnostic signed counters are for bounded demonstrations. Generations
retire capacity rather than wrapping. ASan/UBSan do not prove concurrency safety;
TSan cannot prove all schedules. Browser traces are semantic teaching snapshots,
not ABI layouts, allocator benchmarks or a model of every permitted atomic read.

## 15. Proposed reusable abstractions

No new global engine-container abstraction is proposed. Existing generic
playback, source, inspection, fit controls and SVG primitives suffice. Slot/grid
presentation remains Part-VIII-local because common rectangles do not imply
common ownership. Memory states, ECS membership, work scheduling, command results
and atomic publication retain their own types and invariants.

The shared source extractor received one narrowly scoped correction: exact
region-name matching. This supports distinct canonical helper regions without
renaming source concepts to work around a prefix match.

## 16. Concurrent Part IX considerations

Shared registry, navigation, source publication, diagram-fit selectors,
validation scripts, launcher readiness, README and prerequisite ledger were read
before additive edits. Current Chapters 60–66 remain registered and included in
full validation. Part IX implementation ownership remains with its original
author. At the user's later request, this chat took over final validation,
completed its 21 chapter-entry baseline checks and inspected representative
final spatial images; it did not change Part IX implementation code. The
initial hash manifest separates intended shared-file changes
from the accepted Chapter 1–50 source/screenshot floor; it is not a Git commit.

After connection interruptions, the user required active-process inspection
before every build and no concurrent build. The primary serializes Astro
check/build/dev compilation and native fixture/sanitizer compilation. Subagents
completed their reviews without starting more builds. Production browser tests
use a frozen output directory, avoiding live-reload interference.

The user later permitted validation with at most two unrelated compiler jobs
and requested one validation owner. The Part IX agent confirmed implementation
completion and stopped. Its in-flight spatial stage finished; its coordinator
was stopped before any next stage. The remaining checks ran sequentially here.
The final type-check/prefix-build preflight found zero other compiler or book
validation processes. The existing live server was resumed afterward.

## 17. Readiness for Chapters 1–66 final freeze

Ready for a source freeze of the validated Chapters 1–66 state. Part VIII
implementation acceptance remains scoped to 51–59; Part IX's author supplied
its completed implementation review and handed over final validation. All
current-root cases are accounted for, both deployment modes and the launcher
passed, and the accepted Chapter 1–50 source/screenshot floor is preserved.

This checkout has no Git metadata. `accepted-source.json`, `preservation.json`,
`browser-coverage.json`, `current-validation-delta.json` and the retained logs
provide the acceptance record. Any later source change needs checks appropriate
to that change. No Chapter 0 or content after Chapter 66 is included.

Supporting detail: [memory/identity notes](PART_VIII_MEMORY_NOTES.md),
[organization notes](PART_VIII_ORGANIZATION_NOTES.md),
[architecture](PART_VIII_ARCHITECTURE.md) and
[validation logs](validation/part-viii/).
