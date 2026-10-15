# P05 clustering implementation handoff — UNVALIDATED

Branch: `feature/book-iii-part-v-clustering`.
Worktree: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-v-clustering`.
Book root: `Interactive-Machine-Learning-Book`.
Initial HEAD: `944594728554eca8777773f9d12b70e08613ba77`, accepted Wave B delivery.
Accepted executable source: `06529c0c52215555bcc1a53d80f2bd8dc977bbce` (read-only).
Common Git directory read from metadata: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books/.git`.
Initial status was clean, on the owner-allocated branch. Final author HEAD is supplied
in the final report; the handoff itself belongs to that commit (no self-referential SHA).

## Delivery inventory

- III-26, `k-means`: draggable centroid/observation laboratory; actual scaled squared
  distance matrix, exact tie decisions, held membership, sums, proposed means,
  current/proposed-mean/nearest-assignment WCSS, separate assignment/update half-steps,
  honest stop flag and full immutable replay. Literal first iteration and mean proof.
- III-27, `clustering-initialization-failures`: same lab, deterministic seeds/k,
  horizontal/vertical rectangle fixed points, unit scaling, empty/coincident presets,
  k=1/k=n and partition equivalence. Does not claim a general global optimum.
- III-28, `hierarchical-density-clustering`: actual single/complete/all-cross-pair
  average linkage tree and merge cuts; computed DBSCAN neighborhoods, core/border/noise,
  closed boundary/self counts, coincident rows, noise reassignment and ambiguous border.
  Density roles use circle/diamond/cross and one selected annotation with leader;
  all exact raw coordinates remain in the neighborhood table.
- Each chapter opens with the real Stage, then intuition, definition/mechanics,
  derivation, literal worked examples, actual canonical Python `?raw`, exploration,
  numerical caveats/connections and exactly five corrective graded exercises.

Browser implementation: `src/parts/p05/model/clustering.ts` is pure numerical code;
`lesson.ts` projects it; `ClusteringStage.tsx` keeps one useLesson state. No alternate
render mathematics or imperative drawing state. Responsive Part-local styles reuse
all existing role color/font tokens. SVG IDs are scoped. Tables/prose/tree have bounded
named scroll regions. Plot font/hit dimensions derive from measured rendered width
with a 14.2 CSS-pixel label floor and 44 CSS-pixel handle diameter floor.

Canonical Python/NumPy: `code/python/p05/clustering.py`. Operations `lloyd`,
`hierarchical`, `dbscan`, `initialize` accept complete JSON requests on stdin. Terminal
stdin uses the default literal mean-update example without waiting for EOF. Empty
piped stdin also selects that default. Malformed/invalid requests emit a concise error
on stderr with exit 2. Actual shape/finiteness/arithmetic boundaries are shared in
meaning, not through a TS translation or a fitted clustering library.

## Numerical conventions and limitations

- 1–32 dense two-feature observations. IDs are unique nonempty strings. Coincident
  coordinates with distinct IDs retain unit weight as distinct observations.
- Mathematical observations are 2×1 columns; X is n×2, centers k×2, squared distances
  n×k, assignments n×1. Pairwise hierarchy/density distances and the Boolean neighborhood
  relation are n×n; stored neighborhoods are ragged per-row lists of neighbor indices,
  with reset lengths [4,4,4,5,2,1]. No targets,
  intercept or ground-truth classes. UI coordinates −5…5; UI scales 0.1…10; UI ε 0…2.
- Squared metric: sum over features of ((x−c)/scale)². Scale is positive and fixed
  during Lloyd. Means remain raw-coordinate arithmetic means. WCSS sums assigned
  squared distances (no 1/n or 1/2). Scales encode metric reference units.
- Finite inputs, intermediate differences, normalized differences, squares, sums and
  objectives required. Nonzero differences with zero normalized value or square are
  rejected with rescaling guidance. This includes a tiny dimension even when another
  contributes nonzero distance, preventing manufactured exact ties/zero-radius edges.
  Ordinary positive-small-term loss on addition to a large nonzero sum remains normal
  binary64 rounding. Display uses six significant digits with ≈; full values decide.
