# C++ prerequisite ledger

Canonical coverage is Chapters 1–66, Parts I–IX. This inventory was completed before Chapter 0 and records prerequisites actually used by the canonical implementations and their examples, not an advance syllabus. Earlier milestone scope notes below describe their original deliveries; the final section maps the completed inventory to Chapter 0. The user's accepted Chapters 2–5 milestone superseded the old Milestone 1 report's recommendation to author Chapter 0 next.

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 1 — Singly linked list | structs/classes, pointers, `nullptr`, `->`, constructors/destructors, `new`/`delete`, RAII, deleted copies, move ownership, const correctness, loops | `cpp/chapter-01/SinglyLinkedList.hpp`: owned nodes, borrowed links, iterative destruction, ownership transfer. Existing prerequisite floor. |
| 2 — Stack | ADT versus implementation, LIFO, contiguous storage, fixed capacity versus logical size | `ArrayStack` and `LinkedStack` implement the same order with distinct storage policies. |
| 2 | `std::array`, value initialization, indexing, signed sentinel index, prefix increment/decrement | Five existing int objects; index −1 denotes no logical members. Pop does not destroy or erase an int. |
| 2 | exceptions and guards (`std::overflow_error`, `std::underflow_error`) | Reject full-array push and empty top/pop before changing storage. |
| 2 | allocation, ownership, deleted copy/move operations, iterative destruction | Linked push constructs before publication; pop saves, advances, destroys, frees. |
| 2 | `std::vector`, iterator ranges and returned values | Native read-only `values()` observers collect a dynamic result. The production discussion mentions vector-backed stack growth; the interactive canonical stack itself remains fixed-capacity. |
| 3 — Doubly linked list | multiple pointer fields, reciprocal relationships, private helpers | Each node has `prev` and `next`; the owning list stores `head` and `tail`; unlink updates two directions separately. |
| 3 | assertions, boolean invariants, null guards, const traversal | `valid()` checks completed list structure; native examples assert boundary cases. Diagnostic traversal assumes pointers refer to owned live nodes. |
| 3 | loops, dynamic result vectors, first-match semantics, amortized result growth | `erase(value)` searches before rewiring; forward/backward traversals return collected values. |
| 4 — Memory pool | `std::size_t`, non-type template parameters, `std::array`, `static_assert` | Capacity is a compile-time parameter; storage and metadata have a fixed bound. |
| 4 | unions, active members, `sizeof`, `alignof`, alignment, over-aligned types | A block can hold either `T` or a free-list pointer. Native validation uses `alignas(128)`; the union satisfies both members' size and alignment. |
| 4 | storage lifetime versus object lifetime, placement new, explicit destructor calls | `allocate`, `construct`, `destroy`, and `deallocate` are separate operations; the pool storage survives successive objects. |
| 4 | `void*`, pointer equality, `static_cast`, `std::addressof` | Reserved storage has no user object yet. Checked address lookup uses equality, never subtraction/ordering of unrelated pointers. Construction names the union member and retains the new-expression's returned pointer. |
| 4 | enum classes, arrays of metadata, type traits, `noexcept` | Explicit free/reserved/live/destroyed phases and a non-throwing destructor constraint. |
| 4 | variadic templates, forwarding references, `std::forward` | `construct`/`create` forward constructor arguments to `T`. These are genuinely present in the generic implementation. |
| 4 | `std::bad_alloc`, invalid/logic errors, catch-all cleanup and rethrow | Exhaustion and rejected misuse are checked; a throwing constructor returns reserved storage through `create()` cleanup. |
| 4 | `reinterpret_cast`, `std::uintptr_t` (validation example only) | The native example checks a returned address's alignment. The allocator does not use integer pointer arithmetic for membership. |
| 5 — Intrusive list | object ownership versus non-owning membership, stable addresses | Objects are externally owned and remain alive after unlink; objects and lists disable moves/copies that would invalidate links/tokens. |
| 5 | forward declarations, reference parameters, member access, hook structures | `Object`, `IntrusiveHook`, and `IntrusiveList` express non-owning links without allocating wrapper nodes. |
| 5 | explicit owner/list pointers, singleton state, invariants | Null prev/next cannot prove detachment. The owner token detects singleton membership and rejects duplicate/wrong-list operations. |
| 5 | multiple independent hooks, enum-selected array entries | Active/render/dirty memberships use independent links and owner tokens in the same object. |
| 5 | RAII destruction order, assertions, `noexcept` cleanup | Lists must unlink before external objects are destroyed. List destruction clears membership; it does not delete objects. |
| Validation examples (2–5) | lambdas, generic helper templates, `assert`, type-trait checks | Small native test drivers exercise rejection paths and ownership restrictions; these uses should be identified separately from the learner-facing container APIs. |
| 6 — Queue + deque | ADT versus storage policy, FIFO, interface restriction, composition | `Queue` owns an `ArrayDeque` and exposes only enqueue/dequeue/front/back/empty/size. The underlying deque additionally exposes both endpoints. |
| 6 | `std::array`, `std::size_t`, half-open ranges, indexed assignment, loop bounds | `ArrayDeque` owns five existing integers. Front operations shift values through `[0, count)`; removing membership does not destroy the integer in the old last slot. |
| 6 | defaulted special members, rule of zero, value semantics | Inline array and count copy together; moving this integer array retains a valid source value. The `Queue` wrapper delegates ownership by value. |
| 6 | `std::overflow_error`, `std::underflow_error`, const/noexcept observers | Full insertion and empty endpoint access are rejected before any mutation. `values()` constructs an observer vector from an iterator range. |
| 7 — Circular buffer | remainder/modulo arithmetic, physical index versus logical order, count and sentinel encodings | `RingBuffer` advances read/write indices with `(index + 1) % capacity`; logical position `i` maps to `(head + i) % capacity`. `SentinelRing` reserves one slot to distinguish full from empty without count. Capacity is the fixed, positive constant five. |
| 7 | `enum class`, default arguments, explicit policy branches | `Policy::reject` preserves a full ring; `Policy::overwrite` discards the oldest member before publishing a new one. All slots contain live integers throughout. |
| 7 | unsigned index bounds and separate assignment statements | Head/tail/count updates are separate statements; the completed invariant `tail == (head + count) % capacity` may temporarily be false during an operation. Fixed bounds keep the arithmetic representable. |
| 8 — Priority queue | structs, vectors, stable ordering, strict comparisons, conditional expressions | `Entry` separates payload from priority. `higher_` selects comparison direction; equality retains the earlier arrival. The canonical implementation uses an unsorted vector, not a heap. |
| 8 | iterator difference types, `static_cast<std::ptrdiff_t>`, `vector::erase` | `extract()` locates the best index, saves an entry by value, and erases it while preserving remaining arrival order. The iterator conversion is bounded by the vector's valid index range. |
| 8 | defaulted equality (C++20), defaulted copy/move, RAII | `Entry::operator==` compares both integers. Vector ownership supplies copies, moves and cleanup; guard exceptions leave storage unchanged. Insertion may allocate. |
| 9 — Binary heap | integer division, array/tree index mapping, guarded unsigned subtraction | Root has no parent; other indices use `(i - 1) / 2`. Left/right are `2*i+1` and `2*i+2`; the child-existence guard precedes multiplication. |
| 9 | private comparison/helper functions, `std::swap`, loops and invariants | A runtime max/min flag chooses a strict value comparison. Sift-up/down mutate one array; the tree is an interpretation of that array. No user-supplied comparison functor or generic comparator template is introduced. |
| 9 | `std::vector::push_back/pop_back`, `std::move`, pass-by-value construction | `buildHeap` receives an owned vector, moves it into storage, and sifts internal nodes in reverse order. Allocation precedes non-throwing integer swaps; vector capacity growth can add linear work to insertion. |
| Validation examples (6–9) | assertions, lambdas, exception-catching helpers, `std::sort`, copy/move checks | Native programs exercise endpoint boundaries, overflow/underflow preservation, repeated wrapping, tie ordering, both heap directions, and construction/extraction over many sizes. These are validation techniques, not extra container API prerequisites. |

