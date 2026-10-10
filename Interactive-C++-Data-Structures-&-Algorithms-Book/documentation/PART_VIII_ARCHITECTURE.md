# Part VIII architecture — 2026-10-04

Scope: Chapters 51–59 in the canonical shared checkout. Chapters 1–50 are the
accepted regression floor; concurrent Part IX work owns 60–66. No Chapter 0,
delivery checkout, or application copy is created. This directory has no Git
metadata, so the initial source/screenshot hashes are recorded in
`validation/part-viii/initial-hashes.json` instead of claiming a commit baseline.

## Source-grounded decisions

`LabAdapter<S,E>`, `Trace<S,E>`, `mountTraceLab`, `InspectionDiagram`, and the
canonical source-region renderer already separate chapter semantics from
playback and presentation. Reuse those contracts. New chapter families own their
states, mutations, invariants and geometry; no generic engine-container reducer
or global lifetime policy is introduced. Existing role colors and SVG primitives
remain authoritative. The architecture gate is resolved locally under the user's
explicit architect/integrator assignment.

| Concern | Decision and reason | Rejected alternative / revisit condition |
| --- | --- | --- |
| Storage | Bounded free-list slots; raw-byte bump arena; typed object pool with separate storage and object states. | One allocator abstraction would erase useful lifetime differences. Revisit only after equivalent clients exist. |
| Arena destruction | Raw storage API; callers destroy nontrivial objects before reset. Alignment is bounded by backing alignment and checked before mutation. | An implicit destructor registry changes the API and cost model. |
| Pool failure | Construction rollback returns reserved storage; destruction precedes reuse; raw pointers carry no enduring identity. | Generation checking belongs in Chapter 55. |
| Identity | Index plus generation, validation before access, explicit generation-exhaustion policy. | Finite counters cannot make an unconditional forever-unique identity claim. |
| Membership | Sparse-set round-trip check; swap-delete repairs moved IDs; iteration order is unstable. | Sorting dense storage would change costs and purpose. |
| ECS | Bounded sparse-set component pools; identity does not own storage. Archetypes are a conceptual comparison. | A production ECS framework exceeds the chapter scope. |
| Dirty work | Per-wave deduplication; processing has a frozen current wave, marks during processing enter next wave. | Draining until quiet can fail to terminate; one wave is an explicit boundary. |
| Deferred commands | Owned value payloads, ordered best-effort flush, per-command validation and recorded failure; continue after failures. | Transaction rollback requires a distinct ownership and exception contract. |
| Concurrency | SPSC bounded integer ring, N physical slots and N−1 usable; producer owns write index, consumer owns read index. | MPMC and linked reclamation require different algorithms and proofs. |

## Chapter 59 memory-order policy

Producer loads its own index relaxed, acquires the consumer's read index before
reusing a slot, writes the ordinary integer payload, then publishes write with
release. Consumer loads its own index relaxed, acquires write before reading a
published payload, then releases read after finishing the copy. The acquire must
observe the relevant release (or its release sequence) to establish the
synchronization edge. The second edge prevents reuse racing with a payload read.

Integer objects remain alive for the ring's entire lifetime. Empty/consumed is a
queue-membership state, not destruction. The queue is noncopyable/nonmovable;
construction happens before worker startup and destruction after joining them.
No concurrent reset or diagnostic read of payload storage is exposed.

CAS and ABA are separate bounded demonstrations, not a linked-stack API. ABA
shows that equal bits can hide intervening changes. Hazard pointers, epochs, and
tags are discussed with their limits; none is claimed as implemented reclamation.
Operation bodies have bounded work, but portable C++ does not promise all atomic
size_t operations are lock-free or wait-free. The example reports atomic
lock-freedom; retries in the demonstration driver are outside `try_push/try_pop`.

## Validation plan

Focused semantic/native checks precede full current-root check, unit, native,
build and browser regression. Native parity traces execute annotated statements
from canonical headers; independent queue/set/lifecycle oracles supplement parity.
Concurrency validation includes controlled publication/reuse schedules and a real
producer/consumer sequence test. Probe ThreadSanitizer support separately from
ASan/UBSan; record runtime limitations without claiming race freedom.

Preserve existing screenshot baselines. Add all Part VIII views at 1440×1000,
1024×900 and 390×844, both themes, intermediate mutations, keyboard/touch,
source synchronization, reverse/playback and Fit/Actual Size where relevant.
Re-read shared files immediately before additive edits. Full regression includes
concurrent valid Part IX content; Part VIII acceptance does not certify Part IX.
