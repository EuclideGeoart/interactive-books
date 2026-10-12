/** All Optimization presentation is derived from the objective evaluation and immutable trace. */
import { objectiveModel, stationaryPoints, convexity, chord, vectorFinite, type ObjectiveId, type Vector } from '../../math/optimization/objectives';
import { descentTrace, type Step, type DescentTrace } from '../../math/optimization/descent';
import { regularizedModel, type Constraint } from '../../math/optimization/constraints';
import { quadraticStability, type Method, type BatchMode } from '../../math/optimization/dynamics';
import { traceFrom } from '../../platform/trace';
import { cachedContours } from '../calculus/contour-view';
import { scene, cachedCurve, spec, row, exactDesc, numericDesc, givenDesc, undefinedDesc, ntex, ntext, type CalcScene, type CalcTable, type CalcFrame } from '../calculus/calculus-view';
import type { InspectorRowData } from '../../ui/Inspector';

export type Chapter = 'landscapes'|'optima'|'convexity'|'descent'|'rate'|'momentum'|'stochastic'|'adam'|'constraints'|'diagnostics';
export interface OptimizationState { objective: ObjectiveId; x: number; y: number; a: number; center: number; eta: number; iterations: number; left: number; right: number; t: number; method: Method; beta: number; beta1: number; beta2: number; epsilon: number; batch: BatchMode; batchSize: number; seed: number; constraint:Constraint; lambda:number; gradientTolerance:number; lossTolerance:number; clip:number; divergenceLimit:number }
export const CANONICAL: OptimizationState = {objective:'quadratic',x:2,y:1,a:1,center:0,eta:.25,iterations:12,left:-2,right:2,t:.5,method:'descent',beta:.8,beta1:.9,beta2:.999,epsilon:1e-8,batch:'mini',batchSize:2,seed:42,constraint:'none',lambda:0,gradientTolerance:0,lossTolerance:0,clip:0,divergenceLimit:1e6};
export const TITLES: Record<Chapter,string> = {landscapes:'Explore a parameter landscape',optima:'Inspect what a stationary point means',convexity:'Compare the curve with its chord',descent:'Replay every evaluated gradient descent step',rate:'Inspect stability and the actual learning-rate history',momentum:'Track velocity before and after each gradient',stochastic:'Trace the selected examples and their averaged gradient',adam:'Inspect moments, bias correction and each adaptive update',constraints:'Compare the proposal, projection and penalty',diagnostics:'Inspect why this numerical run stopped'};
export const SPECS = {
  x:spec('x',2,'Parameter θ₁','\\theta_1',-3,3,.25), y:spec('y',1,'Parameter θ₂','\\theta_2',-3,3,.25),
  a:spec('a',1,'Quadratic curvature a','a',.25,4,.25),center:spec('center',0,'Quadratic center c','c',-2,2,.25),
  eta:spec('eta',.25,'Learning rate η','\\eta',.01,2,.01), iterations:spec('iterations',12,'Iteration budget','K',1,40,1,0),
  beta:spec('beta',.8,'Momentum decay β','\\beta',0,.99,.05), beta1:spec('beta1',.9,'First moment decay β₁','\\beta_1',0,.99,.05), beta2:spec('beta2',.999,'Second moment decay β₂','\\beta_2',0,.999,.001,3),
  lambda:spec('lambda',0,'L2 penalty strength λ','\\lambda',0,4,.25),
  gradientTolerance:spec('gradientTolerance',.1,'Raw gradient tolerance (0 disables)','\\tau_g',0,1,.01), lossTolerance:spec('lossTolerance',0,'Absolute loss-change tolerance (0 disables)','\\tau_L',0,1,.01),clip:spec('clip',0,'Gradient clip norm (0 disables)','C',0,5,.25),
  seed:spec('seed',42,'Sampling seed','s',0,0xffffffff,1,0),batchSize:spec('batchSize',2,'Mini-batch size','B',1,4,1,0),
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
const vdesc = (v: Vector) => !vectorFinite(v)?undefinedDesc('A non-finite transition has no accepted numerical value.'): ({status:'approximate' as const,lines:[{relation:'≈' as const,text:vecText(v),tex:vecTex(v)}],spoken:`approximately ${vecText(v)}`});
export const LOSS_TEX: Record<ObjectiveId,string> = {quadratic:'L=\\tfrac a2(\\theta_1-c)^2+2\\theta_2^2',well:'L=(\\theta_1^2-1)^2+\\theta_2^2',cubic:'L=\\theta_1^3-3\\theta_1+\\theta_2^2',ridge:'L=-\\theta_1^2-\\theta_2^2',saddle:'L=\\theta_1^2-\\theta_2^2',flat:'L=\\theta_1^4+\\theta_2^4',degenerate:'L=\\theta_1^3+\\theta_2^2',absolute:'L=|\\theta_1|+\\theta_2^2',log:'L=-\\log\\theta_1+\\theta_2^2,\\quad\\theta_1>0',regression:'L=\\frac14\\sum_{i=1}^4\\frac12(\\theta_1 x_i+\\theta_2-y_i)^2'};
export interface OptimizationView { scenes: readonly CalcScene[];rows:readonly InspectorRowData[];formulas:readonly string[];verdict:string;description:string;table?:CalcTable;frames:ReturnType<typeof traceFrom<CalcFrame>>; batchTable?:CalcTable; metrics:Record<string,unknown>;hint:string }
const MAP={xMin:-3.5,xMax:3.5,yMin:-3.5,yMax:3.5};
function maps(s:OptimizationState, point:Vector, description:string): CalcScene[] {
  const model=regularizedModel(s,s.lambda), key=`opt-${s.objective}-${s.a}-${s.center}-${s.lambda}`, map=scene('map','Parameter space: θ₁ and θ₂',description,MAP);
  map.curves.push({name:'loss-contours',lines:cachedContours(key,(x,y)=>model.evaluate([x,y]).loss??NaN,MAP,[-8,-2,0,.5,1,2,4,8,16,32],48),role:'ink',width:1.3});
  map.handles.push({id:'start',label:`${s.constraint==='none'?'Starting':'Requested starting'} parameters ${vecText([s.x,s.y])}. Arrow keys move by 0.25.`,at:{x:s.x,y:s.y},role:'primary',xField:'x',yField:'y',step:.25});
  map.markers.push({name:'candidate',at:{x:point[0],y:point[1]},role:'derived',filled:true});
  const profile=scene('profile',s.lambda>0?'Penalized loss slice: θ₂ = 0':'Loss slice: θ₂ = 0','This is a slice of the objective in parameter space, with θ₂ fixed at zero.',{xMin:-3.5,xMax:3.5,yMin:-3,yMax:4});
  profile.curves.push({name:'objective',lines:cachedCurve(key,x=>model.evaluate([x,0]).loss,profile.window, s.objective==='log'?[0]:[]),role:'primary',width:2.5});
  map.labels.push({name:'axis-parameter-1',at:{x:3.4,y:0},text:'θ₁',role:'ink',dy:-12,anchor:'end'},{name:'axis-parameter-2',at:{x:0,y:3.4},text:'θ₂',role:'ink',dx:12,dy:6,anchor:'start'});
  profile.labels.push({name:'axis-slice-parameter',at:{x:3.4,y:0},text:'θ₁',role:'ink',dy:-12,anchor:'end'},{name:'axis-slice-loss',at:{x:0,y:3.9},text:s.lambda>0?'J':'L',role:'ink',dx:12,dy:12,anchor:'start'});
  return [map,profile];
}
export function stepRows(step:Step): InspectorRowData[] {
  const rows = [row('point','\\theta_k','Current parameter vector',vdesc(step.point),'primary'),row('loss',step.penalty?'J_k':'L_k',step.penalty?'Current penalized objective value':'Current objective value',numericDesc(step.loss)),
    row('gradient',step.penalty?'\\nabla J_k':step.method==='descent'?'\\nabla L_k':'g_k',step.batch?'Selected batch mean gradient':'Actual gradient components',vdesc(step.gradient),'x'),row('eta','\\eta','Learning rate',numericDesc(step.eta)),
    row('update',step.clipping?'-\\eta\\widetilde g_k':step.penalty?'-\\eta\\nabla J_k':step.method==='descent'?'-\\eta\\nabla L_k':'\\Delta\\theta_k',step.projection?'Unconstrained update vector':'Update vector',vdesc(step.update),'y'),row('next','\\theta_{k+1}','Next parameter vector',vdesc(step.next),'derived'),
    row('next-loss',step.penalty?'J_{k+1}':'L_{k+1}','New objective value',step.nextEvaluation.loss===null?undefinedDesc(step.nextEvaluation.reason):numericDesc(step.nextEvaluation.loss))];
  if(step.projection)rows.push(row('proposal','z_k','Unconstrained proposed parameters',vdesc(step.projection.proposed),'caution'),row('correction','P_C(z_k)-z_k','Projection correction',vdesc(step.projection.correction),'derived'),row('actual-displacement','\\theta_{k+1}-\\theta_k','Actual projected displacement',vdesc(step.actualDisplacement!),'y'),row('constraint','C','Feasible region',exactDesc(step.projection.constraint==='box'?'box [-1, 1]²':'unit disk')));
  if(step.penalty)rows.push(row('base-loss','L','Base objective value',numericDesc(step.penalty.baseLoss)),row('penalty','\\lambda\\|\\theta\\|^2','Explicit L2 penalty value',numericDesc(step.penalty.value)),row('lambda','\\lambda','Penalty strength',givenDesc(step.penalty.lambda)));
  if(step.clipping)rows.push(row('unclipped-update','-\\eta g_k','Unclipped displacement for comparison',vdesc(step.rawUpdate!),'caution'),row('raw-norm','\\|g_k\\|','Raw gradient norm',numericDesc(step.clipping.norm)),row('clip-scale','s_k','Visible clipping scale',numericDesc(step.clipping.scale)),row('applied-gradient','\\widetilde g_k','Gradient used for the update',vdesc(step.clipping.applied)),row('clip-threshold','C','Clip norm threshold',givenDesc(step.clipping.threshold)));
  if(step.momentum) rows.push(row('velocity-before','v_k','Previous velocity',vdesc(step.momentum.previous),'x'),row('velocity','v_{k+1}','Updated velocity',vdesc(step.momentum.velocity),'y'),row('beta','\\beta','Momentum decay',numericDesc(step.momentum.beta)));
  if(step.batch) rows.push(row('indices','B_k','Selected zero-based indices (with repeats)',exactDesc(step.batch.indices.join(', '))),row('full-gradient','\\nabla L_k','Full-data gradient for comparison',vdesc(step.batch.fullGradient)),row('batch-loss','L_{B_k}','Selected batch mean loss',numericDesc(step.batch.loss)),row('rng','s_k\\to s_{k+1}','Explicit RNG state',exactDesc(`${step.batch.before} → ${step.batch.after}`)));
  if(step.adam) {
    const a=step.adam;
    rows.push(row('time','t','Adam update time (k + 1)',exactDesc(String(a.time))),
      row('m-before','m_{t-1}','Previous first moment',vdesc(a.previous.m)),row('v-before','v_{t-1}','Previous second moment',vdesc(a.previous.v)),
      row('m','m_t','Updated first moment',vdesc(a.m),'x'),row('v','v_t','Updated second moment',vdesc(a.v),'y'),
      row('mhat','\\widehat m_t','Bias-corrected first moment',vdesc(a.mhat),'x'),row('vhat','\\widehat v_t','Bias-corrected second moment',vdesc(a.vhat),'y'),
      row('beta1','\\beta_1','First moment decay',numericDesc(a.beta1)),row('beta2','\\beta_2','Second moment decay',numericDesc(a.beta2)),row('epsilon','\\epsilon','Epsilon outside square root',givenDesc(a.epsilon)));
  }
  return rows;
}
export function stepExplanation(step:Step): string {
  const base=`Iteration ${step.k}: at θ ≈ ${vecText(step.point)}, ${step.penalty?'J':'L'} ≈ ${ntext(step.loss)} and gradient ≈ ${vecText(step.gradient)}. Rate η ≈ ${ntext(step.eta)} gives update ≈ ${vecText(step.update)}. ${step.projection?'Before projection the proposal is ≈ '+vecText(step.projection.proposed)+'. Projection gives':'Adding that update gives'} θ next ≈ ${vecText(step.next)} and ${step.penalty?'J':'L'} next ${step.nextEvaluation.loss===null?'undefined: '+step.nextEvaluation.reason:'≈ '+ntext(step.nextEvaluation.loss)}.`;
  if(step.momentum) return base+` Velocity changes from ≈ ${vecText(step.momentum.previous)} to ≈ ${vecText(step.momentum.velocity)} using v next = β v previous + g. The update uses the accumulated velocity; momentum can increase loss.`;
  if(step.batch) return base+` Indices [${step.batch.indices.join(', ')}] are averaged with repeats. RNG state ${step.batch.before} becomes ${step.batch.after}. Full-data gradient is ≈ ${vecText(step.batch.fullGradient)}; displayed objective values use all four examples.`;
  if(step.adam) return base+` Adam time t = ${step.adam.time}: first moment ≈ ${vecText(step.adam.m)}, second moment ≈ ${vecText(step.adam.v)}, corrected moments ≈ ${vecText(step.adam.mhat)} and ≈ ${vecText(step.adam.vhat)}. Epsilon is added outside the square root. Adaptive scaling gives no global-optimality guarantee.`;
  if(step.projection)return base+` The ${step.projection.constraint} projection corrects the proposal by ≈ ${vecText(step.projection.correction)}; actual displacement is ≈ ${vecText(step.actualDisplacement!)}. Feasibility and a soft objective penalty are different mechanisms.`;
  if(step.clipping)return base+` The unclipped displacement would be ≈ ${vecText(step.rawUpdate!)}. Raw gradient norm ≈ ${ntext(step.clipping.norm)} exceeds the clip threshold only when needed. Scale ≈ ${ntext(step.clipping.scale)} gives applied gradient ≈ ${vecText(step.clipping.applied)}; the displayed update uses it. Clipping gives no global-optimality certificate.`;
  return base+' The step follows the negative gradient; a finite step can still increase loss.';
}
export function stepFormula(step:Step): string { if(step.projection)return `z_{${step.k}}\\approx ${vecTex(step.point)}+${vecTex(step.update)},\\quad\\theta_{${step.k+1}}=P_C(z_{${step.k}})\\approx ${vecTex(step.next)}`; return `\\theta_{${step.k+1}}\\approx ${vecTex(step.point)}+${vecTex(step.update)}\\approx ${vecTex(step.next)}`; }
export const optimizationTrace=(s:OptimizationState):DescentTrace=>descentTrace({...s,start:[s.x,s.y]});
export function deriveOptimization(s:OptimizationState,chapter:Chapter,index=0,trace:DescentTrace=optimizationTrace(s)):OptimizationView {
  const model=objectiveModel(s), evaluated=trace.initial;
  const selected=trace.frames[Math.min(index,Math.max(0,trace.frames.length-1))]?.state;
  const replay=['descent','rate','momentum','stochastic','adam','constraints','diagnostics'].includes(chapter);
  const description=replay&&selected?stepExplanation(selected):`Candidate θ ≈ ${vecText(replay?trace.start:[s.x,s.y])}; objective ${evaluated.loss===null?'undefined: '+evaluated.reason:'≈ '+ntext(evaluated.loss)}; gradient ${evaluated.gradient? '≈ '+vecText(evaluated.gradient):'undefined: '+evaluated.reason}. Coordinates are model parameters; data inputs are held fixed.`;
  const scenes=maps(s,replay?(selected?.point??trace.start):[s.x,s.y],description), map=scenes[0]!,profile=scenes[1]!;
  let rows=selected&&replay?stepRows(selected):[row('point','\\theta','Candidate parameters',vdesc(replay?trace.start:[s.x,s.y]),'primary'),row('loss','L','Objective value',evaluated.loss===null?undefinedDesc(evaluated.reason):numericDesc(evaluated.loss)),row('gradient','\\nabla L','Actual gradient',evaluated.gradient?vdesc(evaluated.gradient):undefinedDesc(evaluated.reason),'x')];
  if(!replay)rows.push(row('hessian','H','Hessian of the objective',evaluated.hessian?{status:'approximate',lines:[{relation:'≈',text:evaluated.hessian.map(vecText).join('; '),tex:`\\begin{bmatrix}${evaluated.hessian[0].map(ntex).join('&')}\\\\${evaluated.hessian[1].map(ntex).join('&')}\\end{bmatrix}`}],spoken:'Hessian rows '+evaluated.hessian.map(vecText).join('; ')}:undefinedDesc(evaluated.reason),'derived'));
  let batchTable:CalcTable|undefined;
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
    map.curves.push({name:'optimizer-path',lines:[[{x:trace.start[0],y:trace.start[1]},...visible.map(f=>({x:f.state.next[0],y:f.state.next[1]})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))]],role:'primary',width:3});
    if(selected&&Number.isFinite(selected.next[0])&&Number.isFinite(selected.next[1]))map.arrows.push({name:'actual-update',from:{x:selected.point[0],y:selected.point[1]},to:{x:selected.next[0],y:selected.next[1]},role:'y'});
    table={caption:'Evaluated binary64 history. Replay changes the selected row, never the stored mathematics.',head:['k','θ(k)',s.lambda>0?'J(k)':'L(k)','gradient','η',s.constraint!=='none'?'proposed update':'update','θ(k+1)',s.lambda>0?'J(k+1)':'L(k+1)'],rows:trace.frames.map(f=>{const v=f.state;return [String(v.k),vecText(v.point),ntext(v.loss),vecText(v.gradient),ntext(v.eta),vecText(v.update),vecText(v.next),v.nextEvaluation.loss===null?'undefined':ntext(v.nextEvaluation.loss)];})};
    if(table && chapter==='constraints')table={...table,head:[...table.head,'unconstrained proposal','projection correction','base loss','L2 penalty'],rows:table.rows.map((cells,i)=>{const step=trace.frames[i]!.state;return [...cells,step.projection?vecText(step.projection.proposed):vecText(step.next),step.projection?vecText(step.projection.correction):'not projected',ntext(step.penalty?.baseLoss??step.loss),ntext(step.penalty?.value??0)];})};
    if(table && chapter==='diagnostics')table={...table,head:[...table.head,'raw gradient norm','clip scale','applied gradient','unclipped update','absolute loss change'],rows:table.rows.map((cells,i)=>{const step=trace.frames[i]!.state;return [...cells,step.gradientNorm===null?'undefined':ntext(step.gradientNorm),ntext(step.clipping?.scale??1),vecText(step.clipping?.applied??step.gradient),vecText(step.rawUpdate??step.update),step.lossChange===undefined?'undefined':ntext(step.lossChange)];})};
    if(table && chapter==='momentum') table={...table,head:[...table.head,'previous velocity','updated velocity'],rows:table.rows.map((cells,i)=>[...cells,vecText(trace.frames[i]!.state.momentum!.previous),vecText(trace.frames[i]!.state.momentum!.velocity)])};
    if(table && chapter==='stochastic') table={...table,head:[...table.head,'indices','RNG before','RNG after'],rows:table.rows.map((cells,i)=>{const b=trace.frames[i]!.state.batch!;return [...cells,b.indices.join(', '),String(b.before),String(b.after)];})};
    if(table && chapter==='adam') table={...table,head:[...table.head,'t','m previous','v previous','m','v','m corrected','v corrected'],rows:table.rows.map((cells,i)=>{const a=trace.frames[i]!.state.adam!;return [...cells,String(a.time),vecText(a.previous.m),vecText(a.previous.v),vecText(a.m),vecText(a.v),vecText(a.mhat),vecText(a.vhat)];})};
    if(selected?.batch) batchTable={caption:'Each selected example at the current parameters; duplicates are retained. The update gradient is their arithmetic mean.',head:['zero-based index','example loss','example gradient'],rows:selected.batch.examples.map(e=>[String(e.index),ntext(e.loss),vecText(e.gradient)])};
    verdict=`${description} Stop: ${trace.reason}. Parameters outside the displayed window are retained in the table; the view never changes the path.`;
    formulas.push(chapter==='constraints'?'z_k=\\theta_k-\\eta\\nabla J(\\theta_k),\\quad\\theta_{k+1}=P_C(z_k)':chapter==='diagnostics'&&s.clip>0?'\\theta_{k+1}=\\theta_k-\\eta\\widetilde g_k':chapter==='momentum'?'v_{k+1}=\\beta v_k+g_k,\\quad\\theta_{k+1}=\\theta_k-\\eta v_{k+1}':chapter==='adam'?'\\theta_{t}=\\theta_{t-1}-\\eta\\frac{\\widehat m_t}{\\sqrt{\\widehat v_t}+\\epsilon}':chapter==='stochastic'?'g_{B_k}=\\frac1{|B_k|}\\sum_{i\\in B_k}\\nabla\\ell_i(\\theta_k),\\quad\\theta_{k+1}=\\theta_k-\\eta g_{B_k}':'\\theta_{k+1}=\\theta_k-\\eta\\nabla L(\\theta_k)',...(selected?[stepFormula(selected)]:[]));
    if(chapter==='adam')formulas.push('m_t=\\beta_1m_{t-1}+(1-\\beta_1)g_t,\\quad v_t=\\beta_2v_{t-1}+(1-\\beta_2)g_t^2','\\widehat m_t=\\frac{m_t}{1-\\beta_1^t},\\quad\\widehat v_t=\\frac{v_t}{1-\\beta_2^t}');
    if(trace.frames.length)frames=traceFrom(trace.frames.map(f=>({state:{semantic:f.state,title:`Evaluated iteration ${f.state.k}`,detail:stepExplanation(f.state),formula:stepFormula(f.state)}})));
  }
  if(chapter==='rate') {
    const stability=quadraticStability(s.a,s.eta);
    verdict+=` Quadratic stability: ${stability.kind}; eigenvalues (${s.a}, 4), mode factors ≈ ${vecText(stability.factors)}. All starts converge exactly in real arithmetic only for 0 < η < ${ntext(stability.limit)}. An initially zero unstable component is an exceptional run.`;
    rows.push(row('factors','1-\\eta\\lambda_i','Quadratic error multipliers',vdesc(stability.factors)),row('stability','\\eta<2/\\lambda_{\\max}','All-mode stability bound',numericDesc(stability.limit)));
    formulas.push(`e_{k+1,i}=(1-\\eta\\lambda_i)e_{k,i},\\quad 0<\\eta<\\frac2{\\max(a,4)}`);
  }

  if(chapter==='constraints') {
    if(s.constraint==='box')map.polygons.push({name:'feasible-region',corners:[{x:-1,y:-1},{x:1,y:-1},{x:1,y:1},{x:-1,y:1}],role:'derived'});
    if(s.constraint==='disk')map.polygons.push({name:'feasible-region',corners:Array.from({length:80},(_,i)=>({x:Math.cos(2*Math.PI*i/80),y:Math.sin(2*Math.PI*i/80)})),role:'derived'});
    if(selected?.projection)map.arrows.push({name:'proposed-update',from:{x:selected.point[0],y:selected.point[1]},to:{x:selected.projection.proposed[0],y:selected.projection.proposed[1]},role:'caution'});
    if(selected?.projection)map.labels.push({name:'proposal-label',at:{x:selected.projection.proposed[0],y:selected.projection.proposed[1]},text:'proposal',role:'caution',dy:-12},{name:'projected-label',at:{x:selected.next[0],y:selected.next[1]},text:'projected',role:'derived',dy:22});
    if(selected?.projection)map.segments.push({name:'projection-correction',from:{x:selected.projection.proposed[0],y:selected.projection.proposed[1]},to:{x:selected.next[0],y:selected.next[1]},role:'derived',dashed:true});
    rows.push(row('requested-start','\\theta_{\\rm requested}','Requested start before feasibility projection',vdesc([s.x,s.y])),row('feasible-start','P_C(\\theta_{\\rm requested})','Evaluated feasible start',vdesc(trace.start)),row('penalty-strength','\\lambda','Configured L2 penalty strength',givenDesc(s.lambda)));
    if(trace.initialProjection?.changed)verdict+=` Requested start ≈ ${vecText([s.x,s.y])} was explicitly projected to ≈ ${vecText(trace.start)} before the first objective evaluation.`;
    verdict+=` Feasible region: ${s.constraint==='none'?'unconstrained':s.constraint==='box'?'box [-1, 1]²':'unit disk'}. λ = ${s.lambda} adds λ‖θ‖² to the objective; a finite penalty does not enforce the region.`;
    formulas.push('J(\\theta)=L(\\theta)+\\lambda\\|\\theta\\|^2,\\quad\\nabla J=\\nabla L+2\\lambda\\theta');
  }
  if(chapter==='diagnostics') {
    if(selected?.clipping&&selected.rawProposal&&vectorFinite(selected.rawProposal)){map.arrows.push({name:'unclipped-update',from:{x:selected.point[0],y:selected.point[1]},to:{x:selected.rawProposal[0],y:selected.rawProposal[1]},role:'caution'});map.labels.push({name:'unclipped-label',at:{x:selected.rawProposal[0],y:selected.rawProposal[1]},text:'unclipped',role:'caution',dy:22},{name:'clipped-label',at:{x:selected.next[0],y:selected.next[1]},text:'clipped',role:'y',dy:22});}
    rows.push(row('selected-gradient-norm','\\|g_k\\|','Selected raw gradient norm',selected?.gradientNorm!=null?numericDesc(selected.gradientNorm):undefinedDesc('No accepted iteration is selected.')),
      row('stop-gradient-norm','\\|g_{\\rm final}\\|','Final raw gradient norm at stop',trace.stopGradientNorm===null?undefinedDesc(trace.reason):numericDesc(trace.stopGradientNorm)),
      row('gradient-tolerance','\\tau_g','Raw gradient stopping threshold',s.gradientTolerance>0?givenDesc(s.gradientTolerance):exactDesc('disabled (0)')),
      row('loss-tolerance','\\tau_L','Absolute loss-change stopping threshold',s.lossTolerance>0?givenDesc(s.lossTolerance):exactDesc('disabled (0)')),
      row('last-loss-change','|J_{k+1}-J_k|','Last accepted absolute loss change',trace.lastLossChange===null?undefinedDesc('No accepted loss comparison.'):numericDesc(trace.lastLossChange)),
      row('divergence-limit','R','Explicit divergence norm boundary',givenDesc(s.divergenceLimit)),row('stopping-reason','\\text{stop}','Actual termination reason',exactDesc(trace.reason)));
    verdict+=` Raw gradient threshold = ${s.gradientTolerance}; absolute loss-change threshold = ${s.lossTolerance}; clip norm = ${s.clip} (0 disables each). Parameter norm boundary = ${s.divergenceLimit}. Numerical stopping and clipping do not certify a global minimum.`;
    formulas.push('\\|\\nabla L(\\theta_k)\\|\\le\\tau_g,\\quad|L_{k+1}-L_k|\\le\\tau_L',...(s.clip>0?['\\widetilde g_k=g_k\\min(1,C/\\|g_k\\|),\\quad\\widetilde g_k=0\\text{ if }g_k=0']:[]));
  }
  map.description=description+' '+verdict;
  return {scenes,rows,formulas,verdict,description,table,batchTable,frames,metrics:{evaluated,start:trace.start,initialProjection:trace.initialProjection,stopGradientNorm:trace.stopGradientNorm,lastLossChange:trace.lastLossChange,selected:selected??null,reason:trace.reason},hint:'Drag the starting point. Arrow keys move by 0.25; Shift moves by 1.25. Numeric fields and presets change the same parameters. Replay selects immutable evaluated steps.'};
}


