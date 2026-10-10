# Windows screenshot baselines (`win32`)

**Review status: GENERATED, NOT YET INDEPENDENTLY REVIEWED.**

These 17 images are the Windows/Chromium reference set. They were produced by WIN-0 on Windows 10 with Playwright's bundled
Chromium (1243) via `npx playwright test tests/e2e/visual.spec.ts --update-snapshots=missing`, and are selected automatically
on `win32` by `playwright.config.ts`. They exist **beside** the Linux references (`../<spec>/<project>-<name>.png`), which are
untouched and remain the authority for Linux. Neither set is ever compared against the other, and no tolerance was loosened.

Why separate sets: the same page differs on Windows in text rasterisation and in glyph fallback for characters outside the
self-hosted fonts (`→`, `⚠`, `½`), which also shifts button widths by a pixel or two. Measured against the Linux set the
Windows renders differ in 7 of 17 comparisons by 1–2 % of pixels (limit 0.4 %), all text edges — plus one genuine layout
difference, see `documentation/WIN_0_PORTABILITY_AND_M2_FREEZE_REPORT.md` §6.

A reviewer should open each image (compare with its Linux counterpart) and confirm: nothing is clipped, nothing collides, axes are
not inverted, formulas are not overflowing. Only after that sign-off should this line be changed to "REVIEWED by <name>, <date>".
Refresh deliberately: `npx playwright test tests/e2e/visual.spec.ts --update-snapshots` on Windows, then look at every changed image.
