/**
 * CompareStage — six function families on one plane: y = a·g(x − h) for g ∈ {x, x², eˣ, ln x, sin x, cos x}.
 *
 *   one lesson state (six toggles, a, h, x)  →  deriveCompare  →  curves · markers · inspector · formulas · facts · verdict
 *
 * Nothing here computes a function value. The curves are sampled from (visible set, a, h) ONLY, so dragging the input x never
 * re-samples them; the markers and the inspector are the only things that move with x.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { CANONICAL_COMPARE, FAMILY_IDS, deriveCompare, type CompareDerived, type CompareState, type FamilyId } from '../../math/families/families';
import { toNumber } from '../../math/families/rational';
import type { Grid } from '../../platform/params';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { DragPoint } from '../../ui/plane/DragPoint';
import { PlaneLabel, Segment } from '../../ui/plane/primitives';
import {
  AXIS_Y_PARAM, A_PARAM, COMPARE_PRESETS, COMPARE_WINDOW, CX_PARAM, FAMILY_LABEL, FAMILY_ROLE, H_PARAM,
  compareCurves, compareDescription, compareFacts, compareFormulas, compareMarkers, compareRows, compareSpoken, compareVerdict, curveKey, lnGap, toggled, withFamilies, zeroMarkers,
} from './compare-lesson';

// 0.5, not 0.25: the platform's lattice snapping writes steps with ceil(-log10(step)) decimals, which would round 0.25 multiples to one place
const GRID: Grid = { kind: 'lattice', step: 0.5 };
const FAMILY_NAMES: Record<FamilyId, string> = { linear: 'the line x', square: 'the parabola x squared', exp: 'the exponential e to the x', ln: 'the natural logarithm', sin: 'sine', cos: 'cosine' };

function CompareStageInner({ variant }: { variant: 'hero' | 'full' }) {
  const lesson = useLesson<CompareState, CompareDerived>(CANONICAL_COMPARE, deriveCompare);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  const toggleLabelId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  // Sampled from the visible set, a and h only: the key excludes x.
  const key = curveKey(s);
  const curves = useMemo(() => compareCurves(s), [key]);
  const markers = useMemo(() => compareMarkers(d), [d]);
  const rows = useMemo(() => compareRows(d), [d]);
  const formulas = useMemo(() => compareFormulas(d), [d]);
  const facts = useMemo(() => compareFacts(d), [d]);
  const gap = useMemo(() => lnGap(d), [d]);
  const zeros = useMemo(() => (variant === 'full' ? zeroMarkers(d) : []), [d, variant]);
  const verdict = compareVerdict(d);
  const x = toNumber(d.x);

  const commit = (next: CompareState) => {
    lesson.set(next);
    setAnnouncement(prev => `${compareSpoken(deriveCompare(next))}${prev.endsWith('​') ? '' : '​'}`);
  };
  const Heading = variant === 'hero' ? 'h2' : 'h3';
  const sameSet = (on: readonly FamilyId[]) => FAMILY_IDS.every(id => s[id] === on.includes(id));

  return (
    <section class={`stage stage-${variant}`} aria-labelledby={headingId} data-stage="compare" data-hydrated={hydrated} data-x={x} data-a={toNumber(d.a)} data-h={toNumber(d.h)} data-visible={d.visible.join(',')}>
      <header class="stage-head">
        <Heading id={headingId}>{variant === 'hero' ? 'Try it: six families on one plane' : 'Slide, stretch and compare'}</Heading>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_COMPARE)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div class="family-controls">
        <div>
          <p class="presets-label" id={toggleLabelId}>Draw these functions</p>
          <div class="presets family-toggles" role="group" aria-labelledby={toggleLabelId}>
            {FAMILY_IDS.map(id => (
              <button key={id} type="button" aria-pressed={s[id]} aria-label={FAMILY_NAMES[id]} data-family={id} class={`family-toggle role-${FAMILY_ROLE[id]}`} onClick={() => commit(toggled(s, id))}>
                <span class="swatch" aria-hidden="true" />{FAMILY_LABEL[id]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p class="presets-label" id={presetLabelId}>Or start from</p>
          <div class="presets" role="group" aria-labelledby={presetLabelId}>
            {COMPARE_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={sameSet(p.on)} data-preset={p.id} onClick={() => commit(withFamilies(s, p.on))}>{p.label}</button>)}
          </div>
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={COMPARE_WINDOW} label="Graphs of the chosen function families" description={compareDescription(d)}>
            {gap && <Segment name="ln-gap" from={gap.from} to={gap.to} role="caution" width={6} />}
            {gap && gap.to.x - gap.from.x >= 2.2 && <PlaneLabel name="ln-gap-label" at={{ x: gap.from.x, y: 0 }} dx={6} dy={-14} role="caution" anchor="start">⚠ ln undefined</PlaneLabel>}
            <Segment name="x-line" from={{ x, y: COMPARE_WINDOW.yMin }} to={{ x, y: COMPARE_WINDOW.yMax }} role="ink" dashed width={1.5} />
            {curves.map(c => <Curve key={c.id} name={`curve-${c.id}`} lines={c.lines} role={c.role} width={c.id === 'linear' ? 2.6 : 3.2} />)}
            {zeros.map((z, i) => <PointMarker key={`z${i}`} name={`zero-${z.id}`} at={{ x: z.x, y: 0 }} role={z.role} filled={false} radius={4} />)}
            {curves.map(c => c.labelAt && <PlaneLabel key={c.id} name={`curve-label-${c.id}`} at={c.labelAt.at} dx={c.labelAt.dx} dy={c.labelAt.dy} role={c.role} anchor={c.labelAt.anchor} math>{c.label}</PlaneLabel>)}
            {markers.map(m => <PointMarker key={m.id} name={`marker-${m.id}`} at={m.at} role={m.role} />)}
            <DragPoint role="ink" value={{ x, y: 0 }} xSpec={CX_PARAM} ySpec={AXIS_Y_PARAM} grid={GRID} label={`Input x at ${toNumber(d.x)}. Slides along the x-axis only.`} hintId={hintId} onChange={n => lesson.set({ ...s, x: n.x })} onCommit={n => commit({ ...s, x: n.x })} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag along the x-axis, or press the left and right arrow keys to move one step. Hold Shift to move five steps.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Values of the drawn functions at the input" legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={verdict.caution ? 'false' : 'true'}>{verdict.text}</p>
      {variant === 'full' && formulas.length > 0 && (
        <div class="formula-panel family-formulas" role="group" aria-label="Live formulas">
          {formulas.map(f => <FormulaScroll key={f.id} label={`${FAMILY_LABEL[f.id]} computed at the input, scrollable`} tex={f.tex} />)}
        </div>
      )}
      {variant === 'full' && facts.length > 0 && (
        <div class="facts" role="group" aria-label="Facts about the drawn functions">
          {facts.map(card => (
            <section class={`fact-card role-${FAMILY_ROLE[card.id]}`} key={card.id} data-fact={card.id}>
              <h4>{card.name}</h4>
              <dl>
                {card.rows.map(r => <div key={r.label}><dt>{r.label}</dt><dd>{r.text}</dd></div>)}
              </dl>
            </section>
          ))}
        </div>
      )}
      <div class="stage-controls">
        <ParameterInput spec={A_PARAM} value={toNumber(d.a)} grid={GRID} onCommit={n => commit({ ...s, a: n })} />
        <ParameterInput spec={H_PARAM} value={toNumber(d.h)} grid={GRID} onCommit={n => commit({ ...s, h: n })} />
        <ParameterInput spec={CX_PARAM} value={x} grid={GRID} onCommit={n => commit({ ...s, x: n })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function CompareStage({ variant = 'full' }: { variant?: 'hero' | 'full' }) {
  return (
    <IdScope name={`compare-${variant}`}>
      <CompareStageInner variant={variant} />
    </IdScope>
  );
}
