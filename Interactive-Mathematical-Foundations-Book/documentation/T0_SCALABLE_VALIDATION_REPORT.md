# M6-B-P1 + T0 — affine correctness and scalable validation

Date: 2026-10-11. Repository: `/work/interactive-books`, book: `Interactive-Mathematical-Foundations-Book`, branch: `feature/book-ii-m6b`. Starting commit: `3c5e6edacd105394e4f2d351d27b96e75a6fc79b`.

The affine correction is committed separately as `6d18b6043a458fd63eed1ccfdf7887e13eaadbd0`. T0 introduces focused, milestone and exhaustive workflows with explicit manifests. No complete-book browser suite was executed for this patch. Historical full-suite results below are not presented as new acceptance results.

## 1. Affine correction

II.10 now distinguishes the linear identity `B(Ax)=(BA)x` from `B(Ax+b)+c=(BA)x+(Bb+c)`. Inspector symbols, formulas, arrows, matrix-board labels, translated unit-square polygons, verdict and the SVG's model-built description use the existing exact state.

Independent literal checks distinguish linear `(3,4)`, intermediate affine `(4,0)`, final affine `(4,6)` and combined translation `(1,2)`. Intermediate corners are `(1,-1),(2,-1),(3,0),(2,0)`; final corners are `(1,2),(2,3),(3,5),(2,4)`. A fractional regression retains the exact derived translation `1/16`, without reparsing it as a two-decimal input.

Focused acceptance: 95 matrix unit tests; the four matrix Python self-tests and freshness of 36 matrix/eight system fixtures; II.10 browser cases **28 passed, two existing desktop/tablet touch skips** (35.6 s); six composition visual cases passed (3.1 s). Only the three new Linux affine images were created and individually inspected. Existing canonical/invalid composition images were compared, not regenerated. No oracle contract, input boundary or tolerance changed.

## 2. Measurements before choosing optimizations

Historical M6-B baseline: 22 published chapters, 10,091 unit tests, 270 Python oracle tests; root browser 2,314 passed/50 skipped in 34.2 min; subpath 2,287 passed/35 skipped in 21.8 min. These are the prior milestone's results.

Representative measurements used I.9 and II.10 generic checks, both themes' full-page initial/feedback axe scans, their existing Linux visual comparisons and published-route deployment checks. Desktop, tablet and touch-emulated mobile all ran against production output. Named timing steps measure navigation, hydration, axe and exercise feedback; screenshot assertion steps measure visual comparisons. Remaining chapter/deployment time is recorded separately. Shared beforeAll setup is explicitly accounted for, rather than charged twice or lost from test-body timing.

| Representative run | Cases | Workers | Wall s | User + system CPU s | CPU utilization | Maximum individual RSS KiB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original navigation/hydration duplication | 57 | 3 | 75.95 | 118.81 | 156% | 830,484 |
| Reused read-only setup, full-route hydration added | 57 | 3 | 79.74 | 105.43 | 132% | 874,060 |
| Final bounded route batches | 66 | 3 | 75.64 | 110.49 | 146% | 866,244 |
| Same final cases, one worker | 66 | 1 | 189.90 | 84.42 | 44% | 961,996 |

Final representative wall time is effectively unchanged from the original, while CPU is about 7% lower and deployment coverage is stronger. This is **not** a claimed full-suite speedup. One worker uses less total CPU but takes 2.51× as long here; the existing three-worker default remains. More workers were not assumed to help or enabled.

The original summed axe time was 134.27 s across projects, versus 130.51 s in the final three-worker sample; axe remains the dominant cost. Its rules, tags, initial/feedback scans and separate light/dark contexts are unchanged. I.9's individual three-worker theme cases remain about 20 s; II.10's about 6 s.

For generic chapter checks alone, summed navigation fell from 16.16 to 6.46 s, hydration from 17.66 to 9.08 s, and remaining checks from 11.75 to 6.52 s. Six independent read-only checks now use one page setup; two independent axe cases still use fresh pages. This changes eight navigations per chapter/project to three and six hydration passes to three.

