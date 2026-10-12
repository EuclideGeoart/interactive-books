# M11 — Part VII Information Theory implementation handoff

Date: 2026-10-12, Linux. Sol Agent A. Worktree `/work/interactive-books-part-vii`; book `/work/interactive-books-part-vii/Interactive-Mathematical-Foundations-Book`; branch `feature/book-ii-part-vii-information-theory`.

**Part VII implementation is complete: eight chapters, 40 graded exercises, 16 executable Python references, three independent oracle families, 106 deterministic fixture cases, and 48 reviewed Linux baselines. Branch publication is 87/97 available, 10 planned.** This is focused implementation evidence, not final M11+M12 milestone acceptance. Agent B owns the single combined integration and acceptance. Work stops after this handoff.

## Revision and ownership

The clean starting HEAD matched accepted common baseline `5c97622e5ef16b0f2a1d83d8adb906db7df04bbd`. Dependency setup was inspected before editing: individually linked Node packages; local `.astro`, `.vite`, `.vite-temp` caches; shared `.venv`; existing Chrome. No installation was performed.

| Block | Exact commit | Delivery |
| --- | --- | --- |
| A | `08b0a80e89dc3862894854998148861ee3223042` | VII.1–VII.3: probability products/logs, self-information, entropy; 15 exercises, six references |
| B | `c89ec63a70af71d465e6e80bda090597ae8dca84` | VII.4–VII.5: cross entropy and directional KL; ten exercises, four references |
| C | `ad2bad9e8d723cb1e1db205640cf0ea327e999ac` | VII.6–VII.8: stable logits, log probabilities and token loss; 15 exercises, six references |
| Review and focused fixes | `102926a55cf006f25fc2290153c59c095c691e7f` | Distinct accessible table-region names; corrected infinity notes and axis-label clipping; verified geometry; 48 reviewed baselines and SHA256 inventory |

The subsequent report/evidence commit is the commit containing this file. Obtain its exact hash with `git log -1 --format=%H -- documentation/M11_PART_VII_INFORMATION_THEORY_HANDOFF.md`; the final delivery also reports HEAD. The reviewed source revision is the fourth commit above; the report adds documentation only.

All changes are inside Book II. Book I, canonical checkout, accepted branches, the Numerical Computing worktree, shared dependency contents and the authoritative master plan were preserved. No push, merge, deployment, worktree removal or next-Part work was performed. This branch has no import from unmerged Part VIII.

## Routes and chapter contract

| Chapter | Root route | Opening computation |
| --- | --- | --- |
| VII.1 | `/chapters/log-probabilities/` | Exact probability factors/product, actual direct multiplication, summed logs and repeated-block underflow |
| VII.2 | `/chapters/self-information/` | Probability → surprise, linked selected graph point, nats/bits and infinite endpoint |
| VII.3 | `/chapters/entropy/` | Visible weight normalization, exact masses and actual entropy contributions |
| VII.4 | `/chapters/cross-entropy-nll/` | Fixed P, editable normalized Q, average cross entropy and explicit one-hot observed NLL |
| VII.5 | `/chapters/kl-divergence/` | Both KL directions, signed terms, support mismatch and CE−H identity |
| VII.6 | `/chapters/logits-softmax/` | Actual naive exponentials/denominator and stable probabilities; selected class and common shift |
| VII.7 | `/chapters/stable-logsumexp/` | Actual maximum, shifted scores/exponentials, denominator, LSE, log probabilities and numerical policies |
| VII.8 | `/chapters/token-logits-loss/` | Four named vocabulary entries, four actual positions, targets, stable NLL and explicit mask reduction |

Each MDX chapter starts with a manipulable stage before long prose, includes a second worked/replay stage, five graded exercises with corrective feedback and worked solutions, and two executed reference files. All retain intuition, definition, mechanics, derivation, worked examples, executable code, exploration, misconceptions/counterexamples, numerical considerations, engineering/ML connections, exercises and summary. House `Xref` links connect accepted function-family, Statistics and Optimization material without hardcoding deployment mounts.

