/**
 * PythagorasStage — drag the vector and watch the three squares: x² + y² = ‖v‖² as areas.
 * One flat state (x, y) → deriveVector2 → the squares, the area rows and the equation. No copy of any derived value.
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
import { Arrow, Dot, PlaneLabel, Polygon, Segment } from '../../ui/plane/primitives';
import { CANONICAL_VECTOR, spokenSummary } from '../foundation/vector-lesson';
import { PYTHAGORAS_WINDOW, PYTHAGORAS_X, PYTHAGORAS_Y, areaEquation, areaRows, pythagorasDescription, pythagorasScene } from './pythagoras-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };
const ROLE = { x: 'x', y: 'y', hypotenuse: 'primary' } as const;
const SQUARE_LABEL = { x: 'x²', y: 'y²', hypotenuse: '‖v‖²' } as const;

function PythagorasStageInner() {
  const lesson = useLesson<Vector2, Vector2Derived>(CANONICAL_VECTOR, deriveVector2);
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const scene = useMemo(() => pythagorasScene(d), [d]);
  const rows = useMemo(() => areaRows(d), [d]);
  const announce = (v: Vector2) => setAnnouncement(prev => `${spokenSummary(deriveVector2(v))}${prev.endsWith('​') ? '' : '​'}`);
  const commitAxis = (axis: 'x' | 'y') => (value: number) => { const next = { ...lesson.state, [axis]: value } as Vector2; lesson.set(next); announce(next); };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="pythagoras" data-hydrated={hydrated} data-x={d.x} data-y={d.y}>
      <header class="stage-head">
        <h3 id={headingId}>Squares on the sides: <Formula tex="x^{2}+y^{2}=\norm{\mathbf{v}}^{2}" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_VECTOR); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={PYTHAGORAS_WINDOW} label="Right triangle with a square on each side" description={pythagorasDescription(d)}>
            {scene.squares.map(s => <Polygon key={s.id} name={`square-${s.id}`} corners={s.corners} role={ROLE[s.id]} />)}
            {scene.squares.map(s => <PlaneLabel key={`l${s.id}`} name={`label-${s.id}`} at={s.centre} role={ROLE[s.id]} math>{SQUARE_LABEL[s.id]}</PlaneLabel>)}
            <Dot at={scene.origin} radius={3} />
            <Segment name="x-leg" from={scene.origin} to={scene.foot} role="x" />
            <Segment name="y-leg" from={scene.foot} to={scene.tip} role="y" />
            {!d.isZero && <Arrow name="vector" from={scene.origin} to={scene.tip} role="primary" />}
            <DragPoint value={scene.tip} xSpec={PYTHAGORAS_X} ySpec={PYTHAGORAS_Y} grid={GRID} label={spokenSummary(d)} hintId={hintId} onChange={n => lesson.set({ x: n.x, y: n.y })} onCommit={n => announce(n)} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag with a pointer, or use the arrow keys to move one grid step. Hold Shift to move five steps.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Areas of the three squares" legend="= exact · ≈ rounded to 6 decimals" />
        </div>
      </div>
      <div class="formula-panel" role="group" aria-label="Live formula">
        <MathScroll label="Sum of the leg areas, scrollable"><Formula tex={areaEquation(d)} display /></MathScroll>
      </div>
      <div class="stage-controls">
        <ParameterInput spec={PYTHAGORAS_X} value={d.x} grid={GRID} onCommit={commitAxis('x')} />
        <ParameterInput spec={PYTHAGORAS_Y} value={d.y} grid={GRID} onCommit={commitAxis('y')} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function PythagorasStage() {
  return (
    <IdScope name={'pythagoras'}>
      <PythagorasStageInner />
    </IdScope>
  );
}
