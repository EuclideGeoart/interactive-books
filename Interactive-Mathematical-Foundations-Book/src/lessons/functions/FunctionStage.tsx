/**
 * FunctionStage — the hero of I.5. One input goes through a machine of one or two operations and one output comes out. Pick a rule, set its number a,
 * drag the input along the curve (or type it) and watch each step of the pipeline, the point on the graph and the table of inputs and outputs.
 * One flat state {rule, a, x} → deriveFunction → every view. The curve is memoised on (rule, a) only.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveFunction, type FunctionDerived, type FunctionState, type RuleId } from '../../math/functions/rule';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { DragPoint } from '../../ui/plane/DragPoint';
import { PlaneLabel, Segment } from '../../ui/plane/primitives';
import {
  CANONICAL_FUNCTION, FUNCTION_FORMULA_LABELS, FUNCTION_PRESETS, FUNCTION_WINDOW, FX_SPEC, HANDLE_Y_SPEC, aSpec, functionCurve, functionDescription, functionFormulas,
  functionIsCaution, functionLabel, functionRows, functionScene, functionSpoken, functionTable, functionVerdict,
} from './function-lesson';
import { RULE_CHOICES, numText, numTex, ruleSpoken } from './format';
import { Pipeline } from './Pipeline';
import { rationalForm } from '../../math/quantity/exactform';

const GRID: Grid = { kind: 'lattice', step: 0.5 };

function FunctionStageInner() {
  const lesson = useLesson<FunctionState, FunctionDerived>(CANONICAL_FUNCTION, deriveFunction);
  const s = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const curve = useMemo(() => functionCurve(s.rule, s.a), [s.rule, s.a]);
  const scene = useMemo(() => functionScene(d), [d]);
  const rows = useMemo(() => functionRows(d), [d]);
  const formulas = useMemo(() => functionFormulas(d), [d]);
  const table = useMemo(() => functionTable(s), [s]);
  const announce = (next: FunctionState) => setAnnouncement(prev => `${functionSpoken(deriveFunction(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: FunctionState) => { lesson.set(next); announce(next); };
  const caution = functionIsCaution(d);
  const tags = useMemo(() => ['input x', ...d.evaluation.rows.map((_, i) => (i === d.evaluation.rows.length - 1 ? 'output f(x)' : ''))], [d]);
  const x = rationalForm(d.xRational).text;
  const hintText = 'Drag along the curve, or use the left and right arrow keys to move the input by half a unit. Hold Shift to move by five steps.';

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="function" data-hydrated={hydrated} data-rule={s.rule} data-a={s.a} data-x={s.x}
      data-defined={String(d.output.kind !== 'undefined')} data-curve={curve.length}
    >
      <header class="stage-head">
        <h2 id={headingId}>A function as a machine: <Formula tex="x\;\longmapsto\;f(x)" /></h2>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_FUNCTION); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a machine</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {FUNCTION_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.rule === s.rule && p.state.a === s.a && p.state.x === s.x} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={FUNCTION_WINDOW} label={`The graph of y equals ${ruleSpoken(s.rule, s.a)}, with the input marked`} description={functionDescription(d)}>
            {scene.asymptote !== null && <Segment name="asymptote" from={{ x: scene.asymptote, y: FUNCTION_WINDOW.yMin }} to={{ x: scene.asymptote, y: FUNCTION_WINDOW.yMax }} role="caution" dashed width={2} />}
            <Curve lines={curve} role="derived" name="curve" />
            {scene.start && <PointMarker at={scene.start} role="derived" filled name="curve-start" radius={5} />}
            {scene.defined && <Segment name="to-x" from={{ x: scene.handle.x, y: 0 }} to={scene.handle} role="x" dashed width={2.5} />}
            {scene.defined && <Segment name="to-y" from={{ x: 0, y: scene.handle.y }} to={scene.handle} role="y" dashed width={2.5} />}
            <PlaneLabel name="label-point" at={scene.handle} dx={scene.handle.x >= 0 ? -16 : 16} dy={scene.handle.y >= 0 ? -18 : 20} anchor={scene.handle.x >= 0 ? 'end' : 'start'} role={scene.defined ? 'ink' : 'caution'} math>
              {scene.defined ? `(${x}, ${numText(d.output)})` : `x = ${x}: no output`}
            </PlaneLabel>
            <DragPoint
              value={scene.handle} xSpec={FX_SPEC} ySpec={HANDLE_Y_SPEC} grid={GRID} label={functionLabel(d)} hintId={hintId} role={scene.defined ? 'primary' : 'caution'}
              onChange={p => { if (p.x + 0 !== s.x) update({ ...s, x: p.x + 0 }); }} onCommit={() => undefined}
            />
          </CoordinatePlane>
          <span id={hintId} hidden>{hintText}</span>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The input, each step, the output, and the domain and image" legend="= exact · ≈ rounded to 6 decimals · the domain is every input the machine accepts, the image every output it can give" />
        </div>
      </div>
      <Pipeline evaluation={d.evaluation} tags={tags} label="The machine, step by step" name="main" />
      <p class="verdict" data-verdict data-agree={String(!caution)}>{functionVerdict(d)}</p>
      <div class="fn-table-wrap">
        <table class="fn-table" data-table="values">
          <caption>Some inputs and the outputs the machine gives. The current input is highlighted.</caption>
          <thead><tr><th scope="col">input <Formula tex="x" /></th><th scope="col">output <Formula tex="f(x)" /></th></tr></thead>
          <tbody>
            {table.map(r => (
              <tr key={rationalForm(r.x).text} data-current={String(r.current)} aria-current={r.current ? 'true' : undefined}>
                <td><Formula tex={rationalForm(r.x).tex} /></td>
                <td data-defined={String(r.y.kind !== 'undefined')}>{r.y.kind === 'undefined' ? <span>undefined</span> : <Formula tex={numTex(r.y)} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${FUNCTION_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <SegmentedControl<RuleId> legend="Rule" name={`${headingId}-rule`} options={RULE_CHOICES} value={s.rule} onChange={rule => update({ ...s, rule })} />
        <ParameterInput spec={aSpec(s.rule, s.a)} value={s.a} grid={{ kind: 'lattice', step: 1 }} onCommit={a => update({ ...s, a })} />
        <ParameterInput spec={FX_SPEC} value={s.x} grid={GRID} onCommit={xv => update({ ...s, x: xv })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function FunctionStage() {
  return (
    <IdScope name={'function'}>
      <FunctionStageInner />
    </IdScope>
  );
}
