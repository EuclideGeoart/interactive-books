/**
 * HeightStage — domain, image and "which inputs give this output?". A horizontal line y = h is dragged across the graph; the x where it meets the
 * graph are the inputs that give the output h. The domain is drawn on the x-axis and the image on the y-axis. One flat state {rule, a, h} →
 * deriveHeight → every view; the curve is memoised on (rule, a) only.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { toNumber } from '../../math/quantity/rational';
import { deriveHeight, type HeightDerived, type HeightState, type RuleId } from '../../math/functions/rule';
import type { IntervalSet } from '../../math/functions/interval';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { DragPoint } from '../../ui/plane/DragPoint';
import { PlaneLabel, Segment } from '../../ui/plane/primitives';
import { aSpec, functionCurve } from './function-lesson';
import {
  CANONICAL_HEIGHT, HANDLE_X_SPEC, HEIGHT_FORMULA_LABELS, HEIGHT_PRESETS, HEIGHT_WINDOW, H_SPEC, heightDescription, heightFormulas, heightIsCaution, heightLabel,
  heightRows, heightScene, heightSpoken, heightVerdict,
} from './height-lesson';
import { RULE_CHOICES, ruleSpoken } from './format';

const GRID: Grid = { kind: 'lattice', step: 0.5 };

/** A set of numbers drawn ON an axis of the plane: a thick bar per interval, a filled or hollow dot per finite end. */
function AxisSet({ set, axis, role, name }: { set: IntervalSet; axis: 'x' | 'y'; role: 'x' | 'y'; name: string }) {
  const lo = axis === 'x' ? HEIGHT_WINDOW.xMin : HEIGHT_WINDOW.yMin;
  const hi = axis === 'x' ? HEIGHT_WINDOW.xMax : HEIGHT_WINDOW.yMax;
  const at = (v: number) => (axis === 'x' ? { x: v, y: 0 } : { x: 0, y: v });
  return (
    <g data-part={name}>
      {set.map((i, k) => {
        const a = i.lo === null ? lo : Math.max(lo, toNumber(i.lo));
        const b = i.hi === null ? hi : Math.min(hi, toNumber(i.hi));
        const point = i.lo !== null && i.hi !== null && toNumber(i.lo) === toNumber(i.hi);
        return (
          <g key={k}>
            {!point && b > a && <Segment from={at(a)} to={at(b)} role={role} width={8} name={`${name}-bar`} />}
            {i.lo !== null && toNumber(i.lo) >= lo && toNumber(i.lo) <= hi && <PointMarker at={at(toNumber(i.lo))} role={role} filled={i.loClosed} radius={6} name={`${name}-end`} />}
            {i.hi !== null && !point && toNumber(i.hi) >= lo && toNumber(i.hi) <= hi && <PointMarker at={at(toNumber(i.hi))} role={role} filled={i.hiClosed} radius={6} name={`${name}-end`} />}
          </g>
        );
      })}
    </g>
  );
}

function HeightStageInner() {
  const lesson = useLesson<HeightState, HeightDerived>(CANONICAL_HEIGHT, deriveHeight);
  const s = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const curve = useMemo(() => functionCurve(s.rule, s.a), [s.rule, s.a]);
  const scene = useMemo(() => heightScene(d), [d]);
  const rows = useMemo(() => heightRows(d), [d]);
  const formulas = useMemo(() => heightFormulas(d), [d]);
  const announce = (next: HeightState) => setAnnouncement(prev => `${heightSpoken(deriveHeight(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: HeightState) => { lesson.set(next); announce(next); };
  const caution = heightIsCaution(d);
  const h = toNumber(d.hRational);
  const hintText = 'Drag the handle up or down, or use the up and down arrow keys to move the line by half a unit. Hold Shift to move by five steps.';

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="height" data-hydrated={hydrated} data-rule={s.rule} data-a={s.a} data-h={s.h}
      data-count={String(d.count)} data-injective={String(d.injective)} data-onto={String(d.onto)}
    >
      <header class="stage-head">
        <h3 id={headingId}>Which inputs give this output? <Formula tex="f(x)=h" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_HEIGHT); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try an equation</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {HEIGHT_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.rule === s.rule && p.state.a === s.a && p.state.h === s.h} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={HEIGHT_WINDOW} label={`The graph of y equals ${ruleSpoken(s.rule, s.a)} and a horizontal line at height h`} description={heightDescription(d)}>
            <AxisSet set={d.domain} axis="x" role="x" name="domain" />
            <AxisSet set={d.image} axis="y" role="y" name="image" />
            <Segment name="level" from={{ x: HEIGHT_WINDOW.xMin, y: h }} to={{ x: HEIGHT_WINDOW.xMax, y: h }} role={caution ? 'caution' : 'y'} dashed width={2.5} />
            <Curve lines={curve} role="derived" name="curve" />
            {scene.meets.filter(m => m.inside).map((m, i) => (
              <g key={i}>
                <Segment name={`drop-${i + 1}`} from={{ x: m.x, y: 0 }} to={{ x: m.x, y: m.y }} role="x" dashed width={2.5} />
                <PointMarker at={{ x: m.x, y: m.y }} role="x" filled radius={7} name={`meet-${i + 1}`} />
                <PlaneLabel name={`meet-label-${i + 1}`} at={{ x: m.x, y: m.y }} dx={0} dy={m.y >= 0 ? -16 : 18} role="x" math>{`x${i === 0 ? '₁' : '₂'}`}</PlaneLabel>
              </g>
            ))}
            <DragPoint
              value={scene.handle} xSpec={HANDLE_X_SPEC} ySpec={H_SPEC} grid={GRID} label={heightLabel(d)} hintId={hintId} role={caution ? 'caution' : 'primary'}
              onChange={p => { if (p.y + 0 !== s.h) update({ ...s, h: p.y + 0 }); }} onCommit={() => undefined}
            />
          </CoordinatePlane>
          <span id={hintId} hidden>{hintText}</span>
          <p class="legend-line" aria-hidden="true">The bar on the x-axis is the domain, the bar on the y-axis is the image. A hollow end is not included.</p>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The inputs that give this output, the domain and the image" legend="= exact · ≈ rounded to 6 decimals · f is one-to-one when no output has two inputs" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{heightVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${HEIGHT_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <SegmentedControl<RuleId> legend="Rule" name={`${headingId}-rule`} options={RULE_CHOICES} value={s.rule} onChange={rule => update({ ...s, rule })} />
        <ParameterInput spec={aSpec(s.rule, s.a)} value={s.a} grid={{ kind: 'lattice', step: 1 }} onCommit={a => update({ ...s, a })} />
        <ParameterInput spec={H_SPEC} value={s.h} grid={GRID} onCommit={hv => update({ ...s, h: hv })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function HeightStage() {
  return (
    <IdScope name={'height'}>
      <HeightStageInner />
    </IdScope>
  );
}
