# Part VII architecture decision — 2026-10-04

Scope: Chapters 45–50, preserving the integrated Chapters 1–36 regression floor.
This workspace is a source checkout without Git metadata; starting file hashes
were recorded before editing. Chapter 0 and Part VIII remain deferred.

The primary resolves the architecture locally under the user-assigned architect
role. Source evidence: `engine/types.ts` defines generic immutable `Trace<S,E>`
snapshots; `PlaybackController` indexes them for exact reverse; `LabAdapter`
separates semantic builders from rendering; `TraceLab.astro` and
`InspectionDiagram` provide source jumps, playback, keyboard inspection and views.
Existing graph state carries graph-specific invariants and is unsuitable as an
algorithm-technique semantic model.

Decision: reuse those playback and inspection components unchanged. Add a
Part-VII-only presentation vocabulary: conceptual call frames, positioned decision
nodes, cells with validity/status, explicit dependency transitions, execution
tables and measured counters. Recursive and optimization families extend that
vocabulary with their own semantic fields and generate their own snapshots.
They own mutations, recurrence order, tie policies, termination and invariants.

Rejected alternatives: a universal interpreter would duplicate C++ semantics and
expand scope; adapting graph edges to every table transition would hide table
validity; separate chapter playback would duplicate reverse/source/keyboard
behavior. Shared presentation has no evaluator and makes no ABI/address claims.
Frame resume points are conceptual source locations, not machine addresses.

Visual direction: retain the navy, pale green, blue, amber and red engineering
palette. Frames show retained locals and pending returns. Decision states and
table validity have text labels in addition to color. Retain positions across
steps and expose HTML tables with captions and row/column headers. Reuse SVG
arrow primitives. The user subsequently requested whole-diagram fitting across
all graph/tree chapters: fit the complete SVG viewBox within the available width
and a bounded height by default. A shared presentation-only Fit diagram / Actual
size control restores readable native scale on demand. This supersedes the
original preference for default scrolling; dense labels remain available through
keyboard selection and the full-size inspector. Table and stack scroll regions
remain independent. No topology, coordinates, source tags or snapshots change.

Family A owns factorial versus iteration, combinations with restoration and
pruning, and merge-sort decomposition. Family B owns interval scheduling, the
greedy coin counterexample, Fibonacci overlap, coin DP and evaluation strategies.
Minimum coin change connects the three optimization chapters.

Part VI appeared concurrently in the shared checkout. Preserve its additive
registry, navigation and source routes. Part VII uses content links only and
imports no Part VI implementation. Revisit shared abstractions after both Parts
are accepted, using demonstrated duplication as evidence. Existing chapter
sources and unaffected screenshots remain the regression floor. Only the
explicitly requested graph/tree fitting changes their visual baselines.
