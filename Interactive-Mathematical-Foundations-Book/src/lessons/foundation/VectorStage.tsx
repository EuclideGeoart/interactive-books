/**
 * VectorStage — the foundation demo's interactive stage (chapter-owned composition; plan §6.1 layer D).
 *
 *   one lesson state (x, y)  →  deriveVector2  →  plane · inspector · formulas · spoken text · work frames
 *
 * Nothing in this file computes a magnitude, an angle or a square. It maps derived quantities to views.
 * This is NOT the REF-1 chapter: it exists to exercise the platform (see the page label).
 */
import { useEffect, useId, useMemo, useState } from 'preact/hooks';
import { deriveVector2, type Vector2, type Vector2Derived } from '../../math/vector2/vector2';
import { niceTickStep, pixelsToWorld, worldToScreen, type Point } from '../../platform/geometry/viewport';
import { formatGiven } from '../../platform/numeric/format';
import type { Grid } from '../../platform/params';
import { cursorAt, reset as resetCursor, type TraceCursor } from '../../platform/trace';
import { Formula } from '../../ui/Formula';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TraceStepper } from '../../ui/TraceStepper';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { usePlane } from '../../ui/plane/PlaneContext';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Arc, Arrow, DimensionLine, Dot, PlaneLabel, RightAngle, Segment } from '../../ui/plane/primitives';
import { CANONICAL_VECTOR, WINDOW, X_PARAM, Y_PARAM, formulaChain, inspectorRows, sceneOf, spokenSummary, workFrames, ZERO_VECTOR_REASON, type Scene } from './vector-lesson';

export type StageVariant = 'full' | 'hero';

const SNAP_OPTIONS = [
  { id: '1', label: '1' },
  { id: '0.5', label: '½' },
  { id: '0.1', label: '0.1' },
  { id: 'free', label: 'Free' },
] as const;
type SnapId = (typeof SNAP_OPTIONS)[number]['id'];
const gridOf = (id: SnapId): Grid => (id === 'free' ? { kind: 'free' } : { kind: 'lattice', step: Number(id) });

const HERO_ROWS = new Set(['vector', 'magnitude', 'direction']);
const ORIGIN: Point = { x: 0, y: 0 };

/** Plain-language text alternative for the whole figure, built from the same derived values. */
function planeDescription(d: Vector2Derived): string {
  const base = 'Coordinate plane from −7 to 7 on both axes; +x points right and +y points up.';
  return d.isZero
    ? `${base} The vector v is the zero vector at the origin (0, 0): it has length 0 and no direction.`
    : `${base} The vector v runs from the origin (0, 0) to the point (${formatGiven(d.x).text}, ${formatGiven(d.y).text}). Its horizontal component is ${formatGiven(d.x).text} and its vertical component is ${formatGiven(d.y).text}.`;
}

/** Everything drawn on the plane. Rendered inside <CoordinatePlane> so it can read the viewport. */
function VectorDrawing({ d, scene, grid, onChange, onCommit, hintId }: {
  d: Vector2Derived;
  scene: Scene;
  grid: Grid;
  onChange(next: Vector2): void;
  onCommit(next: Vector2): void;
  hintId: string;
}) {
  const { vp } = usePlane();
  const tipScreen = worldToScreen(vp, scene.handle);
  const originScreen = worldToScreen(vp, ORIGIN);

  // Label placement is presentation only: unit direction of the arrow ON SCREEN, measured through the viewport.
  const length = Math.hypot(tipScreen.x - originScreen.x, tipScreen.y - originScreen.y);
  const along = length > 0 ? { x: (tipScreen.x - originScreen.x) / length, y: (tipScreen.y - originScreen.y) / length } : { x: 1, y: -1 };

  // Keep the x dimension line clear of the y-axis tick numerals (they sit at multiples of the label step).
  const labelStepPx = niceTickStep(vp.scale, 34) * vp.scale;
  const clearOfNumerals = (start: number): number => {
    for (let d = start; d < start + 40; d += 2) {
      let clear = true;
      for (let k = 1; k * labelStepPx < d + 24; k++) if (Math.abs(d - k * labelStepPx) < 12) clear = false;
      if (clear) return d;
    }
    return start;
  };
  const arcRadius = 38;
  const arcLabelRadius = arcRadius + 15;
  const arcLabelAt = scene.arc
    ? (() => {
        const mid = (scene.arc.from + scene.arc.to) / 2;
        const r = pixelsToWorld(vp, arcLabelRadius);
        return { x: r * Math.cos(mid), y: r * Math.sin(mid) };
      })()
    : null;
  // The θ label needs room inside the wedge: hide it for narrow angles rather than let it touch the arrow.
  const showArcLabel = scene.arc !== null && Math.abs(scene.arc.to - scene.arc.from) * arcLabelRadius >= 28 && length > arcLabelRadius + 22;

  return (
    <>
      <Dot at={ORIGIN} radius={3} />
      <Segment name="x-leg" from={scene.xLeg.from} to={scene.xLeg.to} role="x" />
      <Segment name="y-leg" from={scene.yLeg.from} to={scene.yLeg.to} role="y" dashed />
      <RightAngle corner={scene.corner} towardA={ORIGIN} towardB={scene.handle} />
      {scene.arc && <Arc name="angle-arc" centre={ORIGIN} radiusPx={arcRadius} from={scene.arc.from} to={scene.arc.to} role="derived" />}
      {scene.arrow && <Arrow name="vector" from={scene.arrow.from} to={scene.arrow.to} role="primary" />}

      {/* Measurements live on dimension lines OUTSIDE the triangle: below the axis numerals (or above, if the vector points down), and beside the y-leg on the far side from the origin. */}
      <DimensionLine name="x-dimension" from={scene.xLeg.from} to={scene.xLeg.to} side={d.y >= 0 ? 'below' : 'above'} distance={d.y >= 0 ? clearOfNumerals(38) : 24} role="x" labelMinPx={52} label={<><tspan class="sym">x</tspan>{` = ${formatGiven(d.x).text}`}</>} />
      <DimensionLine name="y-dimension" from={scene.yLeg.from} to={scene.yLeg.to} side={d.x >= 0 ? 'right' : 'left'} distance={34} role="y" labelMinPx={30} label={<><tspan class="sym">y</tspan>{` = ${formatGiven(d.y).text}`}</>} />
      {showArcLabel && arcLabelAt && <PlaneLabel name="angle-label" at={arcLabelAt} role="derived" math><tspan class="sym">θ</tspan></PlaneLabel>}
      {scene.arrow && <PlaneLabel name="vector-label" at={scene.handle} dx={along.x * 30} dy={along.y * 30} role="primary" math>v</PlaneLabel>}
      {d.isZero && (
        <PlaneLabel name="zero-note" at={ORIGIN} dy={-36} role="caution" anchor="middle">⚠ zero vector: no direction</PlaneLabel>
      )}

      <DragPoint
        value={scene.handle}
        xSpec={X_PARAM}
        ySpec={Y_PARAM}
        grid={grid}
        label={spokenSummary(d)}
        hintId={hintId}
        onChange={next => onChange(next)}
        onCommit={next => onCommit(next)}
      />
    </>
  );
}

