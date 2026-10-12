import { useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { ParameterInput } from '../../ui/ParameterInput';
import StageFrame, { MassBars } from './StageFrame';
import { BAYES_CANONICAL, bayesSpecs, deriveBayesLesson, type BayesState } from './bayes-lesson';

function Inner({ worked }: { worked: boolean }) {
  const lesson = useLesson(BAYES_CANONICAL, deriveBayesLesson), state = lesson.state, d = lesson.derived;
  const [announcement, setAnnouncement] = useState(''); const uid = useScopedId();
  const commit = (s: BayesState) => { lesson.set(s); setAnnouncement(`${deriveBayesLesson(s).view.verdict}${announcement.endsWith('​') ? '' : '​'}`); };
  return <StageFrame name={`bayes${worked ? '-worked' : ''}`} view={d.view} announcement={announcement} isCanonical={lesson.isCanonical} reset={() => commit(BAYES_CANONICAL)}
    board={<><MassBars items={d.priorMass} label="Prior mass (total one)" /><div class="prob-mini"><MassBars items={d.evidenceMass} label="Retained evidence mass (total P(E))" /></div>
      <div class="prob-mini">{d.posteriorMass ? <MassBars items={d.posteriorMass} label="Normalized posterior mass (total one)" /> : <p>Posterior undefined · impossible evidence</p>}</div>
      <div class="prob-table-wrap"><table class="prob-table"><caption>Expected population of 10,000 · fractional counts are expectations</caption><thead><tr><th scope="col">Group</th><th scope="col">Count</th><th scope="col">Mass</th></tr></thead><tbody>{d.counts.map(c => <tr key={c.label}><th scope="row">{c.label}</th><td>{c.count}</td><td>{c.mass}</td></tr>)}</tbody></table></div></>}
    controls={<>{bayesSpecs.map(spec => <ParameterInput key={spec.id} spec={spec} value={state[spec.id as 'prior' | 'sensitivity' | 'falsePositive']} grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [spec.id]: value })} />)}
      <label class="prob-selector" for={`${uid}-evidence`}>Observed evidence<select id={`${uid}-evidence`} value={state.evidence} onChange={e => commit({ ...state, evidence: e.currentTarget.value as BayesState['evidence'] })}><option value="positive">Positive quality flag</option><option value="negative">Negative quality flag</option></select></label>
      <label class="prob-slider" for={`${uid}-prior`}>Move the prior base rate<input id={`${uid}-prior`} data-probability-slider="prior" type="range" min="0" max="100" step="0.01" value={state.prior} onInput={e => lesson.set({ ...state, prior: Number(e.currentTarget.value) })} onChange={e => commit({ ...state, prior: Number(e.currentTarget.value) })} /></label>
      <div class="prob-presets"><button type="button" data-preset="rare" onClick={() => commit(BAYES_CANONICAL)}>Rare class</button><button type="button" data-preset="common" onClick={() => commit({ ...BAYES_CANONICAL, prior: 50 })}>Common class</button><button type="button" data-preset="impossible" onClick={() => commit({ ...BAYES_CANONICAL, sensitivity: 0, falsePositive: 0 })}>Impossible evidence</button><button type="button" data-preset="perfect" onClick={() => commit({ ...BAYES_CANONICAL, sensitivity: 100, falsePositive: 0 })}>Perfect flag</button></div></>} />;
}
export default function BayesStage({ worked = false }: { worked?: boolean }) { return <IdScope name={`probability-bayes${worked ? '-worked' : ''}`}><Inner worked={worked} /></IdScope>; }
