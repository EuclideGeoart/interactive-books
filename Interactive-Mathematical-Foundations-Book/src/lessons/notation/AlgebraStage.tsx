/**
 * AlgebraStage — do the shapes fit? Rectangles drawn to scale for X in R^(n x d), a second operand and the product. The inner dimensions must be
 * equal; the outer dimensions are what remains. A mismatch is reported with the reason and no result is drawn.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Formula } from '../../ui/Formula';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import {
  ALGEBRA_PARAMS, ALGEBRA_PRESETS, CANONICAL_ALGEBRA, OP_OPTIONS, algebraCode, algebraDescription, algebraFormulas, algebraPresetMatches, algebraRows, algebraSpoken, algebraVerdict, boxesOf,
  deriveAlgebraLesson, usesP, usesQ, type AlgebraLessonDerived, type AlgebraLessonState,
} from './algebra-lesson';
import { GRID_FREE } from './shared';

const UNIT_REM = 1.15;

function AlgebraStageInner() {
  const lesson = useLesson<AlgebraLessonState, AlgebraLessonDerived>(CANONICAL_ALGEBRA, deriveAlgebraLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const boxes = useMemo(() => boxesOf(d), [d]);
  const rows = useMemo(() => algebraRows(d), [d]);
  const formulas = useMemo(() => algebraFormulas(d), [d]);
  const verdict = algebraVerdict(d);
  const commit = (next: AlgebraLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${algebraSpoken(deriveAlgebraLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="algebra" data-hydrated={hydrated} data-op={s.op} data-valid={String(d.d.valid)} data-result={d.d.resultTuple ?? 'undefined'}>
      <header class="stage-head">
        <h3 id={headingId}>Do the shapes fit?</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_ALGEBRA)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {ALGEBRA_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={algebraPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls shape-controls">
        <SegmentedControl legend="The product" name={`${headingId}-op`} options={OP_OPTIONS} value={s.op} onChange={op => commit({ ...s, op })} />
        <ParameterInput spec={ALGEBRA_PARAMS.n} value={s.n} grid={GRID_FREE} onCommit={n => commit({ ...s, n })} />
        <ParameterInput spec={ALGEBRA_PARAMS.d} value={s.d} grid={GRID_FREE} onCommit={dd => commit({ ...s, d: dd })} />
        {usesP(s.op) && <ParameterInput spec={s.op === 'matvec' ? ALGEBRA_PARAMS.pVector : ALGEBRA_PARAMS.pMatrix} value={s.p} grid={GRID_FREE} onCommit={p => commit({ ...s, p })} />}
        {usesQ(s.op) && <ParameterInput spec={ALGEBRA_PARAMS.q} value={s.q} grid={GRID_FREE} onCommit={q => commit({ ...s, q })} />}
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <div class="box-row" role="img" aria-label={algebraDescription(d)} data-boxes>
            {boxes.map((b, m) => (
              <div class="box-item" key={b.id + m}>
                {m > 0 && <span class="box-op" aria-hidden="true">{b.id === 'result' ? (s.op === 'transpose' ? '→' : '=') : '×'}</span>}
                <figure class={`mat-box${b.valid ? '' : ' is-bad'}`} data-box={b.id}>
                  <div class="mat-rect" style={{ width: `${b.cols * UNIT_REM}rem`, height: `${b.rows * UNIT_REM}rem` }} />
                  <figcaption><span class="mat-name">{b.name}</span> <span class="mat-size">{b.rows} × {b.cols}</span></figcaption>
                </figure>
              </div>
            ))}
            {!d.d.valid && <div class="box-item"><span class="box-op" aria-hidden="true">=</span><p class="box-missing" data-undefined><span aria-hidden="true">⚠ </span>undefined</p></div>}
          </div>
          <p class="diagram-note">Rectangles are drawn to scale. For a product the inner two sizes must be equal; the outer two are the shape of the result.</p>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The operands and the product" legend="= exact · ⚠ undefined" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{algebraCode(d)}</code></pre>
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!verdict.caution)}>{verdict.text}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
        <p class="formula-note"><Formula tex={d.d.expressionTex} /> is read: {s.op === 'matvec' ? 'X times w' : s.op === 'matmul' ? 'X times W' : s.op === 'transpose' ? 'X transpose' : 'X transpose X'}.</p>
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function AlgebraStage() {
  return (
    <IdScope name="algebra">
      <AlgebraStageInner />
    </IdScope>
  );
}