export default function VectorStage({ variant = 'full' }: { variant?: StageVariant }) {
  const lesson = useLesson<Vector2, Vector2Derived>(CANONICAL_VECTOR, deriveVector2);
  const d = lesson.derived;
  const [snap, setSnap] = useState<SnapId>('1');
  const [cursor, setCursor] = useState<TraceCursor>(() => cursorAt(4));
  const [announcement, setAnnouncement] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const headingId = useId();
  const hintId = useId();
  useEffect(() => setHydrated(true), []);

  const grid = gridOf(snap);
  const scene = useMemo(() => sceneOf(d), [d]);
  const rows = useMemo(() => inspectorRows(d).filter(row => variant === 'full' || HERO_ROWS.has(row.id)), [d, variant]);
  const equations = useMemo(() => formulaChain(d), [d]);
  const frames = useMemo(() => workFrames(d), [d]);

  // A polite live region speaks COMMITS (key press, numeric entry, drag end), never every pointer frame.
  const announce = (v: Vector2) => setAnnouncement(prev => `${spokenSummary(deriveVector2(v))}${prev.endsWith('​') ? '' : '​'}`);
  const setVector = (v: Vector2) => lesson.set({ x: v.x, y: v.y });
  const commitAxis = (axis: 'x' | 'y') => (value: number) => {
    const next = { ...lesson.state, [axis]: value } as Vector2;
    setVector(next);
    announce(next);
  };
  const doReset = () => {
    lesson.reset();
    setSnap('1');
    setCursor(resetCursor(cursor));
    announce(CANONICAL_VECTOR);
  };

  return (
    <section class={`stage stage-${variant}`} aria-labelledby={headingId} data-stage="vector" data-hydrated={hydrated} data-x={d.x} data-y={d.y}>
      <header class="stage-head">
        <h2 id={headingId}>{variant === 'hero' ? 'Try it: pull the tip of the arrow' : <>Drag the tip of <Formula tex="\mathbf{v}" /></>}</h2>
        <button type="button" class="button quiet" onClick={doReset} disabled={lesson.isCanonical && snap === '1'} data-action="reset">Reset</button>
      </header>

      <div class="stage-grid">
      <div class="stage-plane">
        <CoordinatePlane window={WINDOW} label="Coordinate plane with the vector v" description={planeDescription(d)}>
          <VectorDrawing d={d} scene={scene} grid={grid} hintId={hintId} onChange={setVector} onCommit={announce} />
        </CoordinatePlane>
        <span id={hintId} hidden>Drag with a pointer, or use the arrow keys to move one grid step. Hold Shift to move five steps.</span>
      </div>

      <div class="stage-readout">
        <Inspector rows={rows} label="Live values of the vector" legend="= exact · ≈ rounded to 6 decimals" />
      </div>
      </div>

      {variant === 'full' && (
        <div class="formula-panel" role="group" aria-label="Live formulas">
          {equations.map((tex, i) => <MathScroll key={i} label={`${['Column vector', 'Magnitude derivation', 'Direction derivation'][i] ?? 'Equation'}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
        </div>
      )}

      {variant === 'full' && (
        <div class="stage-controls">
          <ParameterInput spec={X_PARAM} value={d.x} grid={grid} onCommit={commitAxis('x')} />
          <ParameterInput spec={Y_PARAM} value={d.y} grid={grid} onCommit={commitAxis('y')} />
          <SegmentedControl<SnapId> legend="Snap to" name={`${headingId}-snap`} options={SNAP_OPTIONS} value={snap} onChange={setSnap} />
        </div>
      )}

      {variant === 'full' && (
        <div class="stage-work">
          <h3>Show the work: computing <Formula tex="\norm{\mathbf{v}}" /></h3>
          <TraceStepper
            label="Computing the magnitude"
            frames={frames}
            cursor={cursor}
            onCursor={setCursor}
            renderFrame={frame => (<><MathScroll label="Computation step, scrollable"><Formula tex={frame.state.tex} display /></MathScroll><p class="trace-caption">{frame.state.caption}</p></>)}
            describeFrame={frame => frame.state.caption}
          />
        </div>
      )}

      {d.isZero && variant === 'full' && <p class="sr-only">{ZERO_VECTOR_REASON}</p>}
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

