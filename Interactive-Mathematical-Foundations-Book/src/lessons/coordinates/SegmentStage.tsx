/**
 * SegmentStage — two points A and B. The displacement B − A has a direction (the reverse A − B flips both signs); the distance, the
 * midpoint and the taxicab distance are computed from them. One flat state {ax, ay, bx, by} → deriveSegment → every view.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveSegment, type SegmentDerived, type SegmentState } from '../../math/coordinates/segment';
import { rationalForm, rootForm } from '../../math/quantity/exactform';
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
import { worldToScreen } from '../../platform/geometry/viewport';
import { usePlane } from '../../ui/plane/PlaneContext';
import { Arrow, Dot, PlaneLabel, RightAngle, Segment } from '../../ui/plane/primitives';
import { AX_SPEC, AY_SPEC, BX_SPEC, BY_SPEC, CANONICAL_SEGMENT, SEGMENT_PRESETS, SEGMENT_WINDOW, pointLabel, segmentDescription, segmentFormulas, segmentRows, segmentScene, segmentSpoken, segmentVerdict, verdictIsCaution } from './segment-lesson';

const SNAPS = [{ id: '1', label: '1' }, { id: '0.5', label: '½' }] as const;
type SnapId = (typeof SNAPS)[number]['id'];

interface LabelAt { readonly dx: number; readonly dy: number; readonly anchor: 'start' | 'middle' | 'end' }
const anchorFor = (x: number): LabelAt['anchor'] => (x > 0.35 ? 'start' : x < -0.35 ? 'end' : 'middle');
const off = (nx: number, ny: number, gap: number, baseline: number): LabelAt => ({ dx: Math.abs(nx) > 0.35 ? nx * gap * 0.6 : 0, dy: ny * gap + baseline, anchor: anchorFor(nx) });

/**
 * Where the labels M and |AB| go, in pixels from the midpoint. The right triangle's legs and its two labels (dx, dy) lie on one side of the
 * segment, so |AB| goes on the OTHER side and M on the triangle's side, which is empty. Axis-parallel segments have no triangle:
 * their labels are stacked beside the line, away from the dx or dy label.
 */
function labelPlacement(scene: ReturnType<typeof segmentScene>, kind: SegmentDerived['kind']): { m: LabelAt; distance: LabelAt } {
  const ux = scene.b.x - scene.a.x;
  const uy = -(scene.b.y - scene.a.y); // screen y points down
  if (kind === 'horizontal') return { m: { dx: 9, dy: -9, anchor: 'start' }, distance: { dx: 0, dy: -30, anchor: 'middle' } };
  if (kind === 'vertical') return { m: { dx: -9, dy: -9, anchor: 'end' }, distance: { dx: -14, dy: 10, anchor: 'end' } };
  const len = Math.hypot(ux, uy) || 1;
  let nx = -uy / len;
  let ny = ux / len;
  const inside = (scene.corner.x - scene.midpoint.x) * nx + -(scene.corner.y - scene.midpoint.y) * ny; // screen dot product
  if (inside > 0) { nx = -nx; ny = -ny; }
  return { distance: off(nx, ny, 24, 4), m: off(-nx, -ny, 16, 4) };
}

/** The labels whose room depends on the scale: a label is dropped when the thing it names is too short on screen to carry it. */
function SegmentLabels({ d, scene, dist }: { d: SegmentDerived; scene: ReturnType<typeof segmentScene>; dist: string }) {
  const { vp } = usePlane();
  const place = labelPlacement(scene, d.kind);
  const above = scene.b.y >= scene.a.y; // B above the horizontal leg: the triangle is above it, so its label goes below
  const legX = worldToScreen(vp, { x: scene.b.x, y: 0 }).x;
  const wanted = scene.a.x <= scene.b.x; // A left of the vertical leg: the triangle is to its left, so its label goes right
  // ... unless the label (about 66 px wide) would run off the plane on that side; then it goes on the triangle's side, lower on the leg, clear of M
  const right = wanted ? legX + 12 + 80 <= vp.width : legX - 12 - 80 < 0;
  const px = (v: number) => Math.abs(v) * vp.scale;
  const long = d.kind !== 'coincident' && Math.hypot(px(scene.b.x - scene.a.x), px(scene.b.y - scene.a.y)) >= 56;
  return (
    <>
      {scene.legX && px(scene.b.x - scene.a.x) >= 64 && <PlaneLabel name="label-dx" at={{ x: (scene.a.x + scene.b.x) / 2, y: scene.a.y }} dy={above ? 17 : -15} role="x" math>{`dx = ${rationalForm(d.dx).text}`}</PlaneLabel>}
      {scene.legY && px(scene.b.y - scene.a.y) >= 26 && <PlaneLabel name="label-dy" at={{ x: scene.b.x, y: scene.a.y + (scene.b.y - scene.a.y) * (right === wanted ? 0.5 : 0.8) }} dx={right ? 12 : -12} anchor={right ? 'start' : 'end'} role="y" math>{`dy = ${rationalForm(d.dy).text}`}</PlaneLabel>}
      <Dot at={scene.midpoint} radius={4.5} role="derived" />
      {long && <PlaneLabel name="label-m" at={scene.midpoint} dx={place.m.dx} dy={place.m.dy} anchor={place.m.anchor} role="derived" math>M</PlaneLabel>}
      {d.kind !== 'coincident' && <PlaneLabel name="label-distance" at={scene.midpoint} dx={place.distance.dx} dy={place.distance.dy} anchor={place.distance.anchor} role="primary" math>{`|AB| = ${dist}`}</PlaneLabel>}
    </>
  );
}

