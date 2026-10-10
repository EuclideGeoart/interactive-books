# Final Editorial and PWA Release Review

**Review date:** 2026-10-05  
**Scope:** final Chapter 0 editorial corrections, selective reverse prerequisites, PWA readiness, and release validation. No new DSA chapters or visualization architecture changes were made.

## 1. Chapter 0 editorial corrections

The existing 28-lesson structure remains intact. Four reading gaps were filled in place:

- **Lesson 0.1:** `if`/`else`, `while`, classic and range-based `for`, `break`, `return`, and compile-time deduction by `auto`; the text explicitly says `auto` is not dynamic typing.
- **Lesson 0.5:** base and derived classes, private inheritance as implementation reuse, `using Base::member` to re-expose a selected name, and virtual destruction when deleting a derived object through a base pointer.
- **Lesson 0.6:** `explicit` preventing unintended implicit conversion and default arguments supplying omitted constructor parameters, using `explicit BinaryHeap(bool max_heap = true)`.
- **Lesson 0.20:** `std::pair`, `std::tuple`, lexicographic comparison, structured bindings, and `using Name = Type;` aliases.

No independent lesson or lab was added. The canonical chapter C++ examples were not changed.

## 2. Selective reverse prerequisites

One compact **C++ prerequisite → Chapter 0** panel follows the hero in each selected chapter:

| Chapter | Chapter 0 lesson | Prerequisite summary |
| --- | --- | --- |
| 1 | 0.2 | Storage, lifetimes, pointers, ownership, construction, cleanup |
| 4 | 0.9 | Aligned storage, object lifetime, generic construction |
| 16 | 0.12 | Guarded mutation, exception safety, iterator ranges |
| 23 | 0.17 | Key equality, callable hash policies, iterator validity |
| 53 | 0.9 | Alignment, placement lifetime, generic construction |
| 59 | 0.24 | Atomic publication and acquire/release syntax |
| 60 | 0.21 | Safe index arithmetic, floor division, finite coordinates |

All links retain the existing chapter and lesson routes and resolve through Astro's configured base path.

## 3. PWA architecture

The book remains a static Astro site. The PWA adds a relative Web App Manifest, brand-derived raster icons, a scope-aware service worker, and a small offline fallback page. No runtime server, external image/font dependency, install banner, or domain-specific setting was added. Browsers provide their native install affordance.

## 4. Manifest policy

`public/manifest.webmanifest` uses relative `id`, `start_url`, `scope`, and icon paths. It declares `display: standalone`, book name/description, and the existing navy/mint theme. The same manifest therefore resolves under `/` and `/book/`.

The manifest provides 192×192 and 512×512 general icons and a 512×512 maskable icon. PNGs are reproducibly derived from SVGs matching the existing `[→]` favicon mark by `npm run icons:pwa` (ImageMagick `convert`, with metadata stripped).

## 5. Caching policy

The service worker limits precaching to the root/home page, Chapter 0, manifest, favicon, icons, offline fallback, and the local CSS/JavaScript dependency graph referenced by the two shell pages. It does not precache all 67 chapters or downloadable C++ sources.

At runtime:

- Page navigations use **network first** and save successful same-origin responses. If offline, a previously saved page is returned; an unsaved page receives the branded offline page.
- Canonical source downloads also use **network first** and are saved after a successful fetch. An uncached source requested offline returns a clear 503 text response.
- In-scope styles, scripts, images, and fonts use **cache first**, then save a successful response.

Requests outside the registered scope are not intercepted.

## 6. Update and cache invalidation

Caches use the `interactive-cpp-book-` prefix plus an explicit version. On activation, the worker removes older caches with that prefix and claims its scope. The registration uses `updateViaCache: 'none'`.

The worker does not call `skipWaiting()`: an updated worker follows the browser's normal waiting lifecycle, so existing controlled tabs are not interrupted. Online navigations fetch and cache the deployed HTML, while fingerprinted assets are cached by their versioned URL. Increase `CACHE_VERSION` in `public/sw.js` when changing cache or routing behavior; activation then cleans up the prior cache generation.

## 7. Base-path handling

Astro's `BOOK_BASE` setting controls the site output. The registration script uses `import.meta.env.BASE_URL`; the worker derives its home, Chapter 0, fallback, and scope from `self.registration.scope`. Manifest and icon references are relative.

Both production builds were generated and exercised:

- Root build: `npm run build -- --outDir /tmp/final-release-root-dist`
- Subpath build: `BOOK_BASE=/book/ npm run build -- --outDir /tmp/final-release-book-dist`

