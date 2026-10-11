import { useMemo, useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { ParameterInput } from '../../ui/ParameterInput';
import StageFrame from './StageFrame';
import PlotView from './PlotView';
import { deriveMomentsLesson, MOMENTS_CANONICAL, momentsSpecs, type MomentsChapter, type MomentsState } from './moments-lesson';

function Inner({ chapter, worked }: { chapter: MomentsChapter; worked: boolean }) {
  const derive = useMemo(() => (state: MomentsState) => deriveMomentsLesson(chapter, state), [chapter]);
  const lesson = useLesson(MOMENTS_CANONICAL, derive), state = lesson.state, d = lesson.derived;
  const [announcement, setAnnouncement] = useState(''), [error, setError] = useState(''), uid = useScopedId();
  const commit = (s: MomentsState) => { try { const next = derive(s); lesson.set(s); setError(''); setAnnouncement(`${next.view.verdict}${announcement.endsWith('​') ? '' : '​'}`); } catch (e) { setError((e as Error).message); } };
  return <StageFrame name={`${chapter}${worked ? '-worked' : ''}`} view={d.view} announcement={announcement} error={error} isCanonical={lesson.isCanonical} reset={() => commit(MOMENTS_CANONICAL)}
    board={<><PlotView scene={d.scene} />{chapter === 'variance' && <div class="prob-squares" role="group" aria-label="Squared distances on one common length scale">{d.squares.map(square => <div><strong>{square.label}</strong><div class="prob-square-box"><span class="prob-square" style={{ width: `${square.side}px`, height: `${square.side}px` }} aria-hidden="true" /></div><small>Area = {square.squared}<br />Weighted area = {square.contribution}</small></div>)}</div>}
      <div class="prob-table-wrap"><table class="prob-table"><caption>{chapter === 'expectation' ? 'The exact weighted sum' : 'Exact distances and weighted squared contributions'}</caption><thead><tr><th scope="col">x</th><th scope="col">p</th><th scope="col">{chapter === 'expectation' ? 'p·x' : 'x − μ'}</th>{chapter === 'variance' && <th scope="col">p·(x − μ)²</th>}</tr></thead><tbody>{d.table.map((row, i) => <tr key={i}><td>{row.value}</td><td>{row.mass}</td><td>{chapter === 'expectation' ? row.term : row.deviation}</td>{chapter === 'variance' && <td>{row.varianceTerm}</td>}</tr>)}</tbody></table></div></>}
    controls={<>{momentsSpecs.map(spec => <ParameterInput key={spec.id} spec={spec} value={state[spec.id as keyof MomentsState]} grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [spec.id]: value })} />)}
      <label class="prob-slider" for={`${uid}-x3`}>Move the third population value<input id={`${uid}-x3`} data-probability-slider="x3" type="range" min="-5" max="5" step="0.01" value={state.x3} onInput={e => { try { const s = { ...state, x3: Number(e.currentTarget.value) }; derive(s); lesson.set(s); } catch (e) { setError((e as Error).message); } }} onChange={e => commit({ ...state, x3: Number(e.currentTarget.value) })} /></label>
      <div class="prob-presets"><button type="button" data-preset="constant" onClick={() => commit({ ...MOMENTS_CANONICAL, x1: 2, x2: 2, x3: 2 })}>Zero variance</button><button type="button" data-preset="shifted" onClick={() => commit({ ...MOMENTS_CANONICAL, shift: 2 })}>Shift by 2</button><button type="button" data-preset="reversed" onClick={() => commit({ ...MOMENTS_CANONICAL, scale: -2 })}>Scale by −2</button></div></>} />;
}
export default function MomentsStage({ chapter, worked = false }: { chapter: MomentsChapter; worked?: boolean }) { return <IdScope name={`probability-${chapter}${worked ? '-worked' : ''}`}><Inner chapter={chapter} worked={worked} /></IdScope>; }