## Mathematical contracts

Authoritative models live in `src/math/information-theory/`; pure lesson adapters and shared stages live in `src/lessons/information-theory/`. Canonical state feeds pure derivation, then tables, geometry, inspectors, formulas, accessible descriptions and immutable semantic traces. Presentation components do not calculate independent probabilities, entropy or loss. Existing rational masses, explicit weight normalization, parameter controls, plotting, formula/inspector primitives, exercise grading and frozen trace infrastructure are reused.

- **Probability/log probability:** decimal source probabilities are exact rational masses, not their binary expansions. Products remain BigInt fractions; long products are displayed as an equivalent power of the exact block product. Approximate factor logs are added. Zero probability stays impossible and has extended log −∞. Negative/out-of-range/non-finite or overly precise inputs are rejected. Direct zero/subnormal underflow is distinguished from exact support zero, including subnormal stagnation.
- **Surprise:** −log p is in nats, or −log₂ p in bits. p=1 gives zero; p=0 gives mathematical +∞, without a finite sentinel. The graph excludes its infinite endpoint explicitly and uses the same function/selected quantity as the inspector.
- **Entropy:** one exact normalized distribution owns all views. Zero mass contributes zero before multiplication by its infinite surprise. Point masses have zero entropy; uniform masses maximize it at fixed support. Actual weighted contribution terms are shown. The chapter proves the extremal statements through concavity rather than claiming a plotted/sample proof.
- **Cross entropy:** P supplies target weights and Q supplies log probabilities. Both normalize exactly. p=0 contributes zero; p>0,q=0 contributes +∞. The target selector explicitly changes P to one-hot when requested; realized NLL is labeled separately from a target-distribution average.
- **KL:** exact ratios and support checks precede approximate logs. No 0/0 is evaluated. Both directions stay visible; the unequal preset and finite/infinite hand cases expose asymmetry. CE−H is verified independently. The log inequality proves non-negativity and equality iff P=Q. Signed terms need not be nonnegative. A Bernoulli triangle counterexample proves the metric objection beyond asymmetry. Dynamic bit formulas and reversed support conditions keep the stated direction/unit.
- **Softmax/stability:** stable outputs come from the actual max-shift algorithm. Shifted exponentials are ≤1 and their denominator is in [1,n]. Centered log-softmax `(zᵢ−m)−log denominator` preserves corrections even at equal scores near 10³⁰⁸. A common finite shift is mathematically invariant; binary64 addition can erase score differences or overflow, which is explicit numerical failure. Naive overflow/zero denominators are shown separately from mathematical infinities. Probability underflow can coexist with a finite log probability.
- **Policies:** empty vectors, more than six entries, NaN and +∞ are invalid. A −∞ entry explicitly excludes that class; all −∞ is undefined. Overflow of a finite score difference is marked numerical log-range loss, not excluded support. No uniform fallback or epsilon smoothing is fabricated.
- **Token reduction:** the vocabulary is `the`, `cat`, `sat`, `<eos>`. One to four positions have four scores each, a valid target and a boolean mask. Finite toy scores lie in [−1000,1000], with explicit −∞ exclusions allowed by the model. Invalid predictions/targets/shapes are rejected even if masked. NLL is taken directly from the target stable log probability and agrees with the displayed one-hot terms. Masked rows are skipped before summation; the denominator is the contributing count. An all-masked sequence has total zero and undefined mean. The chain-rule/gradient-descent bridge is explained without building a network, tokenizer, transformer or training system.

## Independent references and numerical budgets

Python owns all fixtures and `--check` freshness. NumPy references are executed cross-checks, not fixture owners. Literal hand-worked cases cover products, surprise boundaries, entropy contributions/extrema, zero-support losses, KL signs/asymmetry/triangle failure, equal logits, extreme finite logs and masked reductions.