The eventual foundations chapter should distinguish concepts needed to *use* these types from concepts needed to *implement* or *test* them. No Chapter 0 implementation is included in this milestone. Do not add prerequisites for later search trees, graphs, allocators, or generational handles until their actual use is established.

## Part III — concepts now used by canonical tree implementations

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 10 — Binary trees | Recursive data representation, owning child links versus observing local pointers | `BinaryTree::Node` contains left/right raw links. Ownership is hierarchical; physical allocations need not be adjacent. No parent field is stored. |
| 10–11 | `Node**`, address-of a pointer field, dereferencing an owning slot | Complete-shape append and BST insertion/deletion select either `&root_` or a child field and later assign `*slot`. The local pointer-to-pointer is distinct from the field it addresses. |
| 10 | `std::vector<Node*>` as a worklist, size/index values, allocation-before-publication | Complete-shape append scans vacancies and constructs a node only after finding its slot. Temporary worklist allocation can fail before tree mutation. |
| 10–13 | Private inheritance, `using` declarations, virtual destruction, deleted copy/move | BST reuses the Node and cleanup owner while hiding unordered append; traversal observes the shared Node type. MutationTree is an alias, not another owner implementation. |
| 10, 13 | Iterative, allocation-free cleanup through pointer rewrites | `clear()` rotates left subtrees upward then deletes bypassed roots, avoiding recursive destruction for skewed input. These rewrites do not promise balancing. |
| 11, 13 | Ordered-set policy, strict comparisons, short-circuit conditions, const observers, `noexcept` | Equal integers are rejected; strict successor/predecessor also accept missing query values. Erase copies an integer successor payload, repairs its owning slot, then deletes it. |
| 12 — Traversal | Recursion, call-stack lifetime, reference parameters, namespace, scoped enum | `tree_traversal::dfs` appends to one referenced output vector. `Order` selects output before, between, or after recursive child calls. Null calls and suspended callers are explicit. |
| 12 | `std::queue`, FIFO operations, value-returned vectors | BFS saves `front()` before `pop()` and enqueues each child separately. Returned output occupies O(n) memory in addition to queue or recursion storage. |
| 14 — AVL | `Node*&` references to owning pointers, helpers, cached metadata, bottom-up recursion | `repair` publishes returned subtree roots through the caller's actual slot. Rotation helpers save pivot/transfer locals, rewrite child links and recompute stored heights in dependency order. |
| 14 | `std::max`, `std::abs`, sentinel height conventions, numeric limits | Null stored height is 0; leaf stored height is 1. Diagnostics check strict BST bounds, cached heights and balance factors. The chapter distinguishes stored height from edge height. |
| 15 — Red-black | Actual parent pointers, boolean color state, conditional lvalues, mirrored cases | Conventional rotations repair both child and parent fields. Insertion uses parent/uncle/grandparent relations; native deletion carries a separate parent when the replacement is null. Color is a bool in this implementation, not an enum prerequisite. |
| 14–16 | Recursive cleanup of height-bounded owners | AVL, RB and page-tree cleanup recurse over valid bounded-height structures. This differs from unbalanced BST iterative cleanup and arbitrary-depth DFS. |
| 16 — B/B+ trees | Nested dynamic containers, iterator positions/ranges, reserve, resize, insert/erase, lower/upper bounds | Each page stores key and child vectors; keys/child ranges split at explicit statement boundaries. Constructors reserve the maximum page capacities before publication. |
| 16 | Exception cleanup and rethrow, capacity and ownership contracts | A split allocates/reserves its sibling before rewiring. A guarded new root is published after its split. Earlier completed splits may remain after later allocation failure, preserving logical contents and validity. |
| 16 | Non-owning sibling pointers, separator versus record semantics, result vectors | B+ leaves link through `next`; destruction follows only owning child links. Internal keys guide search, and linked leaves supply range results. |
| 16 | Replacement ownership and `std::swap` | B+ canonical erase builds a replacement and swaps roots. This deliberately provides O(n log n) rebuilding deletion, not an in-place logarithmic erase; its cost and scope are explicit. |
| 17 — Tries | `std::string_view`, `std::string`, characters, bounded ASCII validation | A string is a path, terminal is independent of prefix presence, and empty-string membership belongs at the root. Native words are limited to 64 lowercase letters; the visual lab is more tightly bounded. |
| 17 | Sparse `std::map<char, Node*>`, map lookup/insertion/erasure, structured bindings | Character transitions select actual map entries; the fixed 26-letter alphabet bounds per-transition comparison work. Map nodes incur allocations distinct from the illustrated Trie Node allocations. |
| 17 | Recursive pruning, exception rollback of an unused suffix | Erase preserves shared prefixes and longer words. Failed insertion removes newly published, nonterminal dead-end paths without deleting prior words. Cleanup depth is bounded by the validated native word length. |
| Validation examples and fixtures (10–17) | Standard set/vector oracles, deterministic integer generators, extreme-value checks, type traits, injected allocation failures, RAII debug watchers | Validation-only mechanisms test ordered contents, deletion cases, allocation guarantees, noncopyable ownership, native locals and statement state. They are not hidden runtime fields in the learner-facing containers. |

