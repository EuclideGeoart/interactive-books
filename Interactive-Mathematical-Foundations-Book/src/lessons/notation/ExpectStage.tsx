/**
 * ExpectStage — counts become probabilities, probabilities weight the values, and E[X] is their sum. All counts zero is undefined and says why.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Formula } from '../../ui/Formula';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { OUTCOMES } from '../../math/notation/expectation';
import {
  CANONICAL_EXPECT, COUNT_KEYS, COUNT_SPECS, EXPECT_PRESETS, SET_OPTIONS, deriveExpectLesson, expectCode, expectFormulas, expectPresetMatches, expectRows, expectSpoken, expectTable, expectVerdict,
  type ExpectLessonDerived, type ExpectLessonState,
} from './expect-lesson';
import { GRID_FREE } from './shared';

const signed = (n: number): string => (n < 0 ? `−${-n}` : String(n));

function ExpectStageInner() {
  const lesson = useLesson<ExpectLessonState, ExpectLessonDerived>(CANONICAL_EXPECT, deriveExpectLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const table = useMemo(() => expectTable(d), [d]);
  const rows = useMemo(() => expectRows(d), [d]);
  const formulas = useMemo(() => expectFormulas(d), [d]);
  const verdict = expectVerdict(d);
  const commit = (next: ExpectLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${expectSpoken(deriveExpectLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };
  const k = OUTCOMES[s.set].length;

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="expect" data-hydrated={hydrated} data-set={s.set} data-defined={String(d.d.defined)} data-total={d.d.total} data-expectation={d.d.expectation ? `${d.d.expectation.num}/${d.d.expectation.den}` : 'undefined'}>
      <header class="stage-head">
        <h3 id={headingId}>An average with weights: <Formula tex="\mathbb{E}[X]=\sum_i p_i x_i" /></h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_EXPECT)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {EXPECT_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={expectPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls expect-controls">
        <SegmentedControl legend="The values are" name={`${headingId}-set`} options={SET_OPTIONS} value={s.set} onChange={set => commit({ ...s, set })} />
        {COUNT_KEYS.slice(0, k).map((key, m) => <ParameterInput key={key} spec={{ ...COUNT_SPECS[m]!, name: `count of the value ${signed(OUTCOMES[s.set][m]!)}` }} value={s[key]} grid={GRID_FREE} onCommit={v => commit({ ...s, [key]: v })} />)}
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <div class="expect-table-wrap">
            <table class="expect-table" data-expect-table>
              <caption>Each value, how often it was seen, and its share of the total.</caption>
              <thead>
                <tr><th scope="col" aria-label="value x sub i">x<sub>i</sub></th><th scope="col" aria-label="count c sub i">c<sub>i</sub></th><th scope="col" aria-label="probability p sub i">p<sub>i</sub></th><th scope="col" aria-label="p sub i times x sub i">p<sub>i</sub>x<sub>i</sub></th></tr>
              </thead>
              <tbody>
                {table.map(r => (
                  <tr key={r.index} data-row={r.index} data-mode={String(r.mode && d.d.defined)}>
                    <th scope="row">{signed(r.value)}</th>
                    <td>{r.count}</td>
                    <td data-p={r.index}>{r.pText}</td>
                    <td>{r.weighted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="diagram-note">The probabilities are not typed in: they are the counts divided by their total. That division is the step that fails when every count is 0.</p>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Total, probabilities and expectation" legend="= exact · ≈ rounded to 6 decimals · ⚠ undefined" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{expectCode(d)}</code></pre>
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

export default function ExpectStage() {
  return (
    <IdScope name="expect">
      <ExpectStageInner />
    </IdScope>
  );
}