- Lloyd ties use lowest zero-based centroid index on exact computed equality.
  Empty clusters retain previous centers; their means are explicitly undefined.
  `ready` previews nearest labels; `assign` commits labels; `update` changes centers
  while holding labels. Objective and proposed mean cost use those held labels.
  Nearest cost is separately visible. Stop means exactly unchanged binary64 centers
  after update. UI replay cap 40 half-steps; pure helper 1…100. Cap without stop is not
  convergence. Discrete iteration input bound 0…1000; exceeding it rejects the update.
- Initialization: existing uint32 LCG; one draw per partial Fisher–Yates selection;
  distinct input row indices, no replacement, no k-means++. Seed 0 valid. Seed controls
  initialization only; observations are hand-authored. Row order is part of provenance.
- `samePartition` checks pairwise membership equivalence and ignores whole cluster
  label permutations; it is not accuracy/ARI. It supports nonnegative labels; −1 noise
  has separate semantics and must not be silently scored as an ordinary true group.
- Hierarchy starts singletons; new persistent group IDs n+t; ascending IDs enumerate
  active pairs, strict improvement retains first exact tie. Single=min cross distance,
  complete=max, average=all cross-observation Euclidean distances / cross-pair count.
  No centroid/Ward linkage. Cuts select a count of computed merges.
- DBSCAN uses scaled squared distance ≤ ε², includes self and distinct coincident IDs.
  minPoints integer 1…n, ε≥0. Scan and queued neighbors in ascending input order; only
  core rows expand. Earlier visited noise may become border. Already assigned rows
  are never stolen. Shared noncore border belongs to first reached core component;
  it cannot join components. −1 is noise. There is no WCSS objective for DBSCAN; the
  comparison inspector refers explicitly to the separate centroid model.
- Tiny-data teaching implementation, no missing values, sample weights, spatial index,
  automatic scale estimator, production convergence heuristic or external quality
  score. Raw plot axes stay equal scale even when the metric is anisotropic. Dense
  coincident geometry is inspected numerically and by selected handles/roles.

## Independent mathematical evidence authored, not executed

`oracle/p05/independent.py` imports neither NumPy nor canonical/TS code. It uses an
expanded exact Fraction inner-product quadratic, pairwise cluster-SSE identity and
restricted-growth exhaustive partitions; 80-digit Decimal Euclidean linkage norms;
Warshall transitive closure on the CORE-only graph and first-component border ownership;
and a closed-form modular geometric-series LCG. These methods differ from canonical
delta loops, centroid SSE reduction, queue expansion and recurrence-based initialization.
`test_clustering.py` imports and actually invokes the canonical NumPy module and CLI
when owner-run; no claim is made that it has run. It includes canonical/op oracle parity,
exact half-step monotonicity on the literal scenario, global tiny partition proof,
seed extremes, label permutation, boundary/self/coincidence, traversal/reorder/noise,
shape/ID/bool/string/nonfinite/overflow/underflow/phase limits and terminal CLI regressions.

Hand calculations:

- Initial distances [[0,16],[4,4],[16,0],[36,4]], labels [0,0,1,1], sums −4 and 4,
  means −2 and 2, J=8 → proposed J=4. Full trace J=[8,8,4,4,4].
- Rectangle horizontal fixed point J=16, vertical J=4. Seven unlabeled nonempty
  two-group partitions give singleton/triple costs 40/3, diagonal 20, horizontal 16,
  vertical 4. Only for this tiny unit-scale problem does exhaustive enumeration prove
  global optimum 4. With x-reference scale 10, horizontal J=0.16.
- Two coincident centroids on ±1 give label 0 for both and an empty retained center;
  J=2. Three identical (1,1) rows with k=3 give J=0 and two empty retained centers.
- Three x-values [0,1,3]: first merge [0],[1] at height 1; final single=2,
  complete=3, average=2.5. Tie case [0,1,2] first merges indices 0/1.
- Dyadic density [0,1/8,1/4,3/8,3/4,2], ε=3/8, m=4 has four cores, border index4,
  noise index5, explicit neighborhoods in fixture. UI decimal case ε=.31 has the same
  role pattern away from boundaries and is independently covered in test source.
- Shared-border dyadic fixture has two four-core components and a central noncore
  with neighbors [3,7,8]; it gets label0 by order but cannot merge core components.
