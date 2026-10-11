import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  deriveMatrixLesson, MATRIX_CANONICAL, MATRIX_TITLES, matrixFields, matrixPresets, matrixSpecs,
  type MatrixChapter, type MatrixHandle, type MatrixState,
} from './matrix-lesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Arrow, Dot, PlaneLabel, Polygon, Segment } from '../../ui/plane/primitives';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import './linear-algebra.css';

function Inner({ chapter }: { chapter: MatrixChapter }) {
  const derive = useMemo(() => (state: MatrixState) => deriveMatrixLesson(chapter, state), [chapter]);
  const lesson = useLesson(MATRIX_CANONICAL[chapter], derive), state = lesson.state, derived = lesson.derived;
  const specs = useMemo(() => matrixSpecs(chapter), [chapter]);
  const fields = matrixFields(chapter, state), scene = derived.scene;
  const [hydrated, setHydrated] = useState(false), [announcement, setAnnouncement] = useState('');
  const [lastHandle, setLastHandle] = useState('');
  const [dragWindow, setDragWindow] = useState<WorldWindow | null>(null);
  const id = useScopedId(), hint = useScopedId();
  useEffect(() => setHydrated(true), []);

  const announce = (next: MatrixState) => {
    const value = derive(next);
    setAnnouncement(old => `${value.rows.map(row => `${row.name}: ${row.description.spoken}`).join('. ')}. ${value.verdict}${old.endsWith('​') ? '' : '​'}`);
  };
  const commit = (next: MatrixState) => { lesson.set(next); announce(next); };
  const move = (handle: MatrixHandle, at: Point): MatrixState => ({ ...state, [handle.xField]: at.x + 0, [handle.yField]: at.y + 0 });
  const grid = { kind: 'lattice', step: 0.5 } as const;

  return <section class="stage stage-full matrix-stage" aria-labelledby={id} data-stage={`matrix-${chapter}`} data-hydrated={hydrated}
    data-mode={state.mode} data-status={derived.status} data-a11={state.a11} data-a12={state.a12} data-a21={state.a21} data-a22={state.a22}
    data-b11={state.b11} data-b12={state.b12} data-b21={state.b21} data-b22={state.b22}
    data-x1={state.x1} data-x2={state.x2} data-x3={state.x3} data-r1={state.r1} data-r2={state.r2}
    data-t1={state.t1} data-t2={state.t2} data-c1={state.c1} data-c2={state.c2}
    data-result-x={derived.result?.x} data-result-y={derived.result?.y} data-radius={scene?.window.xMax}>
    <header class="stage-head">
      <h2 id={id}>{MATRIX_TITLES[chapter]}</h2>
      <button type="button" class="button quiet" data-action="reset" disabled={lesson.isCanonical} onClick={() => { lesson.reset(); setLastHandle(''); announce(MATRIX_CANONICAL[chapter]); }}>Reset</button>
    </header>
    <div class="presets" role="group" aria-label="Explore a configuration">
      {matrixPresets(chapter).map(preset => <button key={preset.id} type="button" data-preset={preset.id}
        aria-pressed={Object.entries(preset.state).every(([key, value]) => state[key as keyof MatrixState] === value)}
        onClick={() => commit(preset.state)}>{preset.label}</button>)}
    </div>
    <div class="stage-grid">
      <div class="stage-plane">
        {scene ? <CoordinatePlane window={dragWindow ?? scene.window} label={MATRIX_TITLES[chapter]} description={derived.verdict}>
          {scene.polygons.map(polygon => <Polygon key={polygon.name} {...polygon} />)}
          {scene.lines.map(line => <Segment key={line.name} {...line} />)}
          {scene.arrows.map(arrow => <Arrow key={arrow.name} {...arrow} width={arrow.role === 'primary' ? 4.5 : 3} />)}
          <Dot at={{ x: 0, y: 0 }} />
          {scene.points.map(point => <g key={point.name} data-part={point.name}><Dot at={point.at} radius={point.radius} role={point.role} /></g>)}
          {scene.labels.map(label => <PlaneLabel key={label.name} {...label}>{label.label}</PlaneLabel>)}
          {scene.arrows.filter(arrow => arrow.from.x !== arrow.to.x || arrow.from.y !== arrow.to.y).map((arrow, index) =>
            <PlaneLabel key={`label-${arrow.name}`} name={`label-${arrow.name}`} at={arrow.name.startsWith('weighted-') ? { x: (arrow.from.x + arrow.to.x) / 2, y: (arrow.from.y + arrow.to.y) / 2 } : arrow.to}
              dx={arrow.to.x < 0 ? -20 : 20} dy={index % 2 ? 20 : -20} role={arrow.role} math>{arrow.label}</PlaneLabel>)}
          {scene.handles.map(handle => <g key={handle.id} class={handle.id !== lastHandle && scene.handles.some(other => other.id === lastHandle && other.at.x === handle.at.x && other.at.y === handle.at.y) ? 'la-behind' : undefined}>
            <DragPoint role={handle.role} value={handle.at} xSpec={specs[handle.xField]} ySpec={specs[handle.yField]} grid={grid}
              label={`${handle.label} (${state[handle.xField]}, ${state[handle.yField]})`} hintId={hint}
              onChange={(at, source) => { if (source === 'pointer') setDragWindow(current => current ?? scene.window); lesson.set(move(handle, at)); setLastHandle(handle.id); }}
              onCommit={(at, source) => { if (source === 'pointer') setDragWindow(null); announce(move(handle, at)); }} />
          </g>)}
        </CoordinatePlane> : derived.board ? <div class={`matrix-board${derived.board.invalid ? ' is-invalid' : ''}`} data-board-invalid={derived.board.invalid}>
          <div class="matrix-board-flow">
            {derived.board.items.map((item, index) => <div key={`${item.label}-${index}`} class={`matrix-card role-${item.role}`} data-matrix-item={item.label}>
              <strong>{item.label}</strong><span>{item.shape}</span><code>{item.value}</code>
            </div>)}
          </div>
          <p>{derived.board.relation}</p>
        </div> : null}
        <span id={hint} hidden>Drag this point, or use arrow keys to move by 0.5. Hold Shift for a larger step. The numeric fields provide the same controls.</span>
      </div>
      <div class="stage-readout"><Inspector rows={derived.rows} label="Mathematical quantities" legend="Exact expressions use =. Rounded computations use ≈. Every view uses this same state." /></div>
    </div>
    <p class="verdict" data-verdict>{derived.verdict}</p>
    <div class="formula-panel" role="group" aria-label="Live formulas">
      {derived.formulas.map((tex, index) => <FormulaScroll key={index} tex={tex} label={`Calculation ${index + 1}, scrollable`} />)}
    </div>
    <div class="stage-controls">
      {fields.map(field => <ParameterInput key={field} spec={specs[field]} value={state[field]} grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [field]: value })} />)}
    </div>
    <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
  </section>;
}

export default function MatrixStage({ chapter }: { chapter: MatrixChapter }) {
  return <IdScope name={`matrix-${chapter}`}><Inner chapter={chapter} /></IdScope>;
}