The eventual foundations chapter should distinguish concepts needed to *use* these types from concepts needed to *implement* or *test* them. No Chapter 0 implementation is included in this milestone. Do not add prerequisites for later graphs, allocators, or generational handles until their actual use is established. No comparator concepts were added: these canonical ordered trees store integers and compare them directly.

## Part IV — concepts now used by canonical hashing implementations

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 18 — Hashing fundamentals | `std::uint32_t`, unsigned arithmetic, `unsigned char`, `std::string_view` | Polynomial-31 accumulates lowercase ASCII bytes with defined 32-bit wrap. Modulo capacity is a separate operation. This is a deterministic teaching hash, not cryptographic hashing or a claim about `std::hash`. |
| 18 | Positive size guards and remainder arithmetic | `bucket_index` rejects zero capacity before modulo; the full hash remains unchanged when capacity changes. |
| 19 — Hash tables | Type aliases, map ADT versus representation, `size` versus bucket count versus load factor | `HashTable` aliases Chapter 20's actual owning map. Insert-or-assign distinguishes a new key from an update; automatic growth remaps keys. |
| 20 — Separate chaining | `std::unique_ptr`, `std::make_unique`, ownership transfer through `std::move` | Bucket heads and `Node::next` uniquely own chains. A local owner holds a detached entry until reconnection/publication. Read-only traversal uses borrowed raw pointers. |
| 20 | Pointer to an owning field, iterative cleanup, deleted copy/move policy | Erase edits either a bucket head or predecessor's `next`. Iterative destruction avoids recursive destruction of an adversarial long chain. The owner intentionally exposes no iterators or copy/move operations. |
| 20–22 | `std::optional`, absence versus zero-valued results | Lookup returns a present integer or `std::nullopt`; slot lookup returns an optional index, so index zero is still a successful result. |
| 20–22 | Replacement construction, `vector::swap`, capacity validation, allocation failure | Rehash allocates replacement storage before committing. Chaining preserves node addresses; inline-table indices and references must be reacquired when storage changes. |
| 21 — Open addressing | `enum class`, explicit slot state, full-cycle bounded loops | EMPTY ends lookup, TOMBSTONE preserves it, OCCUPIED triggers equality. Insertion remembers a tombstone but continues searching for an existing key. |
| 21–22 | Copy constructors, copy-and-swap assignment, deleted moves | Vector copies own independent slot storage; copy assignment builds before swapping. Moves are disabled to retain the nonzero-capacity invariant in every usable object. |
| 22 — Robin Hood hashing | Aggregate records, `std::swap`, modular distance, backward shifts | Incoming and resident records exchange places only under the greater-distance rule. Erase shifts later records backward and decrements distance; it does not leave tombstones. |
| 23 — `std::unordered_map` | Standard-library class templates, hash function objects, `operator()`, equality predicates | `TeachingHasher` and `PointHash` supply hashing; default key equality uses `operator==`. Equivalent keys must hash equally. The examples do not implement a generic table template or specialize `std::hash`. |
| 23 | C++20 defaulted equality, custom key structs, `std::pair<const Key, T>` | `PointKey` compares x and y; a map's element has an immutable key and mutable mapped value. Distinct keys may collide. |
| 23 | `insert_or_assign`, `contains`, `at`, `operator[]`, bucket/load APIs | Native examples exercise the standard container directly; `operator[]` appears in the custom-key example. Actual bucket count and iteration order are implementation-selected. |
| 23 | Iterator versus reference/pointer invalidation, `reserve` versus `rehash`, `max_load_factor` | Reserve requests room for elements; rehash requests a bucket lower bound. Rehash invalidates iterators while preserving pointers/references to surviving elements. The example retains an element pointer across rehash and never uses an invalidated iterator. |
| Validation (18–23) | Ordered-map oracle, deterministic generators, type traits, native source instrumentation | Test-only mechanisms compare actual canonical execution, independent contents, capacity boundaries, copies and lifetime policies. They are not extra fields in the learner-facing implementation. |

