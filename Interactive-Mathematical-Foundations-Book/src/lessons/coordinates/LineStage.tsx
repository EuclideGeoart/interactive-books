/**
 * LineStage — two points on a number line. The signed step b − a says which way and how far; the distance |b − a| forgets the way.
 * One flat state {a, b} → deriveLine → every view.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveLine, type LineDerived, type LineState } from '../../math/coordinates/numberline';
import { rationalForm } from '../../math/quantity/exactform';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { DragPoint } from '../../ui/plane/DragPoint';
import { usePlane } from '../../ui/plane/PlaneContext';
import { Arrow, DimensionLine, PlaneLabel, Segment } from '../../ui/plane/primitives';
import { pixelsToWorld } from '../../platform/geometry/viewport';
import { NumberLine } from './NumberLine';
import { A_SPEC, B_SPEC, CANONICAL_LINE, LINE_PRESETS, LINE_WINDOW, LINE_Y_SPEC, lineDescription, lineFormulas, lineRows, lineScene, lineSpoken, lineVerdict, verdictIsCaution } from './line-lesson';

const SNAPS = [{ id: '1', label: '1' }, { id: '0.5', label: '½' }] as const;
type SnapId = (typeof SNAPS)[number]['id'];

/** The annotations that depend on pixel offsets: the unsigned distance above the line, the signed step below it. */
function LineAnnotations({ d, a, b }: { d: LineDerived; a: number; b: number }) {
  const { vp } = usePlane();
  const yStep = -pixelsToWorld(vp, 62);
  const mid = (a + b) / 2;
  const forward = rationalForm(d.forward).text;
  const distance = rationalForm(d.distance).text;
  return (
    <>
      <Segment name="guide-a" from={{ x: a, y: 0 }} to={{ x: a, y: yStep }} role="ink" dashed width={1.5} />
      <Segment name="guide-b" from={{ x: b, y: 0 }} to={{ x: b, y: yStep }} role="ink" dashed width={1.5} />
      <Arrow name="signed-step" from={{ x: a, y: yStep }} to={{ x: b, y: yStep }} role="derived" />
      <DimensionLine name="distance" from={{ x: a, y: 0 }} to={{ x: b, y: 0 }} side="above" distance={46} role="x" label={`|b − a| = ${distance}`} labelMinPx={92} />
      {d.order !== 'same' && <PlaneLabel name="step-label" at={{ x: mid, y: yStep }} dy={19} role="derived" math>{`b − a = ${forward}`}</PlaneLabel>}
    </>
  );
}

function LineStageInner() {
  const lesson = useLesson<LineState, LineDerived>(CANONICAL_LINE, deriveLine);
  const s = lesson.state;
  const d = lesson.derived;
  const [snap, setSnap] = useState<SnapId>('1');
  const [last, setLast] = useState<'a' | 'b'>('b');
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintA = useScopedId();
  const hintB = useScopedId();
  useEffect(() => setHydrated(true), []);
  const grid: Grid = { kind: 'lattice', step: Number(snap) };
  const scene = useMemo(() => lineScene(d), [d]);
  const rows = useMemo(() => lineRows(d, s), [d, s]);
  const formulas = useMemo(() => lineFormulas(d), [d]);
  const announce = (next: LineState) => setAnnouncement(prev => `${lineSpoken(deriveLine(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: LineState, moved?: 'a' | 'b') => { lesson.set(next); if (moved) setLast(moved); announce(next); };
  const caution = verdictIsCaution(d);
  const stacked = d.order === 'same';

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="line" data-hydrated={hydrated} data-a={s.a} data-b={s.b} data-order={d.order}>
      <header class="stage-head">
        <h3 id={headingId}>Two points on a line: <Formula tex="b-a" /> and <Formula tex="\lvert b-a\rvert" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); setSnap('1'); setLast('b'); announce(CANONICAL_LINE); }} disabled={lesson.isCanonical && snap === '1'} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a pair (a → b)</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {LINE_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.a === s.a && p.state.b === s.b} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <NumberLine window={LINE_WINDOW} label="Two points a and b on a number line" description={lineDescription(d)}>
            <LineAnnotations d={d} a={scene.a} b={scene.b} />
            <PlaneLabel name="label-a" at={{ x: scene.a, y: 0 }} dy={-26} role="ink" math>a</PlaneLabel>
            <PlaneLabel name="label-b" at={{ x: scene.b, y: 0 }} dy={-26} role="primary" math>b</PlaneLabel>
            <g class={stacked && last === 'a' ? 'behind' : undefined}>
              <DragPoint role="ink" value={{ x: scene.a, y: 0 }} xSpec={A_SPEC} ySpec={LINE_Y_SPEC} grid={grid} label={`Point a at ${rationalForm(d.a).spoken}. ${lineSpoken(d)}`} hintId={hintA} onChange={p => update({ ...s, a: p.x + 0 }, 'a')} onCommit={() => undefined} />
            </g>
            <g class={stacked && last === 'b' ? 'behind' : undefined}>
              <DragPoint value={{ x: scene.b, y: 0 }} xSpec={B_SPEC} ySpec={LINE_Y_SPEC} grid={grid} label={`Point b at ${rationalForm(d.b).spoken}. ${lineSpoken(d)}`} hintId={hintB} onChange={p => update({ ...s, b: p.x + 0 }, 'b')} onCommit={() => undefined} />
            </g>
          </NumberLine>
          <span id={hintA} hidden>Drag with a pointer, or use the left and right arrow keys to move a by one grid step. Hold Shift to move by five.</span>
          <span id={hintB} hidden>Drag with a pointer, or use the left and right arrow keys to move b by one grid step. Hold Shift to move by five.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Points, signed steps and distance" legend="b − a has a sign (a direction); |b − a| does not. |a| + |b| is a distance only through 0." />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{lineVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${['Signed steps', 'Distance and midpoint'][i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={A_SPEC} value={s.a} grid={grid} onCommit={a => update({ ...s, a }, 'a')} />
        <ParameterInput spec={B_SPEC} value={s.b} grid={grid} onCommit={b => update({ ...s, b }, 'b')} />
        <SegmentedControl<SnapId> legend="Snap to" name={`${headingId}-snap`} options={SNAPS} value={snap} onChange={setSnap} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function LineStage() {
  return (
    <IdScope name={'line'}>
      <LineStageInner />
    </IdScope>
  );
}
