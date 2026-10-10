/**
 * IdentityStage — three rules for rewriting a sum, each checked by adding both sides with separate loops: linearity, the index shift (and the
 * wrong shift that moves the bounds but forgets to change the term), and Gauss's pairing for the whole numbers.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import {
  CANONICAL_IDENTITIES, ID_C_PARAM, ID_K_PARAM, ID_M_PARAM, ID_N_PARAM, IDENTITY_PRESETS, deriveIdentityLesson, gaussLines, identityPresetMatches, identityRows, identitySpoken,
  linearityFormulas, linearitySentence, shiftFormulas, shiftSentence, type IdentityLessonDerived, type IdentityLessonState,
} from './identity-lesson';
import { GRID_FREE } from './shared';

function IdentityStageInner() {
  const lesson = useLesson<IdentityLessonState, IdentityLessonDerived>(CANONICAL_IDENTITIES, deriveIdentityLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const rows = useMemo(() => identityRows(d), [d]);
  const lin = useMemo(() => linearityFormulas(d), [d]);
  const shift = useMemo(() => shiftFormulas(d), [d]);
  const pairing = useMemo(() => gaussLines(d), [d]);
  const shiftNote = shiftSentence(d);
  const commit = (next: IdentityLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${identitySpoken(deriveIdentityLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="identities" data-hydrated={hydrated} data-m={s.m} data-n={s.n} data-c={s.c} data-k={s.k}
      data-linear-holds={String(d.id.linearity.holds)} data-shift-holds={String(d.id.shift.holds)} data-wrong-holds={String(d.id.shift.wrongHolds)}>
      <header class="stage-head">
        <h3 id={headingId}>Rewriting a sum: three rules</h3>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_IDENTITIES)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {IDENTITY_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={identityPresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls">
        <ParameterInput spec={ID_M_PARAM} value={s.m} grid={GRID_FREE} onCommit={m => commit({ ...s, m })} />
        <ParameterInput spec={ID_N_PARAM} value={s.n} grid={GRID_FREE} onCommit={n => commit({ ...s, n })} />
        <ParameterInput spec={ID_C_PARAM} value={s.c} grid={GRID_FREE} onCommit={c => commit({ ...s, c })} />
        <ParameterInput spec={ID_K_PARAM} value={s.k} grid={GRID_FREE} onCommit={k => commit({ ...s, k })} />
      </div>
      <div class="stage-grid">
        <div class="stage-plane identity-panels">
          <section class="identity-panel" data-panel="linearity" aria-labelledby={`${headingId}-lin`}>
            <h4 id={`${headingId}-lin`}>Linearity</h4>
            <p class="panel-rule">The sum of c·i + i² can be split: pull the constant c out front and add the two sums separately.</p>
            {lin.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
            <p class="panel-result" data-result="linearity">{linearitySentence(d)}</p>
          </section>
          <section class="identity-panel" data-panel="shift" aria-labelledby={`${headingId}-shift`}>
            <h4 id={`${headingId}-shift`}>Shifting the index</h4>
            <p class="panel-rule">Renaming i as j − k moves both bounds by k. The term must change too.</p>
            {shift.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
            <p class="panel-result" data-result="shift" data-caution={String(shiftNote.caution)}>{shiftNote.text}</p>
          </section>
          <section class="identity-panel" data-panel="pairing" aria-labelledby={`${headingId}-gauss`}>
            <h4 id={`${headingId}-gauss`}>Gauss's pairing of m, …, n</h4>
            <p class="panel-rule">First with last, second with second last, and so on: every pair has the same sum.</p>
            <ul class="pair-list" aria-label="The pairs" data-pairs>
              {pairing.pairs.map(p => <li key={p.text}>{p.text}</li>)}
              {pairing.middle && <li class="middle" data-middle>{pairing.middle.text}</li>}
            </ul>
            <FormulaScroll label="The pairing formula, scrollable" tex={pairing.formulaTex} />
            <p class="panel-result" data-result="pairing">{pairing.sentence}</p>
          </section>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Both sides of each identity" legend="= exact (every sum is added exactly, never as a rounded double)" />
        </div>
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function IdentityStage() {
  return (
    <IdScope name="identities">
      <IdentityStageInner />
    </IdScope>
  );
}
