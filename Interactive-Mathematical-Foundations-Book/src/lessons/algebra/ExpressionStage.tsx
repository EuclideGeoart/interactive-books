/**
 * ExpressionStage — the distributive law a(bx + c) = abx + ac, checked at one x, next to the slip a(bx + c) = abx + c. The two sides are
 * two lines: they coincide for an identity and are parallel and apart for a contradiction. One flat state {a, b, c, x, form} → deriveDistribute.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveDistribute, type DistributeDerived, type DistributeForm, type DistributeState } from '../../math/algebra/expression';
import { rationalForm } from '../../math/quantity/exactform';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve } from '../../ui/plane/Curve';
import { Dot, PlaneLabel, Segment } from '../../ui/plane/primitives';
import { sampleCurve } from '../../platform/geometry/curve';
import {
  CANONICAL_DISTRIBUTE, DA_SPEC, DB_SPEC, DC_SPEC, DISTRIBUTE_FORMULA_LABELS, DISTRIBUTE_PRESETS, DISTRIBUTE_WINDOW, DX_SPEC, FORM_OPTIONS,
  distributeDescription, distributeFormulas, distributeIsCaution, distributeRows, distributeScene, distributeSpoken, distributeVerdict,
} from './expression-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };

function ExpressionStageInner() {
  const lesson = useLesson<DistributeState, DistributeDerived>(CANONICAL_DISTRIBUTE, deriveDistribute);
  const s = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const scene = useMemo(() => distributeScene(d), [d]);
  // The two lines depend on (a, b, c, form) and the window; the moving x only adds a marker.
  const lines = useMemo(() => ({
    lhs: sampleCurve(x => scene.lhs.slope * x + scene.lhs.intercept, DISTRIBUTE_WINDOW, { samples: 24 }),
    rhs: sampleCurve(x => scene.rhs.slope * x + scene.rhs.intercept, DISTRIBUTE_WINDOW, { samples: 24 }),
  }), [scene.lhs.slope, scene.lhs.intercept, scene.rhs.slope, scene.rhs.intercept]);
  const rows = useMemo(() => distributeRows(d, s), [d, s]);
  const formulas = useMemo(() => distributeFormulas(d), [d]);
  const announce = (next: DistributeState) => setAnnouncement(prev => `${distributeSpoken(deriveDistribute(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: DistributeState) => { lesson.set(next); announce(next); };
  const caution = distributeIsCaution(d);

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="expression" data-hydrated={hydrated}
      data-a={s.a} data-b={s.b} data-c={s.c} data-x={s.x} data-form={s.form} data-kind={d.kind} data-agrees={String(d.agreesHere)}
    >
      <header class="stage-head">
        <h3 id={headingId}>Expression, equation, identity: <Formula tex="a(bx+c)" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_DISTRIBUTE); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a bracket</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {DISTRIBUTE_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={JSON.stringify(p.state) === JSON.stringify(s)} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={DISTRIBUTE_WINDOW} label="The bracket and its expansion drawn as two straight lines" description={distributeDescription(d)}>
            <Curve lines={lines.lhs} role="x" name="line-bracket" width={4} />
            <Curve lines={lines.rhs} role="y" dashed name="line-expansion" width={3} />
            <Segment name="gap" from={{ x: scene.x, y: scene.product }} to={{ x: scene.x, y: scene.expanded }} role="caution" width={3} />
            <Dot at={{ x: scene.x, y: scene.product }} radius={6} role="x" />
            <Dot at={{ x: scene.x, y: scene.expanded }} radius={6} role="y" />
            <PlaneLabel name="label-x" at={{ x: scene.x, y: 0 }} dy={-16} role="primary" math>{`x = ${rationalForm(d.x).text}`}</PlaneLabel>
          </CoordinatePlane>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The bracket, its expansion and the kind of statement" legend="The solid line is the bracket as written, the dashed line is the expansion. The equation is an identity when the lines coincide." />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{distributeVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${DISTRIBUTE_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={DA_SPEC} value={s.a} grid={GRID} onCommit={a => update({ ...s, a })} />
        <ParameterInput spec={DB_SPEC} value={s.b} grid={GRID} onCommit={b => update({ ...s, b })} />
        <ParameterInput spec={DC_SPEC} value={s.c} grid={GRID} onCommit={c => update({ ...s, c })} />
        <ParameterInput spec={DX_SPEC} value={s.x} grid={GRID} onCommit={x => update({ ...s, x })} />
        <SegmentedControl<DistributeForm> legend="Expand by" name={`${headingId}-form`} options={FORM_OPTIONS} value={s.form} onChange={form => update({ ...s, form })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function ExpressionStage() {
  return (
    <IdScope name={'expression'}>
      <ExpressionStageInner />
    </IdScope>
  );
}
