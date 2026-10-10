# Interactive C++ Data Structures & Algorithms Book

## 1. Product Vision

Build a professional-grade, visual-first interactive learning book for C++ Data Structures and Algorithms.

The target reader is not merely preparing for interview questions. The book should teach DSA at the level required to understand and build real systems such as geometry engines, dependency DAGs, render systems, allocators, schedulers, spatial indexes, and other performance-sensitive C++ software.

The book must combine four things on every important concept:

1. Visual intuition.
2. Exact mechanical behavior.
3. Complete modern C++ implementations.
4. Interactive execution at pointer/memory level.

The existing static infographic aesthetic should become the visual design language of the interactive book rather than remain raster images.

The finished product must build to ordinary static HTML/CSS/JavaScript and therefore be deployable to GitHub Pages, Cloudflare Pages, or any static host.

No backend should be required for the core book.

---

# 2. Technology Architecture

Use:

- Astro as the content/site shell.
- TypeScript for all interactive logic.
- MDX for chapter prose combined with interactive components.
- SVG for data-structure visualization.
- CSS variables/design tokens for the visual system.
- Shiki for C++ syntax highlighting.
- Vitest for interactive-model/unit testing.
- Playwright for browser, interaction, responsive-layout, and screenshot regression testing.
- Native C++ source files for every complete implementation shown in the book.
- CMake or a lightweight compiler test script to compile canonical C++ examples during validation.

Do not render pointer diagrams to Canvas unless an interaction genuinely requires it.

Prefer SVG because every node, pointer, address, label, arrow, and link should remain:

- crisp at every resolution;
- individually addressable;
- animatable;
- accessible;
- selectable;
- inspectable;
- reusable.

The frontend is an educational visualization layer. The canonical C++ examples remain real `.cpp`/`.hpp` files and must compile.

---

# 3. Core Page Architecture

Every chapter follows one consistent learning rhythm.

## A. Chapter Hero

Show:

- chapter number;
- data-structure name;
- one-sentence definition;
- key property;
- complexity summary;
- small animated structural overview.

Example:

**Chapter 3 — Doubly Linked List**

> Each node maintains both a forward and backward relationship with its neighbors.

Animated hero:

`nullptr ← [10] ⇄ [20] ⇄ [30] → nullptr`

---

## B. Mental Model / Visual Introduction

Visualization comes before implementation.

The reader should immediately see the structure.

For a doubly linked list:

`head → [10] ⇄ [20] ⇄ [30] ← tail`

Hovering a node should reveal its fields:

`data`
`prev`
`next`

Hovering a pointer should highlight its source and destination.

Toggle:

**Logical View | Memory View**

Logical View:

`[10] ⇄ [20] ⇄ [30]`

Memory View:

`0xA120 [10]`
`0xD800 [20]`
`0xB470 [30]`

This demonstrates that logical adjacency does not imply physical adjacency.

---

# 4. The Core Teaching Component: Interactive Operation Lab

This is the heart of the book.

Every important operation gets an interactive lab.

Example:

## Insert at Head

Layout:

```text
┌────────────────────────────┬───────────────────────────┐
│ Interactive Visualization  │ C++ Code                  │
│                            │                           │
│ head                       │ newNode->next = head;     │
│ ↓                          │ head->prev = newNode;     │
│ [10] ⇄ [20] ⇄ [30]         │ head = newNode;           │
│                            │                           │
└────────────────────────────┴───────────────────────────┘

      ◀ Previous     Step 2 / 3      Next ▶
                 ▶ Play operation
```

The code and diagram must be synchronized.

When the highlighted C++ line is:

`newNode->next = head;`

the visualizer animates exactly that pointer.

Then:

`head->prev = newNode;`

animates the backward pointer.

Then:

`head = newNode;`

moves the head reference.

No animation may imply an operation that the C++ code has not yet performed.

---

# 5. Pointer Inspector

Pointer-based chapters should include a live pointer inspector.

Example:

```text
Selected node: 20
Address:       0xB420

data:          20
prev:          0xA100 → node 10
next:          0xC800 → node 30
```

Clicking `prev` highlights node 10.

Clicking `next` highlights node 30.