- Seed0 first two LCG integers 1013904223/1196435762 select indices0/1; seed7 selects
  indices0/3 for original n=4,k=2. Initialization fixtures are independent literals.

## Deterministic fixtures and owner activation

`fixtures/p05/clustering.json` is a hand-authored deterministic spec (`input`) plus
independent literal expectations (`expected`), with 17 scenarios. No generated output
is fabricated. Numeric parity tolerance is absolute+relative 1e−12, justified by small
binary64 reductions versus exact rational/80-digit norms. IDs, dense shapes, labels,
core flags, neighborhoods and kinds require exact equality in canonical tests.
Freshness is semantic: `generate_fixtures.py --check` independently recomputes each
expected payload from its declared input and compares the same tolerance. Non-check
mode can rewrite only those P05 expected fields, but the author ran neither mode.

No owner fixture generation is prerequisite: all expectations are present as literals.
The owner must run all registered commands within the ONE combined campaign and may
correct source/expectations only with retained independent evidence if discrepancies
are found. No self-declared acceptance or separate focused campaign is recommended.
`INTEGRATION_REQUESTS.md` requests no shared additions; manifest auto-discovery suffices.

## Unexecuted TypeScript and browser test source

- `tests/unit/p05/models.test.ts`: 17 literal scenarios, actual canonical Python batch
  parity, mechanics/proposed cost, monotonicity/stop/cap, local minima, empties/coincidence,
  k/seeds/labels/scales, sparse shapes/discrete boundaries and overflow/underflow;
  actual linkage and density/border traversal.
- `tests/unit/p05/lesson.test.ts`: single-state projections, physical sizing math,
  entire payload detachment/freeze including seed, displayed-state replay edits,
  pointer precision/bounds, all presets, actual MDX/prerequisites/raw code/exercises
  and labeled scoped Stage rendering. These compile/render calls are test source only.
- `tests/e2e/p05/clustering.spec.ts`: relative chapter URLs work with both existing
  root/subpath configs; actual browser/model/geometry parity, literal objective/means,
  keyboard/numeric/pointer/touch/reset, invalid entry and underflow preservation,
  replay/history branching and reset-during-drag, failure/scaling presets, actual
  linkage/density/neighborhood coordinates and both-theme physical responsive bounds.
  Owner canonical captures are external to this Part; no author capture/baseline added.
  Measured font acceptance uses established ≥13.99 SVG transform bound; intended
  physical minimum is 14 CSS px. Existing projects supply 1440×900,820×1180,390×844.

## Exact changed paths (all relative to book root)

1. `src/parts/p05/manifest.json`
2. `src/parts/p05/model/clustering.ts`
3. `src/parts/p05/lesson.ts`
4. `src/parts/p05/ClusteringStage.tsx`
5. `src/parts/p05/stage.css`
6. `src/parts/p05/chapters/k-means.mdx`
7. `src/parts/p05/chapters/clustering-initialization-failures.mdx`
8. `src/parts/p05/chapters/hierarchical-density-clustering.mdx`
9. `code/python/p05/clustering.py`
10. `oracle/p05/manifest.json`
11. `oracle/p05/independent.py`
12. `oracle/p05/generate_fixtures.py`
13. `oracle/p05/test_clustering.py`
14. `fixtures/p05/clustering.json`
15. `data/p05/README.md`
16. `tests/unit/p05/models.test.ts`
17. `tests/unit/p05/lesson.test.ts`
18. `tests/e2e/p05/clustering.spec.ts`
19. `documentation/parts/p05/INTEGRATION_REQUESTS.md`
20. `documentation/parts/p05/HANDOFF.md`

## Author activity and final disposition

Only source reading, mathematical reasoning, ordinary file authoring, Git metadata,
status/diff and commit were performed. No TS/Python tests, generators, freshness checks,
assert-based self-checks, type/lint/compile/build, browsers/Playwright, captures,
benchmarks or validation runners were executed. No checks or acceptance are claimed.
No dependencies installed, shared/earlier source modified, baselines changed, worktrees
removed, branches merged, history rewritten, main touched, push or deployment performed.
All owner numerical/visual review and one combined validation remain required.

## Owner campaign attempt 1 correction