These are observed prerequisites, not a new Chapter 0 syllabus. Chapter 0 and Parts V onward remain unimplemented by this milestone.

## Part V — concepts now used by canonical graph implementations

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 24–25 — Fundamentals and representations | Value records, vertex indices, `std::vector`, nested vectors, `std::vector<bool>` | Edges hold IDs and weights. Adjacency and matrix presence derive from the same graph; zero weight is not absence. ID order has no native address or hierarchy meaning. |
| 24–25 | Bounds/duplicate validation, exceptions, `std::move`, copy-before-commit | Controlled edits validate a proposed graph before publishing it; self-loops are accepted and parallel pairs rejected by the interactive simple-graph policy. |
| 26 — BFS | `std::deque`, FIFO front/pop/push operations, indexed distance/predecessor/color arrays | Discover before enqueue; assign unweighted distance and predecessor at separate tagged statements. Returned state owns its arrays. |
| 27, 32 — DFS/cycles | Explicit continuation records, vector-backed stack, numeric traversal colors | Each frame stores vertex, next-neighbor cursor and parent-edge index. The native canonical DFS is iterative; conceptual recursive calls are explained without requiring a recursive implementation. Directed GRAY and undirected parent-edge rules stay distinct. |
| 28 — Directed graphs | Const graph traversal, ordered endpoints, incoming/outgoing scans | Reversing an edge changes reachability. Incoming and outgoing neighbors are derived, not extra ownership pointers. |
| 29–30 — DAG/Kahn | Nested adjacency vectors of edge indices, `std::size_t`, `std::deque`, result vectors, default template arguments and callable observers | `Graph` validates endpoints and preserves input order. Kahn maintains residual indegrees and emits to an owned output vector. The default observer does nothing; validation observers receive const state after tagged statements. |
| 29–30 | Logical removal flags, signed observer sentinel, checked implementation bounds | Retired edges remain in the original vector. The current vertex/edge observer uses −1 for absence; native graph IDs use unsigned indices. The native Kahn runner bounds counts before its signed observer casts. |
| 31 — Components | Outer seed loop, component-ID arrays, FIFO reuse | Each unseen seed launches another traversal; isolated vertices receive their own component ID. |
| 33–34 — Weighted shortest paths | `std::optional<long long>`, `std::numeric_limits`, guarded addition | Disengaged optional denotes infinity. Arithmetic never adds to infinity and checks signed overflow before forming a candidate. Bellman–Ford distinguishes provisional numbers from valid finite results after a reachable negative cycle. |
| 33 | `std::priority_queue`, `std::pair`, structured bindings, `std::greater` | Lexicographic `(distance, vertex ID)` ordering supplies deterministic ties. Duplicate candidates remain present; stale extraction is tested explicitly. The displayed queue is sorted dequeue order, not physical heap storage. |
| 34 | Structured arc records, repeated edge passes, early-exit flag | Undirected edges expand into two directed arcs except self-loops. A separate detection scan checks reachable negative cycles. |
| 35 — Kruskal | `std::sort`, comparison lambdas, edge-index permutation, `std::iota` | Sort by weight then original edge index. Size-based parent arrays test component membership; accepted edges, weight total and component count update separately. This chapter's helper does not perform path compression. |
| 36 — Union-Find | Owned parent/size vectors, root-only metadata, saved-path vectors, two-pass compression | Find walks to a self-root, then assigns actual shortcuts. Only root sizes are current; equal-size unions choose the lower numeric root. Numeric IDs are scoped to the instance. |
| 36 | `reserve`, validation before mutation, standard-container value ownership | Make-set reserves growing containers before publication; union checks both operands before either find can compress. Copying creates an independent partition. |
| 33–36 | `std::function` optional observer | The observer is teaching/validation instrumentation. It must be nonthrowing and nonreentrant; snapshot copying and queue projection are excluded from core algorithm complexity and explicitly discussed. |
| Validation (24–36) | Assertions, observer callbacks, deterministic fixtures, independent closure/shortest-path/spanning-forest/partition oracles | Native parity compares every tagged snapshot. Independent oracles check mathematical outcomes so equivalent mistakes in both implementations are not the only validation. These are validation prerequisites, not hidden graph fields. |

