/**
 * BalanceStage — the hero of I.4. A statement, a recorded history of balanced operations, and a beam at a trial value of x.
 * One flat state {initial, steps, trial} → deriveBalance → every view. The selected history frame is the only extra state, and selecting a
 * frame never changes the history; a rejected operation (×0, ÷0) never enters it.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveBalance, tryStep, type BalanceDerived, type BalanceState, type StepSpec } from '../../math/algebra/balance';
import { rationalForm } from '../../math/quantity/exactform';
import type { Grid } from '../../platform/params';
import { cursorAt, type TraceCursor } from '../../platform/trace';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TraceStepper } from '../../ui/TraceStepper';
import { useLesson } from '../../ui/useLesson';
import { DragPoint } from '../../ui/plane/DragPoint';
import { PointMarker } from '../../ui/plane/Curve';
import { PlaneLabel, Segment } from '../../ui/plane/primitives';
import { NumberLine } from '../coordinates/NumberLine';
import {
  AMOUNT_SPEC, BALANCE_LINE_WINDOW, BALANCE_PRESETS, BEAM_VIEW, CANONICAL_BALANCE, FORMULA_LABELS, LINE_Y_SPEC, OP_OPTIONS, TRIAL_SPEC,
  applyLabel, balanceDescription, balanceFormulas, balanceFrames, balanceRows, balanceSpoken, balanceStateFor, balanceVerdict, beamDescription, beamScene, setScene, verdictIsCaution,
  type BalancePreset,
} from './balance-lesson';
import { conditionText } from './format';

type OpId = StepSpec['op'];
const GRID: Grid = { kind: 'lattice', step: 1 };

/** The beam: drawn from the beam reading alone. It is schematic about the size of the tilt; the inspector has the numbers. */
function Beam({ d, i }: { d: BalanceDerived; i: number }) {
  const b = d.beams[i]!;
  const scene = beamScene(b);
  const { width, height, pivotX, pivotY } = BEAM_VIEW;
  const descId = useScopedId();
  const PAN_W = 104;
  const DROP = 40;
  const leftPan = { x: scene.left.x, y: scene.left.y + DROP };
  const rightPan = { x: scene.right.x, y: scene.right.y + DROP };
  const text = (r: typeof b.left) => rationalForm(r).text;
  return (
    <div class="beam-wrap">
      <svg class="beam" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Balance beam at the trial value of x" aria-describedby={descId} data-beam data-lower={b.lower} data-tilt={scene.tiltDeg.toFixed(2)}>
        <path class="beam-stand" d={`M${pivotX} ${pivotY} L${pivotX - 26} ${height - 20} H${pivotX + 26} Z`} aria-hidden="true" />
        <line class="beam-bar" x1={scene.left.x} y1={scene.left.y} x2={scene.right.x} y2={scene.right.y} aria-hidden="true" />
        {[leftPan, rightPan].map((pan, k) => {
          const end = k === 0 ? scene.left : scene.right;
          return <line key={`s${k}`} class="beam-string" x1={end.x} y1={end.y} x2={pan.x - 30} y2={pan.y} aria-hidden="true" />;
        })}
        {[leftPan, rightPan].map((pan, k) => {
          const end = k === 0 ? scene.left : scene.right;
          return <line key={`t${k}`} class="beam-string" x1={end.x} y1={end.y} x2={pan.x + 30} y2={pan.y} aria-hidden="true" />;
        })}
        <g class="pan role-x" aria-hidden="true">
          <rect x={leftPan.x - PAN_W / 2} y={leftPan.y} width={PAN_W} height={34} rx={5} />
          <text x={leftPan.x} y={leftPan.y + 22} text-anchor="middle">{text(b.left)}</text>
        </g>
        <g class="pan role-y" aria-hidden="true">
          <rect x={rightPan.x - PAN_W / 2} y={rightPan.y} width={PAN_W} height={34} rx={5} />
          <text x={rightPan.x} y={rightPan.y + 22} text-anchor="middle">{text(b.right)}</text>
        </g>
        <circle class="beam-pivot" cx={pivotX} cy={pivotY} r={7} aria-hidden="true" />
        <text class="beam-caption" x={leftPan.x} y={leftPan.y + 52} text-anchor="middle" aria-hidden="true">left side</text>
        <text class="beam-caption" x={rightPan.x} y={rightPan.y + 52} text-anchor="middle" aria-hidden="true">right side</text>
      </svg>
      <p id={descId} class="sr-only">{beamDescription(d, i)}</p>
    </div>
  );
}

