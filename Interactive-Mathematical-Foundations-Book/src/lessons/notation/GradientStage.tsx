/**
 * GradientStage — a preview of the notation of Part III, not a lesson in calculus. The gradient of f(θ) = θ₁² + 3θ₂² is a vector with the same shape
 * as θ (exact, "="); a finite difference computed in doubles only approximates each entry ("≈") and its error depends on the step h.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Formula } from '../../ui/Formula';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { formatApprox } from '../../platform/numeric/format';
import {
  CANONICAL_GRADIENT, GRADIENT_PRESETS, STEP_OPTIONS, T1_SPEC, T2_SPEC, deriveGradientLesson, errorTableNote, gradientCode, gradientFormulas, gradientPresetMatches, gradientRows,
  gradientSpoken, gradientVerdict, stepId, type GradientLessonDerived, type GradientLessonState,
} from './gradient-lesson';
import { GRID_FREE } from './shared';
import { FORMAT } from './view';

const errText = (v: number): string => formatApprox(v, FORMAT).text;

function GradientStageInner() {
  const lesson = useLesson<GradientLessonState, GradientLessonDerived>(CANONICAL_GRADIENT, deriveGradientLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const rows = useMemo(() => gradientRows(d), [d]);
  const formulas = useMemo(() => gradientFormulas(d), [d]);
  const verdict = gradientVerdict(d);
  const commit = (next: GradientLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${gradientSpoken(deriveGradientLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="gradient" data-hydrated={hydrated} data-t1={s.t1} data-t2={s.t2} data-step={s.e} data-shape={d.d.shapeTuple} data-best-step={d.bestE}>
      <header class="stage-head">
        <h3 id={headingId}>A gradient has the shape of θ: <Formula tex="\nabla_{\theta}f" /> against a finite difference</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_GRADIENT)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <p class="preview-note"><span aria-hidden="true">▸ </span>A preview of Part III, Calculus: this stage is about the notation (what <Formula tex="\nabla_{\theta}f" /> is, what shape it has, and what a numerical estimate of it looks like), not about how to differentiate.</p>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {GRADIENT_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={gradientPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls gradient-controls">
        <SegmentedControl legend="Step h" name={`${headingId}-step`} options={STEP_OPTIONS} value={stepId(s.e)} onChange={id => commit({ ...s, e: Number(id) })} />
        <ParameterInput spec={T1_SPEC} value={s.t1} grid={GRID_FREE} onCommit={t1 => commit({ ...s, t1 })} />
        <ParameterInput spec={T2_SPEC} value={s.t2} grid={GRID_FREE} onCommit={t2 => commit({ ...s, t2 })} />
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <div class="error-table-wrap">
            <table class="error-table" data-error-table>
              <caption>{errorTableNote}</caption>
              <thead>
                <tr><th scope="col">step h</th><th scope="col">error in θ₁</th><th scope="col">error in θ₂</th></tr>
              </thead>
              <tbody>
                {d.errors.map(r => (
                  <tr key={r.e} class={r.e === s.e ? 'is-current' : undefined} data-step-row={r.e} data-current={String(r.e === s.e)} data-best={String(r.e === d.bestE)}>
                    <th scope="row">10⁻{r.e}{r.e === s.e ? <span class="sr-only"> (chosen)</span> : null}{r.e === d.bestE ? <span class="tag"> smallest</span> : null}</th>
                    <td>≈ {errText(r.error1)}</td>
                    <td>≈ {errText(r.error2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="diagram-note">Every number in this table is a computed double, so every line says ≈. The exact gradient comes from the formula, not from any step.</p>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The gradient, exact and estimated" legend="= exact · ≈ computed, rounded to 6 decimals" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{gradientCode(d)}</code></pre>
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

export default function GradientStage() {
  return (
    <IdScope name="gradient">
      <GradientStageInner />
    </IdScope>
  );
}
