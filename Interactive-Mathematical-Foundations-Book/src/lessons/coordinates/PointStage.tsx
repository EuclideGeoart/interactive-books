/**
 * PointStage — the hero of I.2. Drag P (or type its coordinates) and watch its quadrant, its distance to each axis and its distance
 * to the origin. One flat state {x, y} → derivePoint → every view. No view keeps a copy of any derived value.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { derivePoint, type PointDerived, type PointState } from '../../math/coordinates/point';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Dot, PlaneLabel, Polygon, RightAngle, Segment } from '../../ui/plane/primitives';
import { CANONICAL_POINT, POINT_PRESETS, POINT_WINDOW, X_SPEC, Y_SPEC, pointDescription, pointFormulas, pointLabel, pointRows, pointScene, pointSpoken, pointVerdict, verdictIsCaution } from './point-lesson';
import { rationalForm } from '../../math/quantity/exactform';

const SNAPS = [{ id: '1', label: '1' }, { id: '0.5', label: '½' }, { id: '0.25', label: '¼' }] as const;
type SnapId = (typeof SNAPS)[number]['id'];

function PointStageInner() {
  const lesson = useLesson<PointState, PointDerived>(CANONICAL_POINT, derivePoint);
  const s = lesson.state;
  const d = lesson.derived;
  const [snap, setSnap] = useState<SnapId>('1');
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const grid: Grid = { kind: 'lattice', step: Number(snap) };
  const scene = useMemo(() => pointScene(d), [d]);
  const rows = useMemo(() => pointRows(d, s), [d, s]);
  const formulas = useMemo(() => pointFormulas(d), [d]);
  const announce = (next: PointState) => setAnnouncement(prev => `${pointSpoken(derivePoint(next))}${prev.endsWith('​') ? '' : '​'}`);
  /** `+ 0` turns a −0 produced by snapping into 0. */
  const clean = (p: { x: number; y: number }): PointState => ({ x: p.x + 0, y: p.y + 0 });
  const update = (next: PointState) => { lesson.set(next); announce(next); };
  const caution = verdictIsCaution(d);
  const q = d.position.kind === 'quadrant' ? d.position.index : 0;
  const legX = scene.toYAxis;
  const legY = scene.toXAxis;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="point" data-hydrated={hydrated} data-x={s.x} data-y={s.y} data-quadrant={d.position.kind === 'quadrant' ? q : d.position.kind}>
      <header class="stage-head">
        <h2 id={headingId}>A point and its coordinates: <Formula tex="P=(x,\,y)" /></h2>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); setSnap('1'); announce(CANONICAL_POINT); }} disabled={lesson.isCanonical && snap === '1'} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a point</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {POINT_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.x === s.x && p.state.y === s.y} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={POINT_WINDOW} label="A point P in the coordinate plane, with its distances to the axes" description={pointDescription(d)}>
            {scene.quadrant && <Polygon name="quadrant" corners={scene.quadrant} role="derived" />}
            {scene.labels.map(l => <PlaneLabel key={l.index} name={`quadrant-label-${l.index}`} at={l.at} role="ink" math>{['I', 'II', 'III', 'IV'][l.index - 1]}</PlaneLabel>)}
            <Dot at={{ x: 0, y: 0 }} radius={3} />
            {scene.radius && <Segment name="radius" from={scene.radius.from} to={scene.radius.to} role="derived" width={2.5} />}
            {legY && <Segment name="to-x-axis" from={legY.from} to={legY.to} role="y" dashed />}
            {legX && <Segment name="to-y-axis" from={legX.from} to={legX.to} role="x" dashed />}
            {legY && legX && <RightAngle corner={legY.to} towardA={legY.from} towardB={{ x: 0, y: 0 }} />}
            {legY && legX && <RightAngle corner={legX.to} towardA={legX.from} towardB={{ x: 0, y: 0 }} />}
            {legY && <PlaneLabel name="label-y" at={{ x: scene.p.x, y: scene.p.y / 2 }} dx={scene.p.x >= 0 ? 12 : -12} anchor={scene.p.x >= 0 ? 'start' : 'end'} role="y" math>{`|y| = ${rationalForm(d.distToXAxis).text}`}</PlaneLabel>}
            {legX && <PlaneLabel name="label-x" at={{ x: scene.p.x / 2, y: scene.p.y }} dy={scene.p.y >= 0 ? -14 : 16} role="x" math>{`|x| = ${rationalForm(d.distToYAxis).text}`}</PlaneLabel>}
            <PlaneLabel name="label-p" at={scene.p} dx={scene.p.x >= 0 ? 15 : -15} dy={scene.p.y >= 0 ? -15 : 17} role="ink" math>P</PlaneLabel>
            <DragPoint value={scene.p} xSpec={X_SPEC} ySpec={Y_SPEC} grid={grid} label={pointLabel(d)} hintId={hintId} onChange={p => update(clean(p))} onCommit={() => undefined} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag with a pointer, or use the arrow keys to move P by one grid step. Hold Shift to move by five steps.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Coordinates, quadrant and distances" legend="= exact · ≈ rounded to 6 decimals · the distance to the x-axis is |y|, to the y-axis |x|" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{pointVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${['Position', 'Distances'][i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={X_SPEC} value={s.x} grid={grid} onCommit={x => update({ ...s, x })} />
        <ParameterInput spec={Y_SPEC} value={s.y} grid={grid} onCommit={y => update({ ...s, y })} />
        <SegmentedControl<SnapId> legend="Snap to" name={`${headingId}-snap`} options={SNAPS} value={snap} onChange={setSnap} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function PointStage() {
  return (
    <IdScope name={'point'}>
      <PointStageInner />
    </IdScope>
  );
}