The original Chapters 1–36 freeze preserved every Part I–V record above without anticipating Parts VI or VII. Their actual prerequisites are now recorded below. Chapter 0 remains deferred until after Part IX.

## Part VI — concepts used by canonical searching and sorting implementations

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 37 — Linear search | Indexed loops, equality, early termination, signed result sentinel | A bounded forward scan returns the first matching index; −1 means absence and is never used to index storage. Unsorted input is supported. |
| 38 — Binary search | Half-open intervals, integer division, overflow-safe midpoint, monotonic-domain precondition | `low + (high - low) / 2` and exclusive high define the exact updates. The example validates ascending order separately; the checked wrapper is linear even though its query loop is logarithmic. It returns any match. No lower_bound implementation is introduced. |
| 39 — Sorting fundamentals | Record identity, defaulted equality, strict ordering helper, index-pair enumeration | Item records retain key and original ID. Strict inversions exclude equal keys; swapping complete records demonstrates stability separately from numeric sortedness. Runtime ascending/descending helpers are used, not a generic user comparator API. |
| 37–40 | Shared header inclusion, namespaces, optional observer templates, value-owned vectors | `SortState.hpp` supplies bounded input construction, identity records, counters, `std::optional` held storage and observer state. Header downloads preserve relative chapter directories. Observers must not mutate or reenter an operation. |
| 40 — Elementary sorts | `std::swap`, strict tie policy, held local record, shifts versus final placement | Bubble swaps adjacent inversions and may stop after a clean pass. Selection performs one minimum placement. Insertion copies a held record, shifts separately and fills a logical hole; stale physical copies are distinguished from membership. |
| 41 — Merge sort | Generic lambda self-recursion, half-open subranges, left-on-equality merge, optional buffer occupancy | Both child ranges return before merging. One O(n) temporary vector is reused; writes and copy-back occur separately. Optional occupancy is a teaching representation of unwritten buffer slots. |
| 42 — Quick sort | Explicit Lomuto partition contract, recursion progress, scoped pivot and scan indices | Last-element pivot, `<=`, next-free i and scan j define one concrete scheme. Children exclude the pivot; average/worst stack depth is separate from constant partition workspace. Guarded Fault branches demonstrate mistakes without unsafe reads or infinite recursion. |
| 43 — Heap sort | Active array prefix, reverse internal-node traversal, guarded child arithmetic | Chapter 9's child selection and sift-down mechanics adapt to a shrinking heapSize. The array retains its finalized suffix instead of removing extracted elements. Parent geometry is reused and native construction is differentially validated. |
| 44 — Counting/radix | Bounded nonnegative integer domains, cumulative bucket ends, reverse stable placement | Counting allocates maxKey + 1 buckets (maximum 99). Whole key/identity records enter an output buffer at positions reserved by decremented cumulative ends. Negative and excessive counting domains are rejected. |
| 44 | Integer digit extraction, decimal divisor, guarded multiplication | LSD radix uses `(key / divisor) % 10` and checks whether another digit exists before multiplying the divisor. Nonnegative signed 32-bit extrema are supported; maximum scans are separate from sorting comparisons. |
| 41–44 | `std::int32_t`, vectors, optional values, move/value ownership and observer snapshots | Direct key comparisons avoid subtraction overflow. Canonical examples cap traces at 32 records. Explicit diagnostic ranges, copied input owners and playback history are separated from algorithm workspace claims. |
| Validation (37–44) | Stable numeric-sort oracles, exhaustive short arrays, deterministic corpora, native observer parity | Tests compare identities, key order, intermediate invariants and exact source-tagged native state. Chapter 9 supplies a separate heap-construction oracle. These are validation techniques, not additional production algorithm requirements. |

Only actual use is recorded. Part VI ends at Chapter 44. Its original independent review did not accept Part VII; Milestone 05 now validates both inventories together through Chapter 50. Chapter 0 remains deferred.

