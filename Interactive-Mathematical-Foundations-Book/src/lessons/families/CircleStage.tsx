/**
 * CircleStage — sine and cosine as the coordinates of a point on the unit circle, with the two graphs they trace.
 *
 *   one lesson state {mode, twelfths, radians}  →  deriveCircle  →  plane · graphs · inspector · formulas · verdict
 *
 * Three equivalent input paths: drag (or arrow-key) the point, the preset angles, and the numeric box. Exact mode moves in steps of π/12 and
 * shows exact values; free mode accepts any angle with three decimals and shows rounded doubles.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { freeAngle, switchMode, type CircleDerived, type CircleState } from '../../math/families/circle';
import { pixelsToWorld, type Point } from '../../platform/geometry/viewport';
import type { Grid } from '../../platform/params';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve } from '../../ui/plane/Curve';
import { usePlane } from '../../ui/plane/PlaneContext';
import { Arc, Arrow, Dot, PlaneLabel, Segment } from '../../ui/plane/primitives';
import { AngleHandle } from './AngleHandle';
import { TrigGraph } from './TrigGraph';
import {
  CANONICAL_CIRCLE, CIRCLE_FORMULA_LABELS, CIRCLE_PRESETS, CIRCLE_WINDOW, MODE_OPTIONS, RADIANS_PARAM, TWELFTHS_PARAM,
  circleDescription, circleFormulas, circleRows, circleScene, circleSpoken, circleVerdict, deriveCircle, exactAngle, graphDescription, graphMarkers, trigGraphs, type CircleScene,
} from './circle-lesson';

const K_GRID: Grid = { kind: 'lattice', step: 1 };
const R_GRID: Grid = { kind: 'lattice', step: 0.01 };
type ModeId = (typeof MODE_OPTIONS)[number]['id'];

/** Everything drawn on the unit-circle plane (a child of CoordinatePlane so it can convert pixel offsets to world units). */
function CircleDrawing({ d, scene, hintId, onChange, onCommit }: { d: CircleDerived; scene: CircleScene; hintId: string; onChange(s: CircleState): void; onCommit(s: CircleState): void }) {
  const { vp } = usePlane();
  const origin: Point = { x: 0, y: 0 };
  const p = scene.point;
  const mid = scene.arc ? (scene.arc.from + scene.arc.to) / 2 : 0;
  const rLabel = pixelsToWorld(vp, 52);
  const showTheta = scene.arc !== null && Math.abs(d.radians) * 38 >= 26;
  const longCos = Math.abs(p.x) > 0.3;
  const longSin = Math.abs(p.y) > 0.22;
  return (
    <>
      <Curve name="circle" lines={scene.ring} role="ink" width={1.8} />
      {scene.ticks.map((t, i) => <Dot key={i} at={t} radius={d.mode === 'exact' && i === ((d.state.twelfths % 24) + 24) % 24 ? 0 : 2.2} />)}
      <Dot at={origin} radius={3} />
      {scene.arc && <Arc name="angle-arc" centre={origin} radiusPx={38} from={scene.arc.from} to={scene.arc.to} role="derived" />}
      <Segment name="cos-leg" from={origin} to={scene.cosFoot} role="x" width={4.5} />
      <Segment name="sin-leg" from={scene.cosFoot} to={p} role="y" width={4.5} />
      <Arrow name="radius" from={origin} to={p} role="primary" width={3} />
      {longCos && <PlaneLabel name="cos-label" at={{ x: p.x / 2, y: 0 }} dy={p.y >= 0 ? 18 : -18} role="x" math>cos θ</PlaneLabel>}
      {longSin && <PlaneLabel name="sin-label" at={{ x: p.x, y: p.y / 2 }} dx={p.x >= 0 ? 8 : -8} role="y" anchor={p.x >= 0 ? 'start' : 'end'} math>sin θ</PlaneLabel>}
      {showTheta && <PlaneLabel name="theta-label" at={{ x: rLabel * Math.cos(mid), y: rLabel * Math.sin(mid) }} role="derived" math>θ</PlaneLabel>}
      <AngleHandle at={p} state={d.state} snap={d.mode} label={`Angle handle at ${circleSpoken(d)}`} hintId={hintId} onChange={onChange} onCommit={onCommit} />
    </>
  );
}

function CircleStageInner() {
  const lesson = useLesson<CircleState, CircleDerived>(CANONICAL_CIRCLE, deriveCircle);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  const presetsId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const scene = useMemo(() => circleScene(d), [d]);
  const rows = useMemo(() => circleRows(d), [d]);
  const formulas = useMemo(() => circleFormulas(d), [d]);
  const graphs = useMemo(() => trigGraphs(), []);
  const markers = useMemo(() => graphMarkers(d), [d]);
  const announce = (next: CircleState) => setAnnouncement(prev => `${circleSpoken(deriveCircle(next))}${prev.endsWith('​') ? '' : '​'}`);
  const commit = (next: CircleState) => { lesson.set(next); announce(next); };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="circle" data-hydrated={hydrated} data-mode={s.mode} data-theta={d.radians} data-cos={d.point.x} data-sin={d.point.y}>
      <header class="stage-head">
        <h3 id={headingId}>Walk around the unit circle</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_CIRCLE)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetsId}>Jump to an exact angle</p>
        <div class="presets" role="group" aria-labelledby={presetsId}>
          {CIRCLE_PRESETS.map(p => <button key={p.k} type="button" aria-label={p.aria} aria-pressed={s.mode === 'exact' && s.twelfths === p.k} data-preset={p.k} onClick={() => commit(exactAngle(p.k))}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={CIRCLE_WINDOW} label="The unit circle with the point (cos θ, sin θ)" description={circleDescription(d)}>
            <CircleDrawing d={d} scene={scene} hintId={hintId} onChange={lesson.set} onCommit={announce} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag the point around the circle, or press the arrow keys: right and up turn counter-clockwise, left and down clockwise. In exact mode each press turns by π/12; hold Shift for a quarter turn.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Angle, cosine and sine at the point" legend="= exact · ≈ rounded to 6 decimals" />
        </div>
      </div>
      <TrigGraph sin={graphs.sin} cos={graphs.cos} markers={markers} label="The graphs of sine and cosine with the current angle marked" description={graphDescription(d)} />
      <p class="stage-note">The graphs use different scales on the two axes (θ across, height up), unlike the circle above, which has the same scale in both directions.</p>
      <p class="verdict" data-verdict data-agree="true">{circleVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <FormulaScroll key={i} label={`${CIRCLE_FORMULA_LABELS[i]}, scrollable`} tex={tex} />)}
      </div>
      <div class="stage-controls">
        <SegmentedControl<ModeId> legend="Angles" name={`${headingId}-mode`} options={MODE_OPTIONS} value={s.mode} onChange={mode => commit(switchMode(s, mode))} />
        {s.mode === 'exact'
          ? <ParameterInput spec={TWELFTHS_PARAM} value={s.twelfths} grid={K_GRID} onCommit={n => commit(exactAngle(n))} />
          : <ParameterInput spec={RADIANS_PARAM} value={s.radians} grid={R_GRID} onCommit={n => commit(freeAngle(n))} />}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function CircleStage() {
  return (
    <IdScope name="circle">
      <CircleStageInner />
    </IdScope>
  );
}
