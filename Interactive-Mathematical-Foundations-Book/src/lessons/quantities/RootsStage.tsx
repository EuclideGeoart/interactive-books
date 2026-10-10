/**
 * RootsStage — n-th roots as intersections. The line y = A meets the curve y = xⁿ where xⁿ = A; drag the line (or type A) and change n.
 * Even n: the curve is symmetric, so there are two roots when A > 0 and none when A < 0. Odd n: always exactly one, with A's sign.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveNthRoot, type NthRootDerived, type NthRootState } from '../../math/quantity/nthroot';
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
import { Dot, PlaneLabel, Segment } from '../../ui/plane/primitives';
import { CANONICAL_ROOT, HANDLE_X_SPEC, INDEX_OPTIONS, ROOTS_WINDOW, ROOT_A_SPEC, ROOT_PRESETS, powerCurve, rootsDescription, rootsFormulas, rootsRows, rootsScene, rootsSpoken, rootsVerdict, verdictIsCaution } from './roots-lesson';

const GRID: Grid = { kind: 'lattice', step: 0.5 };

function RootsStageInner() {
  const lesson = useLesson<NthRootState, NthRootDerived>(CANONICAL_ROOT, deriveNthRoot);
  const state = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const curve = useMemo(() => powerCurve(state.n), [state.n]); // depends on n only: dragging A never re-samples the curve
  const scene = useMemo(() => rootsScene(d, state), [d, state]);
  const rows = useMemo(() => rootsRows(d, state), [d, state]);
  const formulas = useMemo(() => rootsFormulas(d), [d]);
  const announce = (next: NthRootState) => setAnnouncement(prev => `${rootsSpoken(deriveNthRoot(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: NthRootState) => { lesson.set(next); announce(next); };
  const caution = verdictIsCaution(d);

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="roots" data-hydrated={hydrated} data-a={state.A} data-n={state.n} data-solutions={d.solutions}>
      <header class="stage-head">
        <h3 id={headingId}>Roots as intersections: <Formula tex="x^{n}=A" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_ROOT); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {ROOT_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.A === state.A && p.state.n === state.n} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={ROOTS_WINDOW} label="The graph of y equals x to the n, and the level line y equals A" description={rootsDescription(d)}>
            <Curve name="power-curve" lines={curve} role="primary" width={3} />
            <Segment name="level-line" from={scene.levelLine.from} to={scene.levelLine.to} role="x" dashed width={2} />
            <Dot at={{ x: 0, y: 0 }} radius={3} />
            {scene.markers.map((m, i) => <Segment key={`d${i}`} name={`drop-${i}`} from={m.at} to={m.foot} role="derived" dashed width={1.5} />)}
            {scene.markers.map((m, i) => <PointMarker key={`m${i}`} name={`root-${i}`} at={m.at} role="derived" radius={6.5} />)}
            {scene.markers.map((m, i) => <PlaneLabel key={`l${i}`} name={`root-label-${i}`} at={m.foot} dy={m.at.y >= 0 ? 36 : -36} role="derived" math>{m.label}</PlaneLabel>)}
            {d.solutions === 0 && <PlaneLabel name="none-label" at={{ x: 0, y: state.A }} dy={state.A < 0 ? -22 : 22} role="caution" math>⚠ the line misses the curve</PlaneLabel>}
            <DragPoint value={scene.handle} xSpec={HANDLE_X_SPEC} ySpec={ROOT_A_SPEC} grid={GRID} label={`Level A = ${state.A}. ${rootsSpoken(d)}`} hintId={hintId} role="x" onChange={p => update({ ...state, A: p.y })} onCommit={() => undefined} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag the handle up or down, or use the up and down arrow keys to move the level by one half. Hold Shift to move by two and a half.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Value, root and solutions" legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{rootsVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${i === 0 ? 'The root' : 'The equation'}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={ROOT_A_SPEC} value={state.A} grid={GRID} onCommit={A => update({ ...state, A })} />
        <SegmentedControl<string> legend="Root index n" name={`${headingId}-n`} options={INDEX_OPTIONS} value={String(state.n)} onChange={n => update({ ...state, n: Number(n) })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function RootsStage() {
  return (
    <IdScope name={'roots'}>
      <RootsStageInner />
    </IdScope>
  );
}
