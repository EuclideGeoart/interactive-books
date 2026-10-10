/**
 * UndoStage — a function and its inverse are mirror images in the line y = x, and the round trip works only where both steps exist.
 *
 *   state {family, order, x} → roundTrip → points · rows · formula · verdict
 *
 * The two curves are sampled from the FAMILY alone; moving x moves only the two marked points.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { UNDO_AXIS_Y, UNDO_HANDLE_PARAM, UNDO_PRESETS, UNDO_WINDOW, UNDO_X_PARAM, CANONICAL_ROUNDTRIP, FAMILY_OPTIONS, ORDER_OPTIONS, offPlane, roundTrip, undoClaimTex, undoDescription, undoFormula, undoLabels, undoMirrorNote, undoPoints, undoRows, undoScene, undoSpoken, undoVerdict } from './undo-lesson';
import type { RoundTrip, RoundTripState } from '../../math/families/roundtrip';
import type { Grid } from '../../platform/params';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { DragPoint } from '../../ui/plane/DragPoint';
import { PlaneLabel, Segment } from '../../ui/plane/primitives';

const GRID: Grid = { kind: 'lattice', step: 0.5 };
const same = (a: RoundTripState, b: RoundTripState): boolean => a.family === b.family && a.order === b.order && a.x === b.x;

function UndoStageInner() {
  const lesson = useLesson<RoundTripState, RoundTrip>(CANONICAL_ROUNDTRIP, roundTrip);
  const rt = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  const presetsId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const scene = useMemo(() => undoScene(s.family), [s.family]);
  const labels = useMemo(() => undoLabels(s.family), [s.family]);
  const points = useMemo(() => undoPoints(rt), [rt]);
  const rows = useMemo(() => undoRows(rt), [rt]);
  const formula = useMemo(() => undoFormula(rt), [rt]);
  const verdict = undoVerdict(rt);
  const commit = (next: RoundTripState) => {
    lesson.set(next);
    setAnnouncement(prev => `${undoSpoken(roundTrip(next))}${prev.endsWith('​') ? '' : '​'}`);
  };
  const firstOnForward = s.order === 'forward-first';
  const inPlane = Math.abs(s.x) <= UNDO_HANDLE_PARAM.domain.max;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="undo" data-hydrated={hydrated} data-family={s.family} data-order={s.order} data-x={s.x} data-returned={String(rt.returned)} data-cause={rt.cause}>
      <header class="stage-head">
        <h3 id={headingId}>Undo it: a function and its inverse</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_ROUNDTRIP)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetsId}>Try these round trips</p>
        <div class="presets" role="group" aria-labelledby={presetsId}>
          {UNDO_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={same(s, p.state)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={UNDO_WINDOW} label="A function, its inverse and the mirror line y = x" description={undoDescription(rt, s.family)}>
            <Segment name="diagonal" from={scene.curves.diagonal[0]} to={scene.curves.diagonal[1]} role="ink" dashed width={1.6} />
            {scene.curves.otherBranch.length > 0 && <Curve name="curve-other" lines={scene.curves.otherBranch} role="derived" dashed width={2} />}
            <Curve name="curve-inverse" lines={scene.curves.inverse} role="derived" width={3.2} />
            <Curve name="curve-forward" lines={scene.curves.forward} role="primary" width={3.2} />
            <PlaneLabel name="label-forward" at={labels.forward} dx={-8} dy={-10} role="primary" anchor="end" math>{labels.forwardText}</PlaneLabel>
            <PlaneLabel name="label-inverse" at={labels.inverse} dx={8} dy={14} role="derived" anchor="start" math>{labels.inverseText}</PlaneLabel>
            {labels.other && <PlaneLabel name="label-other" at={labels.other} dx={8} dy={14} role="derived" anchor="start" math>{labels.otherText}</PlaneLabel>}
            <PlaneLabel name="label-diagonal" at={{ x: 4.6, y: 4.6 }} dx={-6} dy={16} role="ink" anchor="end" math>y = x</PlaneLabel>
            {points.onFirst && points.reflected && <Segment name="mirror-link" from={points.onFirst} to={points.reflected} role="ink" dashed width={1.4} />}
            {points.onFirst && <PointMarker name="point-first" at={points.onFirst} role={firstOnForward ? 'primary' : 'derived'} />}
            {points.reflected && <PointMarker name="point-mirror" at={points.reflected} role={firstOnForward ? 'derived' : 'primary'} />}
            {points.returned && <PointMarker name="point-returned" at={points.returned} role="caution" filled={false} radius={6.5} />}
            {inPlane && <DragPoint role="ink" value={{ x: s.x, y: 0 }} xSpec={UNDO_HANDLE_PARAM} ySpec={UNDO_AXIS_Y} grid={GRID} label={`Input x at ${s.x}. Slides along the x-axis only.`} hintId={hintId} onChange={n => lesson.set({ ...s, x: n.x })} onCommit={n => commit({ ...s, x: n.x })} />}
          </CoordinatePlane>
          <span id={hintId} hidden>Drag along the x-axis, or press the left and right arrow keys to move one step. Type a larger value in the box below to leave the plane.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The two steps of the round trip" legend="= exact (or the double the computer holds) · ≈ rounded to 6 decimals · ⚠ undefined" />
        </div>
      </div>
      {!inPlane || offPlane(rt) ? <p class="stage-note" data-off-plane>This input puts the points outside the plane, which shows −5 to 5. The readout above is still exact.</p> : null}
      {undoMirrorNote(rt) && inPlane && !offPlane(rt) ? <p class="stage-note">{undoMirrorNote(rt)}</p> : null}
      <p class="verdict" data-verdict data-agree={verdict.tone}>{verdict.text}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        <FormulaScroll label="The claim, scrollable" tex={undoClaimTex(rt)} />
        <FormulaScroll label="The round trip with numbers, scrollable" tex={formula} />
      </div>
      <div class="stage-controls">
        <SegmentedControl legend="Pair" name={`${headingId}-family`} options={FAMILY_OPTIONS} value={s.family} onChange={family => commit({ ...s, family })} />
        <SegmentedControl legend="Order" name={`${headingId}-order`} options={ORDER_OPTIONS} value={s.order} onChange={order => commit({ ...s, order })} />
        <ParameterInput spec={UNDO_X_PARAM} value={s.x} grid={GRID} onCommit={n => commit({ ...s, x: n })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function UndoStage() {
  return (
    <IdScope name="undo">
      <UndoStageInner />
    </IdScope>
  );
}
