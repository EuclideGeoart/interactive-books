/** All Optimization presentation is derived from the objective evaluation and immutable trace. */
import { objectiveModel, stationaryPoints, convexity, chord, type ObjectiveId, type Vector } from '../../math/optimization/objectives';
import { descentTrace, type Step, type DescentTrace } from '../../math/optimization/descent';
import { traceFrom } from '../../platform/trace';
import { cachedContours } from '../calculus/contour-view';
import { scene, cachedCurve, spec, row, exactDesc, numericDesc, undefinedDesc, ntex, ntext, type CalcScene, type CalcTable, type CalcFrame } from '../calculus/calculus-view';
import type { InspectorRowData } from '../../ui/Inspector';

export type Chapter = 'landscapes'|'optima'|'convexity'|'descent';
export interface OptimizationState { objective: ObjectiveId; x: number; y: number; a: number; center: number; eta: number; iterations: number; left: number; right: number; t: number }
export const CANONICAL: OptimizationState = {objective:'quadratic',x:2,y:1,a:1,center:0,eta:.25,iterations:12,left:-2,right:2,t:.5};
export const TITLES: Record<Chapter,string> = {landscapes:'Explore a parameter landscape',optima:'Inspect what a stationary point means',convexity:'Compare the curve with its chord',descent:'Replay every evaluated gradient descent step'};
export const SPECS = {
  x:spec('x',2,'Parameter θ₁','\\theta_1',-3,3,.25), y:spec('y',1,'Parameter θ₂','\\theta_2',-3,3,.25),
  a:spec('a',1,'Quadratic curvature a','a',.25,4,.25),center:spec('center',0,'Quadratic center c','c',-2,2,.25),
  eta:spec('eta',.25,'Learning rate η','\\eta',.01,2,.01), iterations:spec('iterations',12,'Iteration budget','K',1,40,1,0),
  left:spec('left',-2,'Left chord endpoint','u',-3,3,.25),right:spec('right',2,'Right chord endpoint','v',-3,3,.25),t:spec('t',.5,'Chord fraction t','t',0,1,.05),
};
export const PRESETS = [
  {id:'quadratic',label:'Convex quadratic',state:CANONICAL},
  {id:'well',label:'Double well',state:{...CANONICAL,objective:'well',x:.5,y:1,eta:.1,left:-1,right:1}},
  {id:'cubic',label:'Local, not global',state:{...CANONICAL,objective:'cubic',x:1,y:0,eta:.1}},
  {id:'saddle',label:'Saddle',state:{...CANONICAL,objective:'saddle',x:0,y:0}},
  {id:'ridge',label:'Maximum',state:{...CANONICAL,objective:'ridge',x:0,y:0}},
  {id:'flat',label:'Flat minimum',state:{...CANONICAL,objective:'flat',x:0,y:0}},
  {id:'degenerate',label:'Flat, neither optimum',state:{...CANONICAL,objective:'degenerate',x:0,y:0}},
  {id:'absolute',label:'Nonsmooth kink',state:{...CANONICAL,objective:'absolute',x:0,y:0}},
  {id:'log',label:'Log domain',state:{...CANONICAL,objective:'log',x:0,y:1}},
] as const satisfies readonly {id:string;label:string;state:OptimizationState}[];
export const vecText = (v: Vector) => `(${ntext(v[0])}, ${ntext(v[1])})`;
export const vecTex = (v: Vector) => `\\begin{bmatrix}${ntex(v[0])}\\\\${ntex(v[1])}\\end{bmatrix}`;
const vdesc = (v: Vector) => ({status:'approximate' as const,lines:[{relation:'≈' as const,text:vecText(v),tex:vecTex(v)}],spoken:`approximately ${vecText(v)}`});
export const LOSS_TEX: Record<ObjectiveId,string> = {quadratic:'L=\\tfrac a2(\\theta_1-c)^2+2\\theta_2^2',well:'L=(\\theta_1^2-1)^2+\\theta_2^2',cubic:'L=\\theta_1^3-3\\theta_1+\\theta_2^2',ridge:'L=-\\theta_1^2-\\theta_2^2',saddle:'L=\\theta_1^2-\\theta_2^2',flat:'L=\\theta_1^4+\\theta_2^4',degenerate:'L=\\theta_1^3+\\theta_2^2',absolute:'L=|\\theta_1|+\\theta_2^2',log:'L=-\\log\\theta_1+\\theta_2^2,\\quad\\theta_1>0',regression:'L=\\frac14\\sum_{i=1}^4\\frac12(\\theta_1 x_i+\\theta_2-y_i)^2'};
export interface OptimizationView { scenes: readonly CalcScene[];rows:readonly InspectorRowData[];formulas:readonly string[];verdict:string;description:string;table?:CalcTable;frames:ReturnType<typeof traceFrom<CalcFrame>>; metrics:Record<string,unknown>;hint:string }
const MAP={xMin:-3.5,xMax:3.5,yMin:-3.5,yMax:3.5};
function maps(s:OptimizationState, point:Vector, description:string): CalcScene[] {
  const model=objectiveModel(s), key=`opt-${s.objective}-${s.a}-${s.center}`, map=scene('map','Parameter space: θ₁ and θ₂',description,MAP);
  map.curves.push({name:'loss-contours',lines:cachedContours(key,(x,y)=>model.evaluate([x,y]).loss??NaN,MAP,[-8,-2,0,.5,1,2,4,8,16,32],48),role:'ink',width:1.3});
  map.handles.push({id:'start',label:`Starting parameters ${vecText([s.x,s.y])}. Arrow keys move by 0.25.`,at:{x:s.x,y:s.y},role:'primary',xField:'x',yField:'y',step:.25});
  map.markers.push({name:'candidate',at:{x:point[0],y:point[1]},role:'derived',filled:true});
  const profile=scene('profile','Loss slice: θ₂ = 0','This is a slice of the objective in parameter space, with θ₂ fixed at zero.',{xMin:-3.5,xMax:3.5,yMin:-3,yMax:4});
  profile.curves.push({name:'objective',lines:cachedCurve(key,x=>model.evaluate([x,0]).loss,profile.window, s.objective==='log'?[0]:[]),role:'primary',width:2.5});
  map.labels.push({name:'axis-parameter-1',at:{x:3.4,y:0},text:'θ₁',role:'ink',dy:-12,anchor:'end'},{name:'axis-parameter-2',at:{x:0,y:3.4},text:'θ₂',role:'ink',dx:12,dy:6,anchor:'start'});
  profile.labels.push({name:'axis-slice-parameter',at:{x:3.4,y:0},text:'θ₁',role:'ink',dy:-12,anchor:'end'},{name:'axis-slice-loss',at:{x:0,y:3.9},text:'L',role:'ink',dx:12,dy:12,anchor:'start'});
  return [map,profile];
}
export function stepRows(step:Step): InspectorRowData[] {
  return [row('point','\\theta_k','Current parameter vector',vdesc(step.point),'primary'),row('loss','L_k','Current objective value',numericDesc(step.loss)),
    row('gradient','\\nabla L_k','Actual gradient components',vdesc(step.gradient),'x'),row('eta','\\eta','Learning rate',numericDesc(step.eta)),
    row('update','-\\eta\\nabla L_k','Update vector',vdesc(step.update),'y'),row('next','\\theta_{k+1}','Next parameter vector',vdesc(step.next),'derived'),
    row('next-loss','L_{k+1}','New objective value',step.nextEvaluation.loss===null?undefinedDesc(step.nextEvaluation.reason):numericDesc(step.nextEvaluation.loss))];
}
export function stepExplanation(step:Step): string {
  return `Iteration ${step.k}: at θ ≈ ${vecText(step.point)}, L ≈ ${ntext(step.loss)} and gradient ≈ ${vecText(step.gradient)}. Rate η ≈ ${ntext(step.eta)} gives update ≈ ${vecText(step.update)}. Adding that update gives θ next ≈ ${vecText(step.next)} and L next ${step.nextEvaluation.loss===null?'undefined: '+step.nextEvaluation.reason:'≈ '+ntext(step.nextEvaluation.loss)}. The step follows the negative gradient; a finite step can still increase loss.`;
}
export function stepFormula(step:Step): string { return `\\theta_{${step.k+1}}\\approx ${vecTex(step.point)}+${vecTex(step.update)}\\approx ${vecTex(step.next)}`; }
export const optimizationTrace=(s:OptimizationState):DescentTrace=>descentTrace({...s,start:[s.x,s.y]});
export function deriveOptimization(s:OptimizationState,chapter:Chapter,index=0,trace:DescentTrace=optimizationTrace(s)):OptimizationView {
  const model=objectiveModel(s), evaluated=trace.initial;
  const selected=trace.frames[Math.min(index,Math.max(0,trace.frames.length-1))]?.state;
  const replay=chapter==='descent';
  const description=replay&&selected?stepExplanation(selected):`Candidate θ ≈ ${vecText([s.x,s.y])}; objective ${evaluated.loss===null?'undefined: '+evaluated.reason:'≈ '+ntext(evaluated.loss)}; gradient ${evaluated.gradient? '≈ '+vecText(evaluated.gradient):'undefined: '+evaluated.reason}. Coordinates are model parameters; data inputs are held fixed.`;
  const scenes=maps(s,replay&&selected?selected.point:[s.x,s.y],description), map=scenes[0]!,profile=scenes[1]!;
  let rows=selected&&replay?stepRows(selected):[row('point','\\theta','Candidate parameters',vdesc([s.x,s.y]),'primary'),row('loss','L','Objective value',evaluated.loss===null?undefinedDesc(evaluated.reason):numericDesc(evaluated.loss)),row('gradient','\\nabla L','Actual gradient',evaluated.gradient?vdesc(evaluated.gradient):undefinedDesc(evaluated.reason),'x')];
  if(!replay)rows.push(row('hessian','H','Hessian of the objective',evaluated.hessian?{status:'approximate',lines:[{relation:'≈',text:evaluated.hessian.map(vecText).join('; '),tex:`\\begin{bmatrix}${evaluated.hessian[0].map(ntex).join('&')}\\\\${evaluated.hessian[1].map(ntex).join('&')}\\end{bmatrix}`}],spoken:'Hessian rows '+evaluated.hessian.map(vecText).join('; ')}:undefinedDesc(evaluated.reason),'derived'));
  let verdict=description,table:CalcTable|undefined,formulas=[LOSS_TEX[s.objective]];
  let frames=traceFrom<CalcFrame>([{state:{semantic:evaluated,title:'Evaluate the candidate',detail:description,formula:LOSS_TEX[s.objective]}}]);
  if(chapter==='landscapes') {
    const sliced=model.evaluate([s.x,0]);
    if(sliced.loss!==null)profile.handles.push({id:'slice-point',label:`Slice parameter θ₁ ≈ ${ntext(s.x)}, loss ≈ ${ntext(sliced.loss)} with θ₂ = 0`,at:{x:s.x,y:sliced.loss},role:'primary',xField:'x',step:.25});
  }
  if(chapter==='optima') {
    const points=stationaryPoints(s), critical=points.find(p=>p.point[0]===s.x&&p.point[1]===s.y);
    verdict=critical?`${critical.kind}: ${critical.global}. Gradient zero alone does not establish a minimum.`:evaluated.gradient?'This candidate is not a stationary point. The marked points are the complete analytic stationary set of this example.':evaluated.reason;
    points.forEach((p,i)=>{map.markers.push({name:`critical-${i}`,at:{x:p.point[0],y:p.point[1]},role:'caution',filled:false});map.labels.push({name:`critical-label-${i}`,at:{x:p.point[0],y:p.point[1]},text:p.kind,role:'caution',dy:-20-i*18});});
    table={caption:'Analytically classified stationary points',head:['θ','Classification','Global behavior'],rows:points.map(p=>[vecText(p.point),p.kind,p.global])};
    rows=[...rows,row('classification','\\nabla L=0','Stationary classification',exactDesc(critical?critical.kind:'not a smooth stationary point'),'caution')];
  }
  if(chapter==='convexity') {
    const c=chord(s,s.left,s.right,s.t),cv=convexity(s),l=model.evaluate([s.left,0]).loss,r=model.evaluate([s.right,0]).loss;
    if(l!==null&&r!==null) {
      profile.segments.push({name:'chord',from:{x:s.left,y:l},to:{x:s.right,y:r},role:'y',dashed:true});
      profile.handles.push({id:'left',label:`Left chord endpoint u ≈ ${ntext(s.left)}`,at:{x:s.left,y:l},role:'x',xField:'left',step:.25},{id:'right',label:`Right chord endpoint v ≈ ${ntext(s.right)}`,at:{x:s.right,y:r},role:'y',xField:'right',step:.25});
      profile.labels.push({name:'left-label',at:{x:s.left,y:l},text:'u',role:'x',dy:22},{name:'right-label',at:{x:s.right,y:r},text:'v',role:'y',dy:22});
      const tops=Array.from({length:41},(_,i)=>{const x=-3+i*.15;return {x,y:model.evaluate([x,0]).loss??4};}).filter(p=>p.y<4);
      if(tops.length)profile.polygons.push({name:'epigraph-window',corners:[...tops,{x:tops.at(-1)!.x,y:4},{x:tops[0]!.x,y:4}],role:'derived'});
    }
    if(c.curve!==null&&c.height!==null)profile.segments.push({name:'chord-gap',from:{x:c.x,y:c.curve},to:{x:c.x,y:c.height},role:c.gap!<0?'caution':'derived'});
    verdict=`${cv.convex?'Convex':'Nonconvex'}: ${cv.explanation} ${c.gap===null?'This chord is undefined because an endpoint is outside the domain. '+(model.evaluate([s.left,0]).reason||model.evaluate([s.right,0]).reason):`Chord minus curve ≈ ${ntext(c.gap)} at t ≈ ${ntext(s.t)}. A negative gap is a counterexample; a nonnegative gap verifies only this chosen chord.`}`;
    rows=[...rows,row('chord','(1-t)L(u)+tL(v)','Chord height',c.height===null?undefinedDesc('Endpoints must belong to the objective domain.'):numericDesc(c.height),'y'),row('gap','\\text{chord}-L','Chord gap',c.gap===null?undefinedDesc('Chord is outside the domain.'):numericDesc(c.gap),'derived')];
    formulas.push('L((1-t)u+tv)\\le(1-t)L(u)+tL(v),\\quad 0\\le t\\le1');
  }
  if(replay) {
    const visible=trace.frames.slice(0,Math.min(index+1,trace.frames.length));
    map.curves.push({name:'optimizer-path',lines:[[{x:s.x,y:s.y},...visible.map(f=>({x:f.state.next[0],y:f.state.next[1]})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))]],role:'primary',width:3});
    if(selected&&Number.isFinite(selected.next[0])&&Number.isFinite(selected.next[1]))map.arrows.push({name:'actual-update',from:{x:selected.point[0],y:selected.point[1]},to:{x:selected.next[0],y:selected.next[1]},role:'y'});
    table={caption:'Evaluated binary64 history. Replay changes the selected row, never the stored mathematics.',head:['k','θ(k)','L(k)','gradient','η','update','θ(k+1)','L(k+1)'],rows:trace.frames.map(f=>{const v=f.state;return [String(v.k),vecText(v.point),ntext(v.loss),vecText(v.gradient),ntext(v.eta),vecText(v.update),vecText(v.next),v.nextEvaluation.loss===null?'undefined':ntext(v.nextEvaluation.loss)];})};
    verdict=`${description} Stop: ${trace.reason}. Parameters outside the displayed window are retained in the table; the view never changes the path.`;
    formulas.push('\\theta_{k+1}=\\theta_k-\\eta\\nabla L(\\theta_k)',...(selected?[stepFormula(selected)]:[]));
    if(trace.frames.length)frames=traceFrom(trace.frames.map(f=>({state:{semantic:f.state,title:`Evaluated iteration ${f.state.k}`,detail:stepExplanation(f.state),formula:stepFormula(f.state)}})));
  }
  map.description=description+' '+verdict;
  return {scenes,rows,formulas,verdict,description,table,frames,metrics:{evaluated,selected:selected??null,reason:trace.reason},hint:'Drag the starting point. Arrow keys move by 0.25; Shift moves by 1.25. Numeric fields and presets change the same parameters. Replay selects immutable evaluated steps.'};
}
