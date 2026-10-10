/**
 * BaseStage — exponentials and logarithms with a chosen base, and the logarithm identities, CHECKED.
 *
 * Two independent lessons share one island and one Reset:
 *   growth    {preset, custom, x}  → deriveGrowth      → b^x and log_b x as mirror images across y = x, doubling time, bits and nats
 *   identity  {a, b, k}            → deriveIdentities  → four identities, each with both sides, their difference and the tolerance
 * The curves are sampled from the base alone (never from x).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Grid } from '../../platform/params';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { DragPoint } from '../../ui/plane/DragPoint';
import { PlaneLabel, Segment } from '../../ui/plane/primitives';
import {
  AXIS_Y, BASE_OPTIONS, BASE_PARAM, CANONICAL_GROWTH, CANONICAL_IDENTITY, GROWTH_FORMULA_LABELS, GROWTH_PRESETS, GROWTH_WINDOW, GROWTH_X_PARAM, IDENTITY_A, IDENTITY_B, IDENTITY_K,
  deriveGrowth, deriveIdentities, growthDescription, growthDiagonal, growthFormulas, growthLabels, growthMarkers, growthRows, growthSpoken, growthVerdict, identityCards, identitySpoken, sampleBase,
  type GrowthDerived, type GrowthState, type IdentityDerived, type IdentityState,
} from './base-lesson';

const X_GRID: Grid = { kind: 'lattice', step: 0.5 };
// 0.5, not 0.25: the platform's lattice snapping writes steps with ceil(-log10(step)) decimals, which would round 0.25 multiples to one place
const B_GRID: Grid = { kind: 'lattice', step: 0.5 };
const I_GRID: Grid = { kind: 'lattice', step: 1 };
type PresetId = GrowthState['preset'];
const sameGrowth = (a: GrowthState, b: GrowthState): boolean => a.preset === b.preset && a.custom === b.custom && a.x === b.x;

function BaseStageInner() {
  const growth = useLesson<GrowthState, GrowthDerived>(CANONICAL_GROWTH, deriveGrowth);
  const identity = useLesson<IdentityState, IdentityDerived>(CANONICAL_IDENTITY, deriveIdentities);
  const g = growth.derived;
  const gs = growth.state;
  const is = identity.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  const presetsId = useScopedId();
  const identityHeadingId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const baseValue = g.base;
  const curves = useMemo(() => sampleBase(baseValue, GROWTH_WINDOW), [baseValue]);
  const diagonal = useMemo(() => growthDiagonal(), []);
  const labels = useMemo(() => growthLabels(baseValue, g.kind), [baseValue, g.kind]);
  const markers = useMemo(() => growthMarkers(g), [g]);
  const rows = useMemo(() => growthRows(g), [g]);
  const formulas = useMemo(() => growthFormulas(g), [g]);
  const cards = useMemo(() => identityCards(identity.derived), [identity.derived]);
  const verdict = growthVerdict(g);
  const say = (text: string) => setAnnouncement(prev => `${text}${prev.endsWith('​') ? '' : '​'}`);
  const commitGrowth = (next: GrowthState) => { growth.set(next); say(growthSpoken(deriveGrowth(next))); };
  const commitIdentity = (next: IdentityState) => { identity.set(next); say(identitySpoken(deriveIdentities(next))); };
  const reset = () => { growth.reset(); identity.reset(); say('Reset to base 2 with x equal to 2, and a = 6, b = 4, k = 3.'); };
  const xInPlane = gs.x >= GROWTH_X_PARAM.domain.min && gs.x <= GROWTH_X_PARAM.domain.max;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="base" data-hydrated={hydrated} data-base={g.base} data-kind={g.kind} data-x={gs.x}>
      <header class="stage-head">
        <h3 id={headingId}>Change the base, check the identities</h3>
        <button type="button" class="button quiet" onClick={reset} disabled={growth.isCanonical && identity.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetsId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetsId}>
          {GROWTH_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={sameGrowth(gs, p.state)} data-preset={p.id} onClick={() => commitGrowth(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={GROWTH_WINDOW} label="The graphs of b to the x and of the logarithm to the base b" description={growthDescription(g)}>
            <Segment name="diagonal" from={diagonal[0]} to={diagonal[1]} role="ink" dashed width={1.6} />
            <PlaneLabel name="label-diagonal" at={{ x: 7.4, y: 7.4 }} dx={-6} dy={16} role="ink" anchor="end" math>y = x</PlaneLabel>
            {curves.logarithm.length > 0 && <Curve name="curve-log" lines={curves.logarithm} role="derived" dashed width={3.2} />}
            <Curve name="curve-power" lines={curves.exponential} role="primary" width={3.2} />
            {labels.power && <PlaneLabel name="label-power" at={labels.power.at} dx={labels.power.dx} dy={labels.power.dy} role="primary" anchor={labels.power.anchor}>{labels.power.text}</PlaneLabel>}
            {labels.log && <PlaneLabel name="label-log" at={labels.log.at} dx={labels.log.dx} dy={labels.log.dy} role="derived" anchor={labels.log.anchor}>{labels.log.text}</PlaneLabel>}
            {markers.power && <PointMarker name="marker-power" at={markers.power} role="primary" />}
            {markers.log && <PointMarker name="marker-log" at={markers.log} role="derived" />}
            {xInPlane && <DragPoint role="ink" value={{ x: gs.x, y: 0 }} xSpec={GROWTH_X_PARAM} ySpec={AXIS_Y} grid={X_GRID} label={`Input x at ${gs.x}. Slides along the x-axis only.`} hintId={hintId} onChange={n => growth.set({ ...gs, x: n.x })} onCommit={n => commitGrowth({ ...gs, x: n.x })} />}
          </CoordinatePlane>
          <span id={hintId} hidden>Drag along the x-axis, or press the left and right arrow keys to move one step. Hold Shift to move five steps.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Power, logarithm and doubling time" legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={verdict.caution ? 'false' : 'true'}>{verdict.text}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <FormulaScroll key={i} label={`${GROWTH_FORMULA_LABELS[i]}, scrollable`} tex={tex} />)}
      </div>
      <div class="stage-controls">
        <SegmentedControl<PresetId> legend="Base" name={`${headingId}-base`} options={BASE_OPTIONS} value={gs.preset} onChange={preset => commitGrowth({ ...gs, preset })} />
        {gs.preset === 'custom' && <ParameterInput spec={BASE_PARAM} value={gs.custom} grid={B_GRID} onCommit={n => commitGrowth({ ...gs, custom: n })} />}
        <ParameterInput spec={GROWTH_X_PARAM} value={gs.x} grid={X_GRID} onCommit={n => commitGrowth({ ...gs, x: n })} />
      </div>

      <section class="identity-block" aria-labelledby={identityHeadingId} data-identities>
        <h4 id={identityHeadingId}>Four identities, checked on a computer</h4>
        <p class="stage-note">Each identity is exact in mathematics. The computer rounds every step, so each card shows both sides, their difference and the tolerance it is judged against.</p>
        <div class="stage-controls identity-controls">
          <ParameterInput spec={IDENTITY_A} value={is.a} grid={I_GRID} onCommit={n => commitIdentity({ ...is, a: n })} />
          <ParameterInput spec={IDENTITY_B} value={is.b} grid={I_GRID} onCommit={n => commitIdentity({ ...is, b: n })} />
          <ParameterInput spec={IDENTITY_K} value={is.k} grid={I_GRID} onCommit={n => commitIdentity({ ...is, k: n })} />
        </div>
        <ul class="identity-list">
          {cards.map(c => (
            <li key={c.id} class="identity-card" data-identity={c.id} data-status={c.status} data-within={String(c.within)}>
              <div class="identity-statement"><FormulaScroll label={`Identity ${cards.indexOf(c) + 1}, scrollable`} tex={c.statementTex} /></div>
              {c.status === 'checked' ? (
                <dl>
                  {c.lines.map(l => <div key={l.label}><dt>{l.label}</dt><dd>{l.text}</dd></div>)}
                </dl>
              ) : null}
              <p class="identity-outcome" data-outcome>{c.status === 'checked' ? (c.within ? '✓ ' : '✗ ') : '⚠ '}{c.outcome}</p>
            </li>
          ))}
        </ul>
      </section>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function BaseStage() {
  return (
    <IdScope name="base">
      <BaseStageInner />
    </IdScope>
  );
}
