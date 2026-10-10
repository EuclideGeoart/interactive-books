# Authoring a chapter on the Book II platform

This is the practical pattern. It is deliberately small; it was first exercised by the reference chapter (REF-1, I.3 *Vectors*, `src/content/chapters/vectors.mdx`). The governing rules are in the master plan (§2, §5, §6, §13, §21); this page says *where things go*.

## 1. The rule that organises everything

```
Mathematical state  →  derived quantities  →  every view
```

1. **State** is one small immutable object (e.g. `{ x, y }`) held by `useLesson`.
2. **Derived quantities** come from a *pure function* in `src/math/<family>/` (e.g. `deriveVector2`). It owns the mathematics: policies for degenerate cases, exactness, numerical care. It has unit tests and, for anything non-trivial, an independent Python oracle.
3. **Views** (the drawing, the inspector rows, the formulas, the spoken description, a trace) are produced by pure functions in the lesson folder that take **only** the derived object. A view never recomputes a magnitude, an angle or a square. If you catch yourself writing `Math.sqrt` in a component, move it into the model.

## 2. Files for a chapter

| You add | Path | Notes |
| --- | --- | --- |
| Narrative | `src/content/chapters/<slug>.mdx` | frontmatter below; `##` headings become the margin outline |
| Domain mathematics (if new) | `src/math/<family>/*.ts` | pure functions, no DOM; **tests in `tests/unit/`** |
| Lesson views | `src/lessons/<chapter>/<name>-lesson.ts` | inspector rows, formula strings, world-space scene, trace frames |
| Interactive stage | `src/lessons/<chapter>/<Name>Stage.tsx` | Preact island composing `src/ui/` primitives |
| Oracle + fixture (if the maths is duplicated in Python) | `oracle/`, `fixtures/` | see §5 |
| Reference code | `code/python/*.py` | shown on the page with `?raw`; **executed by the oracle tests** |
| Status | `src/curriculum/curriculum.ts` | replace `planned(n, "Title")` by `available(n, "Title", "slug", role?)`, for example `available(3, "Vectors: components, magnitude, and direction", "vectors", "reference")` |

`src/curriculum/curriculum.ts` already contains the chapter; the *only* edit there is flipping its status. A test checks that every `available` chapter has exactly one MDX file and every `kind: chapter` file names an available chapter.

## 3. Frontmatter

```mdx
---
kind: chapter                 # "demo" for platform demonstrations (not part of the curriculum)
curriculumId: I.3             # required for kind: chapter, must exist and be available
title: "Vectors: components, magnitude, and direction"   # quote titles that contain a colon
hero: What does a vector actually *store*?     # the hero question; one *word* for the italic
lede: One or two sentences that give the chapter a reason to exist.
description: 20–300 characters for the meta description and the book map.
---
```

The route `src/pages/chapters/[slug].astro` is already in place: it generates a page for each `kind: chapter` entry (I.3 is the first). The foundation demo (`kind: demo`) lives at `/foundation/` and is never listed as a chapter.

## 4. Page structure (master plan §5, in the order of the priority ladder)

1. The hero question and lede are generated from frontmatter.
2. **The first thing in the MDX is the interactive mental model.** It must work before any long text:
   ```mdx
   import Stage from '../../shell/Stage.astro';
   import VectorStage from '../../lessons/<chapter>/VectorStage';

   <Stage caption="Drag the tip…"><VectorStage client:load /></Stage>
   ```
3. Then `##` sections in the order of the chapter contract: intuition → definition → mechanics → derivation → worked example → reference code → explorer → common mistakes → numerical considerations → ML connection → exercises → summary. Each `##` appears in the margin outline automatically.

Helpers available in MDX: `<Callout kind="note | misconception | numerical | scope">`, `<CodeFile source={…} file="…" />` (a real file, verbatim), fenced code blocks (Shiki, themed by tokens), tables (wrapped so they scroll in their own region), `$inline$` and `$$block$$` math with the shared macros.

### Mathematics in prose