Final three-worker phase totals below are summed test/setup time, not concurrent elapsed time. Navigation/hydration include the now-complete deployment checks. “Other” is remaining visual setup/transition overhead, not a removed assertion.

| Project | Navigation s | Hydration s | Generic s | Axe s | Feedback s | Visual comparisons s | Deployment remainder s | Other s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | 6.693 | 12.529 | 2.019 | 44.103 | 4.610 | 0.871 | 0.900 | 1.177 |
| Tablet | 6.487 | 12.646 | 2.112 | 43.565 | 4.652 | 0.923 | 0.828 | 1.160 |
| Mobile | 5.929 | 12.763 | 2.387 | 42.840 | 4.598 | 1.419 | 0.859 | 1.189 |

[T0_BROWSER_TIMINGS.json](T0_BROWSER_TIMINGS.json) preserves all four measurements, per-project breakdowns, CPU, context switches, host load and memory snapshots. GNU time RSS is not aggregate process-tree memory. The host exposed 12 available CPUs; one-minute load changed 1.11→5.45 in the original, 0.32→4.04 in the final three-worker run and 2.01→1.43 in the one-worker run. This is a non-isolated host and one sample per configuration; lightweight test discovery overlapped the start of the one-worker run. No second heavy browser/build job ran concurrently.

## 3. Selection and execution

`scripts/validation-plan.mjs` discovers chapter IDs/slugs/families from the existing MDX, follows literal local imports including raw Python samples, and selects unit dependants. It detects staged, unstaged, committed-since-`--base` and untracked files across the Git repository. Repository-level changes retain their relative paths and cannot silently disappear. MDX/Python/oracle/fixture edits also select the filesystem-based content guards. The master plan is executable curriculum authority, not an ignorable documentation edit.

Explicit chapter selectors are additive. They cannot hide detected changes. Exact ID boundaries prevent I.1 accidentally selecting II.1. Known screenshot names select their chapter rather than regenerating or checking unrelated baselines. Deleted/unresolved inputs, unknown families, test infrastructure and unclassified changes expand to all mathematical/root browser coverage. Unknown inputs do not produce an empty successful selection.

Known shared UI/platform/shell/style changes expand differently: complete mathematical gates, every published chapter's read-only contracts, full original both-theme axe cases on representative I.1/I.3/I.9/II.1/II.10, shared control and shell regressions, and all root visual comparisons. Any simultaneously changed chapter/model still receives its full interaction and axe selection. This keeps shared regression coverage meaningful without making all deep chapter interactions the ordinary shared-UI cost. Remaining chapters' complete interaction/axe combinations still run in exhaustive certification. New/unmapped mechanisms remain fail-conservative until their family is registered.

Each runner invocation saves a timestamped `validation-results/<mode>-.../manifest.json`: changed files, reasons, complete/focused mathematical scope, chapter contracts versus interactions, older regression chapters, oracle families, projects, commands, actual gate results and timings. `--only`, `--project` and sharding mark the run partial. Dry-run discovery is not test success. A focused or partial result never claims an unselected suite passed.

Local execution uses `/tmp/imf-heavy.lock`; builds and browser commands run serially. Every routine browser command has `--trace off`; failure screenshots remain enabled. The reused read-only page has its own failure screenshot attachment. Test mode is default, **not serial**: a failure restarts the worker/setup and later cases still run independently. A disposable copy of the actual suite proved one intentional failure followed by five passes, a different worker and a retained PNG. Its expected failure is not a product failure or acceptance pass count.

Production output has a source/base fingerprint over source, code, public assets, build inputs and dependency declarations. Successful builds write `.imf-build.json` inside the ignored output. Browser/production gates refresh only missing or mismatched output; matching root/subpath output is reused. The initial legacy outputs had no stamp, so T0 bootstrapped their records once; the subpath output also needed the affine correction. No additional dependencies, installations or full checkouts were created.

## 4. Deployment coverage