For the subpath browser test, the output was staged at `/tmp/final-release-book-host/book/` and served from the host root, exercising actual `/book/` requests.

## 8. Offline behavior

Production browser tests at both `/` and `/book/` visited Chapter 0, Chapter 1, and the canonical Chapter 0 source, then went offline. The home page and visited chapters remained readable, adjacent-chapter navigation worked in both directions, and the fetched source stayed available. An unvisited Chapter 2 showed the offline fallback with a correctly base-scoped link to book home.

This is **visit-on-demand offline access**, not an offline copy of all chapters.

## 9. Installability evidence

On the production builds, Chrome's DevTools Protocol reported no manifest parse errors. Browser-loaded icon bitmaps had the declared 192×192, 512×512, and maskable 512×512 dimensions. The active worker controlled the page at `/sw.js` or `/book/sw.js`, with scope matching the build base, and the resolved `start_url` opened the corresponding home route.

`Page.getInstallabilityErrors` reported only `in-incognito`, which is expected for Playwright's isolated browser context; no other installability diagnostics were returned. A physical installation on an operating-system launcher or mobile device was not performed.

## 10. Native C++ validation

**Release statement: 67/67 canonical chapter examples passed** for Chapters 0–66 using C++20, warnings as errors, AddressSanitizer, UndefinedBehaviorSanitizer, and leak checking where supported. Chapter 59's existing concurrency-specific validation also passed its controlled schedules and ThreadSanitizer FIFO run.

Sanitizers and TSan provide evidence about the tested executions; they do not prove algorithm correctness or race freedom for every possible schedule.

## 11. Whole-book unit totals

`npm test -- --reporter=dot` passed **6,273/6,273 tests across 52 files**. `npm run check` reported **0 errors, 0 warnings, and 0 hints across 408 files**.

## 12. Browser and accessibility results

The production browser suite covers 1440×1000 desktop, 1024×900 tablet, and 390×844 mobile. It exercises chapter labs, routes, search, progress, downloads, themes, keyboard/touch, overflow, accessibility, PWA registration, and visual regressions. The final full suite completed with **1,069 passed, 2 intentional skips, 0 failures (1,071 total across 25 files)**. The skips are the mobile-only playback case on desktop and tablet.

The frozen production root run used:

```sh
ASTRO_TELEMETRY_DISABLED=1 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome \
BOOK_TEST_DIST=/tmp/final-release-root-dist BOOK_TEST_PORT=4384 \
npx playwright test --reporter=line
```

Focused production PWA and reverse-link checks passed **6/6 in each base mode**, across all three viewport projects. The PWA cases verified manifest parsing, icon dimensions, worker scope, online/offline navigation, source caching, and the uncached-content fallback.

## 13. Screenshot preservation and change scope

The accepted set contains **816 screenshot baselines**. The only authorized visual changes are the new prerequisite panels and their resulting page-layout shifts in Chapters 1, 4, 16, 23, 53, 59, and 60. The scoped visual tests regenerated **115 baseline images** for those seven chapters. A SHA-256 comparison confirms the other **701 images are unchanged**. No global snapshot update was run.

The final release browser uses the repository-documented workstation Chrome 154 executable, matching the established screenshot environment.

## 14. Known PWA limitations

- Only the core shell, Home, and Chapter 0 are precached; other chapters and source files become available offline after a successful online visit.
- Browsers can clear service-worker storage or evict caches under storage pressure.
- The installability API check ran in an isolated/incognito-style test context, and no physical-device install was attempted.
- The fallback page explains that unsaved content is unavailable; it does not pretend the entire book is offline.

## 15. Deployment instructions

For a static HTTPS origin, build and publish the contents of `dist/` at the host root:

```sh
npm run build
```

For a static subdirectory such as `/book/`, build with the configured base and publish `dist/` at that subdirectory:

```sh
BOOK_BASE=/book/ npm run build
```

The root and subpath outputs can be hosted on Cloudflare Pages, GitHub Pages, or another HTTPS static host. Localhost is suitable for development. No custom hostname is required for PWA operation.

## 16. Future permanent domain

No permanent hostname is embedded in the manifest, worker, routes, or application code. Paths are relative or derived from `BASE_URL` and worker scope. Moving to a permanent origin requires publishing the same static output at the intended base path; browser installation and site storage are origin-specific, so a user moving between origins may need to install the new origin separately.

## Release disposition

**Editorial and PWA release pass complete.** No Book II mathematics was started.
