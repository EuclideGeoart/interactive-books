# M5-P1 — Part I mathematical consistency and final freeze

Starting HEAD `489c87c`, branch `main`. No Book I change, no new dependency, no Part II work, nothing pushed. The accepted M5 architecture was not reopened.

## 1. Corrected mathematical behaviour (I.8 empty geometric sums)

**Defect.** `closedForm('geometric', …)` evaluated `r^(n+1)` before deciding whether the formula applied. For `r = 0` and `n + 1 < 0` that is `0` to a negative power, so a sum with *no terms* threw `RangeError` instead of being `0`.

**Fix** (`src/math/summation/sequences.ts`). The geometric closed form now makes no claim, and evaluates no power, when `n < m − 1`, or when the sum is empty with `r = 0` and `m < 0`. It returns `applies: false` with value 0, so the loop total, trace, inspector, verdict and spoken text all follow the empty-sum convention. Only a *non-empty* sum that contains an actual term `0^(negative)` is undefined (loop failure at that index, `ZeroDivisionError` in the Python text, no closed form). The inspector's wording for a non-applying formula was made accurate for `n = m − 1` (`sum-lesson.ts`).

| r, m, n | Result | Closed form |
|---|---|---|
| 0, 5, −5 | empty sum 0, no exception | not claimed |
| 0, 0, −2 | empty sum 0, no exception | not claimed |
| 0, 5, 4 | empty sum 0 | applies, (0⁵−0⁵)/1 = 0, agrees |
| 0, 0, 0 | 1 (0⁰ = 1, see §2) | applies, = 1, agrees |
| 0, −1, 2 | undefined: a₋₁ = 0⁻¹ does not exist | none |

Also tested: r = 0, m = 0, n = 3 gives 1 + 0 + 0 + 0 = 1; every ratio in {−2, −½, 0, ½, 1, 3} over every empty bound pair in the allowed window −5…20 returns total 0 without throwing. The exact-rational model and all other conventions are unchanged.

**Tests.** `tests/unit/summation-empty-geometric.test.ts` (new; checks the model, inspector rows, formulas, verdict, spoken text and the Python loop text agree). Oracle: `oracle/summation_oracle.py` gained the five bound pairs, the fixture was regenerated (`fixtures/summation.fixtures.json`, parity test passes), and `oracle/test_summation_oracle.py` gained `EmptyGeometricSums` (literal expectations, including Python's `Fraction(0) ** 0 == 1`).

## 2. Resolved zero-exponent convention

A *contextual* convention, stated openly in both places:

- **I.1** (`quantities.mdx`): `0⁰` and every negative power of 0 remain undefined for ordinary powers of numbers. The paragraph now says that one later place adopts `0⁰ = 1` — the first term `r⁰` of a geometric sum, read as 1 for every `r` including 0 as the empty product — and points to I.8.
- **I.8** (`summation.mdx`): a new "A convention to notice" paragraph states `r⁰ = 1` for geometric sums (matching Python's `Fraction(0) ** 0`), names I.1's policy and why the two do not conflict, keeps a negative power of 0 undefined everywhere, and says an empty sum is 0 even where `rᵐ` would not exist. `code/python/summation_loops.py` carries the same convention as a comment.
- I.1's model and oracle are unchanged (`0⁰` stays undefined there). A unit test asserts that both chapter texts state the policy and cross-reference each other.

## 3. A pre-existing oracle-suite defect found and fixed

Running `npm run test:oracle` showed **13 failures in `test_families_oracle.py`** at HEAD `489c87c` too (verified by stashing this milestone's changes). Cause: several oracles set the process-wide `Decimal` context at import (quantity 80 digits, functions and algebra 60) and `unittest discover` imports every test module before running any, so the families tests ran at the wrong precision; run alone they passed. **My earlier statement that the oracles passed was wrong**: I had only looked at the tail of the output, not the exit status. Fix: `setUpModule`/`tearDownModule` in `oracle/test_families_oracle.py` set the families context (90 digits, exponent range ±10⁷) for that module and restore it. No oracle logic or tolerance changed.

## 4. Linux acceptance evidence (native Linux, Chromium)

| Command | Result |
|---|---|
| `npx astro check` | 0 errors, 0 warnings, 4 hints |
| `npx vitest run` | 51 files, 9757 tests passed |
| `npm run test:oracle` | exit 0: 260 tests OK, all fixtures fresh (NumPy cross-check on) |
| `npm run build`, `npm run build:subpath` | 13 pages each |
| `npm run check:dist` | root and subpath OK (223 files each) |
| **`npm run test:e2e` (complete root suite: desktop, tablet, mobile)** | **1597 passed, 20 skipped, 0 failed, no flaky** |

The root run includes `visual-part-i.spec.ts`: all 24 screenshots passed. No screenshot changed, so no baseline was regenerated or updated in this milestone. The 20 skips are the specs' own viewport-conditional skips (e.g. desktop-only stages).

I did not re-run the subpath browser suite in this milestone. The last subpath result (1570 passed, 5 skipped) predates this change; the subpath *build* and `check:dist` were re-run and pass.

## 5. Part I publication and M4 contracts

- All nine Part I chapters (I.1–I.9) remain `available`; the other 88 remain `planned`; total 97. Asserted by `tests/unit/curriculum.test.ts`.
- I.3 remains the reference chapter and VI.4 the flagship (same test). I.3's unit, e2e and screenshot baselines pass unchanged in the runs above. `useLesson`, plane, `DragPoint`, `ParameterInput`, `Inspector`, `Formula`, `TraceStepper`, `IdScope`, the MDX shell and the oracle/fixture workflow were not modified.

## 6. Windows

Deferred. All `tests/e2e/__screenshots__/win32/` baselines are untouched. For the next Windows batch: `{desktop,mobile}-contents-fold` and `{desktop,mobile}-map` are stale (from M5), and the 24 `part-i-*` screenshots are missing.

## 7. Known nonblocking limitations

- Free-snap drag exceeds one frame under 4×/6× CPU throttling (pre-existing formula re-rendering; measured in the M5 report).
- Subpath browser suite not re-run after this change (see §4).
- Of the 24 `part-i` baselines only three were individually inspected in M5; all pass deterministically.
- Platform wishes not done: ellipsis after unit, `nowrap`/`sym`, right-aligned `aligned` blocks.

## 8. Final state

Final commit hash and working-tree status are given in the hand-back message for this milestone (a commit cannot contain its own hash).
