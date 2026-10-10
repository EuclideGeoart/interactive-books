/**
 * PlacementStage — a point is a place, a vector is a displacement.
 * Drag P (the tail): the whole arrow slides and v does not change. Drag Q (the tip): v changes, P stays.
 * State is flat {tx, ty, vx, vy}; v is held, never recomputed from the tip.
 */
import { IdScope, useScopedId } from '../../ui/ids';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { withTail, withTip, type Placement, type PlacementDerived } from '../../math/vector2/placement';
import { formatGiven } from '../../platform/numeric/format';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Arrow, Dot, PlaneLabel, Segment } from '../../ui/plane/primitives';
import { CANONICAL_PLACEMENT, DISP_X, DISP_Y, PLACEMENT_LIMIT, PLACEMENT_WINDOW, TAIL_X, TAIL_Y, TIP_X, TIP_Y, derivePlacement, placementDescription, placementFormulas, placementRows, placementScene, placementSpoken } from './placement-lesson';

const SNAPS = [{ id: '1', label: '1' }, { id: '0.5', label: '½' }] as const;
type SnapId = (typeof SNAPS)[number]['id'];

function PlacementStageInner() {
  const lesson = useLesson<Placement, PlacementDerived>(CANONICAL_PLACEMENT, derivePlacement);
  const d = lesson.derived;
  const [snap, setSnap] = useState<SnapId>('1');
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const tailHint = useScopedId();
  const tipHint = useScopedId();
  useEffect(() => setHydrated(true), []);
  const grid: Grid = { kind: 'lattice', step: Number(snap) };
  const scene = useMemo(() => placementScene(d), [d]);
  const rows = useMemo(() => placementRows(d), [d]);
  const formulas = useMemo(() => placementFormulas(d), [d]);
  const announce = (p: Placement) => setAnnouncement(prev => `${placementSpoken(derivePlacement(p))}${prev.endsWith('​') ? '' : '​'}`);
  const apply = (p: Placement) => lesson.set(p);
  const commit = (p: Placement) => { apply(p); announce(p); };
  const s = lesson.state;
  const v = d.vector;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="placement" data-hydrated={hydrated} data-px={d.tail.x} data-py={d.tail.y} data-vx={v.x} data-vy={v.y}>
      <header class="stage-head">
        <h3 id={headingId}>Move the start <Formula tex="P" />, move the tip <Formula tex="Q" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); setSnap('1'); announce(CANONICAL_PLACEMENT); }} disabled={lesson.isCanonical && snap === '1'} data-action="reset">Reset</button>
      </header>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={PLACEMENT_WINDOW} label="An arrow from point P to point Q" description={placementDescription(d)}>
            <Dot at={{ x: 0, y: 0 }} radius={3} />
            {scene.ghost && <Segment name="ghost" from={scene.ghost.from} to={scene.ghost.to} role="ink" dashed width={2} />}
            <Segment name="x-leg" from={scene.xLeg.from} to={scene.xLeg.to} role="x" dashed />
            <Segment name="y-leg" from={scene.yLeg.from} to={scene.yLeg.to} role="y" dashed />
            {scene.arrow && <Arrow name="vector" from={scene.arrow.from} to={scene.arrow.to} role="primary" />}
            <PlaneLabel name="label-p" at={d.tail} dx={-14} dy={20} role="ink" math>P</PlaneLabel>
            <PlaneLabel name="label-q" at={d.tip} dx={14} dy={-14} role="ink" math>Q</PlaneLabel>
            <DragPoint role="ink" value={d.tail} xSpec={TAIL_X} ySpec={TAIL_Y} grid={grid} label={`Start point P at ${formatGiven(d.tail.x).text}, ${formatGiven(d.tail.y).text}. Moving it slides the whole arrow.`} hintId={tailHint} onChange={n => apply(withTail(s, n))} onCommit={n => commit(withTail(s, n))} />
            <DragPoint value={d.tip} xSpec={TIP_X} ySpec={TIP_Y} grid={grid} label={`Tip Q at ${formatGiven(d.tip.x).text}, ${formatGiven(d.tip.y).text}. Moving it changes the displacement.`} hintId={tipHint} onChange={n => apply(withTip(s, n, PLACEMENT_LIMIT))} onCommit={n => commit(withTip(s, n, PLACEMENT_LIMIT))} />
          </CoordinatePlane>
          <span id={tailHint} hidden>Arrow keys move P one grid step; the arrow keeps its shape.</span>
          <span id={tipHint} hidden>Arrow keys move Q one grid step; P stays and the displacement changes.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Points and displacement" legend="P and Q are points (places). v, ‖v‖ and θ describe the displacement, and do not change when only P moves." />
        </div>
      </div>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${['Tip from tail', 'Displacement from two points'][i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={TAIL_X} value={s.tx} grid={grid} onCommit={n => commit({ ...s, tx: n })} />
        <ParameterInput spec={TAIL_Y} value={s.ty} grid={grid} onCommit={n => commit({ ...s, ty: n })} />
        <ParameterInput spec={DISP_X} value={s.vx} grid={grid} onCommit={n => commit({ ...s, vx: n })} />
        <ParameterInput spec={DISP_Y} value={s.vy} grid={grid} onCommit={n => commit({ ...s, vy: n })} />
        <SegmentedControl<SnapId> legend="Snap to" name={`${headingId}-snap`} options={SNAPS} value={snap} onChange={setSnap} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function PlacementStage() {
  return (
    <IdScope name={'placement'}>
      <PlacementStageInner />
    </IdScope>
  );
}
