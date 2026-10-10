# Milestone 1 — implementation and architecture review

Date: 2026-10-04

Scope: the static book foundation and Chapter 1, Singly Linked List. Later chapters remain visibly planned. The master plan is intact.

## Architecture ruling

The foundation is suitable for the next chapter without a general-purpose visualization framework. Keep the shared event reducer and playback controller small, and let each chapter own its traversal rules, invariants, and layout.

The review found two concrete boundary problems and corrected them:

1. Forward-chain traversal helpers lived in the generic memory engine. They now live in `src/visualizers/linked-list/topology.ts`.
2. SVG primitives, pointer inspection, and list layout were bundled together. They are now separate modules with explicit dependencies. The node primitive accepts named field schemas and retains its frame even when the object lifetime ends; the generic inspector never exposes dead fields.

Complexity traversal was also moved out of the Astro view into the model. It counts real visits without retaining large snapshot histories. No later chapter implementation, plugin system, global application store, Canvas renderer, or UI framework was added.

## Review questions resolved

| Question | Ruling and evidence |
| --- | --- |
| Are primitives reusable? | Yes: node frames, configurable pointer fields, arrows, and addresses. A focused test renders a two-field node and checks its freed state. |
| Are semantic events generic? | Allocation, construction, named field/reference assignment, comparison, visit, destroy, free, scope end, and return are structure-independent. No tree/graph events were invented. |
| What stays chapter-specific? | Head/next traversal, owning-list invariants, operation traces, and node-slot/arrow routing. |
| Is state separate from rendering? | Yes. Unit/native tests run without DOM or browser. Rendering reads the current snapshot; timers only select a snapshot. |
| Does the inspector generalize? | Yes. It enumerates named pointer fields and tracks references/lifetime, without knowledge of list order. |
| Can playback support later structures? | Yes. It consumes `Trace` snapshots and never inspects node topology. Snapshot scale is an explicit boundary. |
| Can Chapter 3 reuse Chapter 1? | It can reuse events, playback, source mapping, inspector, node/field/arrow primitives, and shell. Backlink rules and routing remain new chapter work. |
| Can allocators reuse memory components? | Lifetime transitions, addresses, references, and inspector are reusable. Pool/block layout and address reuse require allocator-specific work. |
| Is content separate? | MDX owns explanation; TypeScript owns state/interaction; native files own executable C++. |

## Validation evidence

- Astro/TypeScript: zero errors, warnings, or hints.
- Static production build: both chapter entry routes and downloadable C++ sources generated.
- Vitest: 158 passing tests, including 120 native C++/semantic parity cases and ownership/playback/reuse/counter tests.
- C++20 example: warnings treated as errors; AddressSanitizer, UndefinedBehaviorSanitizer, and leak checking pass. Exercises deleted copies, noexcept moves, self-move, empty/single/multi-node operations, first-match semantics, missing targets, clear, and destruction of 1024 nodes.
- Playwright: 43 applicable browser checks across 1440px desktop, 1024px tablet/laptop, and 390px touch/mobile; the mobile-only dock check is intentionally skipped in the two desktop projects.
- Browser interactions cover all six operations on standard, empty, single-node, and duplicate lists; head/middle/tail deletion; missing targets; input rejection; line selection; exact reverse; playback; memory sorting; keyboard inspection; Break-It; search; persistent theme/progress; and downloads.
- Axe WCAG 2 A/AA and 2.1 AA automated checks pass in light and dark themes at all three widths. No page-level horizontal overflow or browser runtime errors were observed.
- SVG route sampling verifies links do not run through unrelated object rectangles in both representations, including six-node custom lists plus an insertion.
- Reviewed visual baselines cover chapter entry and operation workspace at every width, plus dark desktop. Additional review captures are in `tests/visual/`.

Initial verification found and fixed low-contrast code comments/chapter numbering, a mobile control-distance problem, code-scroll offsets, and invalid-input operation/source mismatch. Native line/chain parity remained intact through the refinements.

## Boundaries

- Browser automation has been run in Chromium on Linux; Firefox and WebKit have not been verified.
- Addresses are deterministic teaching labels, not native allocation addresses. Allocation failures are handled by the C++ implementation but not injected by the visual lab.
- The pointer lab accepts six starting nodes for legible diagrams. The complexity explorer supports up to 1024 without retaining full replay histories.
- Reading progress is local to the browser/device. Available chapter search currently indexes Chapter 1.
- No deployment was requested or performed. The generated `dist/` is ready for a static host.

## Recommended next step

Implement Chapter 0 (the C++ foundations needed by this chapter), reusing lifetime transitions, pointer inspection, and source synchronization. Then proceed through Chapters 2–5 in the master plan's order. Keep the Chapter 1 parity and browser suites as the regression floor.
