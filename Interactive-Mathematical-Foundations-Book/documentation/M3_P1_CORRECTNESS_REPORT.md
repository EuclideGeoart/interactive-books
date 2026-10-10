# M3-P1 — REF-1 mathematical correctness corrections

Starting HEAD `cec677b`. Scope: two defects and wording; no redesign. Not pushed.

## P1-A — point/displacement precision contract
**Defect.** `placement.ts` rounds sums and differences to 9 decimals, but numeric entry accepted any precision, so `P=(0,0), v=(1e-10,0)` showed `Q=(0,0)` with `v≠0`.
**Fix: declared precision with explicit rejection.**
- `ParamSpec.maxDecimals` (optional, generic): `parseParam` rejects finer input with "… can have at most 6 decimal places" and never rounds it. The parameter hint says "up to 6 decimal places".
- All placement parameters (`P`, `v`, tip) declare `PLACEMENT_DECIMALS = 6`. 9-decimal arithmetic is exact for ≤6-decimal inputs, so `Q = P + v` and `v = Q − P` hold exactly for every accepted state.
- `placement.ts` documents the contract and exports `isRepresentable` and `MAX_INPUT_DECIMALS`. The exact/approximate presentation policy is unchanged.
**Tests.** Unit: `parseParam` boundary (6 vs 7 decimals, `1e-10`); smallest accepted displacement `1e-6` survives; sweep over precision boundaries, cancellation (tip lands exactly on 0, never −0), negative components, `Q−P = v`; `isRepresentable`. Browser: typing `0.0000000001` is rejected with an alert and the model is unchanged; `0.000001` is kept exactly (`v=(0.000001, 0)`, `Q=(−1.999999, −1)`). Oracle: smallest-displacement and cancellation literals, and a check that every fixture placement input has ≤6 decimals (fixture unchanged).

## P1-B — same-ratio exercise
**Defect.** Absolute residual tolerance with a `1e-9` floor accepted `(1e-12, 0)`.
**Fix.** `sameRatio(x, y)`: `|2x+3y| ≤ 1e-12·(2|x|+3|y|)` — relative to the size of its own terms, so it is scale-free. Direction: with the ratio fixed, `w = t·(3,−2)` points the same way as `v` exactly when `x < 0`. Misconception-specific feedback is kept; the "for both,." typo is fixed.
**Regression cases (unit and browser).** Correct: `(3,−2)`, `(1.5,−1)`, `(6,−4)`, `(0.3,−0.2)`, `(1000000,−666666.6666666667)`, `(3e-12,−2e-12)`. Incorrect: `(−3,2)` (same way), `(0,1)` and `(0,0)` (undefined), `(1e-12,0)`, `(1e-12,1e-12)`, `(3,−2.000001)`, `(3,−1.999999)`, `(1000000,−666666)`, `(3e-12,−3e-12)`, `(2,−3)`.

## P1-C — wording
`vectors.mdx` and `direction-lesson.ts` now state: counter-clockwise angles are positive and clockwise negative (with `(1,−1)` ↦ −π/4); the identity `atan2 − atan ∈ {0, π, −π}` requires `x ≠ 0`; a vertical vector has a valid direction but no defined ratio `y/x`; the dashed line "carries v and −v" and they share a ratio only where `x ≠ 0` (stage caption and the figure's text alternative say so, with a separate vertical-vector sentence). Quadrant policies and the implementation are unchanged. A browser test checks the wording.

## Validation (native Linux, sequential)
`astro check` clean; unit 775 passing; oracle 35 OK; builds and `check:dist` OK; e2e root and subpath green after the baseline update below. Tolerances unchanged; fixtures unchanged; Windows baselines untouched; 97 chapters and I.3-only publication unchanged.

**Baselines.** Only the chapter's own baselines from M3 were regenerated (`*-chapter-{placement,pythagoras,direction,direction-zero}`), after inspection: placement gains the "up to 6 decimal places" hint; the others shift by ~1 px because the longer chapter text above moves the stage's sub-pixel position (no change inside the stage). No foundation or other baseline changed.

## Nonblocking items for M4
- `scripts/check-dist.mjs` hardcodes `publishedSlugs = ['vectors']`; derive it from the curriculum.
- Chapter stage baselines depend on the page text above them; consider screenshotting stages in isolation from layout offsets.
- `client:load` for every island; `client:visible` would cut initial JS.
- Windows validation for M3/M3-P1 is still pending (stale contents/map/home baselines, missing chapter baselines).
