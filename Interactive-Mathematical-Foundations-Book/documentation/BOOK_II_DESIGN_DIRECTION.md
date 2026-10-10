# Book II — Design Direction

**Product:** *Interactive Mathematical Foundations for Computing & Machine Learning* (Book II)
**Status:** M2 design contract · written before implementation, amended with an "as built" section at the end
**Constraint set:** `documentaion/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md` §2, §3, §6, §7, §8, §11

---

## 1. Philosophy: mathematics is the protagonist

> **See it → manipulate it → understand the mechanism → derive the mathematics → implement/use it.**

The interface exists to disappear into that sequence. Three rules follow, and every later decision is tested against them:

1. **One thing is alive on the page.** Each screen has exactly one object the learner should be pulling on. Chrome stays quiet around it: no card grids around the mathematics, no decorative gradients, no icon confetti.
2. **Every number on screen is an answer to a question the learner just asked** by moving something. Values are not "statistics"; they are the *consequence* of the gesture, shown in the same frame.
3. **Two views of one state.** A picture and a formula are never allowed to disagree because they are never computed separately: `state → derived quantities → {geometry, inspector, formula, spoken description}`.

The tone is a **well-set printed mathematics book that happens to respond to touch** — not a dashboard, not a documentation site, not a slide deck.

## 2. Identity: "the drafting sheet"

Three directions were explored before choosing:

| Direction | Idea | Verdict |
| --- | --- | --- |
| **Blackboard** | Dark-first, luminous chalk-coloured objects on near-black (the familiar animated-maths look) | Striking in demos, poor for long reading, and dark navy + bright accents is too close to Book I's palette. Kept only as the *dark theme*. |
| **Lab notebook / dashboard** | Panels, tiles, status chips around widgets | Exactly the "generic dashboard template" the brief rules out; makes chrome the protagonist. Rejected. |
| **Drafting sheet** *(chosen)* | Warm paper, graphite ink, fine rules, crop marks and ticks like a printed plate; objects are drawn in a small, fixed set of *ink colours*, each with a mathematical meaning | Ties the interactive plane and the surrounding page into one object: the plane is simply the most active region of the sheet. |

**Signature elements** (used consistently, nowhere else):

* **Crop marks.** Interactive stages carry four small corner ticks, like a plate on a drafting sheet. They say "this region responds". Static figures do not have them.
* **The Part ruler.** The eight Parts are positions I–VIII on a hairline with tick marks in the top bar; the current Part is marked on the line. The curriculum *is* an ordered line of dependencies, so the navigation shows it as one.
* **The colour grammar** (below): colour encodes mathematical *role*, never decoration.
* **Part emblems.** Each Part has a small plate computed from its real mathematics at build time (a vector on axes; a sheared grid; a secant and tangent; a bell curve; a regression line; a descent path on contours; binary entropy; a toy floating-point number line). Emblems are wayfinding, not ornament, and are tested as pure functions.

### 2.1 Colour grammar

Colour names a **role**. The same hue means the same thing in every chapter, in both themes. Because colour alone must never carry meaning (plan §11.3), every role also has a non-colour cue.

| Role | Hue (light / dark) | Used for | Non-colour cue |
| --- | --- | --- | --- |
| **primary** | vermilion `#D2501A` / `#FF8C5C` | the object being studied (the vector **v**) | thickest stroke, arrowhead, label **v** |
| **x / first** | cobalt `#0B6FB5` / `#62B6EE` | x-component, first basis vector, first coordinate | solid leg, label "x = …" |
| **y / second** | viridian `#00946B` / `#3DD6A5` | y-component, second basis vector | **dashed** leg, label "y = …" |
| **derived** | plum `#9A4A9E` / `#D997DD` | results computed from the object (angle, transformed vector, residual) | arc/dotted, label with its symbol |
| **caution** | ochre `#B87B00` / `#F3C24F` | validity notes, undefined states, numerical warnings | ⚠ glyph + text, never colour alone |

The hues are an Okabe–Ito–derived set (chosen for colour-vision-deficiency separation) adjusted for contrast. Computed WCAG 2 ratios on the stage surface: all graphic roles ≥ 3 : 1 (light: primary 4.2, x 5.3, y 3.8, derived 5.4; caution graphics are used only with text); every text variant ≥ 4.5 : 1 (light 5.5–6.8; dark ≥ 8.7). Ink on paper: 15.1 : 1 (body), 7.8 : 1 (secondary), 5.0 : 1 (tertiary).

### 2.2 Surfaces and tokens