For singly linked lists only `next` appears.

For trees this evolves into:

`parent`
`left`
`right`

For graphs:

`adjacency edges`

For intrusive structures:

`hook.prev`
`hook.next`

For memory pools:

`free-list next`

This should become a reusable system-wide component.

---

# 6. Operation Controls

Each interactive visualization should expose relevant operations.

Examples:

Singly Linked List:

`Insert Head`
`Insert Tail`
`Insert After`
`Delete`
`Search`
`Clear`

Stack:

`Push`
`Pop`
`Top`
`Reset`

Queue:

`Enqueue`
`Dequeue`

Deque:

`Push Front`
`Push Back`
`Pop Front`
`Pop Back`

BST:

`Insert`
`Search`
`Delete`

Heap:

`Push`
`Extract`
`Heapify`

Graph:

`Add Vertex`
`Add Edge`
`BFS`
`DFS`

The user should be able to enter values manually.

---

# 7. Playback System

Every algorithmic transformation should support:

`Reset`
`Previous`
`Next`
`Play`
`Pause`
`Speed`

Optional later:

`0.5×`
`1×`
`2×`

The system should store transformations as discrete semantic steps rather than arbitrary animation frames.

For example:

```ts
[
  { type: "allocate-node", value: 5 },
  { type: "assign-pointer", from: "new.next", to: "head" },
  { type: "assign-reference", reference: "head", to: "new" }
]
```

The UI renders those semantic events.

This makes operations deterministic and testable.

---

# 8. Before / After Mode

Every mutation operation must support a clear Before/After comparison.

Example:

```text
BEFORE
head → [10] → [20] → [30] → nullptr

AFTER
head → [5] → [10] → [20] → [30] → nullptr
```

For complex operations, allow:

`Before | Step-by-Step | After`

---

# 9. Break-It Mode

For pointer-heavy structures, introduce an optional **Break It** learning mode.

Example: doubly linked list deletion.

Correct operation:

```cpp
prev->next = next;
next->prev = prev;
```

Allow the learner to deliberately omit the second line.

The visualizer then displays:

```text
Forward traversal:  valid
Backward traversal: BROKEN
```

and highlights the stale pointer.

Other examples:

- lost linked-list node;
- dangling pointer;
- self-loop;
- corrupted tail;
- double free;
- stack underflow;
- free-list corruption;
- broken BST ordering.

This teaches invariants far more effectively than prose alone.

---

# 10. Invariant Panel

Every structure should define invariants.

Example for a doubly linked list:

```text
head->prev == nullptr
tail->next == nullptr

node->next != nullptr
    ⇒ node->next->prev == node

node->prev != nullptr
    ⇒ node->prev->next == node
```

The interactive visualization should continuously evaluate them.

Display:

`✓ All invariants valid`

or:

`✗ Broken: node 20 next->prev != node`

This becomes especially valuable later for trees, heaps, and graphs.

---

# 11. Complete C++ Implementation

Every chapter contains a complete, ready-to-compile implementation.

Not fragments.

Canonical source should live outside the prose:

```text
examples/
  chapter-01/
    SinglyLinkedList.hpp
    main.cpp
```

The book imports/display these canonical sources instead of maintaining duplicated code manually where practical.

That prevents the visible code from diverging from the tested implementation.

Each implementation must include appropriate:

- constructors;
- destructors;
- ownership rules;
- copy/move policy;
- const correctness;
- error handling;
- memory management;
- complete core operations.

---

# 12. Code ↔ Visual Synchronization

The most valuable interaction in the book should be synchronized execution.

Example:

```cpp
Node* nodeToDelete = head;
head = head->next;
delete nodeToDelete;
```

The visualizer progresses:

Step 1:

`nodeToDelete → [10]`

Step 2:

`head → [20]`

while `[10]` remains allocated.

Step 3:

node 10 visually changes to a freed-memory state.

This should make lifetime visible.

---

# 13. Memory Visualization

Memory-related chapters require a second representation.

Example:

```text
LOGICAL VIEW

head → [10] → [20] → [30]


MEMORY VIEW

0xA100   Node 10   next=0xD800
0xB200   unused
0xC100   Node 30   next=null
0xD800   Node 20   next=0xC100
```

