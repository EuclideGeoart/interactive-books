/**
 * IntervalStage — two intervals on the real line, one chosen operation, and a test point with a reason for its membership.
 *
 *   one lesson state (ends and their kinds, operation, x)  →  deriveIntervals  →  number line · inspector · reasons · formulas · verdict
 *
 * Every end is an exact decimal with at most two places; the controls reject anything finer instead of rounding it.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Grid } from '../../platform/params';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { NumberLine } from './NumberLine';
import {
  CANONICAL_INTERVALS, DECIMALS, END_EDITORS, END_OPTIONS, END_RANGE, INTERVAL_OP_INFO, INTERVAL_PRESETS, X_PARAM, deriveIntervals, intervalDescription, intervalFormulas,
  intervalPresetMatches, intervalRows, intervalSpoken, intervalVerdict, lineRows, membershipSentence, withEnd,
  type EndEditor, type IntervalOp, type IntervalsDerived, type IntervalsState,
} from './interval-lesson';

// a free grid: typed values are never snapped, and an arrow press moves by the parameter's own step (0.5)
const GRID: Grid = { kind: 'free' };

function IntervalStageInner() {
  const lesson = useLesson<IntervalsState, IntervalsDerived>(CANONICAL_INTERVALS, deriveIntervals);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  const opLabelId = useScopedId();
  const sliderId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const rows = useMemo(() => intervalRows(d), [d]);
  const line = useMemo(() => lineRows(d), [d]);
  const formulas = useMemo(() => intervalFormulas(d), [d]);
  const verdict = intervalVerdict(d);
  const commit = (next: IntervalsState) => {
    lesson.set(next);
    setAnnouncement(prev => `${intervalSpoken(deriveIntervals(next))}${prev.endsWith('​') ? '' : '​'}`);
  };
  const slide = (raw: string) => {
    const n = Math.round(Number(raw) * 10 ** DECIMALS) / 10 ** DECIMALS;
    if (Number.isFinite(n)) commit({ ...s, x: n + 0 });
  };

  const editor = (e: EndEditor) => {
    const kind = s[e.kindKey];
    return (
      <div class="end-editor" data-end-editor={e.valueKey} key={e.valueKey}>
        <SegmentedControl legend={`${e.side === 'left' ? 'Left' : 'Right'} end of ${e.set}`} name={`${headingId}-${e.valueKey}`} options={END_OPTIONS[e.side]} value={kind} onChange={k => commit(withEnd(s, e, { kind: k }))} />
        {kind === 'infinite'
          ? <p class="end-infinite" data-infinite={e.valueKey}>{e.side === 'left' ? 'No left end: the interval goes on to −∞.' : 'No right end: the interval goes on to ∞.'}</p>
          : <ParameterInput spec={e.spec} value={s[e.valueKey]} grid={GRID} onCommit={n => commit(withEnd(s, e, { value: n }))} />}
      </div>
    );
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="intervals" data-hydrated={hydrated} data-op={s.op} data-x={s.x} data-pieces={d.result.length} data-member={String(d.inResult.member)}>
      <header class="stage-head">
        <h3 id={headingId}>Intervals: is the end in or out?</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_INTERVALS)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div class="set-controls">
        <div>
          <p class="presets-label" id={presetLabelId}>Try these</p>
          <div class="presets" role="group" aria-labelledby={presetLabelId}>
            {INTERVAL_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={intervalPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
          </div>
        </div>
        <div>
          <p class="presets-label" id={opLabelId}>Show</p>
          <div class="presets ops" role="group" aria-labelledby={opLabelId}>
            {INTERVAL_OP_INFO.map(o => <button key={o.id} type="button" aria-label={o.aria} aria-pressed={s.op === o.id} data-op={o.id} onClick={() => commit({ ...s, op: o.id as IntervalOp })}>{o.label}</button>)}
          </div>
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <NumberLine rows={line} x={s.x} label="Intervals A, B and the result on the real number line" description={intervalDescription(d)} />
          <div class="slider-row">
            <label for={sliderId}>Slide the test point <span class="x-name">x</span></label>
            <input id={sliderId} type="range" min={END_RANGE.min} max={END_RANGE.max} step={0.05} value={s.x} data-slider="x" aria-valuetext={`x equals ${s.x}`} onInput={event => slide((event.currentTarget as HTMLInputElement).value)} />
          </div>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The two intervals and the result" legend="= exact (every end is an exact decimal, never a rounded double)" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={verdict.caution ? 'false' : 'true'}>{verdict.text}</p>
      <ul class="membership-list" aria-label="Is the test point in each set?" data-membership>
        <li data-set="a" data-member={String(d.inA.member)}>{membershipSentence('A', d.A, d.inA, d.x)}</li>
        <li data-set="b" data-member={String(d.inB.member)}>{membershipSentence('B', d.B, d.inB, d.x)}</li>
        <li data-set="result" data-member={String(d.inResult.member)}>{membershipSentence(INTERVAL_OP_INFO.find(o => o.id === s.op)!.label, d.result, d.inResult, d.x)}</li>
      </ul>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
      </div>
      <div class="end-editors">
        <fieldset class="interval-fieldset role-x" data-interval="A"><legend>Interval A</legend>{END_EDITORS.filter(e => e.set === 'A').map(editor)}</fieldset>
        <fieldset class="interval-fieldset role-y" data-interval="B"><legend>Interval B</legend>{END_EDITORS.filter(e => e.set === 'B').map(editor)}</fieldset>
      </div>
      <div class="stage-controls">
        <ParameterInput spec={X_PARAM} value={s.x} grid={GRID} onCommit={n => commit({ ...s, x: n })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function IntervalStage() {
  return (
    <IdScope name="intervals">
      <IntervalStageInner />
    </IdScope>
  );
}
