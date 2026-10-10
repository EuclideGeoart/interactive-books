# C1 — Curriculum v1.1 Integration, Visual Regression & WIN-0 Final Corrections

**Baseline:** `6b8a89b` (WIN-0) · **Host:** Windows 10, PowerShell 5.1, Node 22.14.0, Python 3.13.3, Playwright 1.63.0 · **Final commit:** `8e17e7b` (§8)
**Not done, by instruction:** no Book I change, no REF-1, no chapter generation, no dependency upgrade, no model change, no threshold change, no performance work, no blanket snapshot regeneration, no Linux file touched. **Not claimed:** independent-reviewer approval, native Linux validation.

## 1. Curriculum v1.1 consistency (C1-A)

The user's uncommitted v1.1 changes (master plan, `curriculum.ts`, both test files, README, amendment document) were preserved as found and are included in this commit.

| Part | Plan headings | `curriculum.ts` | Required |
| --- | ---: | ---: | ---: |
| I Mathematical Language | 9 | 9 | 9 |
| II Linear Algebra | 19 | 19 | 19 |
| III Calculus | 15 | 15 | 15 |
| IV Probability | 16 | 16 | 16 |
| V Statistics | 10 | 10 | 10 |
| VI Optimization | 10 | 10 | 10 |
| VII Information Theory | 8 | 8 | 8 |
| VIII Numerical Computing | 10 | 10 | 10 |
| **Total** | **97** | **97** | **97** |

Checked by the existing drift test (re-parses the plan; compares every Part title, purpose and exit condition and every chapter number, title and role) and by a direct count: 97 `### <Part>.<n>` headings, no duplicate ids, numbering continuous within each Part. I.3 is the only `reference` and VI.4 the only `flagship` (asserted). I.4 *Algebraic expressions, equations and inequalities*, I.6 *Essential function families* and III.10 *Computational graphs and automatic differentiation* are present in both plan and data. All 97 chapters are `planned` (e2e: 97 `data-status="planned"`, zero links). Navigation across the Part boundary (I.9 → II.1) and the end of the book are asserted.

**Stale references.** Searched `src`, `tests`, `scripts`, `oracle`, `code`, both READMEs, the authoring and design documents and the master plan itself for `94`, old chapter ids (I.4–I.7, III.10–III.14), old Part sizes and "summation".
* Fixed (active): `src/platform/trace.ts` comment "I.6 summation" → **I.8** (comment only).
* Left (historical, per instruction): the 94-chapter and old-numbering statements in `M0_M2_IMPLEMENTATION_REPORT.md` (including its "(I.6, II.1)" autoplay note) and `BOOK_II_REUSE_AUDIT.md`; the amendment document records this explicitly.
* No other stale reference found. Other ids used in tests (VII.6 *Logits and softmax*; II.8 in the design text) are unaffected by the amendment.

## 2. WIN-0 correction (C1-B)

`WIN_0_PORTABILITY_AND_M2_FREEZE_REPORT.md` said "was 411; +10 new trace tests". The final M0/M2 baseline is **413** (its own report; 411 was the count in a relocation copy made before two later tests). 421 − 413 = **+8**, equal to the eight new trace tests. Corrected to "was 413 at the final M0/M2 baseline; +8 new trace tests". Historical test evidence is unchanged.
Verified still intact: Linux and Windows screenshot paths are separate (`__screenshots__/<spec>/` vs `__screenshots__/win32/<spec>/`); no Linux baseline differs from `HEAD`; `.gitattributes` exists only in Book II; the eight trace-snapshot tests and the model/oracle code are unchanged and pass.

## 3. Windows validation (C1-C) — `npm run validate` from PowerShell, exit 0, 3 min 42 s

| Step | Result |
| --- | --- |
| Types (`astro check`, 73 files) | 0 errors, 0 warnings, 0 hints |
| Unit (Vitest) | **421 / 421** passed, 11 files (same total as WIN-0: curriculum tests were edited, not added) |
| Python oracle | **16 OK**; fixture fresh, NumPy cross-check on |
| Builds / crawler | root and sub-path built; 4 pages, 91 files each, OK |
| Root browser tests | **273 passed, 0 failed, 18 skipped** (291) |
| Sub-path browser tests | **256 passed, 0 failed, 5 skipped** (261) |

Compared with WIN-0 (270 / 253): +3 in each browser run — the one new test (§5) at three viewports. The skips are the same viewport-conditional skips as in WIN-0. Visual tests are excluded from the sub-path run by its config, as before.

**The first run of this pass** failed 4 visual tests (266 passed): `contents — top of the page` and `the book map dialog`, desktop and mobile — exactly the expected curriculum-caused ones. Home, stage, plane and equation captures still matched.

## 4. Visual review (all 17 Windows baselines)

**The four changed baselines** — actual inspected against the previous reference:

