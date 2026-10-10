# Part VIII organization review — Chapters 54, 56, 57, 58

Reviewed in the canonical shared checkout on 2026-10-04 after the prior agent's
connection dropped. Scope is the four organization chapters and their owned
models, native examples, presentation, fixture and unit test. Chapter 59, the
memory/identity agent's files, Part IX, and shared integration remain primary-owned.

## Architecture and completeness

All four chapters contain the hero and thirteen numbered teaching sections,
canonical header/main imports, inspectable preview, operation lab, source trace,
invariants, mechanical counters, failure experiments, tradeoffs and exercises.
They reuse `LabAdapter`, immutable `Trace` snapshots, `TraceLab`,
`mountTraceLab`, `InspectionDiagram`, canonical source regions and SVG arrow
primitives. Organization semantics and cell geometry remain chapter-owned.
No generic engine-container abstraction or new dependency was introduced.

Storage ownership, identity, membership, iteration order and mutation scheduling
are separate in the implementation and prose. Reserved vector positions are
shown without readable object values; destroyed component rows disappear;
generation metadata survives identity destruction. Reverse playback selects an
earlier snapshot, not an inverse mutation of native objects.

## Source-grounded contract review

| Area | Reviewed behavior |
| --- | --- |
| Bounded owners | `SparseSet`, `Registry`, `DirtyWorkList` and `CommandBuffer` delete copy/move construction and assignment. Construction reserves the normal bounded vector capacities. Copying a `State` for observation remains allowed; it does not create a new owner with a lost reservation. |
| Observers | Every owner documents nonthrowing, nonreentrant callbacks and copying retained snapshots. Observers expose private mutation steps; calling mutators through them is outside the API contract. Callers must handle snapshot allocation failures within their observer if needed. |
| Sparse membership | ID validation precedes sparse access. The candidate must be nonnegative, below dense size, and map back to the same ID before membership succeeds. Stale absent-ID metadata is safe. Middle erase moves the tail, pops, repairs the moved ID, then settles; tail erase skips move and repair. |
| ECS rows | ID/value columns move and pop together. Each pool repairs its own inverse mapping. Queries join by entity ID, never equal dense indices. Entity destruction removes both components before clearing liveness and advancing generation. |
| ECS identity | Creation scans for a dead slot with generation below 65535. Destroying generation 65534 advances to the terminal metadata value 65535 and retires that slot; no live handle at generation 65535 is issued. Capacity is sacrificed instead of wrapping. |
| Dirty waves | Ordinary marks during processing target NEXT, including marks for IDs still waiting in CURRENT. Each wave deduplicates separately. `finish_wave` requires CURRENT to be consumed, swaps queues, copies/clears flags, and returns control. Clear is idle-only; processing has an explicit caller budget. Deduplication does not imply convergence. |
| Commands | `record` copies the enum, handle and scalar payload. Flush validates targets at execution time, preserves append order, reports each attempt and continues after stale/full/overflow failures. Successful prior changes remain. Consumed records are cleared; reports describe the latest flush while counters accumulate across flushes. |
| Command identity | Deletion ends the optional value's lifetime before advancing generation. The same 65535 retirement sentinel prevents reuse after exhaustion. Create selects the lowest available nonretired slot. A failed creation has no resulting valid handle. |

The scalar ECS update checks integer overflow before the affected addition;
earlier updates are not rolled back. Command overflow is a failed command rather
than an exception that aborts subsequent records. The browser's fresh, small
fixtures do not reach either arithmetic boundary; native overflow handling is
source-reviewed, not established by the default parity cases.

Archetype/chunk storage remains a conceptual comparison with migration/query
tradeoffs. Dirty IDs do not own external objects or implement dependency order,
retries or fixed-point convergence. Command replay requires the same initial
world, generations, log and allocation rule; the fixture's predicted creation
handles are not a general symbolic-ID protocol. No transaction, undo system,
thread safety, or concurrent reclamation is claimed.

## Focused changes from this recovery review

- Added the direct `<utility>` include required for `std::move` in Chapter 54.
- Added explicit nonnegative sparse-index guards in canonical sparse lookup,
  the public ECS `Pool::contains`, and the TypeScript membership helper. Normal
  mutations already generate nonnegative indices, but a standalone public
  `Pool` with negative metadata previously permitted an unchecked native read.