| Oracle family | Cases | Independent method | Worst observed error |
| --- | --- | --- | --- |
| `information_probability` | 7 products + 14 surprises + 18 entropies = 39 | Fraction products/normalization and Decimal100 log of the exact product, rather than factor-log accumulation | 8.8373e−16 scaled |
| `information_comparison` | 44 | Fraction sources, Decimal100 log-difference terms and independent CE−H total, rather than TS ratio-log terms | 2.22045e−16 scaled |
| `information_logits` | 17 vectors + 6 sequences = 23 | Decimal400 raw exponential sum/direct normalization/log(total); analytic equal/dominant identities for enormous inputs | 1.84453e−16 scaled logs; 1.11023e−16 absolute probability |

Finite log/entropy/loss parity uses `2e−12 × max(1, |expected|)`, allowing bounded logarithmic evaluation and product repetition up to 1200. Exact fractions, support/equality decisions, null means and signed infinities require exact policy matches. Probability parity has a separate absolute 2e−14 budget. Stable normalization uses `32 × Number.EPSILON × 6 ≈ 4.26326e−14`: at most six nonnegative terms, a denominator ≥1, and bounded division/summation rounding. Tolerances are comparison allowances, not proofs. No accepted tolerance or assertion was weakened.

The enormous-vector oracle explicitly limits its analytic shortcut to equal finite scores or one dominant score separated by >10000; feasible taught scores use raw high-precision exponentials. The supported toy/interactive bounds are documented instead of claiming a general-purpose numerical engine.

## Actual focused gates and retained failures

[M11_INFORMATION_THEORY_FOCUSED_EVIDENCE.json](M11_INFORMATION_THEORY_FOCUSED_EVIDENCE.json) records actual source revision, commands/results, fixture hashes, case counts, browser summaries and production signature. Three T0 manifests are copied byte-for-byte, including the original failed browser invocation. Their `partial: true` status is preserved.

| Gate | Result |
| --- | --- |
| Final Information Theory T0 mathematics | 25 tests / ten files passed; all three oracle families fresh |
| Final content/curriculum/planner guards | 165 tests / three files passed |
| Independent Python self-tests | 16 passed; all 16 shown references executed |
| Final Astro type/content check | 0 errors, 0 warnings; five existing unrelated hints |
| Selected chapter contracts, publication canary and both-theme initial/feedback axe | 195 unique cases passed through retained initial passes and 42 repaired audits |
| Part VII deep interactions and exceptional-state axe | 95 passed; 16 explicitly viewport-specific touch skips |
| Final axis-bound geometry canary | Three passed, desktop/tablet/mobile |
| Reviewed baseline comparison | 24 tests passed, covering 48 images; unchanged 0.004 tolerance |
| Root static canary | 91 pages, eight stylesheets, 391 files checked — OK |

The first focused T0 browser run built only root production, then recorded **153 passes and 42 axe failures**. The failures were duplicate accessible table-region names between opening and worked stages. Tables now retain keyboard scrolling with distinct Explorer/Worked names. A lock-held continuation ran only those 42 audits and the previously pending deep interactions: **131 passed, 16 skipped, six failed**. Those six were two ambiguous dropdown selectors on three projects; the trace-speed selector and information-unit selector both have combobox roles. The tests now name Information unit; all six targeted retries passed. No successful read-only cases were repeated to erase this history.

The selected unique browser total is **290 passed / 16 viewport touch skips / zero unresolved failures**, plus the three final axis canaries. All eight mobile touchscreen cases passed; desktop/tablet exercise keyboard and pointer equivalents. Actual bar widths and surprise-point coordinates are checked against derived quantities. Replay/seek/play/pause, reset, rejection, descriptions, MathML, target controls and masked means are covered.

Visual review found a clipped negative axis label and a mathematically infinite KL row carrying an incorrect undefined default note. Those presentation defects were fixed locally and regression-checked; only the 12 affected new log-product/KL images were refreshed. Playwright’s `changed` update mode initially retained images within tolerance, so `--update-snapshots all` was deliberately used for these 12 files. Their final pixels were reviewed again; the normal comparison then passed all 24 cases. No old or Windows baseline was overwritten.

