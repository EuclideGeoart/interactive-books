import { mountTraceLab } from './trace-lab';
import { InspectionDiagram } from './inspection-diagram';
import { spatialAdapter,spatialDefaults,spatialOperations } from '../visualizers/spatial/adapter';
import { describeSpatial,drawSpatial,inspectSpatial } from '../visualizers/spatial/presentation';
import type { SpatialKind,SpatialState } from '../visualizers/spatial/types';
import { escapeHtml as esc } from '../components/visualizers/primitives';

// Restore local table/tree scrolling after snapshot replacement; leave page scroll alone.
function preserveSpatialScroll(root:HTMLElement):void {
  const canvas=root.querySelector<HTMLElement>('[data-svg]')!, positions=new Map<string,[number,number]>();
  root.addEventListener('scroll',event=>{
    const target=event.target;
    if(target instanceof HTMLElement && target.matches('.spatial-table-scroll,.spatial-hierarchy-scroll')) positions.set(target.getAttribute('aria-label')??'', [target.scrollLeft,target.scrollTop]);
  },true);
  new MutationObserver(()=>{
    for(const el of canvas.querySelectorAll<HTMLElement>('.spatial-table-scroll,.spatial-hierarchy-scroll')){
      const p=positions.get(el.getAttribute('aria-label')??'');
      if(p){el.scrollLeft=p[0];el.scrollTop=p[1];}
    }
  }).observe(canvas,{childList:true});
  root.addEventListener('focusin',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const scroller=target.closest<HTMLElement>('.spatial-table-scroll,.spatial-hierarchy-scroll');
    if(!scroller)return;
    const r=target.getBoundingClientRect(),v=scroller.getBoundingClientRect();
    if(r.top<v.top||r.bottom>v.bottom)scroller.scrollTop+=r.top-v.top-20;
    if(r.left<v.left||r.right>v.right)scroller.scrollLeft+=r.left-v.left-10;
  });
}
for(const wrapper of document.querySelectorAll<HTMLElement>('[data-spatial-lab]')){
  const kind=wrapper.dataset.spatialLab as SpatialKind,root=wrapper.querySelector<HTMLElement>('[data-chapter-lab]')!,form=root.querySelector<HTMLFormElement>('form')!;
  const showInputs=()=>{
    const op=root.dataset.operation??spatialOperations[kind][0]!.id;
    for(const label of form.querySelectorAll<HTMLElement>('[data-spatial-input]')){
      const key=label.dataset.spatialInput;
      label.hidden=key==='custom' ? new FormData(form).get('scene')!=='custom'
        : key==='query' ? !/query|range|search/.test(op)
        : key==='queryPoint' ? !/nearest|search|find|point/.test(op)
        : key==='point'||key==='object' ? !/insert|update|move|refit|rebuild/.test(op)
        : key==='target' ? !/remove|erase|update|move|refit|rebuild/.test(op) : false;
    }
  };
  mountTraceLab(root,spatialAdapter(kind));
  root.querySelector<HTMLElement>('[data-mobile-code]')!.tabIndex=0;
  preserveSpatialScroll(root);
  root.addEventListener('click',showInputs);form.addEventListener('change',showInputs);showInputs();
}
for(const root of document.querySelectorAll<HTMLElement>('[data-spatial-preview]')){
  const state:SpatialState=JSON.parse(root.querySelector('[data-spatial-state]')!.textContent!);
  new InspectionDiagram(root,{draw:drawSpatial,inspect:inspectSpatial,describe:describeSpatial},state,`${root.dataset.spatialPreview}-preview`);
  preserveSpatialScroll(root);
}
for(const root of document.querySelectorAll<HTMLElement>('[data-spatial-explorer]')){
  const kind=root.dataset.spatialExplorer as SpatialKind,form=root.querySelector<HTMLFormElement>('form')!;
  const render=()=>{
    const inputs=spatialDefaults(kind),selected=new FormData(form);
    selected.forEach((v,k)=>inputs.set(k,v));
    const operations=spatialOperations[kind];
    const operation=operations.find(op=>kind==='kd-tree'?/nearest/.test(op.id):kind==='broad-phase'?op.id==='filter':/query|range|pairs|candidates/.test(op.id))??operations[0]!;
    try{
      const trace=spatialAdapter(kind).build(operation.id,inputs),state=trace.steps.at(-1)?.state??trace.initial;
      root.querySelector<HTMLElement>('[data-explorer-error]')!.hidden=true;
      const n=state.objects.length;
      root.querySelector('[data-explorer-result]')!.innerHTML=`<dl><div><dt>Objects</dt><dd>${n}</dd></div>${state.metrics.map(m=>`<div><dt>${esc(m.label)}</dt><dd>${m.value}</dd></div>`).join('')}${kind==='broad-phase'?`<div><dt>Naive unordered pairs</dt><dd>${n*(n-1)/2}</dd></div>`:''}</dl><p>${esc(state.result)}</p>`;
      const scene=String(inputs.get('scene')),moving=inputs.get('motion')==='moving';
      const explanation=kind==='spatial-hash'?'Smaller cells make this fixed query visit more cells. Larger cells put more objects into each cell, increasing candidate tests. Bucket collisions do not make unrelated cells spatial neighbors.'
        :kind==='quadtree'||kind==='octree'?'Lower capacity causes deeper adaptive subdivision. Clusters and coincident points reach the depth limit; a capped leaf may exceed capacity rather than subdividing forever.'
        :kind==='kd-tree'?'A balanced median build controls height, but nearest-neighbor work depends on the query and distribution. Opposite branches are visited only when their split-plane distance can match or improve the best result.'
        :kind==='r-tree'?'Overlapping sibling MBRs can both intersect one query. More overlap weakens pruning even when occupancy and enclosure remain valid.'
        :kind==='bvh'?'Bounds enclose objects, not fixed cells. Clusters and overlapping boxes affect pruning; use Refit in the lab to see a moved leaf expand its ancestors without changing their grouping.'
        :'The grid counts candidate pairs and tests each unique pair once. Exact AABB overlap is still only a proxy for shape contact. Motion below changes the workload advice; it is not a simulated timing measurement.';
      root.querySelector('[data-explorer-explanation]')!.textContent=explanation;
      if(kind==='broad-phase'){
        const dimension=String(inputs.get('dimension')??'2');
        const rows=[
          ['Spatial hash',`${scene==='overlap'?'Large spanning boxes occupy many cells; coarse cells produce false positives.':scene==='clustered'||scene==='duplicates'?'Hot cells can recover quadratic pair work.':'Similar-sized, fairly uniform objects make cell enumeration predictable.'} ${moving?'Cheap membership updates suit motion; suppress repeated pairs.':'Static scenes can amortize a one-time build.'}`],
          [dimension==='3'?'Octree':'Quadtree',`${scene==='clustered'?'Adaptive subdivision follows occupied clusters.':'Fixed root bounds and recursive regions give clear volume queries.'} ${dimension==='3'?'Eight-way subdivision grows faster; sparse allocation matters.':'Four children cover a 2D region.'} Spanning AABBs need a stated containment policy.`],
          ['KD-tree',`A median tree suits ${dimension}D points and nearest-neighbor queries. Extended objects require extra bounds/policy. ${moving?'Frequent moves may need rebuilding.':'Static builds amortize well.'} Pruning degrades with dimension or unfavorable distributions.`],
          ['R-tree',`${scene==='overlap'?'Overlapping MBRs force multi-branch visits.':'Object MBRs suit CAD/GIS and rectangular lookup.'} Insertion updates ancestors; production split heuristics trade build work for query quality.`],
          ['BVH',`${moving?'Refit updates enclosing bounds cheaply, but motion can worsen grouping; rebuild when useful.':'Static object groups can amortize a more expensive build.'} ${scene==='overlap'?'Heavy overlap weakens pruning.':'AABB tests prune whole object groups.'}`],
        ];
        root.querySelector('[data-workload-comparison]')!.innerHTML=rows.map(([name,copy])=>`<tr><th scope="row">${esc(name)}</th><td>${esc(copy)}</td></tr>`).join('');
      }
    }catch(error){const el=root.querySelector<HTMLElement>('[data-explorer-error]')!;el.textContent=error instanceof Error?error.message:String(error);el.hidden=false;}
  };
  form.addEventListener('change',render);form.addEventListener('submit',event=>{event.preventDefault();render();});render();
}
