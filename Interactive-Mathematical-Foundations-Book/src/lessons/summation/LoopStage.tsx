/**
 * LoopStage — the same sum written five ways in Python, each one run. Only range(m, n + 1) visits exactly i = m, …, n; the others lose a
 * term, slide the whole window, or read the wrong entry of a zero-based list. A wrong loop returns a number without any warning.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { SEQ_INFO } from '../../math/summation/sequences';
import {
  CANONICAL_LOOPS, LOOP_M_PARAM, LOOP_N_PARAM, LOOP_PRESETS, LOOP_SEQS, deriveLoopLesson, loopPresetMatches, loopRows, loopSpoken, loopVerdict,
  type LoopLessonDerived, type LoopLessonState,
} from './loops-lesson';
import { GRID_FREE } from './shared';

const MARK = { correct: '✓', wrong: '✗', error: '!' } as const;
const WORD = { correct: 'Correct', wrong: 'Wrong total', error: 'Error' } as const;

function LoopStageInner() {
  const lesson = useLesson<LoopLessonState, LoopLessonDerived>(CANONICAL_LOOPS, deriveLoopLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  const seqLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const rows = useMemo(() => loopRows(d), [d]);
  const verdict = loopVerdict(d);
  const commit = (next: LoopLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${loopSpoken(deriveLoopLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="loops" data-hydrated={hydrated} data-seq={s.seq} data-m={s.m} data-n={s.n} data-right={d.cards.filter(c => c.status === 'correct').length}>
      <header class="stage-head">
        <h3 id={headingId}>Off by one: five loops, one sum</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_LOOPS)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div class="set-controls">
        <div>
          <p class="presets-label" id={presetLabelId}>Try these</p>
          <div class="presets" role="group" aria-labelledby={presetLabelId}>
            {LOOP_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={loopPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
          </div>
        </div>
        <div>
          <p class="presets-label" id={seqLabelId}>The terms a<sub>i</sub> are</p>
          <div class="presets seqs" role="group" aria-labelledby={seqLabelId}>
            {LOOP_SEQS.map(id => <button key={id} type="button" aria-label={SEQ_INFO[id].aria} aria-pressed={s.seq === id} data-seq={id} onClick={() => commit({ ...s, seq: id })}>{SEQ_INFO[id].label}</button>)}
          </div>
        </div>
      </div>
      <div class="stage-controls">
        <ParameterInput spec={LOOP_M_PARAM} value={s.m} grid={GRID_FREE} onCommit={n => commit({ ...s, m: n })} />
        <ParameterInput spec={LOOP_N_PARAM} value={s.n} grid={GRID_FREE} onCommit={n => commit({ ...s, n })} />
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <p class="py-label">The list of terms, zero-based: a[0] holds a<sub>1</sub></p>
          <pre class="py-code" data-code="list"><code>{d.listCode}</code></pre>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The correct sum" legend="= exact" />
        </div>
      </div>
      <ul class="variant-cards" aria-label="The five loops and what each one returns" data-variants>
        {d.cards.map(c => (
          <li key={c.id} class="variant-card" data-variant={c.id} data-status={c.status}>
            <h4><span class="mark" aria-hidden="true">{MARK[c.status]}</span> {c.title} <span class="status-word">{WORD[c.status]}</span></h4>
            <pre class="py-code"><code>{c.code}</code></pre>
            <dl class="variant-facts">
              <div><dt>i takes the values</dt><dd data-visited>{c.visited}</dd></div>
              <div><dt>terms added</dt><dd data-read>{c.read}</dd></div>
              <div><dt>result</dt><dd data-result>{c.result}</dd></div>
            </dl>
            <p class="variant-why">{c.explanation}</p>
          </li>
        ))}
      </ul>
      <p class="verdict" data-verdict data-agree={verdict.caution ? 'false' : 'true'}>{verdict.text}</p>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function LoopStage() {
  return (
    <IdScope name="loops">
      <LoopStageInner />
    </IdScope>
  );
}
