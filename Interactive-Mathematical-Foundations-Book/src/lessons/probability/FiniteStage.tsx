import { useMemo, useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { ParameterInput } from '../../ui/ParameterInput';
import StageFrame, { MassBars } from './StageFrame';
import { deriveFiniteLesson, FINITE_CANONICAL, finitePreset, finiteSpecs, weightKey, type FiniteChapter, type FiniteState } from './finite-lesson';

function Inner({ chapter, worked }: { chapter: FiniteChapter; worked: boolean }) {
  const canonical = useMemo(() => chapter === 'independence' ? finitePreset('coins') : FINITE_CANONICAL, [chapter]);
  const derive = useMemo(() => (s: FiniteState) => deriveFiniteLesson(chapter, s), [chapter]);
  const lesson = useLesson(canonical, derive), state = lesson.state, d = lesson.derived;
  const [announcement, setAnnouncement] = useState(''), [error, setError] = useState('');
  const uid = useScopedId();
  const commit = (next: FiniteState) => {
    try { const value = derive(next); lesson.set(next); setError(''); setAnnouncement(`${value.view.description}${announcement.endsWith('​') ? '' : '​'}`); }
    catch (e) { setError((e as Error).message); }
  };
  return <StageFrame name={`${chapter}${worked ? '-worked' : ''}`} view={d.view} announcement={announcement} error={error} isCanonical={lesson.isCanonical}
    reset={() => commit(canonical)}
    board={<>{chapter === 'events' && <p>Outlined outcomes belong to {d.operationLabel}.</p>}<div class="prob-outcomes">{d.outcomeRows.map(row => <div key={row.index} class={`prob-outcome${(chapter === 'events' ? row.highlighted : row.inBoth) ? ' is-intersection' : ''}${chapter === 'conditional' && !row.inB ? ' is-excluded' : ''}`} data-outcome={row.label}>
      <strong>{row.label}</strong><small>Original P = {row.probability}</small>{chapter === 'events' && <small>{d.operationLabel}: {row.highlighted ? 'included' : 'excluded'}</small>}{chapter === 'conditional' && <small>Inside B: {row.conditional}</small>}
      <button type="button" aria-pressed={state.selected === row.index + 1} onClick={() => commit({ ...state, selected: row.index + 1 })}>Edit weight {row.weight}</button>
      <button type="button" aria-label={`Outcome ${row.label} in event A`} aria-pressed={row.inA} onClick={() => commit({ ...state, aMask: state.aMask ^ (1 << row.index) })}>A: {row.inA ? 'included' : 'excluded'}</button>
      <button type="button" aria-label={`Outcome ${row.label} in event B`} aria-pressed={row.inB} onClick={() => commit({ ...state, bMask: state.bMask ^ (1 << row.index) })}>B: {row.inB ? 'included' : 'excluded'}</button>
    </div>)}</div>{chapter === 'experiments' ? <><p>Observed sequence · first 16 at most</p><ol class="prob-observations" aria-label="Seeded observed outcomes">{d.observations.map((label, i) => <li key={i}>{label}</li>)}</ol>{d.moreTrials && <p>Remaining trials are included in the frequency inspector.</p>}</> : <MassBars items={d.masses} label="Original outcome probabilities" />}</>}
    controls={<><ParameterInput spec={finiteSpecs.weight} value={state[weightKey(state.selected)]} grid={{ kind: 'free' }} onCommit={w => commit({ ...state, [weightKey(state.selected)]: w })} />
      {chapter === 'events' && <label class="prob-selector" for={`${uid}-operation`}>Show event membership<select id={`${uid}-operation`} value={state.operation} onChange={e => commit({ ...state, operation: e.currentTarget.value as FiniteState['operation'] })}>{[['A', 'A'], ['B', 'B'], ['union', 'Union A ∪ B'], ['intersection', 'Intersection A ∩ B'], ['complement', 'Complement Aᶜ']].map(([value, label]) => <option value={value}>{label}</option>)}</select></label>}
      {chapter === 'experiments' && <><ParameterInput spec={finiteSpecs.seed} value={state.seed} grid={{ kind: 'free' }} onCommit={seed => commit({ ...state, seed })} /><ParameterInput spec={finiteSpecs.trials} value={state.trials} grid={{ kind: 'free' }} onCommit={trials => commit({ ...state, trials })} /><button type="button" onClick={() => commit({ ...state })} data-action="replay-samples">Replay seed</button></>}
      <div class="prob-presets">{[['uniform', 'Fair die'], ['weighted', 'Weighted die'], ['coins', 'Two fair coins'], ['empty-b', 'Zero mass B'], ['disjoint', 'Disjoint events'], ['zero-a', 'Empty A']].map(([id, label]) => <button type="button" key={id} data-preset={id} onClick={() => commit(finitePreset(id!))}>{label}</button>)}</div></>} />;
}
export default function FiniteStage({ chapter, worked = false }: { chapter: FiniteChapter; worked?: boolean }) {
  return <IdScope name={`probability-${chapter}${worked ? '-worked' : ''}`}><Inner chapter={chapter} worked={worked} /></IdScope>;
}