/** The solution set of the selected statement, marked on the number line the trial handle moves along. */
function SolutionMarks({ d, i }: { d: BalanceDerived; i: number }) {
  const scene = setScene(d.solutions[i]!);
  const { xMin, xMax } = BALANCE_LINE_WINDOW;
  if (scene.kind === 'point') return <PointMarker at={{ x: scene.point!, y: 0 }} role="y" name="solution" radius={7} />;
  if (scene.kind === 'all') return <Segment name="solution-all" from={{ x: xMin, y: 0 }} to={{ x: xMax, y: 0 }} role="y" width={7} />;
  if (scene.kind === 'none') return <PlaneLabel name="solution-none" at={{ x: 0, y: 0 }} dy={-34} role="caution" math>{'\\varnothing'}</PlaneLabel>;
  const from = scene.bound!;
  const to = scene.side === 'above' ? xMax : xMin;
  return (
    <>
      <Segment name="solution-ray" from={{ x: from, y: 0 }} to={{ x: to, y: 0 }} role="y" width={7} />
      <PointMarker at={{ x: from, y: 0 }} role="y" filled={scene.closed} name="solution-bound" radius={7} />
    </>
  );
}

function BalanceStageInner() {
  const lesson = useLesson<BalanceState, BalanceDerived>(CANONICAL_BALANCE, deriveBalance);
  const s = lesson.state;
  const d = lesson.derived;
  const frames = useMemo(() => balanceFrames(d), [d]);
  const [cursor, setCursor] = useState<TraceCursor>(() => cursorAt(frames.length));
  const [op, setOp] = useState<OpId>('add');
  const [amount, setAmount] = useState<number>(AMOUNT_SPEC.default);
  const [rejection, setRejection] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const i = Math.min(cursor.index, frames.length - 1);
  const rows = useMemo(() => balanceRows(d, i, s), [d, i, s]);
  const formulas = useMemo(() => balanceFormulas(d, i), [d, i]);
  const caution = verdictIsCaution(d, i);
  const announce = (text: string) => setAnnouncement(prev => `${text}${prev.endsWith('​') ? '' : '​'}`);
  const step: StepSpec = { op, value: amount };

  const setState = (next: BalanceState, select: 'end' | 'keep' = 'keep') => {
    const nd = deriveBalance(next);
    lesson.set(next);
    if (select === 'end') setCursor(cursorAt(nd.frames.length, nd.frames.length - 1));
    else setCursor(c => cursorAt(nd.frames.length, Math.min(c.index, nd.frames.length - 1)));
    return nd;
  };
  const choose = (p: BalancePreset) => {
    setRejection(null);
    const nd = setState(balanceStateFor(p));
    setCursor(cursorAt(nd.frames.length, 0));
    announce(balanceSpoken(nd, 0));
  };
  const apply = () => {
    const result = tryStep(s, step);
    if (!result.ok) { setRejection(result.reason); announce(`Rejected. ${result.reason}`); return; }
    setRejection(null);
    const nd = setState({ ...s, steps: [...s.steps, step] }, 'end');
    announce(balanceSpoken(nd, nd.frames.length - 1));
  };
  const removeLast = () => {
    if (s.steps.length === 0) return;
    setRejection(null);
    const nd = setState({ ...s, steps: s.steps.slice(0, -1) }, 'end');
    announce(`Removed the last step. ${balanceSpoken(nd, nd.frames.length - 1)}`);
  };
  const setTrial = (trial: number) => { const next = { ...s, trial: trial + 0 }; lesson.set(next); const nd = deriveBalance(next); announce(balanceVerdict(nd, i)); };
  const reset = () => { lesson.reset(); setCursor(cursorAt(1)); setOp('add'); setAmount(AMOUNT_SPEC.default); setRejection(null); announce('Reset to the first statement.'); };
  const activePreset = BALANCE_PRESETS.find(p => JSON.stringify(p.spec) === JSON.stringify(s.initial));
  const atCanonical = lesson.isCanonical && op === 'add' && amount === AMOUNT_SPEC.default && rejection === null;

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="balance" data-hydrated={hydrated}
      data-steps={s.steps.length} data-frame={i} data-trial={s.trial} data-solution={conditionText(d.solutions[i]!)} data-holds={String(d.beams[i]!.holds)}
    >
      <header class="stage-head">
        <h2 id={headingId}>A balanced statement: <Formula tex="L(x)\ \square\ R(x)" /></h2>
        <button type="button" class="button quiet" onClick={reset} disabled={atCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Start from a statement</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {BALANCE_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={activePreset?.id === p.id && s.steps.length === 0} data-preset={p.id} onClick={() => choose(p)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <Beam d={d} i={i} />
          <NumberLine window={BALANCE_LINE_WINDOW} label="The trial value of x on a number line, with the solutions of the selected statement marked" description={balanceDescription(d, i)}>
            <SolutionMarks d={d} i={i} />
            <PlaneLabel name="label-trial" at={{ x: s.trial, y: 0 }} dy={-26} role="primary" math>x</PlaneLabel>
            <DragPoint
              value={{ x: s.trial, y: 0 }} xSpec={TRIAL_SPEC} ySpec={LINE_Y_SPEC} grid={GRID}
              label={`Trial value x at ${rationalForm(d.trial).spoken}. ${d.beams[i]!.holds ? 'The statement is true here.' : 'The statement is false here.'}`}
              hintId={hintId} onChange={p => setTrial(p.x)} onCommit={() => undefined}
            />
          </NumberLine>
          <span id={hintId} hidden>Drag with a pointer, or use the left and right arrow keys to move the trial value by one. Hold Shift to move by five.</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Trial value, both sides, and the solution set" legend="The beam tilts toward the larger side. Left minus right is 0 exactly at a solution of an equation." />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{balanceVerdict(d, i)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, k) => <MathScroll key={k} label={`${FORMULA_LABELS[k]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="balance-history">
        <h3 class="mini-head" id={`${headingId}-h`}>The history: every step done to both sides</h3>
        <TraceStepper
          label="History of balanced operations" frames={frames} cursor={cursor} onCursor={setCursor}
          renderFrame={f => (<><MathScroll label="Statement at this step, scrollable"><Formula tex={f.state.tex} display /></MathScroll><p class="trace-caption">{f.state.caption}</p></>)}
          describeFrame={f => f.state.text}
        />
      </div>
      <div class="stage-controls balance-controls">
        <SegmentedControl<OpId> legend="Do the same to both sides" name={`${headingId}-op`} options={OP_OPTIONS} value={op} onChange={setOp} />
        <ParameterInput spec={AMOUNT_SPEC} value={amount} grid={GRID} onCommit={v => { setAmount(v + 0); setRejection(null); }} />
        <ParameterInput spec={TRIAL_SPEC} value={s.trial} grid={GRID} onCommit={setTrial} />
        <div class="apply-row">
          <button type="button" class="button" data-action="apply" onClick={apply}>{applyLabel(step)}</button>
          <button type="button" class="button quiet" data-action="remove-step" onClick={removeLast} disabled={s.steps.length === 0}>Remove last step</button>
        </div>
        <p class={`rejection${rejection ? ' is-shown' : ''}`} role="status" data-rejection data-rejected={String(rejection !== null)}>{rejection ?? 'Each operation is applied to the latest statement. Selecting an earlier step in the history only shows it; nothing is undone.'}</p>
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function BalanceStage() {
  return (
    <IdScope name={'balance'}>
      <BalanceStageInner />
    </IdScope>
  );
}