For allocators:

```text
POOL MEMORY

0x1000 [USED]
0x1020 [FREE] ─┐
0x1040 [USED]  │
0x1060 [FREE] ←┘
```

The user should visually understand both logical topology and physical storage.

---

# 14. Complexity Explorer

Do not present Big-O only as a static table.

Show why it happens.

Example linked-list search:

```text
Search for 40:

[10] → [20] → [30] → [40]
  1      2      3      4
```

Display:

`Visited nodes: 4`

Then allow list sizes:

`8`
`32`
`128`
`1024`

The relationship between operations and `O(n)` should become visible.

For binary search later, show the search space halving.

For hash tables, show average vs collision-heavy lookup.

---

# 15. Engineering Insight Section

Every chapter ends by connecting the structure to real systems.

Examples:

Linked lists:
- free lists;
- event chains.

Stacks:
- parsers;
- backtracking;
- DFS;
- command systems.

Intrusive lists:
- render queues;
- dirty-object lists;
- memory allocators.

DAGs:
- dependency evaluation;
- build systems;
- geometry construction graphs.

R-trees:
- geometry engines;
- GIS;
- spatial picking.

The book should continually answer:

**Why would a systems engineer care about this?**

---

# 16. Chapter Page Order

Use this exact chapter structure unless a topic genuinely requires an exception:

1. Chapter Hero
2. Visual Mental Model
3. Intuition
4. Structure / Memory Layout
5. Interactive Operations
6. C++ Implementation
7. Code + Visualization Pointer Trace
8. Invariants
9. Complexity Explorer
10. Common Mistakes / Break-It Mode
11. Real-World Analogy
12. Engineering Insight
13. Exercises / Challenges
14. Chapter Summary

The philosophy remains:

**Visual first → mechanics → code → experimentation → engineering application.**

---

# 17. Site-Level Navigation

Desktop:

```text
┌───────────────┬────────────────────────────────────┐
│ BOOK          │ Chapter Content                    │
│               │                                    │
│ Part 0        │                                    │
│ Chapter 0     │                                    │
│               │                                    │
│ Part I        │                                    │
│ 01 Linked     │                                    │
│ 02 Stack      │                                    │
│ ...           │                                    │
│               │                                    │
└───────────────┴────────────────────────────────────┘
```

Use:

- collapsible book sidebar;
- chapter table of contents;
- previous/next chapter controls;
- global search;
- dark/light mode;
- progress tracking stored locally;
- responsive mobile navigation.

The visualization itself should receive as much horizontal room as possible.

---

# 18. Visual Design System

Preserve the visual identity established by the generated chapter posters:

- deep navy chapter headers;
- white/light neutral learning surface;
- restrained pale green for data/valid states;
- pale blue for pointer/reference information;
- pale amber for active operations;
- restrained red only for broken/dangerous state;
- dark code surface;
- thin technical borders;
- strong typography;
- no neon aesthetics;
- no decorative gradients unless extremely subtle.

Visuals must resemble engineering diagrams rather than cartoons.

Nodes should share one common component language throughout the entire book.

A node from Chapter 1 should visually relate to a tree node in Chapter 10.

---

# 19. Responsive Design

Desktop can use side-by-side:

`visualization | code`

Mobile should stack:

`visualization`
`code`
`controls`

Interactive diagrams must remain usable on touchscreens.

Avoid interactions that require hover.

Every hover action must also work through tap/click.

---

# 20. Accessibility

Provide:

- keyboard-operable controls;
- appropriate ARIA labels;
- meaningful focus states;
- non-color-only status indicators;
- sufficient contrast;
- reduced-motion support;
- textual/ASCII fallback where useful.

Example:

`head → [10] → [20] → nullptr`

The old ASCII diagrams therefore remain valuable.

---

# 21. Book Structure

## Part 0 — C++ Foundations for DSA

### Chapter 0 — C++ Foundations

Cover only concepts required by subsequent chapters:

- stack vs heap;
- values and objects;
- pointers;
- references;
- `nullptr`;
- pointer-to-pointer;
- structs/classes;
- constructors;
- destructors;
- RAII;
- `new` / `delete`;
- `new[]` / `delete[]`;
- placement new;
- copy constructor;
- copy assignment;
- move constructor;
- move assignment;
- deleted operations;
- `const`;
- `assert`;
- invariants;
- operator overloading;
- templates;
- iterators;
- `std::array`;
- `std::vector`;
- `std::span`;
- `std::unique_ptr`;
- `std::shared_ptr` only sufficiently to understand ownership tradeoffs;
- basic memory layout;
- Big-O introduction.

This chapter should itself be interactive.

Examples:

pointer animation:

`p → object`

move-semantics ownership transfer:

`A owns buffer → B owns buffer`

vector reallocation:

```text
old storage [10][20][30]
                ↓ reallocate
new storage [10][20][30][ ][ ][ ]
```

---

## Part I — Linear Structures and Memory

Chapter 1 — Singly Linked List  
Chapter 2 — Stack: Array and Linked Implementations  
Chapter 3 — Doubly Linked List  
Chapter 4 — Custom Allocator / Memory Pool  
Chapter 5 — Intrusive List  

---

## Part II — Queues and Ordered Access

Chapter 6 — Queue + Deque  
Chapter 7 — Circular Buffer / Ring Buffer  
Chapter 8 — Priority Queue  
Chapter 9 — Binary Heap  

Chapter 6 deliberately combines Queue and Deque because their relationship should be learned comparatively.

---

## Part III — Trees

Chapter 10 — Binary Trees  
Chapter 11 — Binary Search Trees  
Chapter 12 — Tree Traversal: DFS / BFS  
Chapter 13 — Tree Insertion and Deletion Mechanics  
Chapter 14 — AVL Trees  
Chapter 15 — Red-Black Trees  
Chapter 16 — B-Trees / B+ Trees  
Chapter 17 — Tries / Prefix Trees  

Animations must show rotations, rewiring, parent/child changes, height changes, and invariant restoration.

---

## Part IV — Hashing

Chapter 18 — Hashing Fundamentals  
Chapter 19 — Hash Tables  
Chapter 20 — Separate Chaining  
Chapter 21 — Open Addressing  
Chapter 22 — Robin Hood Hashing  
Chapter 23 — C++ `unordered_map` Engineering View  

---

## Part V — Graphs

Chapter 24 — Graph Fundamentals  
Chapter 25 — Adjacency List vs Adjacency Matrix  
Chapter 26 — Breadth-First Search  
Chapter 27 — Depth-First Search  
Chapter 28 — Directed Graphs  
Chapter 29 — DAGs  
Chapter 30 — Topological Sorting / Kahn's Algorithm  
Chapter 31 — Connected Components  
Chapter 32 — Cycle Detection  
Chapter 33 — Shortest Paths / Dijkstra  
Chapter 34 — Bellman-Ford  
Chapter 35 — Minimum Spanning Trees  
Chapter 36 — Union-Find / Disjoint Set  

DAG chapters should receive particularly strong systems-engineering treatment.

---

## Part VI — Searching and Sorting

Chapter 37 — Linear Search  
Chapter 38 — Binary Search  
Chapter 39 — Sorting Fundamentals  
Chapter 40 — Bubble / Selection / Insertion Sort  
Chapter 41 — Merge Sort  
Chapter 42 — Quick Sort  
Chapter 43 — Heap Sort  
Chapter 44 — Radix / Counting Sort  

Animations should expose comparisons, swaps, partitions, recursion, and memory usage.

---

## Part VII — Algorithmic Techniques

Chapter 45 — Recursion  
Chapter 46 — Backtracking  
Chapter 47 — Divide and Conquer  
Chapter 48 — Greedy Algorithms  
Chapter 49 — Dynamic Programming  
Chapter 50 — Memoization and Tabulation  

---

## Part VIII — Engine and Systems Data Structures

Chapter 51 — Free Lists  
Chapter 52 — Arena Allocators  
Chapter 53 — Object Pools  
Chapter 54 — Sparse Sets  
Chapter 55 — Generational Handles  
Chapter 56 — ECS Storage Patterns  
Chapter 57 — Dirty Sets / Work Lists  
Chapter 58 — Command Buffers  
Chapter 59 — Lock-Free Structure Introduction  

