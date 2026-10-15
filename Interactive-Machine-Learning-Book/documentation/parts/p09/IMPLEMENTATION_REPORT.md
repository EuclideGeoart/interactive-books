# Part IX implementation-only handoff

IMPLEMENTATION COMPLETE — UNVALIDATED — OWNER VALIDATION REQUIRED

Author scope: allocated linked worktree `book-iii-part-ix-neural-bridge`, branch `feature/book-iii-part-ix-neural-bridge`, exact starting HEAD `f916281abf91152efc4a99a4e6497987ed93c66b`. The common Git directory was inspected and is the canonical `interactive-books/.git`. Initial source status was clean. The owner supplied freeze/lock/protected-tree evidence; the author did not rerun that validation.

## Source delivered

III-40 and III-41 register through the owned manifest. Each opens with the numerical explorer and includes intuition, definitions/shapes, mechanics, derivation, literal worked examples, actual Python `?raw` reference code, mistakes/limits/connections, five graded corrective exercises, a summary and a conceptual derivative/optimization bridge to Book IV. Actual Book II prerequisite IDs use the frozen shell resolver. All teaching is offline. No Book IV mechanisms or general training machinery are implemented.

The neuron exposes x/w columns, every product/running sum, dot, scalar bias, z and a under identity/ReLU/stable sigmoid. It explicitly connects identity d=1 to the unchanged III-07 affine predictor. The network exposes every entry of x/W1/b1/W2/b2 and every hidden/output contribution. The UI fixes d=h=2,o=1 and editable scalars to ±1000. The pure single-sample model accepts arbitrary positive compatible dense dimensions. No batches or implicit broadcasting are implemented.

Identity composition calculates W_eff=W2W1 and b_eff=W2b1+b2, evaluates that affine map and reports actual-minus-collapsed output. Nonlinear comparison is labeled counterfactual. A separately unrepresentable collapse does not discard a valid actual forward pass. Editable hand-chosen ReLU XOR displays all four binary inputs, both hidden preactivations/activations and scalar output. Prose independently excludes every exact scalar affine XOR map by contradiction. No fitting, semantic-learning or classification-threshold claim is made.

One derived record supplies SVG labels/data, equations, inspector, table, full JSON and announcements. Six neuron or fourteen default network trace frames explain each operation while retaining complete detached immutable input/forward snapshots via `traceFrom`. Edits start at the displayed frame and close replay; reset restores canonical input and phase. Rails remain intrinsic 320px wide with 16px labels; the frozen overflow helper supplies named keyboard scrolling if needed. Controls retain 44px minimum heights. Vertical full JSON uses the Part-local named wrapper around plain pre, following the accepted P08 pattern.

## Arithmetic and independent evidence authored

Canonical Python+NumPy constructs explicit columns and product arrays, then sums sequentially in input order, matching TypeScript. Trust boundaries reject wrong kinds/types, nonfinite numbers, incompatible/empty/ragged dimensions and sparse TS arrays. Products, running sums and bias/output arithmetic must remain finite. Nonzero affine products that underflow to zero are rejected; nonzero subnormals and ordinary rounding remain possible. Stable sigmoid intentionally permits rounded tails at 0/1. Input conversion cannot recover intended real precision from stored binary64 values.

Eighteen literal fixtures were written by hand, never generated: negative/positive/zero neurons, bias-only cases, ±2/0/±40/±1000 sigmoid, nonzero-bias identity and ReLU compositions, the four XOR inputs, zero-input two-layer biases, and hidden sigmoid followed by an affine output. `check_fixtures.py --check` checks those literals and canonical data freshness without rewriting them. The independent oracle imports no canonical code: Fraction exact rational sums and matrix composition plus 80-digit Decimal sigmoid supply expectations. The checker separately invokes the actual canonical module. It does not treat Python↔TS agreement as mathematical proof.

P09's new comparison policy uses exact equality for declared exact integer/dyadic/endpoint cases. Independent and unit/parity comparisons check every expected zero exactly. Other nonexact derived values—including 1 after summing separately rounded sigmoid values—use `32ε·|expected| + 32ε` for magnitude at least 10⁻⁸, ε=2⁻⁵². Tiny nonzero values use `32ε·|expected|` only. Browser numerical projections retain their stated allowance, with an absolute 32ε also at expected zero; those projection assertions do not replace exact independent/unit zero expectations. The allowance covers a small number of rounded operations and exponential implementations in the committed small examples, not arbitrary-dimensional conditioning. It never alters a kernel result or any frozen tolerance. Signed zero is compared numerically/through JSON-observable representations, without normalizing the kernels.