* Write `$\mathbf v=(3,2)$` and `$$ … $$`. A formula that fails to parse **fails the build**, and `tests/unit/content.test.ts` renders every formula in strict mode.
* Macros live in `src/math/katex-macros.mjs` (`\norm{·}`, `\abs{·}`, `\R`, `\argmin`, `\argmax`, `\atantwo`). Add a macro only for a book-wide notation convention.
* Avoid a bare `$` in prose; escape currency as `\$`.

## 5. The oracle pattern (independent validation)

For any mathematics that exists in both TypeScript (browser) and Python (canonical reference):

1. Write `oracle/<family>_oracle.py` using a **different algorithm** where possible (the vector oracle uses correctly-rounded `decimal` arithmetic and prime factorisation; the browser uses `Math.hypot` and trial division by squares). NumPy is a *cross-check only*, so the committed fixture is identical with or without it.
2. The oracle self-test (`oracle/test_*.py`) must use **literals** from the plan or worked by hand, never values the oracle computed itself.
3. The oracle writes `fixtures/<family>.fixtures.json` with **inputs and expected values** and a documented tolerance (in ulps, with rationale); `--check` fails if the committed file is stale.
4. A TypeScript test reads that file and compares. Exact forms and zero/undefined policies must match **exactly**; floats within the documented tolerance. Report the worst observed error.
5. Show the reference code on the page from a real file under `code/python/` and execute that file in the oracle tests.

## 6. Interaction checklist (every stage)

* One canonical state; **Reset** restores it.
* Pointer, keyboard (arrow keys; Shift = coarse) **and** numeric input all write the same state. No input path may be required.
* Parameters are declared with `ParamSpec` (symbol, domain, default, step, invalid policy) and invalid input is *rejected with a message*, never silently clamped.
* The draggable point has an accessible name that includes its current values, an operating hint, a 44 px+ hit target, and `touch-action` handled as in `DragPoint.tsx` (touches elsewhere on the plane must still scroll the page).
* Undefined mathematical states (zero vector, singular matrix…) are *shown as undefined* with a reason, never fabricated.
* Rounded values are shown with `≈`; an exact form is shown with `=` only when the model has one (`platform/numeric/quantity.ts`).
* Colour is a **role** (primary / x / y / derived / caution) and never the only cue: add line style, a label, or a glyph.
* Announce *commits* (key press, numeric entry, drag end) in the polite live region, not every pointer frame.
* Motion is optional garnish gated on `prefers-reduced-motion: no-preference`.

## 7. Tests a chapter must add

| Layer | Where | What |
| --- | --- | --- |
| Domain model | `tests/unit/<family>.test.ts` | hand-worked values, degenerate cases, seeded property tests (never unseeded randomness) |
| Oracle parity | `tests/unit/<family>.parity.test.ts` | fixture-driven, tolerance documented |
| Lesson views | `tests/unit/<chapter>-lesson.test.ts` | inspector, formulas (render every formula for a sweep of states in strict KaTeX), world-space scene |
| Content | already generic | frontmatter, formulas, referenced files |
| Browser | `tests/e2e/<chapter>.spec.ts` | start from `tests/e2e/stage.spec.ts`: canonical state, drag, keyboard, numeric entry, reset, degenerate cases, **DOM geometry equals the model** (use `expectInSync` and the `drawn geometry` pattern), mobile |
| Accessibility | extend `tests/e2e/a11y.spec.ts` | axe in both themes in each unusual state; touch targets; non-colour cues |
| Visual | `tests/e2e/visual.spec.ts` | a *few* deterministic states only |

Use **relative** URLs in browser tests (`goto('foundation/')`, never `'/foundation/'`) so the same suite runs against the sub-path build.

## 8. Things not to do (master plan §16, §23)

No arbitrary-dimension framework, no symbolic algebra engine, no universal optimiser or matrix engine, no hand-written chapter route wrappers, no `innerHTML` re-rendering of an interactive, no per-view copies of state, no geometry computed in the renderer. Abstractions are extracted only after a second real chapter needs them.