- Updated Chapter 54's predicate explanation to match those signed bounds.
- Clarified the ECS terminal-generation comment and corrected the lab prose
  for duplicate addition: fresh fixtures must target E0's existing Velocity,
  rather than repeat the successful E1 addition against another fresh fixture.
- Added compile-time copy/move prohibition assertions to all four mains.
- Added native ECS checks for negative/out-of-range sparse metadata and IDs.
- Added command checks for copied payload/target ownership, repeated flush
  report replacement with cumulative counters, terminal retirement, and stale
  rejection after retirement. The retirement case uses ordinary public calls.
- Added one TypeScript membership regression with a throwing proxy to detect
  a dense read before bounds validation.

Changed paths in this recovery pass:

```text
cpp/chapter-54/SparseSet.hpp
cpp/chapter-54/main.cpp
cpp/chapter-56/ECSStorage.hpp
cpp/chapter-56/main.cpp
cpp/chapter-57/main.cpp
cpp/chapter-58/main.cpp
src/visualizers/systems-organization/types.ts
src/content/chapters/54-sparse-sets.mdx
src/content/chapters/56-ecs-storage.mdx
tests/unit/systems-organization.test.ts
documentation/PART_VIII_ORGANIZATION_NOTES.md
```

No shared registry, navigation, source-publication, global test/script, memory
agent or Part IX file was edited. Presentation, event tags, operation defaults,
fixture protocol and diagram coordinates were preserved.

## Validation status and primary handoff

**No Astro build/check, compiler, native executable, unit test or browser process
was run during this recovery review.** The user's no-concurrent-build constraint
leaves serialized validation with the primary. Source inspection does not certify
the new assertions or current output artifacts.

The incoming handoff reported 30 passing unit/native-parity tests and four passing
sanitized mains before this review. Those results were not rerun here. The added
membership case makes 31 expected organization unit cases; this is an expected
count, not a new pass claim. The unit file's `beforeAll` invokes the native
compiler through `compileOrganizationFixture`, so even that focused suite must
wait for the primary's serialized validation slot.

The primary subsequently confirmed passing first-run sparse/dirty/command
desktop operations and accessibility in both views against its existing static
build. ECS exposed a shared source-region prefix collision; the primary corrected
the extractor to match complete names and added regression coverage.
It is adding explicit mutation captures for `sparse.move/pop/repair`, `ecs.move`,
dirty NEXT-wave scheduling and command stale-target handling. Default midpoint
captures may show only fixture setup and are insufficient to establish those
states. This review did not accept or replace any screenshot baseline.

Primary's focused remaining validation:

1. Run the organization unit/native-parity suite and all four native mains with
   the established sanitizer configuration, serially. Check the new signed-index,
   owner-trait, payload-copy and command retirement assertions.
2. Rebuild/check once its current browser run is finished; changed native source
   line numbers and MDX text require fresh published source and source highlighting.
   Preserve the normal full-root regression floor, including concurrent content.
3. Complete the primary-owned mutation captures, keyboard/touch inspection,
   reverse/source sync and Fit/Actual Size checks at 1440×1000, 1024×900 and
   390×844 in both themes. This review adds no visual geometry changes.
4. Fold these contracts, results and actual prerequisite usage into the shared
   prerequisite ledger and consolidated Part VIII review. No final Part VIII or
   Chapters 1–66 acceptance is claimed by this organization-only review.

The sparse reference arrow deliberately appears only for an active ID whose
current mapping completes the membership round trip. It can disappear during
private move/pop/repair states while fixed cells and sparse metadata remain
visible. Read the pending invariant and metadata rather than interpreting an
absent arrow as a cleared sparse entry; the primary is reviewing these exact
screenshots. No arrow-routing change was made.

Break-It scenarios stop for inspection; their corrupted state is not a supported
starting point for ordinary mutations. Normal operations' reservation guarantees
exclude deliberately bypassed uniqueness checks. These are bounded teaching
examples with signed diagnostic counters, not indefinite production telemetry;
unbounded counter accumulation and observer exceptions are outside their scope.