Authored units/parity/Python/oracle tests cover every literal, actual frozen III-07 prediction semantics, compatible multiple-output dimensions, every parameter leaf, sparse/malformed/nonfinite inputs, finite-input product/sum/bias/output overflow, product underflow, successful forward with failed collapse, and a separate binary64 identity-rounding witness (staged 0 versus collapsed/exact 1). Trace tests inspect deep freezing/detachment, complete records, phase labels and immutable edits/reset. Unit parity source executes the actual canonical CLI under owner control.

Authored browser tests use relative routes at root/subpath through the unchanged runner and native JSON import attributes, including transitive imports. They cover both themes and inherit desktop1440×900/tablet820×1180/mobile390×844. Assertions project actual state into DOM/SVG terms and readable values, exact formula annotations, shapes, all four binary rows, every input/parameter edit, all activation choices, rejection, keyboard increments, touch controls/native surface scrolling (CDP swipe on hasTouch projects, actual wheel on desktop/tablet, with identical state-preservation assertions and no skipped scrolling cases), full immutable replay records and reset, ten exercise feedback paths, page bounds, conditional keyboard scroll regions, unchanged13.99px physical plot-font bound and44px control bound. No screenshot/baseline updates were authored.

## Execution and remaining limits

No validation was executed: no unit/Python tests, fixture generators/checkers, oracles, type checks/compilers, builds, browsers/screenshots, benchmarks, exploratory correctness programs or new mathematical code. Only source/search reads, literal source/file edits and Git inspection/commit operations were used. No dependencies were installed or replaced; no shared/prior-Part/config/Book I/II/baseline file was edited. Git hooks are disabled for the implementation commit to preserve the no-execution policy.

Owner-only runner: the accepted unchanged `npm run validate:milestone` without a Part filter remains the integration authority, under the existing shared heavy gate. This author neither ran it nor supplies pass counts, acceptance, visual proof, performance claims or a frozen status. All correctness, TypeScript/MDX compatibility, Python parity, actual rendered accessibility and root/subpath behavior remain unvalidated. There is no arbitrary-precision, huge-dimension, cross-platform or production-learning guarantee. Both sigmoid saturation and affine reassociation limits are explicit.

No open shared request; see `INTEGRATION_REQUESTS.md`. The final commit SHA and clean status are supplied in the chat handoff after committing this report; full ancestry is preserved and only the owner integrates. Initial delivery `49ea89472944452b292232e78af8b06eba4c1702` is retained; the final native-scrolling/precision correction is a separate owned commit.

## Exact owned additions

- `src/parts/p09/manifest.json`
- `src/parts/p09/model/forward.ts`
- `src/parts/p09/lesson.ts`
- `src/parts/p09/ForwardStage.tsx`
- `src/parts/p09/stage.css`
- `src/parts/p09/chapters/linear-model-artificial-neuron.mdx`
- `src/parts/p09/chapters/composition-learned-representations.mdx`
- `code/python/p09/forward.py`
- `oracle/p09/manifest.json`
- `oracle/p09/independent.py`
- `oracle/p09/check_fixtures.py`
- `oracle/p09/test_forward.py`
- `fixtures/p09/forward.fixtures.json`
- `data/p09/examples.json`
- `tests/unit/p09/forward.test.ts`
- `tests/unit/p09/parity.test.ts`
- `tests/e2e/p09/forward.spec.ts`
- `documentation/parts/p09/INTEGRATION_REQUESTS.md`
- `documentation/parts/p09/IMPLEMENTATION_REPORT.md`

## Owner source-derived binary-counterfactual correction

After the two retained delivery commits, the owner identified an uncaught derived-row failure: active x=[0,0], W1=[[1e-300,0],[-1,1]], b1=[0,0], W2=[[1e-300,0]], b2=[0], ReLU is a valid zero forward pass, but the [1,0]/[1,1] binary rows reject their nonzero 1e-600 output product. The derived lesson now isolates RangeError failures per binary case and marks those cases unavailable with the numerical reason. Rendering and the complete JSON project those statuses and omit unavailable numeric attributes. The model API is unchanged and completes atomically; partial hidden/output rows are withheld rather than recomputed through a second mathematical path. Unrelated programming errors are not swallowed by the binary-case helper.

Parameter-dependent input presets now use the existing `attempt()` rejection path, preserving the last valid active state if a selected case fails. A small authored unit and browser regression enters the concrete tiny-weight case numerically, checks both unavailable rows, both rejecting input presets, valid active values, subsequent bias editing, reset and the absence of uncaught page errors. These are authored assertions, not executed results. The unchanged canonical kernels, Python/oracle expectations and frozen tolerances are not modified. This is another P09-only correction commit preserving both earlier commits; all correctness/type/render checks remain owner-only and unvalidated.