The arbitrary 25-page cutoff is gone. Expected routes derive from every published curriculum slug plus home, contents and foundation. The traversal is finite, deduplicated and partitioned into eight-route cases so 97 chapters do not require extending a single test's timeout. Unit canaries require all 100 intended routes for a synthetic 97-chapter publication, on both bases, exactly once.

Every batch attaches expected/visited/missing/unexpected routes plus the complete publication manifest, assets and failures. All current 25 routes are required in both mounts. Every island is hydrated. Missing pages, in-page and cross-page broken anchors, escaped base paths, unauthorized foreign URLs/assets, page errors, HTTP failures and failed browser requests are fatal. Both component and renderer attributes are checked, not merely the first one on an island. Asset fetches are deduplicated within each finite batch; cross-batch anchor targets are checked against their actual HTML IDs.

`scripts/check-dist.mjs` is unchanged: exhaustive HTML/CSS/JS/link/anchor validation remains available and runs on both outputs in milestone/exhaustive modes. `playwright.subpath.config.ts` excludes **all** `visual*.spec.ts`; Linux root visuals remain authoritative. Windows platform routing/baselines and screenshot tolerances are untouched.

## 5. Coverage matrix

| Existing behavior | Focused implementation | Milestone acceptance | Exhaustive certification |
| --- | --- | --- | --- |
| Strict mathematical models, properties, exact outputs, exceptions, parity, graders/traces | Affected families/dependants; all for shared/unknown inputs | Complete unit suite | Complete unit suite |
| Python samples, independent oracle self-tests, fixture freshness | Corresponding oracle families; all for shared/unknown | All discovered oracle families | All discovered oracle families |
| Type/content/curriculum/build-time strict TeX guards | Associated unit/content guards and necessary production rebuild; explicit type check when relevant | Complete check + mathematical gates | Complete check + mathematical gates |
| Metadata, headings, section contract, hydration, IDs, overflow, MathML, pager, touch targets, model descriptions, reduced motion | Affected chapters; all read-only contracts for known shared UI | Affected + older representative contracts; all read-only for known shared UI | Every chapter, both mounts |
| Generic full-page axe, both themes, initial and all exercise feedback/solutions | Full original cases for affected chapters; representative full cases for known shared UI | Full original cases for affected + representative chapters | Every original case on every chapter, both mounts |
| Deep geometry/pointer/touch/numeric/keyboard/error/reset/worked-trace/exercise synchronization and chapter-specific axe states | Affected chapter/family cases + selected shared regressions | Same + representative older control/shell regressions | Every original root/subpath functional case |
| Shared foundation, navigation, map/dialog, theme, shell, accessibility | Shared/unknown expansion or explicit chapter selection where applicable | Original smoke/stage/navigation/a11y/deployment suites at root | All at both mounts |
| Published-route links, anchors, scripts/styles/fonts, no external requests/base escapes, direct access, 404s | Selected shared/deployment scope; `validate:production` explicitly available | Full static verification on both outputs; root deployment plus subpath navigation/deployment, all routes hydrated | Same plus all subpath chapter interactions |
| Authoritative screenshot regressions | Affected Linux root comparisons; all for shared/unknown | Required root comparisons | Every original root visual case |
| Duplicate prefix-independent deep interactions and nonrepresentative shared-UI axe combinations | Not mandatory for unrelated chapters | Not duplicated at subpath; nonrepresentative shared cases deferred explicitly | Run at release, periodic certification or requested recertification |

The last row is a scheduling distinction, not deleted assertions. Release/certification uses the exhaustive command or all native CI shards. A milestone manifest records the exact smaller chapter/state scope and is not advertised as complete-book browser certification.

## 6. Enumeration proof, not pass-total inference

[T0_TEST_ENUMERATION.json](T0_TEST_ENUMERATION.json) records exact before/after identity digests, all removed subpath visual identities, the six unchanged read-only check titles, crawler-to-batch mappings and native shard verification. Comparison asserts set equality after only the documented namespace/batch mapping; losing any other behavior fails the comparison.