| Image | Difference | Verdict |
| --- | --- | --- |
| `desktop-contents-fold` | "0 of **97**"; Part I "9 chapters" with nine rows (new I.1 title, new I.4, I.6; renumbered I.5, I.7–I.9); Part II starts lower | intentional |
| `desktop-map` | "0 of **97**"; same Part I rows; column balance reflows (Part IV now starts the second column where Part V did) | intentional |
| `mobile-contents-fold` | "0 of 97"; Part I "9 chapters"; longer I.1 title wraps to two lines | intentional, no overflow |
| `mobile-map` | "0 of 97"; new Part I rows | intentional, no overflow |

Only these four `win32` files were updated (`--update-snapshots=changed`, limited to those two tests). Stability without update: the visual spec repeated twice, **34 / 34 passed**; the full pipeline then passed again with no update.

**All 17 images reviewed** for clipping, alignment, formula legibility, geometry and mobile overflow: no clipped text, no collisions, no overflow; axes, right-angle marks and angle arcs correct; KaTeX formulas legible in light and dark; the 390 px layouts fit the width. Observations, no action: (a) in `desktop-plane-third-quadrant` the "x = −2.5" dimension label interrupts its line near the axis — the documented dimension-line design; (b) `mobile-equation-overflow` is only the scroll region's visible portion (a crop by design); (c) `→`, `⚠` and `½` come from OS fallback fonts, so Windows widths differ slightly from Linux — the reason for separate sets. **Unresolved from this review: none.** `win32/README.md` is unchanged and still says *generated, not independently reviewed*; this is the implementer's review, not the external one.

## 5. Zero-vector label and the Linux follow-up (C1-D)

Source inspected: `VectorStage.tsx` renders `<PlaneLabel name="zero-note" at={ORIGIN} dy={-36} anchor="middle">`; `PlaneLabel` (`primitives.tsx`) emits `<text x=origin.x y=origin.y−36 text-anchor="middle" dominant-baseline="central">`. No CSS overrides `text-anchor`; no other code repositions the label; there is no collision logic; the `along` fallback `{1,−1}` applies only to the arrow label, which is not rendered for the zero vector. The code specifies a centred label and Windows draws exactly that. **No source defect was found, so no source change was made.** The repository holds a single M2 commit for these files, so the older picture cannot be traced to an earlier code state.
Likely explanations for the Linux reference (unproven; not decidable from Windows): (1) the reference is stale or was captured unsettled — it also sits ~10 px lower than `dy` would put it; (2) a Linux/system-Chrome quirk with `text-anchor` or the `⚠` fallback glyph; (3) a real Linux-only defect.
**Added** a geometric regression test (`tests/e2e/stage.spec.ts`: "(0, 0): the "zero vector" note is centred above the origin and lies wholly inside the plane"): bounding box inside the plane, centre within 3 px of the origin, above the origin. It is pixel-independent, passes on Windows at all three viewports, and **will fail on Linux if the clipping is real**, which makes the Linux run decisive.

**Linux status: PENDING.** Native Linux execution is unavailable from this session (the WSL distro has no Node; installing it or changing Linux files was not authorised). The Linux operator must check:
1. `npm ci && npm run oracle:setup && npm run validate` — the complete pipeline. It may show the four curriculum-affected diffs (`contents-fold`, `map`, desktop and mobile) against the **Linux** set, which this pass did not and could not update; inspect before updating, and update only those.
2. Whether the zero-vector clipping still reproduces (does the new geometric test pass?) and whether `desktop-stage-zero.png` is stale.
3. Whether the WIN-0 `settle()` change (`.skip-link{visibility:hidden}`) leaves every other Linux baseline passing.
4. That Linux still selects the original baseline set.

## 6. Files changed

Curriculum v1.1 (the user's, preserved): `documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md`, `src/curriculum/curriculum.ts`, `tests/unit/curriculum.test.ts`, `tests/e2e/navigation.spec.ts`, `README.md`, `documentation/CURRICULUM_V1_1_AMENDMENT.md` (new; status line updated in this pass).
This pass: `src/platform/trace.ts` (one comment), `tests/e2e/stage.spec.ts` (+1 test), `documentation/WIN_0_PORTABILITY_AND_M2_FREEZE_REPORT.md` (test-count fix), `README.md` (status sentence), four files under `tests/e2e/__screenshots__/win32/visual.spec.ts/`, and this report.

## 7. Unresolved limitations

* Linux validation pending (§5); the Linux screenshot set needs a native review of the four curriculum-affected images.
* Windows baselines await independent review.
* Cause of the Linux zero-vector reference undetermined.
* Free-mode drag latency under 4–6× CPU throttling remains as documented in WIN-0 §7; not addressed.
* Only Chromium; touch is emulation.

**Stopping at the independent review gate. Next educational milestone: M3 / REF-1 — Vectors.**

## 8. Commit

Milestone commit `8e17e7b`. A file cannot contain its own hash, so this line was recorded by a docs-only commit that follows it.
