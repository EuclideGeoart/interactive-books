/**
 * ArgminStage — min, arg min and np.argmin are three different answers to "where is the loss smallest?". A table of losses on a grid of
 * parameters marks every minimiser; the inspector shows the value, the set of points and NumPy's position side by side.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Formula } from '../../ui/Formula';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import {
  ARGMIN_PRESETS, B_PARAM, CANONICAL_ARGMIN, C_PARAM, LOSS_OPTIONS, argminCode, argminFormulas, argminPresetMatches, argminRows, argminSpoken, argminVerdict, deriveArgminLesson,
  type ArgminLessonDerived, type ArgminLessonState,
} from './argmin-lesson';
import { GRID_FREE } from './shared';

const signed = (n: number): string => (n < 0 ? `−${-n}` : String(n));

function ArgminStageInner() {
  const lesson = useLesson<ArgminLessonState, ArgminLessonDerived>(CANONICAL_ARGMIN, deriveArgminLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const rows = useMemo(() => argminRows(d), [d]);
  const formulas = useMemo(() => argminFormulas(d), [d]);
  const verdict = argminVerdict(d);
  const commit = (next: ArgminLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${argminSpoken(deriveArgminLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="argmin" data-hydrated={hydrated} data-kind={s.kind} data-c={s.c} data-b={s.b} data-min={d.d.minValue} data-argmin={d.d.argmin.join(',')} data-np-index={d.d.npIndex} data-tie={String(d.d.tie)}>
      <header class="stage-head">
        <h3 id={headingId}>Where is the loss smallest? <Formula tex="\argmin_{\theta}L(\theta)" /> against <Formula tex="\min_{\theta}L(\theta)" /></h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_ARGMIN)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {ARGMIN_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={argminPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls argmin-controls">
        <SegmentedControl legend="The loss is" name={`${headingId}-kind`} options={LOSS_OPTIONS} value={s.kind} onChange={kind => commit({ ...s, kind })} />
        <ParameterInput spec={C_PARAM} value={s.c} grid={GRID_FREE} onCommit={c => commit({ ...s, c })} />
        <ParameterInput spec={B_PARAM} value={s.b} grid={GRID_FREE} onCommit={b => commit({ ...s, b })} />
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <div class="loss-table-wrap">
            <table class="loss-table" data-loss-table>
              <caption>The loss at each grid point. Position is the index NumPy uses, counting from 0.</caption>
              <thead>
                <tr><th scope="col">position</th><th scope="col" aria-label="theta">θ</th><th scope="col" aria-label="L of theta">L(θ)</th><th scope="col">smallest?</th></tr>
              </thead>
              <tbody>
                {d.d.rows.map(r => (
                  <tr key={r.index} class={r.isMinimiser ? 'is-min' : undefined} data-row={r.index} data-minimiser={String(r.isMinimiser)} data-np={String(r.index === d.d.npIndex)}>
                    <th scope="row">{r.index}</th>
                    <td>{signed(r.theta)}</td>
                    <td>{r.loss}</td>
                    <td>{r.isMinimiser ? <><span aria-hidden="true">◀ </span>{r.index === d.d.npIndex ? 'minimiser, the one np.argmin reports' : 'minimiser'}</> : <span class="sr-only">no</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="diagram-note">Changing the offset b moves the minimum value but never the arg min: adding the same number to every loss cannot change which points are smallest.</p>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="min, arg min and np.argmin" legend="= exact" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{argminCode(d)}</code></pre>
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

export default function ArgminStage() {
  return (
    <IdScope name="argmin">
      <ArgminStageInner />
    </IdScope>
  );
}
