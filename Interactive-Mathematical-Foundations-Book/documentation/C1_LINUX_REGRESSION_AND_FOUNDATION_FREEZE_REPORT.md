# C1-LINUX — Native Linux Regression, Visual Reconciliation & Foundation Freeze

**Starting commit:** `b231282` · **Host:** Linux 6.8 (Ubuntu), Node 24.18.0, `.venv/bin/python`, Playwright (repo-pinned) · **Final commit:** see the Git log (the commit containing this report).
**Not done, by instruction:** no Book I change, no curriculum/interface change, no M3/REF-1, no dependency change, no threshold change, no Windows baseline touched, no source change.

## 1. Commands (run sequentially, no concurrent builds)

```
npm run validate        # check → test → test:oracle → build → build:subpath → check:dist → test:e2e → test:e2e:subpath
npx playwright test tests/e2e/visual.spec.ts -g "contents — top of the page|book map dialog" --project=desktop --project=mobile --update-snapshots
npx playwright test tests/e2e/visual.spec.ts -g "zero vector" --project=desktop --update-snapshots=all
npx playwright test tests/e2e/visual.spec.ts      # twice, no update flags
npx playwright test tests/e2e/stage.spec.ts -g "centred above the origin"
npm run test:e2e ; npm run test:e2e:subpath       # re-run after the baseline update (the first validate stopped at test:e2e)
```

## 2. Results

| Stage | First `validate` run | After baseline updates |
| --- | --- | --- |
| `astro check` | 0 errors / 0 warnings / 0 hints | — |
| Unit (Vitest) | **421 passed** | — |
| Python oracle | **16 passed** (fixture fresh, deterministic) | — |
| Build / `build:subpath` / `check:dist` | passed | — |
| Root browser (Playwright) | 269 passed, **4 failed** (visual), 18 skipped | **273 passed**, 18 skipped, 0 failed |
| Subpath browser | not reached (chain stops on failure) | **256 passed**, 5 skipped, 0 failed |

Counts equal the Windows C1 reference (421 / 16 / 273 / 256). No math, TypeScript, oracle or interaction failure occurred; no tolerance was changed.

## 3. Linux screenshot differences (Task B)

Exactly the four predicted cases failed (class 5, expected curriculum difference) and nothing else:

| Baseline | Diff pixels | Inspection |
| --- | --- | --- |
| `desktop-contents-fold.png` | 13 655 (0.02) | "0 of 97 chapters"; Part I lists 9 chapters I.1–I.9; I.3 marked reference; layout intact |
| `desktop-map.png` | 19 511 (0.02) | "0 of 97"; Part I "9 chapters"; two-column distribution now Part I / Part IV in the visible fold; no clipping |
| `mobile-contents-fold.png` | 5 910 (0.02) | "0 of 97"; "9 chapters · none written yet"; intact |
| `mobile-map.png` | 6 872 (0.03) | "0 of 97"; Part I 9 chapters; single column; intact |

Only those four were regenerated, each by test name and project. Re-running the whole visual suite twice without update flags: 17 passed / 13 skipped both times (deterministic).

## 4. Zero-vector label (Task C)

* The C1 geometry test ("note is centred above the origin and lies wholly inside the plane") **passes on Linux** for desktop, tablet and mobile.
* Probe on Linux Chromium (desktop, v = (0,0)): text `x` = 213.21 (the origin), `text-anchor = middle` (attribute and computed), label box 197 px wide centred on the origin, fully inside the 426 px plane. A fresh plane screenshot shows the label centred above the origin. The source and rendering are correct; **no defect exists**.
* The committed Linux baseline `desktop-stage-zero.png` (last changed in the import commit `3247b96`) **was stale**: it showed the label starting right of the origin and clipped at the plane edge. It still *passed* because the label is a small region and the suite's `maxDiffPixelRatio` is 0.004, so the discrepancy fit inside the tolerance.
* Action: that baseline alone was regenerated (`--update-snapshots=all`, since a within-tolerance image is otherwise not rewritten) and the new image was inspected: label centred above the origin, as on Windows. No source, geometry or test was changed; the new regression test is intact.
* Observation (not acted on, per "no loosened/changed tolerances"): a 0.4 % ratio can hide small label-position errors in full-stage shots. The geometry test is what actually guards this. Other Linux baselines were not individually audited for the same effect; a possible follow-up is to inspect them or use region screenshots.

## 5. WIN-0 compatibility on Linux (Task D)

All confirmed working without modification: Node `build:subpath` (built `dist-subpath`, `check:dist` ok); interpreter discovery selected `.venv/bin/python`; oracle fixture freshness and determinism tests pass; `.gitattributes` enforces LF (no non-LF tracked text files); root and subpath deployments both pass the full browser suite; Playwright uses the top-level (Linux) baseline directory; the skip-link stabilisation in `visual.spec.ts` is harmless on Linux; the deep-immutable trace tests are in the 421 passing unit tests.

## 6. Freeze readiness (Task E)

Verified by passing automated suites on Linux plus inspection: one canonical state feeds all views (synchronisation + drawn-geometry-equals-model tests, root and subpath, three viewports); domain math (`src/math`) separate from rendering (`src/ui`, `src/lessons`); formula ↔ geometry identity tests pass; exact (`=`) vs approximate (`≈`) markers preserved; zero-vector direction `undefined` in inspector, formula and screenshot, draws no arrow/legs/arc; trace history immutability tests pass; desktop/tablet/mobile interaction and a11y (axe) suites pass; the plan has 97 chapters with Parts 9/19/15/16/10/10/8/10 (curriculum unit test), I.3 the sole reference chapter and VI.4 the sole flagship. M3 not started.

## 7. Windows-baseline preservation

`git diff` on `tests/e2e/__screenshots__/win32/` is empty; no file there was touched.

## 8. Source corrections

None. Changes: five Linux PNG baselines and this report.

## 9. Remaining limitations

* Known free-mode drag latency under CPU throttling remains documented, unchanged.
* Screenshot tolerance masking (§4).
* No independent reviewer sign-off; commit not pushed.

## 10. Final Git status

Committed on `main`, working tree clean, not pushed (see the Git log).