## Independent source-review numerical-presentation correction

The read-only review at `c8e540f` found that a legend did not qualify exact-looking numerical equations at sigmoid(-1000) and at identity x=[1,0], w=[1,0], b=1e-16. Live numeric formulas now use approximation signs around evaluated numbers, while symbolic activation definitions and chapter proofs retain exact equality. SVG sum/z/a labels and the collapsed calculation use approximation signs; replay calls the values computed binary64 contributions/preactivations/outputs rather than asserting real equalities. Full-precision numeric records and all numeric data attributes are unchanged. The wording does not promise correctly rounded ideal transcendental evaluation.

A small authored unit/source assertion covers saturated sigmoid zero, the small-bias rounded preactivation, replay wording and SVG/collapse source labels. It was not executed. Only P09 presentation strings, their authored assertions and Part-local reporting change: arithmetic kernels, literal fixture bytes, tolerances and exact symbolic proofs remain unchanged. All validation remains prohibited and the final clean correction SHA is supplied in the chat handoff.

## Owner-reported milestone attempt 1 caller correction

Owner reported gate 1 failure at integration source `25dae973ec48365ab5c829bd8174a4265fcaf236`, signature `175c91fa36aa975189737e0562cb9a9519e7cba1fe98281380f8ea5ca8167a1b`: Astro check TS2322 at `ForwardStage.tsx` TraceStepper frames. The shared `TraceStepper<S>` accepts `TraceFrame<S, never>[]`, while P09's original frames include `{ numerical }` events.

The Part-owned caller now passes an inferred typed projection containing only index/state/explanation to the shared stepper. The original frozen eventful frames remain unchanged for seeking, full JSON and trace assertions. There is no cast, shared API change, tolerance change or test suppression. Existing replay tests are retained. The author did not reproduce the failure or execute validation; only the owner reruns the unchanged full campaign. This correction remains unvalidated, with its clean commit SHA supplied in the chat handoff.

## Owner-reported milestone attempt 2 browser harness correction

Owner reported integration source `b8d9546`, signature `0887baa058ea40ec218385e87284999488dd82a247403fc71b2c6d674796856f`, passing seven gates (135 files, 585 units, 184 Python cases, 25 oracle commands, 53 pages per mount). Root P09 network every-parameter browser test then failed at exact `data-hidden` deep equality: browser `[0.5926665999540697,0.5926665999540697]` versus Node-side model `[0.5926665999540698,0.5926665999540698]`, a one-ULP sigmoid-derived difference. These are owner-reported outcomes; the author executed none of the gates or the failure.

The P09 browser harness now applies only its existing `near` 32ε allowance to sigmoid-dependent numerical record fields/arrays (activation values, output products/running/dot/z, and actual-minus-collapse differences), including stored numerical events. Hidden affine rows, neuron affine rows, output biases, effective affine weights/bias/rows, shapes, object keys, array lengths, strings, state and parameters remain exact; identity/ReLU numerical records retain exact comparisons. Collapsed affine outputs do not depend on sigmoid and remain exact. Presentation strings, DOM/SVG scalar/term attributes and table product/running payloads are compared exactly against the observed browser numerical record after it has been checked against the Node model. TeX annotations, descriptions and replay use those validated observed values, avoiding a separate full-precision-string disagreement at an allowed ULP. Replay also checks stored state and exact agreement of stored event/current numerical records.

Only the owned browser harness and this report change. Kernels, fixtures, unit/oracle policy, tolerance magnitude, numeric checks' declared bounds and the owner integration run are unchanged; no tests are skipped or suppressed. This correction is source-only and unvalidated. The owner alone reruns the unchanged complete campaign after reviewing/integrating the clean correction commit.

Owner also reported actual-pixel overlap in running attempt 2 capture `artifacts/wave-e-visuals/root/III-41-desktop-light-binary-underflow-unavailable.png`: the two horizontal connector strokes at y55 intersect the scientific weight label `1.000e-300` in x85…125 / x195…235. The renderer correction removes only those two strokes between the labeled x/w/product numeric columns. Text positions, fonts, displayed precision, data attributes, tolerances and the vertical sum/bias/activation flow are unchanged. The owner adapts its coordinate assertions to actual term text centers/baselines. The author neither opened/produced captures nor executed validation; the pixel finding is attributed solely to the owner. This minimal renderer correction is committed alongside the P09 harness correction.
