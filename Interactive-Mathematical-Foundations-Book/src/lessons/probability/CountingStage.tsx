import { useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { ParameterInput } from '../../ui/ParameterInput';
import StageFrame from './StageFrame';
import { COUNTING_CANONICAL, countingSpecs, deriveCountingLesson, type CountingState } from './counting-lesson';

function Inner({ worked }: { worked: boolean }) {
  const lesson = useLesson(COUNTING_CANONICAL, deriveCountingLesson), state = lesson.state, d = lesson.derived;
  const [announcement, setAnnouncement] = useState(''), uid = useScopedId();
  const commit = (s: CountingState) => { lesson.set(s); setAnnouncement(`${deriveCountingLesson(s).view.description}${announcement.endsWith('​') ? '' : '​'}`); };
  return <StageFrame name={`counting${worked ? '-worked' : ''}`} view={d.view} announcement={announcement} isCanonical={lesson.isCanonical} reset={() => commit(COUNTING_CANONICAL)}
    board={<><p>First 12 selections at most · labels A through H</p><ol class="prob-selections">{d.examples.map((example, i) => <li key={i}><strong>{example.label}</strong><br />{example.arrangements} ordering(s) · P = {example.probability}</li>)}</ol>{d.model.impossible && <p>No outcomes under this rule.</p>}</>}
    controls={<>{countingSpecs.map(spec => <ParameterInput key={spec.id} spec={spec} value={state[spec.id as 'n' | 'k']} grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [spec.id]: value })} />)}
      <label class="prob-selector" for={`${uid}-order`}>Does order matter?<select id={`${uid}-order`} value={String(state.ordered)} onChange={e => commit({ ...state, ordered: e.currentTarget.value === 'true' })}><option value="true">Ordered</option><option value="false">Unordered</option></select></label>
      <label class="prob-selector" for={`${uid}-replace`}>Replacement<select id={`${uid}-replace`} value={String(state.replacement)} onChange={e => commit({ ...state, replacement: e.currentTarget.value === 'true' })}><option value="false">Without</option><option value="true">With</option></select></label>
      <div class="prob-presets"><button type="button" data-preset="unordered" onClick={() => commit({ ...COUNTING_CANONICAL, ordered: false })}>Ignore order</button><button type="button" data-preset="replacement" onClick={() => commit({ ...COUNTING_CANONICAL, ordered: false, replacement: true })}>Unequal multiset masses</button><button type="button" data-preset="empty" onClick={() => commit({ ...COUNTING_CANONICAL, k: 0 })}>Zero draws</button><button type="button" data-preset="impossible" onClick={() => commit({ ...COUNTING_CANONICAL, n: 2, k: 4 })}>Impossible selection</button></div></>} />;
}
export default function CountingStage({ worked = false }: { worked?: boolean }) { return <IdScope name={`probability-counting${worked ? '-worked' : ''}`}><Inner worked={worked} /></IdScope>; }
