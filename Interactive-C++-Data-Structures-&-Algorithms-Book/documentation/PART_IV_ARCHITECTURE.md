# Part IV architecture decisions

Date: 2026-10-04. Scope: Chapters 18–23, integrated on the accepted Chapters 1–17 workspace. This exported workspace has no readable Git history; no upstream commit identity is claimed. Chapters 0 and 24 onward are out of scope.

The user assigns architectural authority to the primary integrator. Decisions are resolved locally under the architecture-gate skill. The source evidence is `LabAdapter`, `TraceLab.astro`, `mountTraceLab`, `InspectionDiagram`, the typed `Trace` snapshots and `PlaybackController`. These already separate algorithm state from playback and rendering. No global event, playback, or memory-reducer extension is required.

## Representation and presentation ruling

A universal indexed-container model would couple contiguous probing, bucket heads, independently owned nodes and standard-library contracts. Fully independent presentation would repeat selection, frame and field markup. Keep each algorithm's canonical state and invariants in its domain; share only a Part-IV-local hash function and small cell/SVG/inspector markup helpers. Adapters choose geometry and routes. Chapters 6–9 remain unchanged. A future promotion requires actual consumers and equivalent semantics, not visual resemblance.

The visual direction follows the existing engineering diagrams: labeled bucket indices, explicit EMPTY/OCCUPIED/TOMBSTONE states, pale green entries, amber execution, blue links, and source-synchronized steps. Horizontal scrolling preserves readable labels. Opposite deletion policies remain visibly distinct. The generic inspector continues to receive only adapter-rendered markup and opaque selection IDs.

## Hash and key policy

The teaching algorithms share polynomial-31 over lowercase ASCII with unsigned 32-bit wrap. TypeScript uses `Math.imul` and unsigned conversion; native C++ uses `std::uint32_t`. Public teaching inputs are one to twelve lowercase ASCII letters. Capacity reduction is a separate modulo operation, and collisions are normal. The policy is deterministic for parity and explanation, not cryptographic or a production-quality recommendation. Standard-library hashing, reduction, iteration order and bucket growth remain unspecified in Chapter 23.

## Ownership and algorithm boundary

Chaining owns nodes and links; open addressing owns inline slots with tombstones; Robin Hood owns inline slots and uses backward shifts. Neither probing family borrows the chaining engine. Rehash recomputes placement under the new capacity, including actual reinsertion where probe policy requires it. Native examples define their copy/move and failure policies; the browser illustrates successful deterministic execution and cannot establish general allocator behavior.

Chapter 23 models the public contract, not a vendor's implementation. Its source and native tests exercise actual `std::unordered_map`. Contract review uses the public C++ working draft's [unordered associative requirements](https://eel.is/c++draft/unord.req): equivalent keys require equal hashes; rehash invalidates iterators but preserves element references/pointers; reserve expresses element count while rehash expresses bucket count. Exact capacity and layout are not guaranteed.

## Integration ownership

Agent A owns Chapters 18–20; Agent B owns Chapters 21–23. The primary owns shared presentation/styles, mounts, book registration, source publication, prerequisite ledger, full regression/browser review and the consolidated report. Each agent uses High reasoning; no more than two run concurrently. Part V is independent and may integrate its own completed registry entries later.

## Final acceptance boundary

Concurrent Part V development began adding graph registrations and routes to the shared root. Acceptance therefore uses a separate Chapters 1–23 copy: `/tmp/interactive-dsa-part-iv`, preserved in `part-iv-delivery/checkout`. It contains the accepted Chapters 1–17 baseline plus Part IV, without graph files or registrations. The root's concurrent graph work is preserved and is not covered by this report's test totals. Do not replace its registry or navigation wholesale with the frozen acceptance copy.

Final review retained the existing generic playback, canonical-source component, SVG primitives and inspection contract. The only presentation additions are hashing-specific cells, inspector rows, status styling, keyboard/camera behavior, and metadata outside the scrollport. Chaining geometry stays in its adapter; there is no general graph router or indexed-container framework. The future cross-Part candidate is a small scroll-to-active/selected helper only if independent consumers converge on identical behavior.

Native authority was checked with instrumentation of the shipped headers and an independent ordered-map oracle. Pending invariants describe explicit ownership-transfer or Robin Hood deletion-repair states; they do not disable distance, uniqueness, cycles or unrelated corruption checks.
