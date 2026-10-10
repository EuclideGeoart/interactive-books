/**
 * ReversalStage — a true inequality p ? q, multiplied by k. The order is kept for k > 0, reversed for k < 0 (a reflection of the line through
 * 0, stretched by |k|), and the step is rejected for k = 0. One flat state {p, q, k} → deriveReversal → every view.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveReversal, type ReversalDerived, type ReversalState } from '../../math/algebra/reversal';
import { rationalForm } from '../../math/quantity/exactform';
import { pixelsToWorld } from '../../platform/geometry/viewport';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { useLesson } from '../../ui/useLesson';
import { DragPoint } from '../../ui/plane/DragPoint';
import { usePlane } from '../../ui/plane/PlaneContext';
import { Arrow, Dot, PlaneLabel } from '../../ui/plane/primitives';
import { NumberLine } from '../coordinates/NumberLine';
import {
  AFTER_WINDOW, BEFORE_WINDOW, CANONICAL_REVERSAL, K_SPEC, P_SPEC, Q_SPEC, REVERSAL_FORMULA_LABELS, REVERSAL_PRESETS, REVERSAL_Y_SPEC,
  orderText, reversalDescription, reversalFormulas, reversalIsCaution, reversalRows, reversalScene, reversalSpoken, reversalVerdict,
} from './reversal-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };

/** An arrow from the first number to the second, below the axis: it points the way the order is read. */
function OrderArrow({ from, to, text, name }: { from: number; to: number; text: string; name: string }) {
  const { vp } = usePlane();
  const y = -pixelsToWorld(vp, 52);
  if (from === to) return <PlaneLabel name={`${name}-label`} at={{ x: from, y }} role="derived" math>{text}</PlaneLabel>;
  return (
    <>
      <Arrow name={name} from={{ x: from, y }} to={{ x: to, y }} role="derived" />
      <PlaneLabel name={`${name}-label`} at={{ x: (from + to) / 2, y }} dy={19} role="derived" math>{text}</PlaneLabel>
    </>
  );
}

function ReversalStageInner() {
  const lesson = useLesson<ReversalState, ReversalDerived>(CANONICAL_REVERSAL, deriveReversal);
  const s = lesson.state;
  const d = lesson.derived;
  const [last, setLast] = useState<'p' | 'q'>('q');
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintP = useScopedId();
  const hintQ = useScopedId();
  useEffect(() => setHydrated(true), []);
  const scene = useMemo(() => reversalScene(d), [d]);
  const rows = useMemo(() => reversalRows(d, s), [d, s]);
  const formulas = useMemo(() => reversalFormulas(d), [d]);
  const announce = (next: ReversalState) => setAnnouncement(prev => `${reversalSpoken(deriveReversal(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: ReversalState, moved?: 'p' | 'q') => { lesson.set(next); if (moved) setLast(moved); announce(next); };
  const caution = reversalIsCaution(d);
  const stacked = scene.p === scene.q;
  const afterStacked = scene.kp === scene.kq;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="reversal" data-hydrated={hydrated} data-p={s.p} data-q={s.q} data-k={s.k} data-rule={d.rule} data-after={d.after}>
      <header class="stage-head">
        <h3 id={headingId}>Multiply an inequality by <Formula tex="k" />: keep the order or reverse it</h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); setLast('q'); announce(CANONICAL_REVERSAL); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a pair and a multiplier</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {REVERSAL_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.p === s.p && p.state.q === s.q && p.state.k === s.k} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane reversal-lines">
          <p class="line-title" aria-hidden="true">before: <Formula tex="p,\ q" /></p>
          <NumberLine window={BEFORE_WINDOW} label="The numbers p and q on a number line" description={reversalDescription(d)}>
            <OrderArrow name="order-before" from={scene.p} to={scene.q} text={orderText(d.p, d.before, d.q)} />
            <PlaneLabel name="label-p" at={{ x: scene.p, y: 0 }} dy={-26} role="ink" math>p</PlaneLabel>
            <PlaneLabel name="label-q" at={{ x: scene.q, y: 0 }} dy={-26} role="primary" math>q</PlaneLabel>
            <g class={stacked && last === 'p' ? 'behind' : undefined}>
              <DragPoint role="ink" value={{ x: scene.p, y: 0 }} xSpec={P_SPEC} ySpec={REVERSAL_Y_SPEC} grid={GRID} label={`Number p at ${rationalForm(d.p).spoken}`} hintId={hintP} onChange={pt => update({ ...s, p: pt.x + 0 }, 'p')} onCommit={() => undefined} />
            </g>
            <g class={stacked && last === 'q' ? 'behind' : undefined}>
              <DragPoint value={{ x: scene.q, y: 0 }} xSpec={Q_SPEC} ySpec={REVERSAL_Y_SPEC} grid={GRID} label={`Number q at ${rationalForm(d.q).spoken}`} hintId={hintQ} onChange={pt => update({ ...s, q: pt.x + 0 }, 'q')} onCommit={() => undefined} />
            </g>
          </NumberLine>
          <p class="line-title" aria-hidden="true">after multiplying by <Formula tex="k" />: <Formula tex="kp,\ kq" /></p>
          <NumberLine window={AFTER_WINDOW} label="The products kp and kq on a number line" description={`The products on a wider line. kp is at ${rationalForm(d.kp).spoken} and kq is at ${rationalForm(d.kq).spoken}.`}>
            <OrderArrow name="order-after" from={scene.kp} to={scene.kq} text={orderText(d.kp, d.after, d.kq)} />
            <PlaneLabel name="label-kp" at={{ x: scene.kp, y: 0 }} dy={-26} role="ink" math>{afterStacked ? 'kp = kq' : 'kp'}</PlaneLabel>
            {!afterStacked && <PlaneLabel name="label-kq" at={{ x: scene.kq, y: 0 }} dy={-26} role="primary" math>kq</PlaneLabel>}
            <Dot at={{ x: scene.kp, y: 0 }} radius={7} role="ink" />
            <Dot at={{ x: scene.kq, y: 0 }} radius={7} role="primary" />
          </NumberLine>
          <span id={hintP} hidden>Drag with a pointer, or use the left and right arrow keys to move p by one. Hold Shift to move by five.</span>
          <span id={hintQ} hidden>Drag with a pointer, or use the left and right arrow keys to move q by one. Hold Shift to move by five.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The numbers, their products and the order" legend="Multiplying by a negative k reflects the line through 0, so the numbers swap sides." />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{reversalVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${REVERSAL_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={P_SPEC} value={s.p} grid={GRID} onCommit={p => update({ ...s, p }, 'p')} />
        <ParameterInput spec={Q_SPEC} value={s.q} grid={GRID} onCommit={q => update({ ...s, q }, 'q')} />
        <ParameterInput spec={K_SPEC} value={s.k} grid={GRID} onCommit={k => update({ ...s, k })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function ReversalStage() {
  return (
    <IdScope name={'reversal'}>
      <ReversalStageInner />
    </IdScope>
  );
}