The owner reported that combined milestone attempt 1 stopped at Type/content with
exit 1 and an unchanged signature; all other gates were unexecuted. Retained owner
evidence is in `documentation/validation/wave-c/owner/combined-attempt-1/` in the
integration worktree. Only the specified code corrections were made: intentionally
malformed scale arrays now cross the test boundary through an explicit `unknown`
tuple cast, and the Stage imports the root `TargetedPointerEvent` type from Preact.
Installed declarations export it through `index.d.ts` → `dom.d.ts`; the JSX namespace
alias is deprecated. The author ran no type checks, tests or other validation.
Owner rerun and acceptance remain pending. Exact correction HEAD is in the final report.

## Independent reviewer corrections during owner attempt 2

The owner reported seven gates passed before interrupting incomplete attempt 2;
there is no acceptance. Coincident centroid and observation hit areas now use a
separate bounded front selection and keyed paint order, following the accepted P06
pattern: the selector or Enter/Space brings its chosen handle forward; pointer-down
selects without reordering the active capture node. Movement/finish also require the
original capture node. Reset, handle-kind and preset changes restore the corresponding
front selection. Authored physical pointer/touch regressions check selector hit identity
and that only the selected coincident centroid/observation changes; they are unexecuted.
III-28 and this handoff now distinguish n×n distances/Boolean adjacency from ragged
neighborhood index lists (reset lengths [4,4,4,5,2,1]). No shared files changed and no
author validation was executed. Owner rerun and acceptance remain required.

## Owner native touch diagnostic correction

The owner separately diagnosed real SVG touch cancellation on the retained `ed92`
build: a centroid-0 drag from −3 through −2.5 toward −1 triggered native pointercancel,
and overlapping old/new touches on that centroid stopped subsequent movement. The
owner reported that handle-local native touchstart prevention eliminated cancellation
in desktop/mobile while preserving outside-handle behavior. The minimal source change
adds `onTouchStart={event => event.preventDefault()}` only to circle handles, with a why
comment; no global touch-action or background handler is changed. The strengthened
physical touch regression polls actual state and retained capture through small and
large successive moves, records no native cancellation, releases with `touchEnd[]`,
and then verifies unprevented background touch/native page scrolling. This test source
is unexecuted by the author. The independent source verification and owner campaign
remain pending; no acceptance is claimed.

## Owner attempt 3: native event binding correction

Owner classification: two genuine desktop touch capture failures retained; combined
attempt 3 deliberately interrupted after seven gates, incomplete, no acceptance.
The bounded owner diagnostic identifies installed Preact `diff/props.js` event casing:
in default desktop SVG contexts without an `ontouchstart` property, JSX `onTouchStart`
registers `TouchStartfalse`, not native `touchstartfalse`. Default prevention was false
and both gestures received pointercancel. Desktop-touch/mobile contexts expose the
property and the prior prop worked; direct native listeners worked in default desktop.
The source now replaces that prop with the explicitly lowercase, standard-typed spread
`{...{ ontouchstart: (event: TouchEvent) => event.preventDefault() }}` on circle handles.
One why comment documents native casing when the property is absent. Existing real
tests are unchanged, including navigation before touch emulation; no pre-navigation
touch workaround, library/shared typing change or background blocking is introduced.
The previous JSX handler record is historical and superseded by this native binding.
The author executed no validation. Owner verification and combined acceptance remain
pending; the independent source verification is a separate pending review.

## Owner C4 pixel finding: coincident observation visibility

Owner genuine pixel review of fresh `III-26-desktop-light.png` found that the surface
fill of later-painted centroid diamonds hid the canonical blue observation marks s1
and s3. All four IDs and numerical rows remained present, but only two blue dots were
visible. The correction changes only `.p05-center` fill to `none`, preserving centroid
stroke, geometry, capture and numerical/input behavior. Owner C4 reportedly passed
seven gates and desktop/tablet native cases but remains incomplete, with no acceptance;
the owner stops the obsolete run and retains its exact raster blocker and partial
evidence. Existing genuine production captures provide verification. No extra feature
or mirror-property test was added and no author checks were executed.

IMPLEMENTATION COMPLETE — UNVALIDATED — OWNER VALIDATION REQUIRED
