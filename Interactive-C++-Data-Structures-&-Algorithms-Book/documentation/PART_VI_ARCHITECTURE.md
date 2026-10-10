# Part VI architecture ruling

2026-10-04. Scope: Chapters 37–44. Chapters 1–36 are the accepted regression floor. No Chapter 0, Part VII implementation, or later Part is included.

The primary integrator resolves architecture locally under the user's explicit assignment. The workspace is a file-based checkout without Git metadata; existing acceptance manifests and new SHA-256 inventories establish the baseline.

## Execution and presentation

Reuse `Trace<S,E>`, `PlaybackController`, `LabAdapter`, `TraceLab`, `InspectionDiagram`, canonical source regions/tags, book components and tokens. Two chapter families own independent algorithm states and immutable deterministic traces: search/elementary sorting (37–40) and advanced sorting (41–44).

The one shared Part VI renderer accepts `SortingScene` from `src/visualizers/sorting/types.ts`: indexed record rows, half-open ranges, named cursor indices, active/finalized/fault/discarded cells, factual text, and optional heap projection. Items carry numeric keys and original numeric identities. Identity stays attached to the record as it moves. Renderer color is accompanied by labels and accessible text. Memory view shows actual current indexed storage and auxiliary buffers; it makes no native address/ABI claim.

This contract is presentation only. It does not compare, swap, choose pivots, infer stability, validate algorithm invariants or manage execution. Search windows, merge ranges, heap prefixes and radix buckets belong to algorithms. No competing array renderer and no universal indexed-data model is authorized. Existing Chapters 6–9 remain unchanged.

## Canonical policies

Linear search returns the first match. Binary search uses an explicit half-open sorted domain, overflow-safe midpoint, and reports its duplicate policy. Sorting uses distinct identities for equal keys. Bubble and insertion preserve equal-key order; selection, Lomuto quicksort and heap sort do not promise stability. Merge chooses the left head on equality. Counting and LSD radix use stable cumulative-count placement. Counting/radix explicitly validate their bounded nonnegative teaching domain.

Chapter 9's `BinaryHeap` stores private values and extracts by removing the last element. Calling it directly would allocate another owning heap and discard the array's finalized suffix. Chapter 43 therefore adapts its exact guarded child-index/better-child/swap/advance rules to a shrinking active prefix; it reuses Chapter 9 index geometry and knowledge without changing the accepted chapter. A differential test against Chapter 9 validates heap construction. No heap framework is promoted.

Counters count key comparisons, swaps, shifts, array writes, temporary-buffer writes, passes and maximum active recursion depth where meaningful. They exclude rendering, snapshot clones, invariant checking and input validation; they are an algorithmic operation model, not wall-clock measurements. In-place claims concern algorithm auxiliary memory excluding trace storage and the input owner; recursive quicksort separately states stack cost.

## Validation and integration ownership

The primary owns shared presentation, navigation/source publication, integration tests, whole-book regression, root and prefixed deployment, visual review, prerequisite ledger and consolidated `PART_VI_REVIEW.md`. Agent A owns Chapters 37–40 algorithms, canonical C++, chapter content, local adapters/components and native parity tests. Agent B owns the corresponding files for 41–44. Agents may not modify shared infrastructure or accepted chapters.

Preserve all accepted screenshot baselines. New chapter baselines are added only after inspection. Existing endpoint/count assertions may be extended from 36 to 44 while retaining coverage of all previous chapters. Potential future sharing with Part VII is recorded for integration review, not implemented here.