Everything is a CSS custom property on `:root`, redefined under `[data-theme="dark"]`. Components never use hex values.

| Token | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--paper` | `#F5F2EA` | `#0E1214` | the page |
| `--sheet` | `#FFFEFA` | `#151A1D` | stage / raised plate |
| `--ink`, `--ink-2`, `--ink-3` | `#1A1D21`, `#464C54`, `#626872` | `#ECE8DE`, `#BDBAB0`, `#92958F` | primary, secondary, tertiary text |
| `--rule`, `--rule-strong` | ink at 12 % / 28 % | chalk at 14 % / 32 % | hairlines, borders |
| `--grid-minor`, `--grid-major`, `--axis` | ink at 7 % / 14 % / 72 % | chalk at 8 % / 16 % / 76 % | graph paper |
| `--role-primary/-x/-y/-derived/-caution` (+ `-text` variants) | §2.1 | §2.1 | colour grammar |

The theme is chosen before first paint from `localStorage` (guarded) or `prefers-color-scheme`, and is a visible toggle.

## 3. Typography

> **The typeface tells you what kind of thing you are looking at.**

| Role | Family (self-hosted, variable, OFL) | Used for |
| --- | --- | --- |
| **Meaning** — prose, titles, hero question | *Source Serif 4* (optical-size aware) | everything the learner reads as a sentence |
| **Mathematics** | *KaTeX* fonts (Computer-Modern-like) | all formulas, inline and display; **also SVG axis/symbol labels**, so a "θ" in a diagram is the same glyph as a "θ" in an equation |
| **Controls and labels** | *Instrument Sans* | buttons, inputs, nav, captions, inspector row names |
| **Literal values and code** | *JetBrains Mono* | inspector values, code, anything where "these are the actual characters" matters; tabular figures keep columns steady while dragging |

Scale (fluid, rem-based; prose measure 66 ch):

| Step | Size | Use |
| --- | --- | --- |
| hero | `clamp(2.25rem, 1.2rem + 4.5vw, 4.25rem)` | the hero question, serif, tight leading, one italic emphasis word |
| h2 / h3 | `clamp(1.6rem…)` / `1.25rem` | section titles, serif, hanging section index on wide screens |
| body | `1.125rem` / 1.65 | prose |
| ui | `0.875–0.9375rem` | controls, inspector; inputs ≥ 16 px on mobile to avoid focus-zoom |
| math | `1.06em` relative to its context | inline math slightly larger so it matches serif x-height |