## Part VII — concepts used by canonical algorithmic-technique implementations

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 45 — Recursion | Recursive functions, per-invocation parameters and locals, return values, base cases | `factorial_call` retains its own `n` and resumes multiplication after the child's return. Conceptual frames describe retained state, not ABI bytes or native addresses. Input is bounded to 0–8, keeping integer results and demonstration depth safe. |
| 45 | Loop accumulator versus recursive continuation | The iterative variant multiplies factors in one conceptual frame. Teaching state retains history; this instrumentation is distinct from an ordinary constant-space iterative factorial. |
| 46 — Backtracking | Mutable state passed by reference, `vector::push_back/pop_back`, copy of a solution | `explore` appends a candidate, recursively explores, and explicitly pops it. Saved combinations are independent vector copies. Increasing candidates prevent duplicate sets; remaining capacity permits pruning. |
| 46 | Nested vectors and recursive tree records | Partial solutions, completed combinations and conceptual search nodes are owned values. The bounded example has no raw owning pointers or manual lifetime management. |
| 47 — Divide and conquer | Half-open subranges, safe midpoint, recursion, merge buffers, stable comparison | `solve(lo, hi)` covers disjoint halves. Equal values select the left side; original-index metadata validates stability. Empty and singleton ranges terminate directly. |
| 47 | Reference invalidation under vector growth, `std::move`, `std::iota` | A reference to the active frame is acquired only after recursive pushes finish. Origins use ascending indices; vectors own all storage. |
| 48 — Greedy algorithms | `std::stable_sort`, comparison lambda, interval endpoint conventions | Finish-time order commits compatible half-open activities. Stable ties retain input order. Largest-first coin choice is shown as a counterexample, not a universally optimal rule. |
| 48–50 | Input normalization with `std::sort`, duplicate detection with `std::adjacent_find`, exception guards and reverse iterators | Denominations are checked for positive bounded values and duplicates before solving. All store ascending denominations; greedy visits them largest-first with `rbegin`/`rend`, while DP visits them forward. These checks validate the denomination contract rather than prove greedy optimality. |
| 49 — Dynamic programming | State indices, recurrence, dependency order, `std::optional<int>`, numeric sentinels | Coin tables distinguish unknown (`nullopt`), proven unreachable (`-1`), and nonnegative optimum. Arithmetic adds one only to reachable dependencies; positive coins make dependencies smaller. |
| 49–50 | Generic lambda recursion through an explicit self parameter | Fibonacci and memoized solving pass the lambda to itself. This is actual canonical usage; no implicit claim about C++23 explicit-object parameters. |
| 50 — Memoization and tabulation | Cache lookup, local versus shared state, stack depth, bottom-up loops | Each memo invocation retains amount, best and pending child; cache hits include unreachable results. Tabulation resolves the same recurrence in ascending amount order. Neither strategy is universally preferred. |
| 45–50 | `std::function` observers, const state views, owned snapshot copies | Optional observers expose tagged execution for validation. The examples also retain teaching metadata; snapshot/history costs are distinguished from core algorithm bounds. Observers must not mutate or reenter the run. |
| Validation (45–50) | Bitmask enumeration, BFS amount oracle, native observer fixtures, sanitizer runs | Independent bounded oracles validate outcomes separately from native/TypeScript trace parity. These are validation techniques, not additional learner-facing algorithm requirements. |

Only concepts used in these canonical sources are added. Chapter 0 remains
deferred until after Part IX, and Parts VIII and IX are outside this delivery.

## Chapters 1–50 reconciliation

Milestone 05 preserves every Part I–VII prerequisite row above. Searching/sorting
records, ranges, buffers and observers remain Part-VI-owned; recursive frames,
search restoration and subproblem validity remain Part-VII-owned. Similar use of
vectors or ranges does not introduce a shared state-model prerequisite. Diagram
fitting and acceptance tooling add no learner-facing C++ prerequisites. Observer
instrumentation and validation-only techniques remain distinguished from core
algorithm requirements. No prerequisites are invented for Parts VIII or IX;
Chapter 0 remains deferred until after Part IX.


## Part VIII — concepts used by canonical engine and systems implementations

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 51 — Free lists | `std::byte`, `alignas(std::max_align_t)`, `std::memcpy`, index sentinel | Free storage holds an embedded next index copied through bytes. Acquired bytes do not expose a free-link field. Bitmap validation catches immediate invalid/double return; raw indices do not supply enduring identity. |
| 52 — Arena allocators | Power-of-two alignment, masks, subtraction-based bounds checks, `std::span<std::byte>` | A 16-aligned 64-byte backing array supports aligned positive-size raw reservations. Spans are nonowning and reset invalidates reservations by contract. Reset does not destroy client objects. No marker stack is implemented. |
| 53 — Object pools | `alignas(T)`, `sizeof(T)`, `std::construct_at`, `std::destroy_at`, forwarding references and `std::forward` | Reserve raw storage, construct a T, explicitly destroy it, then return the slot. The returned construction pointer is retained. Throwing construction rolls storage back; `std::is_nothrow_destructible_v<T>` is required. |
| 51–53, 55–58 | Deleted copy/move, fixed capacity, vector reservation, observer preconditions | These owners keep storage stable or retain bounded vector capacity. Optional observers must not throw/reenter, and retained snapshots must be copied. Instrumentation/ledger work is distinguished from core operations. |
| 54 — Sparse sets | Direct-index metadata, short-circuit bounds/equality test, `vector::back/pop_back` and swap-delete | Membership checks both dense range and identity. Moving the tail repairs its inverse entry; an absent ID's stale sparse entry is harmless only with the full round-trip test. Dense positions and iteration order can change. |
| 55 — Generational handles | `std::uint32_t`, `std::numeric_limits`, aggregate handle, `std::optional<int>` | Bounds, alive state and generation must agree. Destroy clears the value before advancing generation. Slots retire at a chosen limit instead of wrapping; no bit packing or reclamation scheme is implemented. |
| 56 — ECS storage | Paired dense ID/value columns, sparse joins, checked integer addition | Position and Velocity pools own component values independently of entity identity. Structural mutation moves IDs and values together. Generation checks reject stale handles. Archetypes/chunks are a conceptual comparison, not a second framework. |
| 57 — Dirty work | Two vectors and membership arrays, `swap`, cursor, stable mutation boundary | Marks during processing enter NEXT; CURRENT stays frozen. Flags deduplicate separately per wave. Promotion copies/clears the bounded flag domain; wave budgets do not promise convergence. |
| 58 — Command buffers | `enum class`, owned aggregate payloads, sequential dispatch, optional occupancy, result records | Create/Move/Delete records own scalar payloads. Ordered best-effort flush validates handles and records failures while continuing. No type-erased command interface, transaction rollback, or undo system is used. |
| 59 — SPSC | `std::atomic<std::size_t>`, relaxed/acquire/release, `is_lock_free`, reserved-slot ring | Own-index loads are relaxed; peer-index loads acquire; index publication releases. Payload objects stay alive. One writer per index avoids CAS in the ring; atomic lock-freedom remains implementation-dependent. |
| 59 — Atomic demonstrations | `compare_exchange_strong`, expected-value update, acquire-release success/acquire failure | Separate scalar CAS/ABA examples illustrate value comparison and intervening history. They allocate no nodes and implement no concurrent linked stack. |
| 59 — Standalone driver | `std::jthread`, lambda captures, explicit `join`, `std::this_thread::yield`, `-pthread` | One producer and consumer transfer an ordered sequence. The driver retries; the queue's try operations do not. Queue destruction follows both joins. |
| Validation (51–59) | Native tagged snapshots, independent storage/set/queue oracles, alignment/destructor checks, `std::binary_semaphore` gates, ThreadSanitizer | Controlled test gates pause publication/reuse without reading another thread's payload. ASan/UBSan do not prove race freedom; even a clean TSan run covers only exercised executions. Semaphores are test instrumentation, not part of the canonical queue. |

