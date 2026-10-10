/**
 * DirectionStage — atan(y/x) versus atan2(y, x), made geometric: the dashed line through the origin carries v and −v
 * (the same ratio), the naive arrow shows where atan(y/x) points, and the verdict names the half-plane responsible.
 */
import { IdScope, useScopedId } from '../../ui/ids';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveVector2, type Vector2, type Vector2Derived } from '../../math/vector2/vector2';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Arc, Arrow, Dot, PlaneLabel, Segment } from '../../ui/plane/primitives';
import { WINDOW, X_PARAM, Y_PARAM, spokenSummary } from '../foundation/vector-lesson';
import { DIRECTION_PRESETS, compareDirections, directionDescription, directionFormulas, directionRows, directionScene, directionSpoken, verdictText } from './direction-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };
const DOMAIN = { ...X_PARAM, domain: { min: -6, max: 6 } };
const DOMAIN_Y = { ...Y_PARAM, domain: { min: -6, max: 6 } };
const START: Vector2 = Object.freeze({ x: -3, y: 2 });

function DirectionStageInner() {
  const lesson = useLesson<Vector2, Vector2Derived>(START, deriveVector2);
  const d = lesson.derived;
  const c = useMemo(() => compareDirections(lesson.state), [lesson.state]);
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const scene = useMemo(() => directionScene(c, d), [c, d]);
  const rows = useMemo(() => directionRows(c), [c]);
  const formulas = useMemo(() => directionFormulas(c), [c]);
  const announce = (v: Vector2) => setAnnouncement(prev => `${directionSpoken(compareDirections(v))}${prev.endsWith('​') ? '' : '​'}`);
  const commit = (v: Vector2) => { lesson.set({ x: v.x, y: v.y }); announce(v); };
  const agree = c.location.kind === 'origin' ? null : c.halfTurns === 0;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="direction" data-hydrated={hydrated} data-x={c.x} data-y={c.y} data-location={c.location.kind}>
      <header class="stage-head">
        <h3 id={headingId}>Where does <Formula tex="\arctan(y/x)" /> go wrong?</h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(START); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Jump to</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {DIRECTION_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={c.x === p.x && c.y === p.y} data-preset={p.id} onClick={() => commit({ x: p.x, y: p.y })}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={WINDOW} label="Vector with the naive and true direction" description={directionDescription(c)}>
            <Dot at={{ x: 0, y: 0 }} radius={3} />
            {scene.sameRatioLine && <Segment name="same-ratio" from={scene.sameRatioLine.from} to={scene.sameRatioLine.to} role="ink" dashed width={1.5} />}
            {scene.arc && <Arc name="angle-arc" centre={{ x: 0, y: 0 }} radiusPx={34} from={scene.arc.from} to={scene.arc.to} role="derived" />}
            {scene.naiveArrow && <Arrow name="naive" from={scene.naiveArrow.from} to={scene.naiveArrow.to} role="caution" width={3} />}
            {scene.mirror && <Dot at={scene.mirror} radius={4} role="caution" />}
            {scene.mirror && <PlaneLabel name="mirror-label" at={scene.mirror} dx={22} dy={-12} role="caution" math>−v</PlaneLabel>}
            {scene.arrow && <Arrow name="vector" from={scene.arrow.from} to={scene.arrow.to} role="primary" />}
            {d.isZero && <PlaneLabel name="zero-note" at={{ x: 0, y: 0 }} dy={-36} role="caution">⚠ zero vector: no direction</PlaneLabel>}
            <DragPoint value={scene.handle} xSpec={DOMAIN} ySpec={DOMAIN_Y} grid={GRID} label={spokenSummary(d)} hintId={hintId} onChange={n => lesson.set({ x: n.x, y: n.y })} onCommit={n => announce(n)} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag with a pointer, or use the arrow keys to move one grid step. Hold Shift to move five steps.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Naive and true direction" legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={agree === null ? 'none' : String(agree)}>{verdictText(c)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${['Naive angle', 'True direction'][i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={DOMAIN} value={d.x} grid={GRID} onCommit={n => commit({ ...lesson.state, x: n })} />
        <ParameterInput spec={DOMAIN_Y} value={d.y} grid={GRID} onCommit={n => commit({ ...lesson.state, y: n })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function DirectionStage() {
  return (
    <IdScope name={'direction'}>
      <DirectionStageInner />
    </IdScope>
  );
}
