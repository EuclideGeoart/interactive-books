import { useMemo, useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { ParameterInput } from '../../ui/ParameterInput';
import StageFrame from './StageFrame';
import PlotView from './PlotView';
import { deriveDistributionLesson, DISTRIBUTION_CANONICAL, distributionSpecs, type DistributionChapter, type DistributionState } from './distributions-lesson';

function Inner({ chapter, worked }: { chapter: DistributionChapter; worked: boolean }) {
  const derive = useMemo(() => (s: DistributionState) => deriveDistributionLesson(chapter, s), [chapter]), canonical = DISTRIBUTION_CANONICAL[chapter];
  const lesson = useLesson(canonical, derive), state = lesson.state, d = lesson.derived;
  const [announcement, setAnnouncement] = useState(''), [error, setError] = useState(''), uid = useScopedId();
  const commit = (s: DistributionState, announce = true) => { try { const result = derive(s); lesson.set(s); setError(''); if (announce) setAnnouncement(`${result.view.description}${announcement.endsWith('​') ? '' : '​'}`); } catch (e) { setError((e as Error).message); } };
  return <StageFrame name={`${chapter}${worked ? '-worked' : ''}`} view={d.view} announcement={announcement} error={error} isCanonical={lesson.isCanonical} reset={() => commit(canonical)}
    board={<><PlotView scene={d.densityScene} /><PlotView scene={d.cdfScene} /></>}
    controls={<>{chapter !== 'binomial' && <label class="prob-selector" for={`${uid}-mode`}>Probability representation<select id={`${uid}-mode`} value={state.mode} onChange={e => commit({ ...state, mode: e.currentTarget.value as DistributionState['mode'] })}>{chapter === 'representations' && <option value="discrete">Binomial PMF</option>}<option value="uniform">Uniform PDF</option><option value="normal">Gaussian PDF</option></select></label>}
      {d.fields.map(field => <ParameterInput key={field} spec={distributionSpecs[field]} value={state[field]} grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [field]: value })} />)}
      {chapter !== 'binomial' && <label class="prob-slider" for={`${uid}-lower`}>Move the lower interval bound<input id={`${uid}-lower`} data-probability-slider="lower" type="range" min="-20" max="35" step="0.01" value={state.lower} onInput={e => commit({ ...state, lower: Number(e.currentTarget.value) }, false)} onChange={e => commit({ ...state, lower: Number(e.currentTarget.value) })} /></label>}
      <div class="prob-presets">{chapter === 'binomial' ? <><button type="button" data-preset="bernoulli" onClick={() => commit({ ...canonical, n: 1, k: 1 })}>One Bernoulli trial</button><button type="button" data-preset="zero-p" onClick={() => commit({ ...canonical, p: 0 })}>p = 0</button><button type="button" data-preset="one-p" onClick={() => commit({ ...canonical, p: 100 })}>p = 1</button><button type="button" data-preset="impossible" onClick={() => commit({ ...canonical, k: 31 })}>Impossible k</button><button type="button" data-preset="empty" onClick={() => commit({ ...canonical, n: 0, k: 0 })}>Zero trials</button></>
        : <><button type="button" data-preset="uniform" onClick={() => commit({ ...canonical, mode: 'uniform', lower: -1, upper: 1 })}>Uniform area</button><button type="button" data-preset="normal" onClick={() => commit({ ...canonical, mode: 'normal', lower: -1, upper: 1 })}>Gaussian area</button><button type="button" data-preset="point" onClick={() => commit({ ...canonical, mode: 'normal', lower: 0, upper: 0 })}>One continuous point</button><button type="button" data-preset="narrow" onClick={() => commit({ ...canonical, mode: 'normal', sigma: .1, lower: -.1, upper: .1 })}>Density above one</button></>}</div></>} />;
}
export default function DistributionStage({ chapter, worked = false }: { chapter: DistributionChapter; worked?: boolean }) { return <IdScope name={`probability-${chapter}${worked ? '-worked' : ''}`}><Inner chapter={chapter} worked={worked} /></IdScope>; }
