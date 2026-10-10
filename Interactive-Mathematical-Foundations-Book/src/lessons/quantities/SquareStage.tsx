/**
 * SquareStage — the hero of I.1. A number, its square, and its square root, in both directions.
 *   side mode: drag the side q (or type it): the square has area q², and the root of that area is |q|, not q.
 *   area mode: choose an area A: its side is √A (exact when it can be), and two numbers square to it.
 * One flat state (mode, side, area, unit) → deriveSquare → every view. No view keeps a copy of any derived value.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveSquare, type SquareDerived, type SquareMode, type SquareState, type SquareUnit } from '../../math/quantity/square';
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
import { Dot, DimensionLine, PlaneLabel, Polygon } from '../../ui/plane/primitives';
import { PointMarker } from '../../ui/plane/Curve';
import { AREA_MAX, AREA_MIN, AREA_SPEC, CANONICAL_SQUARE, HANDLE_Y_SPEC, SIDE_SPEC, SQUARE_WINDOW, applyPreset, presetsFor, squareCentreLabel, squareDescription, squareFormulas, squareRows, squareScene, squareSpoken, sideDimensionLabel, squareVerdict, verdictIsCaution } from './square-lesson';

const SIDE_GRID: Grid = { kind: 'lattice', step: 0.5 };
const AREA_GRID: Grid = { kind: 'lattice', step: 1 };
const MODES = [{ id: 'side', label: 'the side' }, { id: 'area', label: 'the area' }] as const;
const UNITS = [{ id: 'none', label: 'no unit' }, { id: 'm', label: 'metres' }] as const;

function SquareStageInner() {
  const lesson = useLesson<SquareState, SquareDerived>(CANONICAL_SQUARE, deriveSquare);
  const state = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  const sliderId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const scene = useMemo(() => squareScene(d, state), [d, state]);
  const rows = useMemo(() => squareRows(d, state), [d, state]);
  const formulas = useMemo(() => squareFormulas(d, state), [d, state]);
  const announce = (next: SquareState) => setAnnouncement(prev => `${squareSpoken(deriveSquare(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: SquareState) => { lesson.set(next); announce(next); };
  const caution = verdictIsCaution(d);
  const metres = state.unit === 'm';

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="square" data-hydrated={hydrated} data-mode={state.mode} data-unit={state.unit} data-side={state.side} data-area={state.area}>
      <header class="stage-head">
        <h2 id={headingId}>A square and its side: <Formula tex="q\mapsto q^{2}\mapsto\sqrt{q^{2}}" /></h2>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_SQUARE); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div class="stage-options">
        <SegmentedControl<SquareMode> legend="I choose" name={`${headingId}-mode`} options={MODES} value={state.mode} onChange={mode => update({ ...state, mode })} />
        <SegmentedControl<SquareUnit> legend="Unit" name={`${headingId}-unit`} options={UNITS} value={state.unit} onChange={unit => update({ ...state, unit })} />
      </div>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try {state.mode === 'side' ? 'a side' : 'an area'}</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {presetsFor(state.mode).map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={(state.mode === 'side' ? state.side : state.area) === (p.state.mode === 'side' ? p.state.side : p.state.area)} data-preset={p.id} onClick={() => update(applyPreset(state, p))}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={SQUARE_WINDOW} label="A square standing on the x-axis, and its side" description={squareDescription(d, state)}>
            {scene.corners && <Polygon name="square" corners={scene.corners} role="primary" />}
            {scene.corners && scene.centre && <PlaneLabel name="square-label" at={{ x: scene.centre.x, y: scene.side ?? 0 }} dy={-15} role="primary" math>{squareCentreLabel(d)}</PlaneLabel>}
            <Dot at={{ x: 0, y: 0 }} radius={3} />
            {scene.sideArrow && <DimensionLine name="side-dimension" from={scene.sideArrow.from} to={scene.sideArrow.to} side="below" distance={40} role="x" label={sideDimensionLabel(d, state)} labelMinPx={70} />}
            {scene.negativeRootMarker && <PointMarker name="negative-root" at={scene.negativeRootMarker} role="y" filled={false} radius={6.5} />}
            {scene.negativeRootMarker && <PlaneLabel name="negative-root-label" at={scene.negativeRootMarker} dy={62} role="y" math>{`−√A`}</PlaneLabel>}
            {scene.rootMarker && <PointMarker name="root" at={scene.rootMarker} role="derived" radius={6.5} />}
            {scene.rootMarker && <PlaneLabel name="root-label" at={scene.rootMarker} dy={62} role="derived" math>{d.mode === 'side' ? '√(q²)' : '√A'}</PlaneLabel>}
            {d.mode === 'area' && d.solutions === 0 && <PlaneLabel name="none-label" at={{ x: 0, y: 3.5 }} role="caution" math>{`⚠ no real square has area ${state.area < 0 ? '−' : ''}${Math.abs(state.area)}`}</PlaneLabel>}
            {scene.handle && <DragPoint value={scene.handle} xSpec={SIDE_SPEC} ySpec={HANDLE_Y_SPEC} grid={SIDE_GRID} label={`Side q = ${state.side}${metres ? ' metres' : ''}. ${squareSpoken(d)}`} hintId={hintId} onChange={p => update({ ...state, side: p.x })} onCommit={() => undefined} />}
          </CoordinatePlane>
          <span id={hintId} hidden>Drag with a pointer, or use the left and right arrow keys to move the side by one half. Hold Shift to move by two and a half.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label={d.mode === 'side' ? 'Side, area and root' : 'Area, root and solutions'} legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{squareVerdict(d, state)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${i === 0 ? (d.mode === 'side' ? 'Squaring' : 'The root') : (d.mode === 'side' ? 'Rooting' : 'Solutions')}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        {state.mode === 'side'
          ? <ParameterInput spec={SIDE_SPEC} value={state.side} grid={SIDE_GRID} onCommit={side => update({ ...state, side })} />
          : <ParameterInput spec={AREA_SPEC} value={state.area} grid={AREA_GRID} onCommit={area => update({ ...state, area })} />}
        {state.mode === 'area' && (
          <div class="slider-field">
            <label for={sliderId}>Area slider</label>
            <input id={sliderId} type="range" min={AREA_MIN} max={AREA_MAX} step={1} value={Math.round(state.area)} aria-valuetext={`area ${state.area}`} data-slider="area" onInput={e => update({ ...state, area: Number((e.currentTarget as HTMLInputElement).value) })} />
          </div>
        )}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function SquareStage() {
  return (
    <IdScope name={'square'}>
      <SquareStageInner />
    </IdScope>
  );
}
