/**
 * NestedStage — a double sum over a grid of entries, added by two loops in either order. The trace has one frame per cell; the grid shows
 * which cells are already added, which one is being added, and which are not part of the sum (the upper triangle of a triangular sum).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { cursorAt, type TraceCursor } from '../../platform/trace';
import { form } from '../../math/summation/rational';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TraceStepper } from '../../ui/TraceStepper';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import {
  CANONICAL_NESTED, COLS_PARAM, KIND_OPTIONS, NESTED_PRESETS, ORDER_OPTIONS, ROWS_PARAM, RULE_OPTIONS, cellState, deriveNestedLesson, nestedCode, nestedFormulas,
  nestedGridDescription, nestedPresetMatches, nestedRows, nestedSpoken, nestedVerdict, type NestedLessonDerived, type NestedLessonState,
} from './nested-lesson';
import { GRID_FREE } from './shared';

const endOf = (d: NestedLessonDerived): TraceCursor => cursorAt(d.frames.length, d.frames.length - 1);

function NestedStageInner() {
  const lesson = useLesson<NestedLessonState, NestedLessonDerived>(CANONICAL_NESTED, deriveNestedLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [cursor, setCursor] = useState<TraceCursor>(() => endOf(d));
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  const gridDescId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const cur = cursor.count === d.frames.length ? cursor : endOf(d);
  const rows = useMemo(() => nestedRows(d), [d]);
  const formulas = useMemo(() => nestedFormulas(d), [d]);
  const verdict = nestedVerdict(d);
  const commit = (next: NestedLessonState) => {
    lesson.set(next);
    const nd = deriveNestedLesson(next);
    setCursor(endOf(nd));
    setAnnouncement(prev => `${nestedSpoken(nd)}${prev.endsWith('​') ? '' : '​'}`);
  };
  const cols = Array.from({ length: d.d.cols }, (_, j) => j + 1);
  const rowsIdx = Array.from({ length: s.n }, (_, i) => i + 1);

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="nested" data-hydrated={hydrated} data-kind={s.kind} data-rule={s.rule} data-order={s.order} data-n={s.n} data-cols={d.d.cols} data-cells={d.d.cellCount} data-total={form(d.d.total).text}>
      <header class="stage-head">
        <h3 id={headingId}>A sum inside a sum</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_NESTED)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {NESTED_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={nestedPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls nested-controls">
        <SegmentedControl legend="Cells in the sum" name={`${headingId}-kind`} options={KIND_OPTIONS} value={s.kind} onChange={kind => commit({ ...s, kind })} />
        <SegmentedControl legend="Add the cells" name={`${headingId}-order`} options={ORDER_OPTIONS} value={s.order} onChange={order => commit({ ...s, order })} />
        <SegmentedControl legend="Entries" name={`${headingId}-rule`} options={RULE_OPTIONS} value={s.rule} onChange={rule => commit({ ...s, rule })} />
        <ParameterInput spec={ROWS_PARAM} value={s.n} grid={GRID_FREE} onCommit={n => commit({ ...s, n, ...(s.kind === 'triangular' ? { k: n } : {}) })} />
        {s.kind === 'rectangular' && <ParameterInput spec={COLS_PARAM} value={s.k} grid={GRID_FREE} onCommit={k => commit({ ...s, k })} />}
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <div class="cell-grid-wrap">
            <table class="cell-grid" aria-describedby={gridDescId} data-cell-grid>
              <caption>Rows i, columns j. Totals of each row on the right, of each column underneath.</caption>
              <thead>
                <tr>
                  <td class="corner" aria-hidden="true"><span class="axis-a">i</span>↓ <span class="axis-b">j</span>→</td>
                  {cols.map(j => <th key={j} scope="col">{j}</th>)}
                  <th scope="col" class="total-head">row total</th>
                </tr>
              </thead>
              <tbody>
                {rowsIdx.map(i => (
                  <tr key={i}>
                    <th scope="row">{i}</th>
                    {cols.map(j => {
                      const st = cellState(d, cur.index, i, j);
                      return (
                        <td key={j} class={`cell is-${st}`} data-cell={`${i},${j}`} data-state={st} aria-current={st === 'current' ? 'step' : undefined}>
                          {st === 'outside' ? <><span aria-hidden="true">·</span><span class="sr-only">not in the sum</span></> : form(d.d.entries[i - 1]![j - 1]!).text}
                        </td>
                      );
                    })}
                    <td class="total" data-row-total={i}>{form(d.d.rowSums[i - 1]!).text}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">column total</th>
                  {cols.map(j => <td key={j} class="total" data-col-total={j}>{form(d.d.colSums[j - 1]!).text}</td>)}
                  <td class="total grand" data-grand-total>{form(d.d.total).text}</td>
                </tr>
              </tfoot>
            </table>
            <p id={gridDescId} class="sr-only">{nestedGridDescription(d)}</p>
          </div>
          <TraceStepper label="Cell by cell" frames={d.frames} cursor={cur} onCursor={setCursor} autoplay
            renderFrame={f => (<><FormulaScroll label="Cell update, scrollable" tex={f.state.tex} /><p class="trace-caption" data-caption>{f.state.caption}</p></>)}
            describeFrame={f => (f.state.c === 0 ? 'acc = 0' : `cell ${f.state.i}, ${f.state.j}: acc = ${f.state.afterText}`)} />
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The double sum in both orders" legend="= exact" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{nestedCode(s, d.d.cols)}</code></pre>
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={verdict.caution ? 'false' : 'true'}>{verdict.text}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function NestedStage() {
  return (
    <IdScope name="nested">
      <NestedStageInner />
    </IdScope>
  );
}
