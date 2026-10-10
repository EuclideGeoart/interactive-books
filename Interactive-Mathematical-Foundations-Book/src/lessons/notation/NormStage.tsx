/**
 * NormStage — the three norms of a vector in the plane, exact. The unit balls (diamond, circle, square) show what each norm calls "length 1";
 * the ball of the chosen norm through x shows what "the same size as x" means for that norm.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { worldToScreen } from '../../platform/geometry/viewport';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { usePlane } from '../../ui/plane/PlaneContext';
import { Arrow, Dot, PlaneLabel, type Role } from '../../ui/plane/primitives';
import {
  CANONICAL_NORM, NORM_OPTIONS, NORM_PRESETS, NORM_WINDOW, X1_SPEC, X2_SPEC, deriveNormLesson, normCode, normFormulas, normPlaneLabel, normPresetMatches, normRows, normScene,
  normSpoken, normVerdict, type NormLessonDerived, type NormLessonState, type Pt,
} from './norm-lesson';
import { GRID_FREE } from './shared';

const DRAG_GRID: Grid = { kind: 'lattice', step: 0.5 };

/** A closed outline from world points (the ball boundaries are outlines, not filled areas, so they can overlap without hiding each other). */
function Outline({ points, role, name, width = 2.5, dashed = false }: { points: readonly Pt[]; role: Role; name: string; width?: number; dashed?: boolean }) {
  const { vp } = usePlane();
  const d = points.map((p, m) => { const s = worldToScreen(vp, p); return `${m === 0 ? 'M' : 'L'}${s.x.toFixed(2)} ${s.y.toFixed(2)}`; }).join(' ');
  return <path class={`ball role-${role}`} data-part={name} d={`${d} Z`} fill="none" stroke-width={width} stroke-dasharray={dashed ? '6 5' : undefined} aria-hidden="true" />;
}

function NormStageInner() {
  const lesson = useLesson<NormLessonState, NormLessonDerived>(CANONICAL_NORM, deriveNormLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const scene = useMemo(() => normScene(d), [d]);
  const rows = useMemo(() => normRows(d), [d]);
  const formulas = useMemo(() => normFormulas(d), [d]);
  const verdict = normVerdict(d);
  const commit = (next: NormLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${normSpoken(deriveNormLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="norm" data-hydrated={hydrated} data-x1={s.x1} data-x2={s.x2} data-norm={s.norm} data-zero={String(d.n.zero)}>
      <header class="stage-head">
        <h3 id={headingId}>Three ways to measure a vector: <Formula tex="\lVert\mathbf{x}\rVert_1,\ \lVert\mathbf{x}\rVert_2,\ \lVert\mathbf{x}\rVert_\infty" /></h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_NORM)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {NORM_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={normPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls norm-controls">
        <SegmentedControl legend="Draw the ball of the" name={`${headingId}-norm`} options={NORM_OPTIONS} value={s.norm} onChange={norm => commit({ ...s, norm })} />
        <ParameterInput spec={X1_SPEC} value={s.x1} grid={GRID_FREE} onCommit={x1 => commit({ ...s, x1 })} />
        <ParameterInput spec={X2_SPEC} value={s.x2} grid={GRID_FREE} onCommit={x2 => commit({ ...s, x2 })} />
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={NORM_WINDOW} label="A vector and the balls of three norms" description={normPlaneLabel(d)}>
            {scene.unit.map(u => <Outline key={u.norm} points={u.points} role={u.norm === '1' ? 'x' : u.norm === '2' ? 'primary' : 'y'} name={`unit-${u.norm}`} width={1.5} dashed />)}
            {scene.ball && <Outline points={scene.ball.points} role={s.norm === '1' ? 'x' : s.norm === '2' ? 'primary' : 'y'} name={`ball-${s.norm}`} width={3} />}
            {!d.n.zero && <Arrow from={{ x: 0, y: 0 }} to={scene.point} role="ink" name="vector" />}
            <Dot at={{ x: 0, y: 0 }} radius={3} />
            <PlaneLabel name="x-label" at={scene.point} dy={d.n.zero ? -16 : scene.point.y >= 0 ? -14 : 22} dx={scene.point.x >= 0 ? 14 : -14} role="ink" math>x</PlaneLabel>
            <DragPoint value={scene.point} xSpec={X1_SPEC} ySpec={X2_SPEC} grid={DRAG_GRID} label={`The vector x = (${s.x1}, ${s.x2}). ${normSpoken(d)}`} hintId={hintId} onChange={p => commit({ ...s, x1: p.x, x2: p.y })} onCommit={() => undefined} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag with a pointer, or use the arrow keys to move the vector by one half. Hold Shift to move by two and a half.</span>
          <p class="diagram-note">Dashed: the unit balls, diamond (ℓ₁), circle (ℓ₂) and square (ℓ∞). Solid: the ball of the chosen norm through x. The three outlines differ in shape, not only in colour.</p>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The three norms of x" legend="= exact · ≈ rounded to 6 decimals" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{normCode(d)}</code></pre>
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!verdict.caution)}>{verdict.text}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function NormStage() {
  return (
    <IdScope name="norm">
      <NormStageInner />
    </IdScope>
  );
}
