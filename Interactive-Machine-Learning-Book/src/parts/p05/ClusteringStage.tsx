import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import NumberField from '../../ui/NumberField';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import TraceStepper from '../../ui/TraceStepper';
import type { TraceFrame } from '../../platform/trace';
import { lloydStep, editLloyd, type Vec, type Linkage } from './model/clustering';
import { labTrace, deriveLab, editCoordinate, initialLab, pointerCoordinate, reseed, scenario, shown, type LabState, type Mode } from './lesson';
import './stage.css';
export default function ClusteringStage({ scope, mode }: { scope: string; mode: Mode }) {
  return <IdScope name={scope}><Experiment mode={mode} /></IdScope>;
}
function Experiment({ mode }: { mode: Mode }) {
  const canonical = useMemo(() => initialLab(mode), [mode]);
  const [width, setWidth] = useState(560), plot = useRef<SVGSVGElement>(null);
  const derive = useCallback((s: LabState) => deriveLab(s, width), [width]);
  const lesson = useLesson(canonical, derive), a = lesson.derived, s = a.state;
  const latest = useRef(a); latest.current = a;
  const [frames, setFrames] = useState<readonly TraceFrame<LabState>[] | null>(null), [index, setIndex] = useState(0), [revision, revise] = useState(0);
  const [kind, setKind] = useState<'point' | 'center'>(mode === 'alternatives' ? 'point' : 'center'), [selected, select] = useState(0), [reason, reject] = useState(''), [announcement, announce] = useState('');
  // Selection changes paint order; pointer capture keeps its keyed node in place.
  const [frontId, setFront] = useState(0);
  const epoch = useRef(0), drag = useRef<{ pointer: number; index: number; kind: 'point' | 'center'; epoch: number; node: SVGCircleElement } | null>(null);
  const uid = useScopedId();
  useEffect(() => { const svg = plot.current!; const measure = () => { const w = svg.getBoundingClientRect().width; if (w > 0) setWidth(w); }; measure(); const observer = new ResizeObserver(measure); observer.observe(svg); return () => observer.disconnect(); }, []);
  function cancelDrag() { epoch.current++; const held = drag.current; drag.current = null; if (held?.node.hasPointerCapture(held.pointer)) held.node.releasePointerCapture(held.pointer); }
  function accept(next: LabState, speak = true) {
    const derived = derive(next); latest.current = derived; lesson.set(next); setFrames(null); setIndex(0); reject('');
    if (speak) { cancelDrag(); announce(derived.speech); } return derived;
  }
  function attempt(action: () => void) { try { action(); } catch (error) { reject(error instanceof Error ? error.message : 'Edit rejected.'); } }
  function reset() { cancelDrag(); accept(canonical); select(0); setFront(0); setKind(mode === 'alternatives' ? 'point' : 'center'); revise(v => v + 1); }
  function seek(i: number) { const frame = frames?.[i]; if (!frame) return; cancelDrag(); lesson.set(frame.state); latest.current = derive(frame.state); setIndex(i); revise(v => v + 1); reject(''); announce(`Frame ${i + 1}. ${latest.current.speech}`); }
  function replay() {
    attempt(() => { const next = labTrace(s, mode);
      cancelDrag(); next.forEach(f => derive(f.state)); setFrames(next); setIndex(0); lesson.set(next[0]!.state); revise(v => v + 1); reject(''); announce('Replay begins. ' + derive(next[0]!.state).speech); });
  }
  const targets = kind === 'center' ? a.centers : a.points;
  const selectedIndex = Math.min(selected, targets.length - 1), coordinate = targets[selectedIndex]!.x;
  const frontIndex = Math.min(frontId, targets.length - 1);
  const handles = targets.map((point, index) => ({ point, index }));
  const handleOrder = [...handles.filter(h => h.index !== frontIndex), ...handles.filter(h => h.index === frontIndex)];
  function move(k: 'point' | 'center', i: number, x: Vec, speak = true) { return accept(editCoordinate(latest.current.state, k, i, x), speak); }
  function finish(event: TargetedPointerEvent<SVGCircleElement>) {
    const held = drag.current; if (!held || held.pointer !== event.pointerId || held.node !== event.currentTarget) return;
    drag.current = null; if (held.node.hasPointerCapture(held.pointer)) held.node.releasePointerCapture(held.pointer);
    if (held.epoch === epoch.current) announce('Drag finished. ' + latest.current.speech);
  }
  const numeric = (label: string, value: number, min: number, max: number, onCommit: (v: number) => void, step = .1) => <NumberField key={`${revision}-${label}`} label={label} value={value} min={min} max={max} step={step} onCommit={onCommit} />;
  return <div data-p05 data-mode={mode} data-state={JSON.stringify(s)} data-objective={a.lloyd.objective} data-nearest-objective={a.lloyd.nearestObjective} data-proposed-objective={a.lloyd.proposedObjective} data-labels={JSON.stringify(a.lloyd.labels)}>
    <div class="p05-heading"><h2>{mode === 'alternatives' ? 'What makes a cluster?' : 'Distance → assignment → mean'}</h2><button onClick={reset}>Reset experiment</button></div>
    <p data-provenance>Hand-authored, unitless toy observations. Labels identify groups; they have no numerical order.</p>
    <div class="p05-layout"><div>
      <svg ref={plot} viewBox="0 0 560 560" data-cluster-plane role="group" aria-labelledby={`${uid}-title ${uid}-desc`}>
        <title id={`${uid}-title`}>Feature plane with {kind === 'center' ? 'draggable centroids' : 'draggable observations'}</title>
        <desc id={`${uid}-desc`}>Axes use raw coordinates and equal scale, −5 to 5. Group numbers and the tables supplement color. Arrow keys move a handle by 0.1; Shift uses 0.5.</desc>
        <g class="p05-axes"><line x1="70" y1="280" x2="490" y2="280"/><line x1="280" y1="70" x2="280" y2="490"/></g>
        <g font-size={a.fontSize} class="p05-labels" aria-hidden="true">{[-4,-2,0,2,4].map(v => <><text x={280+42*v} y="520" text-anchor="middle">{v}</text><text x="25" y={285-42*v}>{v}</text></>)}<text x="280" y="552" text-anchor="middle">x₁ · raw units</text><text x="18" y="45">x₂</text></g>
        {mode !== 'alternatives' && a.points.map((p,i) => { const c = a.centers[a.lloyd.labels[i]!]!; return <line data-assignment-link={p.id} x1={p.cx} y1={p.cy} x2={c.cx} y2={c.cy} class="p05-link"/>; })}
        {mode === 'alternatives' && <ellipse data-neighborhood-ring cx={a.points[Math.min(selected,a.points.length-1)]!.cx} cy={a.points[Math.min(selected,a.points.length-1)]!.cy} rx={42*s.epsilon*s.lloyd.scales[0]} ry={42*s.epsilon*s.lloyd.scales[1]} class="p05-radius"/>}
        {a.points.map((p,i) => <g data-point-id={p.id} data-x={p.x[0]} data-y={p.x[1]} data-cx={p.cx} data-cy={p.cy}><title>{p.id}; coordinates {p.x.join(", ")}; {p.kind}; cluster {mode === 'alternatives' ? p.densityLabel : p.cluster}</title>{mode !== 'alternatives' || p.kind === 'core' ? <circle cx={p.cx} cy={p.cy} r="6" class="p05-point"/> : <path class={p.kind === 'border' ? "p05-border" : "p05-noise"} d={p.kind === 'border' ? `M${p.cx},${p.cy-7}L${p.cx+7},${p.cy}L${p.cx},${p.cy+7}L${p.cx-7},${p.cy}Z` : `M${p.cx-6},${p.cy-6}L${p.cx+6},${p.cy+6}M${p.cx-6},${p.cy+6}L${p.cx+6},${p.cy-6}`}/>} {mode !== 'alternatives' && <text x={p.cx+9} y={p.cy-12-a.points.slice(0,i).filter(q=>q.cx===p.cx && q.cy===p.cy).length*(a.fontSize+4)} font-size={a.fontSize} class="p05-labels">{p.id}:{p.cluster}</text>}</g>)}
        {mode === 'alternatives' && <g><line class="p05-guide" x1="280" y1="85" x2={a.points[selectedIndex]!.cx} y2={a.points[selectedIndex]!.cy}/><text data-selected-label x="280" y="60" text-anchor="middle" font-size={a.fontSize} class="p05-labels">{a.points[selectedIndex]!.id} · {a.points[selectedIndex]!.kind}</text></g>}
        {mode !== 'alternatives' && a.centers.map(c => <g><path class="p05-center" data-center={c.index} d={`M${c.cx},${c.cy-9}L${c.cx+9},${c.cy}L${c.cx},${c.cy+9}L${c.cx-9},${c.cy}Z`}/><text x={Math.min(440,c.cx+12)} y={Math.min(490,c.cy+24+a.centers.slice(0,c.index).filter(q=>q.cx===c.cx && q.cy===c.cy).length*(a.fontSize+4))} font-size={a.fontSize} class="p05-labels">c{c.index}</text></g>)}
        {/* Native casing is required when the SVG ontouchstart property is absent. */}
        {handleOrder.map(({point:p,index:i}) => <circle key={kind+':'+i} data-handle={i} class="p05-handle" cx={p.cx} cy={p.cy} r={a.hitRadius} tabindex={0} role="button" aria-label={`${kind === 'center' ? 'Centroid' : 'Observation'} ${i}; x ${p.x[0]}, y ${p.x[1]}. Arrow keys move; numeric fields give the same edit.`}
          {...{ ontouchstart: (event: TouchEvent) => event.preventDefault() }}
          onFocus={() => select(i)} onPointerDown={event => { cancelDrag(); select(i); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { pointer: event.pointerId, index: i, kind, epoch: epoch.current, node: event.currentTarget }; }}
          onPointerMove={event => { const held = drag.current; if (!held || held.pointer !== event.pointerId || held.epoch !== epoch.current || held.node !== event.currentTarget || !held.node.hasPointerCapture(event.pointerId)) return; attempt(() => move(held.kind,held.index,pointerCoordinate(event.clientX,event.clientY,plot.current!.getBoundingClientRect()),false)); }}
          onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cancelDrag(); select(i); setFront(i); } if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); const step = event.shiftKey ? .5 : .1, v = latest.current.state.lloyd;
            const current = kind === 'center' ? v.centers[i]! : v.points[i]!.x, dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0, dy = event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0;
            attempt(() => move(kind,i,[Math.max(-5,Math.min(5,current[0]+dx)),Math.max(-5,Math.min(5,current[1]+dy))])); }}/>) }
      </svg>
      <p class="p05-help"> {mode === 'alternatives' ? 'Density roles: filled circle = core, hollow diamond = border, cross = noise. Selected ID and role appear above the plane; all coordinates are in the table.' : 'Filled circles: observations. Hollow diamonds: centroids. Dashed links use held labels.'} Drag snaps to 0.1; arrow keys preserve full input precision. Only handles capture touch. The selector brings an overlapping handle forward; Enter or Space does the same for a focused handle.</p>
    </div><div class="p05-controls">
      <label>Edit handles<select value={kind} onChange={event => { cancelDrag(); setKind(event.currentTarget.value as 'point' | 'center'); select(0); setFront(0); }}>{mode !== 'alternatives' && <option value="center">Centroids</option>}<option value="point">Observations</option></select></label>
      <label>Selected handle<select value={selectedIndex} onChange={event => { cancelDrag(); select(Number(event.currentTarget.value)); setFront(Number(event.currentTarget.value)); }}>{targets.map((_,i) => <option value={i}>{kind} {i}</option>)}</select></label>
      <div class="p05-fields">{numeric('Handle x',coordinate[0],-5,5,x => move(kind,selectedIndex,[x,coordinate[1]]))}{numeric('Handle y',coordinate[1],-5,5,y => move(kind,selectedIndex,[coordinate[0],y]))}
        {numeric('Scale x',s.lloyd.scales[0],.1,10,x => accept({...s,lloyd:editLloyd(s.lloyd,{scales:[x,s.lloyd.scales[1]]})}))}{numeric('Scale y',s.lloyd.scales[1],.1,10,y => accept({...s,lloyd:editLloyd(s.lloyd,{scales:[s.lloyd.scales[0],y]})}))}</div>
      {mode !== 'alternatives' ? <>
        <div class="p05-fields">{numeric('k',s.lloyd.centers.length,1,s.lloyd.points.length,k => accept(reseed(s,k)),1)}{numeric('Seed',s.seed,0,0xffffffff,seed => accept({...s,seed}),1)}</div>
        <div class="p05-actions"><button onClick={() => attempt(() => accept(reseed(s)))}>Initialize from seed</button><button disabled={s.lloyd.stopped} onClick={() => attempt(() => accept({...s,lloyd:lloydStep(s.lloyd)}))}>{s.lloyd.phase === 'assign' ? 'Update means' : 'Assign nearest'}</button><button onClick={replay}>Replay Lloyd steps</button></div>
        {mode === 'failures' && <div class="p05-actions">{[['vertical','Vertical groups'],['horizontal','Horizontal local minimum'],['empty','Empty cluster'],['coincident','Coincident observations']].map(([key,label]) => <button onClick={() => attempt(() => { accept(scenario(s,key!)); select(0); setFront(0); revise(v=>v+1); })}>{label}</button>)}</div>}
      </> : <>
        <label>Linkage<select value={s.linkage} onChange={event => attempt(() => accept({...s,linkage:event.currentTarget.value as Linkage}))}><option value="single">Single · minimum</option><option value="complete">Complete · maximum</option><option value="average">Average · all cross pairs</option></select></label>
        <div class="p05-fields">{numeric('Merges displayed',s.mergeCount,0,s.lloyd.points.length-1,mergeCount => accept({...s,mergeCount}),1)}{numeric('Epsilon',s.epsilon,0,2,epsilon => accept({...s,epsilon}))}{numeric('Minimum points',s.minPoints,1,s.lloyd.points.length,minPoints => accept({...s,minPoints}),1)}</div>
        <div class="p05-actions"><button onClick={replay}>Replay actual merges</button><button onClick={() => attempt(() => { accept(scenario(s,'density')); setKind('point'); select(0); setFront(0); })}>Core, border and noise</button><button onClick={() => attempt(() => { accept(scenario(s,'border')); setKind('point'); select(8); setFront(8); })}>Shared border</button></div>
      </>}
      {reason && <p role="alert" data-rejection>{reason}</p>}
      <p data-current-frame>Frame {frames ? index+1 : 1} / {frames?.length ?? 1} · edit begins at the displayed state.</p>
      {frames && <TraceStepper frames={frames} index={index} onSeek={seek}/>}
      <Inspector rows={a.inspector}/>
    </div></div>
    <div class="p05-formulas">{a.formulas.map(f => <Formula {...f}/>)}</div>
    {mode !== 'alternatives' ? <>
      <div class="table-scroll" tabindex={0} role="region" aria-label="Squared distances and assignments, scrollable"><table><caption>Actual scaled squared distances. Lowest centroid index wins exact ties. {s.lloyd.labels === null ? 'Preview labels' : 'Committed labels'}; ≈ marks display rounding.</caption><thead><tr><th>Observation</th><th>x₁</th><th>x₂</th>{s.lloyd.centers.map((_,j)=><th>d² to c{j}</th>)}<th>Held label</th><th>Nearest / tie</th></tr></thead><tbody>{a.points.map((p,i)=><tr data-row-id={p.id} data-distances={JSON.stringify(a.lloyd.distances[i])} data-assignment={a.lloyd.labels[i]}><th scope="row">{p.id}</th><td>{String(p.x[0])}</td><td>{String(p.x[1])}</td>{a.lloyd.distances[i]!.map(d=><td>≈ {shown(d)}</td>)}<td>{a.lloyd.labels[i]}</td><td>{a.lloyd.nearest[i]} / {a.lloyd.ties[i] ? 'tie' : 'unique'}</td></tr>)}</tbody></table></div>
      <div class="table-scroll" tabindex={0} role="region" aria-label="Cluster sums and means, scrollable"><table><caption>Held membership → sums → proposed mean. Empty clusters retain previous coordinates; their mean is undefined.</caption><thead><tr><th>Cluster</th><th>IDs / n</th><th>Sum</th><th>Mean / policy</th><th>Current centroid</th></tr></thead><tbody>{a.lloyd.clusters.map(c=><tr data-cluster={c.index} data-empty={String(c.empty)} data-mean={JSON.stringify(c.mean)}><th scope="row">c{c.index}</th><td>{c.ids.join(', ') || 'none'} / {c.count}</td><td>[{c.sums.map(shown).join(', ')}]</td><td>{c.empty ? 'Undefined; retain' : '≈'} [{c.mean.map(shown).join(', ')}]</td><td>≈ [{s.lloyd.centers[c.index]!.map(shown).join(', ')}]</td></tr>)}</tbody></table></div>
    </> : <>
      <h3>Actual merge tree · height is linkage distance</h3>
      <div class="p05-tree-scroll" tabindex={0} role="region" aria-label="Merge tree, scrollable"><svg viewBox="0 0 560 300" class="p05-tree" role="img" aria-label={`${s.linkage} linkage tree; ${s.mergeCount} merges selected`}><g class="p05-labels" font-size="16">{a.branches.map(b=><g><path data-merge-id={b.group.id} data-height={b.height} d={b.path} class={b.active?'p05-branch active':'p05-branch'}/><text x={b.labelX} y={b.labelY} text-anchor="middle">≈ {shown(b.height)}</text></g>)}{a.leaves.map(p=><text x={p.x} y="282" text-anchor="middle">{p.id}</text>)}</g></svg></div>
      <p data-cut-groups>{a.groups.map(g=>`[${g.members.map(i=>s.lloyd.points[i]!.id).join(', ')}]`).join(' · ')}</p>
      <div class="table-scroll" tabindex={0} role="region" aria-label="Actual linkage merges, scrollable"><table><caption>{s.linkage}: exact ties choose the first pair by ascending persistent group IDs.</caption><thead><tr><th>Merge</th><th>Left IDs</th><th>Right IDs</th><th>Height</th></tr></thead><tbody>{a.hierarchy.merges.map((m,i)=><tr data-merge={i} data-height={m.height}><th scope="row">{i+1}</th><td>{m.left.members.map(j=>s.lloyd.points[j]!.id).join(', ')}</td><td>{m.right.members.map(j=>s.lloyd.points[j]!.id).join(', ')}</td><td>≈ {shown(m.height)}</td></tr>)}</tbody></table></div>
      <div class="table-scroll" tabindex={0} role="region" aria-label="Density neighborhoods and labels, scrollable"><table><caption>Closed ε-neighborhood includes self. Core iff count ≥ minimum points. Noise uses −1; a shared border belongs to the first reached core component in input order.</caption><thead><tr><th>Observation</th><th>x₁</th><th>x₂</th><th>Neighbor IDs</th><th>Count</th><th>Role</th><th>Cluster</th></tr></thead><tbody>{a.points.map((p,i)=><tr data-density-id={p.id} data-neighbors={JSON.stringify(a.density.neighborhoods[i])} data-kind={p.kind} data-label={p.densityLabel}><th scope="row">{p.id}</th><td>{String(p.x[0])}</td><td>{String(p.x[1])}</td><td>{a.density.neighborhoods[i]!.map(j=>s.lloyd.points[j]!.id).join(', ')}</td><td>{a.density.neighborhoods[i]!.length}</td><td>{p.kind}</td><td>{p.densityLabel}</td></tr>)}</tbody></table></div>
    </>}
    <p class="sr-only" data-announcement role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </div>;
}
