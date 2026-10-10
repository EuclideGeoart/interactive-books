/**
 * SetsStage — two subsets of U = {1, …, 12}, one chosen operation, and the identities that always hold.
 *
 *   one lesson state (A, B, operation)  →  deriveSets  →  Venn · inspector · subset facts · identity formulas · verdict
 *
 * Membership is changed by pressing the numbered buttons (each a native toggle button), never by drawing in the Venn, so the whole stage
 * works from a keyboard and a screen reader. The Venn is a picture of the state, not a control.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { UNIVERSE } from '../../math/sets/finite';
import { Venn } from './Venn';
import {
  CANONICAL_SETS, OPS, SETS_PRESETS, chipLabel, deriveSets, hasItem, presetMatches, setsFacts, setsFormulas, setsRows, setsSpoken, setsVerdict, toggleItem,
  type SetOp, type SetsDerived, type SetsState,
} from './sets-lesson';

function SetsStageInner({ variant }: { variant: 'hero' | 'full' }) {
  const lesson = useLesson<SetsState, SetsDerived>(CANONICAL_SETS, deriveSets);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const opLabelId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const rows = useMemo(() => setsRows(d), [d]);
  const facts = useMemo(() => setsFacts(d), [d]);
  const formulas = useMemo(() => setsFormulas(d), [d]);
  const commit = (next: SetsState) => {
    lesson.set(next);
    setAnnouncement(prev => `${setsSpoken(deriveSets(next))}${prev.endsWith('​') ? '' : '​'}`);
  };
  const Heading = variant === 'hero' ? 'h2' : 'h3';
  const chips = (set: 'A' | 'B') => {
    const mask = set === 'A' ? s.a : s.b;
    return UNIVERSE.map(i => {
      const member = hasItem(mask, i);
      return (
        <button key={i} type="button" class="chip" aria-pressed={member} aria-label={chipLabel(set, i, member)} data-set={set} data-element={i}
          onClick={() => commit(set === 'A' ? { ...s, a: toggleItem(s.a, i) } : { ...s, b: toggleItem(s.b, i) })}>{i}</button>
      );
    });
  };

  return (
    <section class={`stage stage-${variant}`} aria-labelledby={headingId} data-stage="sets" data-hydrated={hydrated} data-op={s.op} data-a={d.A.join(',')} data-b={d.B.join(',')} data-result={d.selected.join(',')}>
      <header class="stage-head">
        <Heading id={headingId}>{variant === 'hero' ? 'Try it: two sets inside a universe' : 'Build two sets and combine them'}</Heading>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_SETS)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div class="set-controls">
        <div>
          <p class="presets-label" id={`${presetLabelId}`}>Or start from</p>
          <div class="presets" role="group" aria-labelledby={presetLabelId}>
            {SETS_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={presetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
          </div>
        </div>
        <div>
          <p class="presets-label" id={opLabelId}>Show</p>
          <div class="presets ops" role="group" aria-labelledby={opLabelId}>
            {OPS.map(o => <button key={o.id} type="button" aria-label={o.aria} aria-pressed={s.op === o.id} data-op={o.id} onClick={() => commit({ ...s, op: o.id as SetOp })}>{o.label}</button>)}
          </div>
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <Venn d={d} />
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Sizes and the selected result" legend="= exact (every statement about finite sets is exact)" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree="true">{setsVerdict(d)}</p>
      <div class="chip-rows">
        <fieldset class="chip-set role-x" data-chip-set="A">
          <legend>Elements of <span class="chip-name">A</span></legend>
          <div class="chips">{chips('A')}</div>
        </fieldset>
        <fieldset class="chip-set role-y" data-chip-set="B">
          <legend>Elements of <span class="chip-name">B</span></legend>
          <div class="chips">{chips('B')}</div>
        </fieldset>
      </div>
      {variant === 'full' && (
        <div class="fact-list-wrap">
          <ul class="fact-list" aria-label="True or false about A and B">
            {facts.map(f => <li key={f.id} data-fact={f.id} data-holds={f.holds}><span class="mark" aria-hidden="true">{f.holds ? '✓' : '✗'}</span><strong>{f.claim}</strong> is {f.holds ? 'true' : 'false'}: {f.why}.</li>)}
          </ul>
          <div class="formula-panel" role="group" aria-label="Identities that hold for every pair of sets">
            {formulas.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
          </div>
        </div>
      )}
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function SetsStage({ variant = 'full' }: { variant?: 'hero' | 'full' }) {
  return (
    <IdScope name={`sets-${variant}`}>
      <SetsStageInner variant={variant} />
    </IdScope>
  );
}
