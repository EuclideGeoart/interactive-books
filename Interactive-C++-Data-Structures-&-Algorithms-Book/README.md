# The Interactive C++ Book

A static Astro/MDX book covering **Chapter 0 C++ foundations and Chapters 1–66: linear structures and memory, queues and ordered access, trees, hashing, graphs, searching, sorting, algorithmic techniques, engine/systems structures and spatial indexes**.
The product authority remains [the master plan](documentation/INTERACTIVE_DSA_BOOK_MASTER_PLAN.md).

## Run locally

Requires Node.js 22.12+ and npm. Native validation also requires a C++20 compiler (`g++` by default; override with `CXX`).

```sh
npm ci
npm run dev
```

Or run `./open-book.sh` to start and open this combined book (default port 4323; override with `BOOK_PORT=4324 ./open-book.sh`). The launcher checks that hashing and the final graph, sorting, algorithmic-technique, systems and spatial chapters are available before reusing a server.

Chapters 1–50, including Fit / Actual Size, are the canonical regression floor for future work. The [Milestone 05 integration report](documentation/MILESTONE_05_PARTS_VI_VII_INTEGRATION.md) records combined acceptance of the current shared root and the source checkpoint. The accepted Parts I–IV evidence is preserved in `part-iv-delivery/checkout`; see [its delivery notes](part-iv-delivery/README.md). `part-iii-delivery/checkout` remains the earlier frozen Trees milestone. Both delivery directories are excluded from application type checking and remain unchanged.

Open http://localhost:4321 when using `npm run dev`. Chapters have stable routes under `/chapters/`, beginning with `/chapters/00-cpp-foundations/` and ending at `/chapters/66-broad-phase-spatial-indexing/`. The home page opens Chapter 0.

```sh
npm run build
npm run preview
```

`dist/` is ordinary static HTML, CSS, JavaScript, and downloadable C++ files. There is no backend, framework hydration runtime, or external font/image requirement. For a subdirectory host, build with `BOOK_BASE=/your-book/ npm run build`.

The book is also installable as a PWA on HTTPS static hosting (localhost works for development). The manifest uses paths relative to its own URL, so the same build configuration supports `/` and `/book/`. The production service worker precaches Home/Chapter 0 and their local CSS/JavaScript, the manifest, icons and offline page; it then saves chapter pages and source files as you visit them. Offline access is visit-on-demand, not a claim that all 67 chapters were downloaded. Astro development does not register the worker.

HTML uses network-first updates and falls back to the saved copy offline. Fingerprinted assets use cache-first requests. The worker waits for existing controlled tabs to close before activation, then removes older `interactive-cpp-book-*` caches; it does not force-reload a reader mid-session. While online, page navigation fetches the deployed version. Increase `CACHE_VERSION` in `public/sw.js` when changing worker caching behavior. No hostname is configured in the app.

To deploy at the origin root, build with `npm run build` and publish `dist/` to an HTTPS static host. To deploy under a path, use `BOOK_BASE=/book/ npm run build` and publish that output at `/book/`. For a temporary installability check, use an HTTPS preview URL supplied by the host; the permanent domain can be chosen later. Regenerate the checked-in PNG icons from the brand-matched SVG sources with `npm run icons:pwa` (requires ImageMagick `convert`).

## Validate

```sh
npx playwright install chromium
npm run validate
```

The validation command runs Astro/TypeScript checks, Vitest (including native C++/trace comparisons), AddressSanitizer + UndefinedBehaviorSanitizer + leak checks, the static build, and Playwright browser tests. Browser tests use 1440, 1024, and 390-pixel viewports, test light/dark accessibility with axe, and compare screenshot baselines.

Optional environment variables:

- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: use an already-installed Chromium/Chrome binary.
- `BOOK_TEST_PORT`: isolated static preview port (default `4321`). `CI=1` prevents reusing an existing dev server.
- `BOOK_TEST_DIST`: frozen production output directory; when set, Playwright always starts its own preview server.
- `ASTRO_TELEMETRY_DISABLED=1`: disable Astro telemetry in restricted environments.
- `CXX`: alternative C++ compiler with compatible sanitizer flags.

Example using the installed browser on this workstation:

```sh
ASTRO_TELEMETRY_DISABLED=1 BOOK_TEST_PORT=4322 CI=1 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome npm run validate
```

`npm run test:e2e -- --update-snapshots` deliberately updates visual baselines. Inspect changes before accepting them. `scripts/capture.mjs` saves additional review screenshots under `tests/visual/` while the server is running.

Check for active builds before starting another; builds in the shared checkout must run sequentially. For a complete browser regression against a frozen production output:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
mkdir -p /tmp/dsa-book-regression
cp -a dist/. /tmp/dsa-book-regression/
BOOK_TEST_DIST=/tmp/dsa-book-regression BOOK_TEST_PORT=4361 npm run test:e2e
```

`scripts/validate-book-deployment.mjs` checks every registered chapter, search, navigation and source dependencies against `BOOK_DEPLOYMENT_URL` (a root URL or a `/book` URL). It then compiles and runs every downloaded example with sanitizers. See the integration reports for deployment commands and results.


### Canonical Chapters 1–50 checkpoint

The combined freeze is `documentation/validation/milestone-05/checkpoint.tar.gz`, with a SHA-256 checksum, per-file source manifest and acceptance logs alongside it. It includes the accepted diagram fitting and all current tests and screenshot baselines; it performs no chapter filtering or source rewriting. See the [Milestone 05 report](documentation/MILESTONE_05_PARTS_VI_VII_INTEGRATION.md#reproduce-the-frozen-acceptance) for restore and validation commands.

Part VI's sorting records/ranges/buffers and Part VII's recursion/frames/dependencies remain separately owned. Shared playback, inspection, source extraction, SVG primitives and fitting are sufficient infrastructure; future Parts should preserve this regression floor. Chapter 0 was added after Part IX from the completed prerequisite ledger.

### Historical Part VI acceptance checkpoint

Part VI ends at Chapter 44. Its original independent acceptance used an isolated 1–44 checkpoint, without later-Part source or tests. This historical archive preserves screenshots from before the separately authorized diagram fitting and does not replace the current Chapters 1–50 floor:

```sh
mkdir -p /tmp/dsa-part-vi-review
tar -xzf documentation/validation/part-vi/checkpoint.tar.gz -C /tmp/dsa-part-vi-review
cd /tmp/dsa-part-vi-review
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run check
npm test
npm run test:cpp
ASTRO_TELEMETRY_DISABLED=1 npm run build
BOOK_TEST_DIST=/tmp/dsa-part-vi-review/dist BOOK_TEST_PORT=4371 npm run test:e2e
```

Source hashes, archive checksum, logs and the exact acceptance scope are recorded in [the Part VI review](documentation/PART_VI_REVIEW.md). `scripts/freeze-part-vi.mjs` can create a fresh 1–44 copy of the current shared checkout, including subsequent shared UI changes; that fresh copy is distinct from the archived review checkpoint. Neither workflow alters concurrent work.

## What is implemented

- Responsive book and chapter navigation, search, themes, and device-local reading progress.
- Sixty-seven MDX chapters with the master plan's learning rhythm and chapter-specific interactive models.
- Chapter 0: ten focused C++ mechanics labs, complete C++20 source, and forward links grounded in the prerequisite ledger.
- Logical/memory SVG views, keyboard/touch node selection, pointer inspection, and textual fallback.
- Chapter 1: singly linked insertion, deletion, search, and clear.
- Chapter 2: array and linked stacks, raw storage, checked boundaries, and an interactive comparison.
- Chapter 3: bidirectional operations, exact half-rewiring, traversal, and controlled invariant faults.
- Chapter 4: aligned pool storage, placement construction, explicit destruction, free-list mechanics, reuse, and guarded misuse.
- Chapter 5: external object ownership, unlink/reinsert, explicit membership tokens, and independent hooks.
- Chapter 6: queue/deque access policies, exact array shifting, boundary guards, and implementation comparisons.
- Chapter 7: physical/logical ring views, wrap-around, count/sentinel encodings, and reject/overwrite policies.
- Chapter 8: priority-first selection, higher/lower direction, stable ties, and storage-cost comparisons.
- Chapter 9: simultaneous heap tree/array views, insert/extract/build, max/min modes, faults, and height exploration.
- Chapters 10–17: binary trees, BSTs, traversal, exact mutation mechanics, AVL, red-black trees, B/B+ pages, and tries.
- Chapters 18–23: deterministic hashing, hash-table operations, separate chaining, linear probing with tombstones, Robin Hood displacement/backward shifts, and the `std::unordered_map` contract.
- Chapters 24–36: graph representations, BFS/DFS, directed graphs, DAGs/Kahn, components/cycles, Dijkstra, Bellman–Ford, Kruskal, and Union-Find with path compression.
- Chapters 37–44: linear/binary search, ordering and stability, bubble/selection/insertion, merge, Lomuto quicksort, heap sort, stable counting and LSD radix.
- Chapters 45–50: recursion frames, choose/explore/undo, divide-and-conquer ranges, justified greedy choices, DP dependencies, and memoization versus tabulation.
- Graph and tree diagrams fit their panels by default; Actual size preserves readable close inspection.
- Deterministic previous/next, play/pause, speed, reset, seek, and before/after comparison.
- Exact C++ line highlighting, allocation/construction/destruction/freeing states, and continuous invariants.
- Model-based complexity explorers, chapter-specific guarded failure/Break-It scenarios, and exercises.
- Canonical C++20 ownership policies, iterative cleanup, aligned reusable storage, external memberships, and executable validation.

See the [Part VII review](documentation/PART_VII_REVIEW.md), [Part VII architecture](documentation/PART_VII_ARCHITECTURE.md), [Part VI review](documentation/PART_VI_REVIEW.md), [Part VI architecture](documentation/PART_VI_ARCHITECTURE.md), [Chapters 1–36 integration report](documentation/MILESTONE_04_PARTS_IV_V_INTEGRATION.md), [Part V review](documentation/PART_V_REVIEW.md), [Part IV review](part-iv-delivery/checkout/documentation/PART_IV_REVIEW.md), [Part III review](documentation/PART_III_REVIEW.md), [Part II review](documentation/PART_II_REVIEW.md), [Chapters 2–5 milestone](documentation/MILESTONE_02_REVIEW.md), [architecture and authoring](documentation/IMPLEMENTATION.md), [Milestone 1 review](documentation/MILESTONE_01_REVIEW.md), and [C++ prerequisite ledger](documentation/CPP_PREREQUISITE_LEDGER.md).

### Part VIII — engine and systems structures

Chapters 51–59 separate raw storage, object lifetime, identity, membership, mutation scheduling and concurrency. The labs cover free lists, aligned arenas, typed pools, sparse sets, generational handles, ECS component pools, dirty waves, deferred commands and an SPSC ring with both acquire/release handoffs. See [the Part VIII review](documentation/PART_VIII_REVIEW.md) for validation status, ownership policies and limits.

### Part IX — spatial data structures

Chapters 60–66 cover spatial hashing, quadtrees, real 3D octrees, KD nearest-neighbor traversal, R-tree insertion/splits, BVH refit/rebuild, and broad-phase pair generation. Spatial and hierarchy/storage views share deterministic semantic traces. Workload explorers count actual operations and distinguish broad candidates, exact AABB overlap and shape contact. See [the Part IX review](documentation/PART_IX_REVIEW.md) for policies, tests, responsive evidence and scope limits.