function SegmentStageInner() {
  const lesson = useLesson<SegmentState, SegmentDerived>(CANONICAL_SEGMENT, deriveSegment);
  const s = lesson.state;
  const d = lesson.derived;
  const [snap, setSnap] = useState<SnapId>('1');
  const [last, setLast] = useState<'A' | 'B'>('B');
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintA = useScopedId();
  const hintB = useScopedId();
  useEffect(() => setHydrated(true), []);
  const grid: Grid = { kind: 'lattice', step: Number(snap) };
  const scene = useMemo(() => segmentScene(d), [d]);
  const rows = useMemo(() => segmentRows(d), [d]);
  const formulas = useMemo(() => segmentFormulas(d), [d]);
  const announce = (next: SegmentState) => setAnnouncement(prev => `${segmentSpoken(deriveSegment(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: SegmentState, moved?: 'A' | 'B') => { lesson.set(next); if (moved) setLast(moved); announce(next); };
  const caution = verdictIsCaution(d);
  const stacked = d.kind === 'coincident';
  const dist = d.distance.kind === 'exact' ? rootForm(d.distance.root).text : '';

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="segment" data-hydrated={hydrated} data-ax={s.ax} data-ay={s.ay} data-bx={s.bx} data-by={s.by} data-kind={d.kind}>
      <header class="stage-head">
        <h3 id={headingId}>Two points: displacement, distance, midpoint</h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); setSnap('1'); setLast('B'); announce(CANONICAL_SEGMENT); }} disabled={lesson.isCanonical && snap === '1'} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a pair (A → B)</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {SEGMENT_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.ax === s.ax && p.state.ay === s.ay && p.state.bx === s.bx && p.state.by === s.by} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={SEGMENT_WINDOW} label="Two points A and B in the coordinate plane, with the displacement and the distance between them" description={segmentDescription(d)}>
            <Dot at={{ x: 0, y: 0 }} radius={3} />
            {scene.legX && <Segment name="leg-x" from={scene.legX.from} to={scene.legX.to} role="x" dashed />}
            {scene.legY && <Segment name="leg-y" from={scene.legY.from} to={scene.legY.to} role="y" dashed />}
            {scene.rightAngle && <RightAngle corner={scene.corner} towardA={scene.a} towardB={scene.b} />}
            {scene.arrow && <Arrow name="displacement" from={scene.arrow.from} to={scene.arrow.to} role="primary" />}
            <SegmentLabels d={d} scene={scene} dist={dist} />
            <PlaneLabel name="label-a" at={scene.a} dx={-14} dy={scene.a.y <= scene.b.y ? 18 : -16} role="ink" math>A</PlaneLabel>
            <PlaneLabel name="label-b" at={scene.b} dx={14} dy={scene.b.y >= scene.a.y ? -16 : 18} role="primary" math>B</PlaneLabel>
            <g class={stacked && last === 'A' ? 'behind' : undefined}>
              <DragPoint role="ink" value={scene.a} xSpec={AX_SPEC} ySpec={AY_SPEC} grid={grid} label={pointLabel('A', d.a.x, d.a.y, d)} hintId={hintA} onChange={p => update({ ...s, ax: p.x + 0, ay: p.y + 0 }, 'A')} onCommit={() => undefined} />
            </g>
            <g class={stacked && last === 'B' ? 'behind' : undefined}>
              <DragPoint value={scene.b} xSpec={BX_SPEC} ySpec={BY_SPEC} grid={grid} label={pointLabel('B', d.b.x, d.b.y, d)} hintId={hintB} onChange={p => update({ ...s, bx: p.x + 0, by: p.y + 0 }, 'B')} onCommit={() => undefined} />
            </g>
          </CoordinatePlane>
          <span id={hintA} hidden>Arrow keys move A by one grid step. B stays where it is, so the displacement and the distance change.</span>
          <span id={hintB} hidden>Arrow keys move B by one grid step. A stays where it is, so the displacement and the distance change.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Points, displacement, distance and midpoint" legend="The displacement B − A has a direction; the distance |AB| does not. Taxicab = |dx| + |dy|." />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{segmentVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${['Displacement', 'Distance', 'Midpoint and taxicab'][i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={AX_SPEC} value={s.ax} grid={grid} onCommit={ax => update({ ...s, ax }, 'A')} />
        <ParameterInput spec={AY_SPEC} value={s.ay} grid={grid} onCommit={ay => update({ ...s, ay }, 'A')} />
        <ParameterInput spec={BX_SPEC} value={s.bx} grid={grid} onCommit={bx => update({ ...s, bx }, 'B')} />
        <ParameterInput spec={BY_SPEC} value={s.by} grid={grid} onCommit={by => update({ ...s, by }, 'B')} />
        <SegmentedControl<SnapId> legend="Snap to" name={`${headingId}-snap`} options={SNAPS} value={snap} onChange={setSnap} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function SegmentStage() {
  return (
    <IdScope name={'segment'}>
      <SegmentStageInner />
    </IdScope>
  );
}
