# Part III architecture decisions

Date: 2026-10-04. Accepted baseline: exported Milestone 2, snapshotted as `de7c087f8b7458a6987c246a69d167762ba8845e`. Isolated worktree: `/tmp/interactive-dsa-part-iii`, branch `part-iii-trees`. Original workspace is left untouched. No upstream Git history was supplied; the snapshot is provenance, not a claim to the original canonical HEAD.

## Local architecture ruling

The user assigns the primary agent architectural ownership. Decisions are resolved locally under the same-thread architecture skill's Astra exemption. Chapters 1–5, their model semantics and regression tests are the immutable floor. No Chapter 0, Part II or Part IV implementation belongs in this branch.

Evidence: the accepted `LabAdapter` already delegates state, drawing, inspection, description, invariants and source regions. `PlaybackController` selects opaque typed snapshots; `InspectionDiagram` handles selection, keyboard navigation, reference following and focus. None needs a tree topology extension.

Alternatives: a universal graph engine would force B-tree pages, Trie edges and binary links into global semantics; fully separate renderers would duplicate the actual hierarchy and inspection requirements across eight chapters. The selected boundary is a **tree-local presentation projection** (`TreeScene`) with ordered structural links and adapter-supplied field rows. Chapter models keep their own algorithms, events and invariants. A projection cannot mutate its source state.

The shared renderer provides ordered hierarchy placement, disconnected/transitional node placement, parent-child routing, independently allocated memory view, references, accessible selection, auxiliary stack/queue presentation and lifetime-aware inspection. Labels, shapes and widths accommodate multi-key pages and character edges. Actual parent links are shown only when present in the canonical type; a computed layout parent is never exposed as a C++ field. Ended lifetimes expose no fields.

Binary foundation algorithms may share their binary representation across Chapters 10–13. Balanced tree rotations share mechanical concepts and diagram behavior; their concrete semantic algorithms remain with their canonical implementation unless code evidence proves one reusable rotation contract. Stable node identities persist across rotation snapshots; intermediate cycles or detached subtrees must render safely and truthfully.

A subtree-width layout with reserved per-node widths and level gaps is sufficient for ordered rooted trees. Defensive visited sets handle temporary or deliberately broken cycles. Large/skewed diagrams scroll within their panel. There is no global graph solver, global scene registry, or new dependency.

## Integration boundaries

Primary agent owns tree types/layout/renderer/inspector, tree mount integration, navigation/source registry changes, cross-tree review, browser/accessibility/layout checks and final review. Agent A owns Chapters 10–13 canonical implementations, models/adapters, components/content/pages and semantic/native parity tests. Agent B owns the same for Chapters 14–17. Neither changes the accepted Chapters 1–5 or generic engine.

Global changes are limited to registering implemented chapters and canonical downloads and updating accurate search scope. Part II is unmerged and must remain optional; cross-part navigation should derive from the registry. Final cross-Part promotion is deferred until integration against Part II's accepted canonical HEAD.

## Final cross-tree ruling

All eight chapters use the projection without changes to the generic playback engine or inspector class. Binary foundations share the owning representation; AVL and RB retain separate rotation semantics because their actual root/parent publication differs. Page splits and Trie character maps confirm that binary node fields cannot become the tree-wide model. B+ leaf links remain non-owning secondary edges, and derived inspector values are labeled.

Layout tests cover 127-node shapes and defensive cycles. Chromium tests sample routes in both views, including every distinct topology in representative canonical mutations. Deep-node following and reference keyboard focus pass at all three widths. References and auxiliary state remain outside diagram scrolling through the tree-local mount. There is no evidence requiring a universal graph solver, shared semantic rotation primitive, or global scene lifecycle. An optional generic auxiliary-panel hook is a future integration candidate only if Part II proves another consumer.

Complete validation, explicit semantic/native parity boundaries, the proven stale Chapter 3 screenshot correction, and cross-Part merge considerations are recorded in [PART_III_REVIEW.md](PART_III_REVIEW.md).