Reproduction from this clean branch:

```sh
# T0 self-locks; do not add flock around these invocations.
node scripts/validate.mjs focused --only math --chapter VII.1 --chapter VII.2 --chapter VII.3 --chapter VII.4 --chapter VII.5 --chapter VII.6 --chapter VII.7 --chapter VII.8 --dry-run
node scripts/validate.mjs focused --only browser,visual --chapter VII.1 --chapter VII.2 --chapter VII.3 --chapter VII.4 --chapter VII.5 --chapter VII.6 --chapter VII.7 --chapter VII.8 --dry-run
```

Dry runs are selection evidence, not test success. The committed manifests/results above are the executed evidence. Inspect selection again after integration, because shared curriculum/T0 edits intentionally broaden plans. Do not launch complete-book browser scans merely to validate these shared edits. No `validate:milestone`, `validate:exhaustive` or second production mount was run by Agent A.

## Visual inventory, disk and integration conflicts

[M11_INFORMATION_THEORY_SCREENSHOT_INVENTORY.json](M11_INFORMATION_THEORY_SCREENSHOT_INVENTORY.json) records all 48 SHA256 hashes, dimensions and individual review provenance: 16 desktop, 16 tablet, 16 mobile; opening and meaningful exceptional state for each chapter. Linux Chrome emulation is the reviewed platform. Wide pipeline tables/formulas use focusable horizontal regions on narrow screens; no page-breaking overflow was accepted.

All heavy operations were serialized through `/tmp/imf-heavy.lock`. T0 acquired it itself; direct builds/Playwright/captures used one direct lock. `df -h /` was checked before heavy operations. Free disk started at 21 GiB and remained approximately 20 GiB at handoff, above the 15 GiB threshold. The book directory is about 197.38 MiB; local Node overlay 1.58 MiB, root production 28.23 MiB, retained ignored validation evidence 21.71 MiB, and new baselines 8.88 MiB. No automatic cleanup or duplicate environment/browser/package installation was performed. Routine traces were off.

Expect shared-file reconciliation in:

- `src/curriculum/curriculum.ts`: retain all eight VII publication entries and Agent B’s ten VIII entries, with plan titles/markers unchanged.
- `tests/unit/curriculum.test.ts`: combined publication must become 97 available / zero planned, preserving exact reading order and all per-Part/marker assertions.
- `scripts/validation-plan.mjs`: merge both family registries, stage/model owners, oracle mappings, exact-ID browser selection and visual prefixes/specs. Preserve conservative unknown/deleted fallback and actual consumer closure.
- `tests/unit/validation-plan.test.ts`: preserve both parts’ ownership regressions and reconcile publication counts. Information probability edits select VII.1–VII.5; comparison edits VII.4–VII.5; softmax edits VII.6–VII.8; token edits VII.8. No broad/unrelated Numerical Computing selection is introduced by this branch. Reconcile any actual new cross-Part consumers at integration rather than imposing blanket exclusions.

The new Part VII models, lesson files, references, fixtures, oracle tests, interaction specs and dedicated screenshot directory are separately owned and should not conflict with Agent B’s numerical implementations. Accepted Book I/earlier chapter source and historical baseline bytes remain unchanged.

## Limits and stop

Final combined acceptance, the subpath production build/browser run, full-book release certification, Windows rendering, physical-device and manual screen-reader acceptance are not claimed. Agent B owns the combined integration and final milestone validation. Bounded toy vocabulary/support/repetition limits and explicit enormous-reference shortcuts are deliberate. There is no arbitrary expression parser, external model API, transformer, tokenizer or network-training system.

Required mathematics and focused functionality are sound within the executed scope; no selected failure remains. All implementation, baselines, evidence and this handoff are committed, and the branch is left clean. Agent A stops here.