Only actual source use is recorded. Cache locality and reclamation are explained
as engineering concepts, not implemented as extra APIs. Chapter 0 remains deferred.

## Part IX — concepts used by canonical spatial implementations

| Chapter | Prerequisite | Concrete use and teaching boundary |
| --- | --- | --- |
| 60–66 | Small value geometry structs, finite floating-point validation, closed bounds | Points and AABBs use `double`; `std::isfinite` and explicit coordinate limits reject NaN, infinity and excessive magnitude. Minimums cannot exceed maximums; touching and zero-extent bounds are valid. No external geometry library or native-layout assumption. |
| 60 | `std::floor`, signed integer cell coordinates, normalized remainder, full-key equality | Negative coordinates map to the correct half-open grid cell. Seven teaching buckets retain full coordinate keys so hash collisions cannot merge cells. |
| 61–62 | Recursive subdivision, bit-indexed child selection, fixed root and depth guards | Midpoint equality selects the high child. Quadtrees allocate four children on split; octrees retain eight slots but allocate occupied octants sparsely. Depth caps permit overflow leaves for coincident points. |
| 61–65 | Value-owned vectors, stable integer node references and recursive traversal | RAII owns records. Index references survive vector relocation; code reacquires nodes after growth. Parent/child and pending redistribution state are explicit. No new raw-owning-pointer mechanism is required. |
| 63 | Coordinate/ID total ordering, alternating dimensions, sorted medians, squared distance | Balanced KD construction uses `std::sort` at every subrange. Nearest traversal compares point and split-plane squared distances; equal-distance ties choose the lowest ID and require visiting an equally close opposite plane. |
| 64 | AABB union/area, lexicographic tuple comparison, capacity and root exceptions | Minimum area enlargement chooses a child. Center sorting splits overflowing leaves/internal nodes, and ancestor unions restore enclosure. No R*-tree algorithm is claimed. |
| 65 | Centroid extents, recursive sorting, bottom-up ancestor updates | A binary BVH divides on the longest centroid extent and refits the moved leaf then ancestors. Lookup scans and snapshot instrumentation are distinguished from the ancestor-update cost. |
| 66 | Runtime dimensionality, integer coordinate arrays, ordered maps and sets, canonical pairs | One 2D/3D grid enumerates all cells touched by closed AABBs. `std::map` locates exact cell keys; `std::set` suppresses duplicate ID pairs. An optional overlap filter tests unique candidates once. No general dimensional template system is introduced. |
| 60–66 | Optional `std::function` observers, const views and copied snapshots | Instrumentation exposes canonical statement boundaries. Callbacks must not reenter or mutate the observed state. Snapshot history is educational overhead, not core query complexity. |
| Validation (60–66) | Bounded deterministic corpora, exhaustive geometric scans, native snapshots, sanitizer checks | Independent point/range/nearest/pair oracles test outcomes separately from TypeScript/C++ parity and continuous structure-specific invariants. These are validation techniques, not additional production geometry features. |

This inventory records actual Part IX use. Concurrent Part VIII additions remain independently owned and are preserved. Chapter 0 is still deferred; no ML or additional mathematics chapter has been introduced.

## Chapter 0 closeout — prerequisite to lesson mapping

