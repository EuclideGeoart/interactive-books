/**
 * SumStage — the hero. A sum Σ_{i=m}^{n} a_i is a loop that adds one term at a time to an accumulator.
 *
 *   one lesson state (sequence, m, n, r, list)  →  deriveSumLesson  →  trace of the accumulator · term table · inspector · formulas · Python
 *
 * The trace has terms + 1 frames: frame 0 is acc = 0 before the loop, frame k is the state after the k-th term. It can be stepped, scrubbed or
 * played (autoplay is user-started and pausable). When a term does not exist the trace ends with an error frame and the sum is undefined.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { cursorAt, type TraceCursor } from '../../platform/trace';
import { form } from '../../math/summation/rational';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { TraceStepper } from '../../ui/TraceStepper';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { ListInput } from './ListInput';
import {
  CANONICAL_SUM, M_PARAM, N_PARAM, R_PARAM, SEQ_OPTIONS, SUM_PRESETS, deriveSumLesson, loopCode, sumDescription, sumFormulas, sumPresetMatches, sumRows, sumSpoken, sumVerdict,
  type SumLessonDerived, type SumLessonState,
} from './sum-lesson';
import { GRID_FREE } from './shared';

const endOf = (d: SumLessonDerived): TraceCursor => cursorAt(d.frames.length, d.frames.length - 1);

function SumStageInner() {
  const lesson = useLesson<SumLessonState, SumLessonDerived>(CANONICAL_SUM, deriveSumLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [cursor, setCursor] = useState<TraceCursor>(() => endOf(d));
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  const seqLabelId = useScopedId();
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => setHydrated(true), []);

  const cur = cursor.count === d.frames.length ? cursor : endOf(d);
  const rows = useMemo(() => sumRows(d), [d]);
  const formulas = useMemo(() => sumFormulas(d), [d]);
  const verdict = sumVerdict(d);
  const commit = (next: SumLessonState) => {
    lesson.set(next);
    const nd = deriveSumLesson(next);
    setCursor(endOf(nd));
    setAnnouncement(prev => `${sumSpoken(nd)}${prev.endsWith('​') ? '' : '​'}`);
  };

  // keep the current row of the term table in view by scrolling the table itself (never the page)
  useEffect(() => {
    const box = tableRef.current;
    const row = box?.querySelector<HTMLElement>('tr[data-state="current"]');
    if (box && row) box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 2 + row.offsetHeight / 2);
  }, [cur.index, d]);

  const rowState = (j: number): 'done' | 'current' | 'todo' | 'unreached' => {
    if (j + 1 >= d.frames.length) return 'unreached';
    if (j + 1 < cur.index) return 'done';
    return j + 1 === cur.index ? 'current' : 'todo';
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="sum" data-hydrated={hydrated} data-seq={s.seq} data-m={s.m} data-n={s.n} data-count={d.d.count} data-empty={String(d.d.empty)} data-total={sumDescription(d)} data-defined={String(d.d.total !== null)}>
      <header class="stage-head">
        <h2 id={headingId}>A sum is a loop</h2>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_SUM)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div class="set-controls">
        <div>
          <p class="presets-label" id={presetLabelId}>Try these</p>
          <div class="presets" role="group" aria-labelledby={presetLabelId}>
            {SUM_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={sumPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
          </div>
        </div>
        <div>
          <p class="presets-label" id={seqLabelId}>The terms a<sub>i</sub> are</p>
          <div class="presets seqs" role="group" aria-labelledby={seqLabelId}>
            {SEQ_OPTIONS.map(o => <button key={o.id} type="button" aria-label={o.aria} aria-pressed={s.seq === o.id} data-seq={o.id} onClick={() => commit({ ...s, seq: o.id })}>{o.label}</button>)}
          </div>
        </div>
      </div>
      <div class="stage-controls">
        <ParameterInput spec={M_PARAM} value={s.m} grid={GRID_FREE} onCommit={n => commit({ ...s, m: n })} />
        <ParameterInput spec={N_PARAM} value={s.n} grid={GRID_FREE} onCommit={n => commit({ ...s, n })} />
        {s.seq === 'geometric' && <ParameterInput spec={R_PARAM} value={s.r} grid={GRID_FREE} onCommit={r => commit({ ...s, r })} />}
        {s.seq === 'list' && <ListInput value={s.list} onCommit={list => commit({ ...s, list })} />}
      </div>
      <div class="stage-grid">
        <div class="stage-plane sum-plane">
          <div class="formula-panel" role="group" aria-label="The sum written out">
            {formulas.slice(0, 1).map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
          </div>
          <TraceStepper label="Running sum" frames={d.frames} cursor={cur} onCursor={setCursor} autoplay
            renderFrame={f => (<><FormulaScroll label="Accumulator update, scrollable" tex={f.state.tex} /><p class="trace-caption" data-caption data-frame-error={f.state.error !== null ? 'true' : undefined}>{f.state.caption}</p></>)}
            describeFrame={f => (f.state.k === 0 ? 'acc = 0' : f.state.error !== null ? `a ${f.state.i} does not exist` : `acc = ${f.state.afterText}`)} />
          <div class="term-table" ref={tableRef} role="region" tabIndex={0} aria-label="Terms of the sum and the running total, scrollable" data-terms>
            <table>
              <caption class="sr-only">The terms a_i for i from {s.m} to {s.n} and the accumulator after each one</caption>
              <thead><tr><th scope="col">i</th><th scope="col">a<sub>i</sub></th><th scope="col">acc after</th></tr></thead>
              <tbody>
                {d.d.rows.map((row, j) => {
                  const st = rowState(j);
                  const shown = st === 'done' || st === 'current';
                  const after = d.frames[j + 1]?.state;
                  return (
                    <tr key={row.i} data-row={row.i} data-state={st} aria-current={st === 'current' ? 'step' : undefined}>
                      <th scope="row">{row.i}</th>
                      <td>{row.term === null ? <span class="missing">undefined</span> : form(row.term).text}</td>
                      <td>{!shown ? <span class="pending">–</span> : after?.error ? <span class="missing">stops here</span> : after?.afterText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The sum and its closed form" legend="= exact (every term and every sum is an exact fraction, never a rounded double)" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{loopCode(d)}</code></pre>
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={verdict.caution ? 'false' : 'true'}>{verdict.text}</p>
      {formulas.length > 1 && (
        <div class="formula-panel" role="group" aria-label="Live formulas">
          {formulas.slice(1).map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
        </div>
      )}
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function SumStage() {
  return (
    <IdScope name="sum">
      <SumStageInner />
    </IdScope>
  );
}
