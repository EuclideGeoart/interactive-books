# Visualization rules for agents

Apply these user-approved conventions to new or revised bidirectional node diagrams, including doubly linked lists and intrusive hooks:

- Draw fields in **`[prev | data | next]`** order. Keep the value centered between its directional links.
- `prev` leaves the left side and enters the predecessor's right edge; `next` leaves the right side and enters the successor's left edge. Arrows target the object boundary, not another pointer dot. Use distinct entry/exit heights so opposite links remain distinguishable.
- In a null-terminated list, show **`head.prev = nullptr`** and **`tail.next = nullptr`** explicitly. A singleton has both null fields; an empty list has null head and tail. Do not replace an actual sentinel or circular link with a null endpoint.
- Prefer short links for adjacent nodes. Route longer links outside unrelated nodes and labels. Keep object positions stable during a trace, including half-rewired states.
- Treat field arrangement as a teaching convention, not a claim about native C++ byte offsets. Follow the actual topology in both logical and memory views.
- Reuse existing SVG primitives; keep topology and routing chapter-owned. Verify both views, mutation states, keyboard inspection and 1440/1024/390 layouts before accepting changed screenshots. Preserve unaffected chapter regressions.

Chapter 3 is the reference implementation. See [the visualization authoring guide](documentation/IMPLEMENTATION.md#bidirectional-node-visualization-rule) for details. This rule was requested by the user on 2026-10-04 and applies to future agents working in this repository.