export const CANONICALS: Record<Chapter,OptimizationState> = {
  landscapes:CANONICAL,optima:CANONICAL,convexity:CANONICAL,descent:CANONICAL,rate:CANONICAL,
  momentum:{...CANONICAL,method:'momentum'},
  stochastic:{...CANONICAL,method:'stochastic',objective:'regression',x:0,y:0,eta:.1},
  adam:{...CANONICAL,method:'adam'},
  constraints:{...CANONICAL,x:0,y:1,center:2,eta:1,constraint:'box'},
  diagnostics:{...CANONICAL,gradientTolerance:.1},
};
export function presetsFor(chapter:Chapter):readonly {id:string;label:string;state:OptimizationState}[] {
  const base=CANONICALS[chapter];
  if(chapter==='rate')return [
    {id:'slow',label:'Slow: η = 0.03',state:{...base,eta:.03}},{id:'effective',label:'Contracting: η = 0.25',state:base},
    {id:'oscillation',label:'Damped oscillation: η = 0.4',state:{...base,eta:.4}},{id:'boundary',label:'No decay: η = 0.5',state:{...base,eta:.5}},
    {id:'divergence',label:'Divergent: η = 0.75',state:{...base,eta:.75}},
  ];
  if(chapter==='momentum')return [
    {id:'momentum',label:'Momentum β = 0.8',state:base},{id:'no-momentum',label:'No memory: β = 0',state:{...base,beta:0}},
    {id:'damping',label:'Less memory: β = 0.2',state:{...base,beta:.2}},{id:'overshoot',label:'Strong memory, large rate',state:{...base,beta:.95,eta:1}},
  ];
  if(chapter==='stochastic')return [
    {id:'mini',label:'Mini-batch (2 slots)',state:base},{id:'full',label:'Full batch',state:{...base,batch:'full'}},
    {id:'single',label:'One sampled example',state:{...base,batch:'stochastic'}},{id:'seed7',label:'Reproduce seed 7',state:{...base,seed:7}},
  ];
  if(chapter==='adam')return [
    {id:'adam',label:'Bias-corrected Adam',state:base},{id:'zero',label:'Zero gradients',state:{...base,x:0,y:0}},
    {id:'change-sign',label:'Gradients change direction',state:{...base,x:.25,y:.25,eta:1}},{id:'one-zero',label:'One zero component',state:{...base,y:0}},
  ];
  if(chapter==='constraints')return [
    {id:'box',label:'Project onto a box',state:base},{id:'disk',label:'Project onto a disk',state:{...base,constraint:'disk'}},
    {id:'unconstrained',label:'No constraint or penalty',state:{...base,constraint:'none',eta:.1}},
    {id:'penalty',label:'L2 penalty λ = 1',state:{...base,constraint:'none',lambda:1,eta:.1}},
    {id:'strong-penalty',label:'Stronger penalty λ = 3',state:{...base,constraint:'none',lambda:3,eta:.1}},
  ];
  if(chapter==='diagnostics')return [
    {id:'gradient-stop',label:'Small raw gradient',state:base},{id:'loss-stop',label:'Small loss change',state:{...base,gradientTolerance:0,lossTolerance:.5}},
    {id:'budget',label:'Two-step budget',state:{...base,gradientTolerance:0,iterations:2}},
    {id:'clipped',label:'Visible gradient clipping',state:{...base,gradientTolerance:0,clip:1}},
    {id:'divergence',label:'Divergence boundary',state:{...base,gradientTolerance:0,eta:2}},
    {id:'nonfinite',label:'Non-finite quartic loss',state:{...base,objective:'flat',x:3,y:1,eta:2,gradientTolerance:0,divergenceLimit:1e300}},
    {id:'saddle-stop',label:'Zero gradient at a saddle',state:{...base,objective:'saddle',x:0,y:0}},
  ];
  return PRESETS;
}
export function fieldsFor(s:OptimizationState,chapter:Chapter):readonly (keyof typeof SPECS)[] {
  if(chapter==='convexity')return ['left','right','t'];
  const fields:(keyof typeof SPECS)[]=['x','y'];
  if(s.objective==='quadratic')fields.push('a','center');
  if(['descent','rate','momentum','stochastic','adam','constraints','diagnostics'].includes(chapter))fields.push('eta','iterations');
  if(chapter==='momentum')fields.push('beta');
  if(chapter==='stochastic')fields.push('seed',...(s.batch==='mini'?['batchSize' as const]:[]));
  if(chapter==='adam')fields.push('beta1','beta2');
  if(chapter==='constraints')fields.push('lambda');
  if(chapter==='diagnostics')fields.push('gradientTolerance','lossTolerance','clip');
  return fields;
}