Chapter 0 was authored after the Parts I–IX inventory. Historical “deferred” statements above describe the status of their individual milestone deliveries. The live chapter is `src/content/chapters/00-cpp-foundations.mdx`. Lessons 0.1–0.22 teach the mechanics needed to read canonical code; 0.23–0.25 preview later-specific uses; 0.26–0.27 teach the book's reasoning vocabulary; 0.28 isolates validation infrastructure.

| Ledger concept from actual usage | Chapter 0 lesson | Scope and later example |
| --- | --- | --- |
| Declarations, types, names, scopes, headers, namespaces, member access | 0.1 | Reading vocabulary used from Chapter 1 onward. |
| Storage duration, object lifetime, construction/destruction, automatic and dynamic storage | 0.2, 0.6, 0.9 | Chapters 1, 4, 52–53. |
| Raw pointers, null, address-of, dereference, references, borrowed const access | 0.3 | Chapters 1, 3, 5, 10 and 20. |
| `Node**`, address of an owning field, `Node*&` | 0.4 | BST, AVL and chaining ownership slots in Chapters 10–11, 14 and 20. |
| `struct`, `class`, access control, nesting, forward declarations, private inheritance | 0.5 | Lists, trees and hashing owners; the exact inheritance policy remains in Chapter 10. |
| Constructors, member initializers, destructor order, `this` | 0.6 | Linked owners and typed pools. |
| RAII, unique ownership, non-owning intrusive membership | 0.7 | Chapters 1, 5, 20 and 53. |
| `new`/`delete`, matching `new[]`/`delete[]`, dangling and double-delete faults | 0.8 | Early raw-owning examples and allocation failures. |
| `sizeof`, `alignof`, `alignas`, union active members, placement construction, `construct_at`/`destroy_at`, `std::byte`, `std::memcpy`, type traits | 0.9 | Chapters 4 and 51–53; pool-specific block representation remains there. |
| Copy/move constructors and assignments, `std::move`, defaulted/deleted operations, value ownership | 0.10 | Chapters 1, 6, 20–21 and 36. |
| `const`, `noexcept`, `static_assert`, debug `assert` | 0.11 | Pool contracts and read-only observers. |
| `throw`/`try`/`catch`, guard before mutation, rollback and exception guarantees | 0.12 | Chapters 2, 4, 10, 16 and 52. |
| `std::array` versus `std::vector`, logical size, capacity, reserve/resize and reallocation | 0.13 | Chapters 2, 9, 16, 54 and 56. |
| Borrowed `std::span` and `std::string_view` versus owned `std::string` | 0.14 | Trie, hashing and arena code in Chapters 17–18 and 52. |
| `std::optional`, index zero versus absence, signed sentinel distinctions | 0.15 | Hash lookups, DP and handles in Chapters 20–22, 49 and 55. |
| Scoped `enum class` phase and command values | 0.16 | Chapters 4, 7, 21 and 58. |
| C++20 defaulted equality and manual operator semantics | 0.17 | Chapter 23 keys, Chapter 39 records, Chapter 55 handles. |
| Lambdas, captures, `operator()`, comparators, `std::function` observers | 0.18 | Hashing, sorting, greedy, DP and spatial chapters. Observer restrictions stay in their owner chapters. |
| Type/non-type templates, variadic arguments and `std::forward` | 0.19 | Chapters 4, 23 and 53. |
| Iterators, half-open ranges, sort/bounds algorithms, reverse iterators, structured bindings and invalidation | 0.20 | Chapters 16, 23, 35, 48 and 63. Container-specific rules stay with each container. |
| `size_t`, fixed-width integers, numeric limits, guarded arithmetic, safe midpoint and negative remainder | 0.21 | Chapters 7, 9, 18, 38, 55 and 60. |
| Finite `double`, NaN/infinity, squared distance | 0.22 | Chapters 60–66; spatial indexing itself remains in Part IX. |
| Recursive calls, retained locals, base cases | 0.23 | Enough to read trees; full treatment is Chapter 45. |
| Atomic load/store/CAS, relaxed/acquire/release, `std::jthread`/join | 0.24 | Syntax preview; SPSC proof and concurrency behavior remain in Chapter 59. |
| `std::queue`, `std::map`, `std::set`, `std::unordered_map`, `std::priority_queue` | 0.25 | Orientation only; the structures are taught in their later chapters. |
| Complexity growth, amortized work, auxiliary space, cache and allocation costs | 0.26 | Preparation for every later complexity explorer. |
| Preconditions, completed invariants, postconditions | 0.27 | Preparation for later mutation and Break-It traces. |
| `assert` as a fixture check, deterministic corpora, independent oracles, parity, ASan/UBSan/TSan, warnings-as-errors | 0.28 | Validation-only machinery, explicitly separated from learner-facing implementation APIs. |

The fixture-only `std::uintptr_t` alignment probe, injected allocation failures, RAII debug watchers, type-trait test assertions, semaphores, bitmask/BFS oracles and snapshot parity harnesses are explained only as validation techniques in 0.28 or left to their chapter test notes. They are not prerequisites for implementing every structure. Specific algorithm policies—rotation cases, B-tree split semantics, graph traversal, hashing schemes, recursion analysis, SPSC correctness and spatial geometry—remain in their own chapters. No generic C++ course topics were added merely for completeness.
