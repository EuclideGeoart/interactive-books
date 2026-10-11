import { useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope } from '../../ui/ids';
import { ParameterInput } from '../../ui/ParameterInput';
import StageFrame, { MassBars } from './StageFrame';
import PlotView from './PlotView';
import { deriveVariableLesson, VARIABLE_CANONICAL, valueKey, variableWeightKey, variableSpecs, type VariableState } from './variables-lesson';

function Inner({ worked }: { worked: boolean }) {
  const lesson = useLesson(VARIABLE_CANONICAL, deriveVariableLesson), state = lesson.state, d = lesson.derived;
  const [announcement, setAnnouncement] = useState(''), [error, setError] = useState('');
  const commit = (s: VariableState) => { try { const result = deriveVariableLesson(s); lesson.set(s); setError(''); setAnnouncement(`${result.view.description}${announcement.endsWith('​') ? '' : '​'}`); } catch (e) { setError((e as Error).message); } };
  return <StageFrame name={`variables${worked ? '-worked' : ''}`} view={d.view} announcement={announcement} error={error} isCanonical={lesson.isCanonical} reset={() => commit(VARIABLE_CANONICAL)}
    board={<><div class="prob-outcomes">{d.outcomes.map(o => <div class="prob-outcome" key={o.face}><strong>Face {o.face} → {o.value}</strong><small>Mass = {o.mass}</small><button type="button" aria-pressed={state.selected === o.face} data-select-outcome={o.face} onClick={() => commit({ ...state, selected: o.face })}>Edit this mapping</button></div>)}</div><PlotView scene={d.scene} /><MassBars items={d.masses} label="Exact induced probability masses" /></>}
    controls={<><ParameterInput spec={variableSpecs[0]!} value={state[valueKey(state.selected)]} grid={{ kind: 'free' }} onCommit={v => commit({ ...state, [valueKey(state.selected)]: v })} /><ParameterInput spec={variableSpecs[1]!} value={state[variableWeightKey(state.selected)]} grid={{ kind: 'free' }} onCommit={w => commit({ ...state, [variableWeightKey(state.selected)]: w })} />
      <div class="prob-presets"><button type="button" data-preset="constant" onClick={() => commit({ ...VARIABLE_CANONICAL, v1: 2, v2: 2, v3: 2, v4: 2, v5: 2, v6: 2 })}>Every face maps to 2</button><button type="button" data-preset="distinct" onClick={() => commit({ ...VARIABLE_CANONICAL, v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6 })}>Distinct values</button></div></>} />;
}
export default function RandomVariableStage({ worked = false }: { worked?: boolean }) { return <IdScope name={`probability-variables${worked ? '-worked' : ''}`}><Inner worked={worked} /></IdScope>; }