| Discovery only | Root cases | Subpath cases |
| --- | ---: | ---: |
| Starting M6-B | 2,364 | 2,322 |
| After six new affine cases, before T0 | 2,370 | 2,328 |
| T0 final | 2,379 | 2,271 |

Root adds nine cases because three crawler cases become twelve finite batch cases. All 2,370 pre-T0 normalized root behaviors remain. Subpath removes exactly 66 accidentally duplicated visual cases and adds nine route-batch cases; all 2,262 pre-T0 normalized subpath functional behaviors remain. All 396 independent read-only test cases remain independently enumerable; they gained only a grouping namespace.

Native three-way root shards enumerate 793/793/793 cases; subpath 757/757/757. Their identities are disjoint and their unions exactly match the full respective enumerations. No full browser execution was used to establish this proof.

## 7. Validation actually performed

Focused affine validation is recorded in §1. T0 validation is distinct:

- New infrastructure regressions: **16 passed** (selectors, actual untracked files, transitive math dependencies, exact chapter boundaries, content/master-plan handling, shared/unknown expansion, modes, freshness, timing accounting and 97-chapter finite traversal).
- Complete mathematical/production gates, explicitly partial milestone scope: **61 unit files / 10,109 tests passed**, **270 Python tests** and all 12 fixture freshness checks passed, both root/subpath builds and unchanged static deployment verification passed. Unit total is the 10,091 baseline plus two affine and 16 T0 tests. Both outputs have 26 HTML pages; static verification reports seven stylesheets and 249 files per output.
- Final static check on the integrated code: **344 files, zero errors/warnings, four existing hints**. Initial new JavaScript type inference errors were fixed, followed by focused regressions and the affected type gate. Subsequent selector/test edits received focused regressions/type checking; unchanged successful mathematical/oracle/build gates were not repeated.
- Original representative timing canary: **57 passed**. Final three-worker and one-worker timing canaries: **66 passed each**, including all root route batches and unchanged representative visuals/axe.
- Cross-chapter regression selection: **150 passed**, including I.1/I.3/II.1/II.3 read-only contracts, older vector-family keyboard/rejection and both-theme accessibility states, and foundation/quantity feedback announcements (2.3 min). This selection is not the complete root suite.
- Subpath prefix/navigation/deployment canary: **69 passed, three existing responsive skips**, all published route batches included (26.8 s). No deep chapter family suite or visual suite was duplicated there.
- Read-only failure-isolation probe: parent self-check passed with **one deliberately injected failure, five subsequent passes**, worker restart and retained PNG (10.1 s). Probe files are tiny generated test/config copies in `/tmp`, with no dependencies or checkout copied.
- Before/after and native-shard enumeration comparison: passed with no unmapped lost behavior.

Final runner workflow canary: **all five selected gates passed** in 55.6 s of gate wall time: 95 matrix unit tests, four Python self-tests plus matrix/system freshness, 27 generic publication/II.10 cases, 28 II.10 interaction cases (two existing touch skips), and six composition visual comparisons. It used the staged integrated source tree `c6b61092315060e2780aaa1b1b67c76f88e30007` as its comparison baseline with additive `--chapter II.10 --only math,browser,visual`; earlier infrastructure coverage is recorded above. The manifest is `validation-results/focused-2026-10-11T14-19-28-696Z/manifest.json`, explicitly partial. Source-matched root output was reused with **no rebuild**. The documented CI shard command also passed dry-run validation only. No new complete root/subpath acceptance run, full milestone-browser run or distributed CI execution is claimed.

## 8. Commands for agents

Run from `/work/interactive-books/Interactive-Mathematical-Foundations-Book`. The new runners acquire the shared lock themselves: do not wrap them in another `flock`. `npm run validate` keeps its legacy **exhaustive** meaning; it is not the ordinary edit loop.