Rules: no all-caps monospace "eyebrow" labels (Book I's idiom); labels are sentence case in the sans. Numerals in the inspector are tabular. Negative zero never reaches the screen. Plain `-` is never used for a mathematical minus: dynamic text uses `−` (U+2212).

## 4. Mathematical display

* Prose math is rendered at **build time** (remark-math → KaTeX HTML+MathML). It works with JavaScript off and ships no JS.
* **Live** formulas use the same KaTeX version and one shared macro table, so a static `\mathbf v` and a live one are indistinguishable.
* KaTeX output contains MathML for assistive technology; the HTML layer is `aria-hidden`. Every live formula sits next to a prose or `aria-label` rendering of the same quantities.
* **Overflow:** display equations scroll horizontally inside their own region — never the page, never shrink-to-fit. A region that actually overflows becomes keyboard-focusable and labelled ("Equation, scrollable"); one that fits is not a tab stop.
* **Numbers inside formulas** come from the chapter's formatter (§6), never from default `Number#toString`.

## 5. Layout and the interaction space

### 5.1 Page anatomy (chapter)

```
┌ top bar ──────────────────────────────────────────────────────────┐
│ ▤ Map   ⌐ Mathematical Foundations   I II III IV V VI VII VIII   ☾ │   ← Part ruler
└────────────────────────────────────────────────────────────────────┘
   I.3                                                  ┌ in this chapter
   What does a vector                                   │ ▸ Section
   actually store?                                       │   Section …
   lede…                                                 └──────────
 ╔ stage ═══════════════════════════════════════════════╗   ← crop-marked plate
 ║  plane (square, equal-scale)    │  values  │ formula  ║
 ║                                 │          │          ║
 ║  controls ───────────────────────────────────────────  ║
 ╚══════════════════════════════════════════════════════╝
   prose column (66 ch)  ·  figures may break out to the stage width
```

* **Interaction first.** The hero question and the stage come before any long text; prose below elaborates what the learner has already touched (plan §5.2).
* **Priority ladder** (plan brief): ① the plane → ② immediate numbers/formula (same viewport as the plane on desktop, directly under it on mobile) → ③ explanation → ④ derivation → ⑤ code → ⑥ exercises. Layout order follows the ladder; nothing lower on the ladder may sit above a higher one.
* The reading column is centred with a **right-hand margin outline** (sticky, ≥ 1180 px) rather than a left sidebar. There is no permanent left navigation: the whole width belongs to the mathematics.

### 5.2 The stage

A stage is a container-query region (`container-type: inline-size`), so it adapts to the space it is *given*, not to the viewport.

| Container width | Arrangement |
| --- | --- |
| ≥ 760 px | plane (left, square) and a values/formula column (right) side by side; controls under the plane |
| < 760 px | plane at full container width (edge to edge on phones), values directly beneath, then controls |

The plane SVG measures its container and uses **1 SVG unit = 1 CSS pixel**, so strokes, labels and hit areas keep their intended size on a 390 px phone. The world→screen transform has a *single* scale factor — axes can never be stretched, so perpendicular vectors always look perpendicular (plan §7.3). The y-flip lives in exactly one function.

### 5.3 Responsive principles

1. Content first, then enhance: the server-rendered canonical state is complete without JS.
2. Container queries for components, media queries only for page chrome (top bar, map dialog).
3. Touch targets ≥ 44 × 44 CSS px for handles, steppers, toggles; the visible handle is smaller than its hit area.
4. Scrolling is never trapped: only the draggable handle sets `touch-action: none`; touching anywhere else on the plane scrolls the page.
5. No horizontal page scroll at 320 px. Wide things (equations, tables, code) scroll inside labelled regions.
6. Phone top bar collapses to mark + current Part name + map/theme buttons; the Part ruler appears from 900 px.

## 6. Interaction philosophy

* **Direct manipulation, with three equivalent paths** (plan §11.1): pointer drag; keyboard (focus the handle, arrows; Shift = coarse step); numeric fields. All three write the same model.
* **A visible, honest snap policy.** The endpoint snaps to a chosen grid (1, ½, 0.1) or moves freely. Exact forms (e.g. √13) are shown whenever the state is exactly representable and are replaced by "numeric only" otherwise, so snapping is a *teaching control*, not a hidden repair.
* **Parameters are declared** (plan §6.5): symbol, unit, domain, default, step, format, and invalid-input policy live in a `ParamSpec`. Out-of-domain text is *rejected with a message*, not silently clamped.
* **Undefined is a state, not an error.** The zero vector's direction is drawn as an explicit "undefined" (no arc, no angle) and read out as such; nothing is fabricated.
* **Reset returns to the canonical state** (3, 2), always.
* **Announcements are commits, not frames.** Pointer drags update visually every frame; the polite live region speaks only on keyboard moves, numeric commits and drag end.
* **Motion is optional garnish.** The canonical state exists independently of any transition; hover/focus transitions and the hero's draw-in are gated on `prefers-reduced-motion: no-preference`. The trace stepper is timer-free.

## 7. Navigation model

Hierarchy: **Book → Part (I–VIII) → Chapter (`I.3`)**. A chapter has exactly one of these statuses, driven by data:

| Status | In the map | Has a page? |
| --- | --- | --- |
| `available` | link, filled marker | yes |
| `planned` | plain text, hollow marker, "planned" label, `aria-disabled` semantics, never a dead link | no |
| *foundation demo* (not a chapter) | listed separately under "Platform", link, "demo" label | yes — `/foundation/` |

* **Book map**: a native `<dialog>` opened from the top bar, listing all eight Parts with chapters and their status, with a live filter. The same structure renders as a full page at `/contents/` (no-JS access, shareable anchors `#part-ii`).
* **Part ruler**: eight links to `/contents/#part-…`; the current Part is marked and carries `aria-current`.
* **In chapter**: margin outline (current section highlighted), previous/next within the curriculum at the end.
* **404** explains that unwritten chapters appear in the map as "planned".
* All internal links go through one `href()` helper that applies the deployment base path.

Search in M2 is *structural* (filter the map). Full-text search is deferred (see audit §C).

## 8. Accessibility baseline

Skip link; landmark structure (`header`, `nav` ×n with labels, `main`, `aside`, `footer`); one `h1` per page; visible 3 px focus ring in the role colour with 2 px offset; native `<dialog>`; `aria-current`; all controls named; live region for committed changes; reduced-motion honoured; colour never the sole carrier; the handle exposes name, value text and operating instructions (plan §11.2); automated axe checks on every page type in both themes, supplemented by manual keyboard walk-throughs.

## 9. Rationale for the major choices

* **Serif body + KaTeX** keeps prose and formulas in one typographic family tree, which is what makes long mathematical reading comfortable; sans is reserved for controls so "this is a thing you can operate" is legible at a glance.
* **Fixed colour roles** let a learner carry a visual vocabulary from I.3 to II.8 to VI.4: vermilion is always *the thing*, cobalt/viridian always *the first/second axis*, plum always *what was computed from it*.
* **Self-hosted fonts and no web requests** make rendering deterministic (screenshots) and deployable to any static path.
* **No left sidebar** gives the stage the page; the map is one gesture away.
* **Preact islands** because the handle must survive continuous dragging (audit R1); every other part of the page is static HTML.

## 10. As built — where the implementation departs from, or sharpens, the plan above

The design was inspected as rendered (full-resolution captures at 1440 / 820 / 390 px, light and dark) and corrected. Differences from §1–§9:

| # | Decision in §1–§9 | As built | Why |
| --- | --- | --- | --- |
| 1 | Chapter header: hero question above the lede | At ≥ 980 px the hero question and the lede share a row; on narrow screens they stack | The first version put the plane **below the fold** on a 1440 × 900 screen — contradicting "interaction first". Now the whole plane is inside the first viewport at 1440 × 900, 820 × 1180 and 390 × 844 (it clips by ~117 px only on a 720 px-tall laptop, with the handle still visible) |
| 2 | Measurements labelled on the legs | **Drafting-style dimension lines** outside the triangle (below the axis numerals, or beside the y-leg on the far side), with end ticks and an interrupting label | Labels on the legs collided with the angle arc, its label and the dashed leg ("y ≐ 2"). The dimension line is on-identity and collision-free; its offset is nudged to avoid the y-axis numeral rows |
| 3 | Part ruler shown from 900 px | From **800 px** | It fits at 820 px (portrait tablet) and was otherwise missing there |
| 4 | Planned chapters: "plain text… `aria-disabled` semantics" | Plain text with a **visible and screen-reader status word** ("○ planned"); no `aria-disabled` | `aria-disabled` is not valid on non-interactive text; the status word carries the meaning |
| 5 | Live formulas as single-line equation chains | **Aligned multi-line derivations** in a row beneath the plane | Single lines overflowed their column; aligned blocks read as a derivation and fit |
| 6 | "Inspector beside the plane" | Inspector beside the plane; formulas in a full-width band under both; a legend (`= exact · ≈ rounded to 6 decimals`) fills the readout column | Balances the two columns and teaches the `=`/`≈` convention where the learner needs it |
| 7 | Handle handled with `touch-action: none` | `touch-action: none` **plus** `touchstart.preventDefault()` on the handle only | `touch-action` is not honoured on a bare SVG `<g>`: a real touch drag was cancelled after one step by the browser's scroll gesture. Found by a CDP touch test, not by inspection |
| 8 | "1 SVG unit = 1 CSS pixel" | Same — now actually true: the border sits on the wrapper, not on the `<svg>` | A 1 px border on the svg shrank its content box and rescaled the drawing by ~0.5% (legs drawn ≈ 1.4 px off). Found by the DOM-geometry test |
| 9 | Stage as a one-column grid | Every grid track is `minmax(0, 1fr)` | An `auto` track grew to the widest equation, pushing the **Reset button off-screen** on a phone in free mode. Regression test fails on the old CSS and passes on the fix |
| 10 | — | Scrolling regions (equations, tables, the map) are tab stops **only when they really overflow** (`tabindex 0`, named region), otherwise `tabindex -1` | Chrome otherwise turns any sub-pixel overflow into an unlabelled tab stop; duplicate region names are numbered ("Equation 2, scrollable") |
| 11 | Top-bar Contents button with a text label | `aria-label="Contents"` always; the text is `aria-hidden` | On phones the text is hidden, which left the button nameless |
| 12 | Touch targets ≥ 44 px | Enforced by tests for stage controls, top bar, pager and footer | Snap segments were 42 px; top-bar buttons 40 px |

Not built, by decision: Fit / Actual-size diagram controls (no diagram yet exceeds its container), a service worker / PWA (out of M2), full-text search (the map filters structure only), reading-progress persistence.

Open design questions for the review: whether the hero stage on the landing page should remain the full foundation stage in a compact form or become a purpose-built hero; whether the map should also be offered as a persistent panel on very wide screens; and how the `caution` colour should appear in the dark theme for large filled areas (it is only used for lines and text today).