---

## Part IX — Spatial Data Structures

Chapter 60 — Spatial Hashing  
Chapter 61 — Quadtrees  
Chapter 62 — Octrees  
Chapter 63 — KD-Trees  
Chapter 64 — R-Trees  
Chapter 65 — Bounding Volume Hierarchies  
Chapter 66 — Broad-Phase Spatial Indexing  

Tie these chapters to geometry, CAD, collision detection, GIS, and interactive picking.

---

# 22. Directory Structure

Use a structure similar to:

```text
interactive-dsa/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── fonts/
│
├── src/
│   ├── components/
│   │   ├── book/
│   │   ├── code/
│   │   ├── controls/
│   │   ├── memory/
│   │   └── visualizers/
│   │
│   ├── visualizers/
│   │   ├── linked-list/
│   │   ├── stack/
│   │   ├── allocator/
│   │   ├── intrusive-list/
│   │   ├── queue/
│   │   ├── tree/
│   │   ├── graph/
│   │   └── spatial/
│   │
│   ├── engine/
│   │   ├── TraceEvent.ts
│   │   ├── PlaybackController.ts
│   │   ├── MemoryModel.ts
│   │   ├── InvariantChecker.ts
│   │   └── VisualizationState.ts
│   │
│   ├── content/
│   │   └── chapters/
│   │
│   ├── layouts/
│   ├── pages/
│   └── styles/
│
├── cpp/
│   ├── chapter-00/
│   ├── chapter-01/
│   ├── chapter-02/
│   └── ...
│
├── tests/
│   ├── unit/
│   ├── visual/
│   └── e2e/
│
└── documentation/
    ├── BOOK_ROADMAP.md
    ├── DESIGN_SYSTEM.md
    ├── INTERACTION_SPEC.md
    └── CHAPTER_ACCEPTANCE.md
```

---

# 23. Reusable Visualization Components

Do not implement every chapter from scratch.

Develop reusable primitives:

`DataNode`
`PointerField`
`ReferenceArrow`
`HeadMarker`
`TailMarker`
`MemoryAddress`
`ArrayCell`
`TreeNode`
`GraphVertex`
`GraphEdge`
`FreeBlock`
`ActiveBlock`
`CodeHighlighter`
`PointerInspector`
`OperationStepper`
`InvariantPanel`
`ComplexityCounter`

SVG arrows should use common definitions and markers.

All chapters should visually feel like one book.

---

# 24. Semantic Trace Engine

Implement a reusable trace/event model before scaling the book.

Possible event families:

```ts
Allocate
Construct
Destroy
Free
AssignPointer
AssignReference
Compare
Visit
Swap
Push
Pop
Connect
Disconnect
Move
Rotate
Mark
Unmark
InvariantCheck
```

A visualization receives these semantic events and renders them.

This architecture will later allow the same playback system to animate:

- linked-list rewiring;
- heap swaps;
- tree rotations;
- BFS traversal;
- DAG processing;
- sorting;
- allocator operations.

Do not hard-code every animation as isolated CSS timing.

---

# 25. Chapter Acceptance Standard

A chapter is not complete merely because text exists.

Every chapter must pass these gates:

### Content

- precise definition;
- complete intuition;
- full C++ implementation;
- edge cases;
- complexity;
- mistakes;
- engineering application.

### Visual

- initial structure;
- before/after;
- stepwise mutation;
- pointer/reference directions;
- memory state when relevant.

### Interactive

- all core operations work;
- reset works;
- stepping forward works;
- stepping backward works;
- replay produces deterministic result;
- invalid operations are handled visibly.

### Code

- canonical C++ examples compile;
- tests pass;
- frontend has no TypeScript errors.

### Responsive

Validate at least:

- desktop 1440px;
- laptop 1024px;
- mobile ~390px.

### Quality

- no overlapping arrows;
- no clipped labels;
- no illegible text;
- no stale pointer visualization;
- no discrepancy between C++ code and the visual operation.

---

# 26. Recursive Agent Workflow

The agent must not attempt all 60+ chapters immediately.

Work recursively.