```bash
# Inspect detected scope first, including untracked files.
npm run validate:focused -- --dry-run

# Associated mathematical unit, Python oracle and freshness gates.
npm run validate:focused -- --chapter II.10 --only math
# Direct single-family oracle/self-test/freshness command, if needed:
npm run test:oracle -- matrices

# One chapter, one viewport. Selectors add to detected changes, not override them.
npm run validate:focused -- --chapter II.10 --only browser --project desktop
npm run validate:focused -- --chapter II.10 --only browser --project mobile

# Targeted comparisons; never implicitly updates a baseline.
npm run validate:focused -- --chapter II.10 --only visual

# Root + subpath source-matched build/static verification, without deep browsers.
npm run validate:production

# Integrated milestone: complete math/production + affected/representative root
# coverage + prefix-dependent subpath checks. Include committed changes since base.
npm run validate:milestone -- --base <milestone-start-commit>

# Scheduled/release/requested complete certification, both functional mounts
# plus every root-authoritative screenshot case.
npm run validate:exhaustive
```

`--chapter` also accepts a published slug, can be repeated, and rejects unknown/planned chapters. `--only` accepts comma-separated `math,browser,visual,production`. `--project` accepts `desktop,tablet,mobile`. A clean focused run without selectors or changes has zero gates, not a full-suite success. A clean milestone without a chapter/base selection expands conservatively; use the actual milestone start to make scope explicit. Review the manifest when shared/unknown files broaden a proposed run.

Optional independent Linux CI workers:

```bash
# Once in the build job; publish dist/, dist-subpath/ INCLUDING their stamps.
npm run validate:exhaustive -- --only math,production

# After restoring matching output and existing-dependency installation,
# run on three independent CI workers, respectively 1/3, 2/3 and 3/3:
CI=true npm run validate:exhaustive -- --only browser,visual --shard 1/3
```

Each shard remains partial until all shards/gates pass. Each host still serializes its own heavyweight work. Do not launch these jobs concurrently on the local machine. Windows retains its independent native Playwright commands/baselines; these Linux lock/profile wrappers were not Windows-tested and require `flock`. Existing native commands can be run serially there, with `--trace off`.

Diagnostic/maintenance commands:

```bash
npm run measure:validation -- sample-three-workers 3
npm run measure:validation -- sample-one-worker 1
npm run validation:isolation
npm run validation:enumerate -- capture before   # save before an infrastructure edit
npm run validation:enumerate -- capture final    # also enumerates native shards
npm run validation:enumerate -- compare final   # requires preserved before capture
```

## 9. Disk, limitations and Git delivery

The checkout was about 406 MiB initially and about 408 MiB at delivery (417,928 KiB measured after the final canary), including retained local evidence. Existing `node_modules` remains about 267 MiB; no second dependency tree, browser installation or full checkout was created. Local ignored validation evidence is approximately 6 MiB. No trace archives were found; the intentional probe's failure PNG is retained. Only three new Linux affine baselines were added; no existing or Windows baseline was overwritten. Timings/manifests/failure directories are ignored, while the compact timing/enumeration summaries and this report are committed.

The import selector understands this repository's literal relative imports/raw samples and explicit filesystem guards, not arbitrary runtime imports or external alias graphs. Add a family mapping when a genuinely new mechanism arrives; unclassified/deleted/test-infrastructure changes expand to full coverage. Fingerprints do not police manual tampering inside ignored dependency/build directories; static checks and browser request failures remain independent safeguards. Browser/resource results are Linux/Chrome emulation, not physical-device/Windows certification or a measured 97-chapter site. The synthetic 97-chapter canary proves finite coverage, not future page performance. Every-route batching bounds each case without changing timeouts.

Final delivery consists of two appended commits on `feature/book-ii-m6b`: the separate affine commit `6d18b6043a458fd63eed1ccfdf7887e13eaadbd0` and the infrastructure commit containing this report (`git log -1 --format=%H -- documentation/T0_SCALABLE_VALIDATION_REPORT.md`). The exact infrastructure hash and post-commit clean status are reported in the delivery message. No push, merge, history rewrite, Book I edit, frozen chapter edit, dependency/tolerance/axe-rule change or II.14 implementation occurred. Independent review and full-book release recertification remain distinct next acceptance steps, not results implied by these canaries.