## Phase A — Foundation

1. Initialize project.
2. Build global layout.
3. Build design tokens.
4. Build reusable SVG primitives.
5. Build semantic trace engine.
6. Build playback controls.
7. Build code-display system.
8. Build invariant system.
9. Build responsive shell.

Do not proceed until foundation tests pass.

---

## Phase B — Reference Chapter

Implement **Chapter 1 — Singly Linked List** first as the reference implementation.

It must include:

- hero;
- mental model;
- memory mode;
- insert-at-head lab;
- insert-at-tail lab;
- deletion lab;
- search;
- code synchronization;
- pointer inspector;
- invariants;
- complexity;
- mistakes;
- engineering insight.

Make Chapter 1 excellent before generalizing.

---

## Phase C — Architecture Review

After Chapter 1:

Audit reusable vs chapter-specific code.

Refactor before adding more chapters.

Questions:

- Are node components reusable?
- Are arrows reusable?
- Are trace events generic?
- Can Chapter 3 reuse Chapter 1 infrastructure?
- Are content and interactive logic cleanly separated?
- Is chapter data declarative where practical?

Only then continue.

---

## Phase D — Existing Chapters

Implement in order:

Chapter 0  
Chapter 2  
Chapter 3  
Chapter 4  
Chapter 5

Reuse and improve the architecture rather than duplicate it.

Chapter 0 may be placed first in navigation even though implementation happens after the Chapter 1 reference architecture.

---

## Phase E — New Chapters

Continue strictly in book order.

Next:

Chapter 6 — Queue + Deque  
Chapter 7 — Circular Buffer  
Chapter 8 — Priority Queue  
Chapter 9 — Binary Heap  
Chapter 10 — Binary Trees

Do not skip ahead merely because a later structure is more interesting.

---

# 27. Recursive Quality Loop

After every chapter:

1. Build.
2. Run TypeScript/unit tests.
3. Compile C++ examples.
4. Run browser interactions.
5. Capture desktop screenshot.
6. Capture mobile screenshot.
7. Inspect diagrams visually.
8. Check pointer correctness.
9. Check text/code agreement.
10. Fix detected problems.
11. Repeat validation.

Do not declare the chapter complete while known visual, pointer, code, interaction, or responsive defects remain.

After every 3–5 chapters, perform a cross-book consistency pass.

Refactor repeated implementations into reusable components.

---

# 28. First Milestone

The first milestone is **not** “all chapters implemented.”

The first milestone is:

> A polished interactive book shell plus one exceptional reference chapter.

Acceptance:

- navigation works;
- desktop/mobile work;
- dark/light theme works;
- Chapter 1 is complete;
- operations animate correctly;
- code lines synchronize with pointer movement;
- memory view works;
- pointer inspector works;
- invariant panel works;
- visual style matches the professional quality of the original chapter posters;
- C++ implementation compiles;
- automated tests pass.

Once this milestone is strong, expansion becomes systematic rather than chaotic.

---

# 29. Important Implementation Rules

Do not:

- convert the old PNG posters directly to web images;
- recreate them as giant fixed SVG illustrations;
- produce animation merely for decoration;
- hide pointer mutations behind generic transitions;
- duplicate C++ source in several places;
- use random memory addresses that change during a trace;
- claim freed nodes still contain valid objects;
- animate operations in an order different from the displayed C++;
- introduce a backend without a compelling reason;
- implement dozens of chapters before proving the visualization architecture.

Do:

- recreate the visual concepts as semantic HTML/SVG components;
- keep pointer movement mechanically exact;
- make states deterministic;
- favor reusable components;
- test invariants;
- compile the C++ examples;
- expose edge cases;
- preserve a clean engineering aesthetic.

---

# 30. Definition of Success

The final product should make a learner feel that they can **see the data structure executing**.

A user reading:

```cpp
node->prev->next = node->next;
```

should simultaneously see:

```text
[A] → [C]
```

and understand exactly:

- which object the pointer belonged to;
- what address/reference changed;
- which link existed before;
- which link exists afterward;
- which invariants were restored;
- whether any object was destroyed.

The book should make invisible C++ mechanics visible.

That is the central product principle.