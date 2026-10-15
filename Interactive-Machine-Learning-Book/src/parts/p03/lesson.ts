import { formatNumber } from '../../platform/format';
import { distance,finite,pointVector } from './model/distance';
import { deriveNeighbors,type NeighborState,type Point } from './model/neighbors';
import { deriveMetrics,type MetricState } from './model/metrics';
import { BAYES_CANONICAL,deriveBayes,type BayesState } from './model/bayes';
export const approx = (value:number|null):string => value === null ? 'Undefined' : '≈ '+formatNumber(value);
const texNumber = (value:number) => formatNumber(value).replace('−','-');
const shape = (value:readonly number[]) => value.join(' × ');
export const QUERY_UI={min:-3,max:3,step:.1} as const;
export const PLANE={size:640,origin:320,scale:80} as const;
function supported(point:Point) {
  for(const v of [point.x,point.y])if(!Number.isFinite(v)||v < -3||v > 3)
    throw new RangeError('This plot supports coordinates from −3 to 3. Previous state preserved.');
}
function plane(width:number) {
  if(!Number.isFinite(width)||width<=0)throw new RangeError('Plot width must be positive and finite.');
  const {size,origin,scale}=PLANE,fontSize=finite(Math.max(16,14*size/width),'Plot label arithmetic'),markRadius=finite(Math.max(7,4*size/width),'Plot marker arithmetic');
  const project=(p:Point)=>({cx:origin+scale*p.x,cy:origin-scale*p.y});
  const labels=[{x:592,y:origin-12,text:'x',anchor:'end'},{x:origin+12,y:48,text:'y',anchor:'start'}] as const;
  const ticks=[-2,0,2].flatMap(v=>[
    {x:origin+scale*v,y:origin+fontSize+8,text:String(v),anchor:'middle' as const},
    ...(v===0?[]:[{x:origin-12,y:origin-scale*v+fontSize/3,text:String(v),anchor:'end' as const}]),
  ]);
  return {viewBox:'0 0 640 640',size,origin,scale,fontSize,markRadius,hitRadius:finite(Math.max(11,23*size/width),'Plot handle arithmetic'),project,
    clip:{x:56,y:56,width:528,height:528},ticks,labels,
    axes:[{x1:56,y1:origin,x2:584,y2:origin},{x1:origin,y1:56,x2:origin,y2:584}]};
}
function queryProjection(point:Point,plot:ReturnType<typeof plane>) {
  const {cx,cy}=plot.project(point),r=plot.markRadius;
  return {...point,cx,cy,hitRadius:plot.hitRadius,
    diamond:'M '+cx+' '+(cy-r)+' L '+(cx+r)+' '+cy+' L '+cx+' '+(cy+r)+' L '+(cx-r)+' '+cy+' Z',
    name:'Query: x '+point.x+', y '+point.y+'. Arrow keys move 0.1; Shift moves 0.5.'};
}
function contour(query:Point,radius:number|null,state:{metric:NeighborState['metric'];p:number;scales:readonly [number,number]},plot:ReturnType<typeof plane>) {
  if(radius===null)return '';
  const points=Array.from({length:97},(_,j)=>{
    const angle=j*2*Math.PI/96,dx=Math.cos(angle),dy=Math.sin(angle);
    const norm=distance([dx,dy],[0,0],state.metric,state.p,state.scales);
    return plot.project({x:query.x+radius*dx/norm,y:query.y+radius*dy/norm});
  });
  return points.map((p,j)=>(j?'L ':'M ')+p.cx+' '+p.cy).join(' ')+' Z';
}
export function deriveNeighborLesson(state:NeighborState,width=320) {
  const active=deriveNeighbors(state);supported(state.query);state.samples.forEach(supported);
  state.scales.forEach(v=>{if(v<.1||v>10)throw new RangeError('UI reference scales must be between 0.1 and 10.');});
  const plot=plane(width),q=queryProjection(state.query,plot);
  const points=active.rows.map((row,index)=>{
    const {cx,cy}=plot.project(row),r=plot.markRadius;
    const coincidentBefore=active.rows.slice(0,index).filter(other=>other.x===row.x&&other.y===row.y).length;
    return {...row,cx,cy,r,label:{x:cx+r+5,y:cy-r-5-coincidentBefore*(plot.fontSize+4),text:row.id+' '+row.category},
      glyph:row.category==='A'?'M '+(cx-r)+' '+(cy-r)+' h '+2*r+' v '+2*r+' h '+(-2*r)+' Z':
        'M '+cx+' '+(cy-r)+' L '+(cx+r)+' '+(cy+r)+' L '+(cx-r)+' '+(cy+r)+' Z',
      line:{x1:q.cx,y1:q.cy,x2:cx,y2:cy},name:'Sample '+row.id+', class '+row.category+', target '+row.target};
  });
  const radius=active.reason===null?active.rows[state.k-1]!.distance:null;
  const scalars=[
    {key:'classification',label:'Classification vote',text:active.classification??'Undefined',number:null},
    {key:'regression',label:'Unweighted regression average',text:approx(active.regression),number:active.regression},
    {key:'boundary-distance',label:'kth neighbor distance',text:approx(radius),number:radius},
  ];
  return {...active,points,plot:{...plot,points,query:q,contour:contour(state.query,radius,state,plot)},scalars,
    voteExplanation:active.reason!==null?'No neighbors selected. '+active.reason:
      active.voteTie?'Tie: choose A by the declared deterministic rule.':'Unweighted majority among exactly k selected rows.',
    tableRows:active.rows.map(row=>({...row,text:{x:String(row.x),y:String(row.y),target:String(row.target),distance:approx(row.distance)}})),
    formula:{tex:'N_k(q)=\\operatorname{first}_k\\{\\operatorname{sort}_{(d,\\mathrm{ID})}(X)\\},\\quad \\hat y=\\frac{1}{k}\\sum_{i\\in N_k(q)}y_i'+
      (active.regression===null?'':'\\approx'+texNumber(active.regression)),
      label:'First k neighbors by distance then ID; regression average '+approx(active.regression)},
    inspector:[{label:'X · sample rows',value:shape(active.shapes.X)},{label:'Query column',value:shape(active.shapes.query)},
      {label:'Distance column',value:shape(active.shapes.distances)},{label:'Target column',value:shape(active.shapes.targets)},
      {label:'Ordering',value:'distance, then ID',detail:'Exact binary64 equality; IDs use UTF-16 code-unit order.'},
      {label:'Vote tie',value:active.voteTie?'A by declared rule':'None',detail:'Equal A/B vote counts choose A; no certainty is implied.'}],
    speech:'Query x '+state.query.x+', y '+state.query.y+'. k '+state.k+'. Selected '+(active.selectedIds.join(', ')||'none')+
      '. Classification '+(active.classification??'undefined')+'. Regression average '+approx(active.regression)+'. '+(active.reason??'')};
}
export function deriveMetricLesson(state:MetricState,width=320) {
  const active=deriveMetrics(state);supported(state.query);supported(state.point);
  state.scales.forEach(v=>{if(v<.1||v>10)throw new RangeError('UI reference scales must be between 0.1 and 10.');});
  const plot=plane(width),query=queryProjection(state.query,plot),end=plot.project(state.point);
  const span=active.summary.max-active.summary.min;
  const position=(value:number)=>span===0?320:56+(value-active.summary.min)*528/span;
  const strip={viewBox:'0 0 640 220',fontSize:plot.fontSize,
    axis:{x1:56,y1:125,x2:584,y2:125},mean:{x1:position(active.summary.mean),y1:42,x2:position(active.summary.mean),y2:130},
    points:active.rows.map((row,j)=>({id:row.id,cx:position(row.distance),cy:65+(j%3)*20,r:plot.markRadius,distance:row.distance})),
    labels:[{x:56,y:165,text:'min '+approx(active.summary.min),anchor:'start' as const},{x:584,y:165,text:'max '+approx(active.summary.max),anchor:'end' as const},
      {x:320,y:205,text:'mean '+approx(active.summary.mean),anchor:'middle' as const}]};
  const scalars=[
    {key:'pair-distance',label:'Scaled pair distance',number:active.pairDistance},
    {key:'mean',label:'Mean origin distance',number:active.summary.mean},
    {key:'relative-spread',label:'(max − min) / mean',number:active.summary.relativeSpread},
    {key:'cv',label:'Population SD / mean',number:active.summary.coefficientOfVariation},
  ].map(v=>({...v,text:approx(v.number)}));
  return {...active,scalars,strip,plot:{...plot,query,contour:contour(state.query,1,state,plot),
    points:[{...end,id:'point',r:plot.markRadius,glyph:'M '+(end.cx-plot.markRadius)+' '+(end.cy-plot.markRadius)+' h '+2*plot.markRadius+' v '+2*plot.markRadius+' h '+(-2*plot.markRadius)+' Z',
      label:{x:end.cx+plot.markRadius+5,y:end.cy-plot.markRadius-5,text:'z'},line:{x1:query.cx,y1:query.cy,x2:end.cx,y2:end.cy},
      selected:true,category:'A',name:'Comparison point z: x '+state.point.x+' metres, y '+state.point.y+' seconds'}]},
    formula:{tex:'d_r(q,z)=\\left(\\sum_j\\left|\\frac{q_j-z_j}{s_j}\\right|^r\\right)^{1/r},\\quad r\\approx'+texNumber(active.power)+
      ',\\quad d_r(q,z)\\approx'+texNumber(active.pairDistance),label:'Scaled Minkowski distance '+approx(active.pairDistance)},
    inspector:[{label:'Pair feature units',value:'metres, seconds',detail:'Reference scales carry those units; scaled differences and distance are dimensionless.'},
      {label:'Simulation X',value:shape(active.shapes.X)},{label:'Origin query',value:shape(active.shapes.query)},
      {label:'Distances',value:shape(active.shapes.distances)},{label:'Seed',value:String(state.seed)},
      {label:'Normalization',value:state.normalization,detail:state.normalization==='raw'?'Lp norm':'Divide Lp norm by d^(1/r); this rescales every distance equally.'}],
    speech:'Pair query x '+state.query.x+', y '+state.query.y+'. Pair distance '+approx(active.pairDistance)+'. Seed '+state.seed+
      ', dimension '+state.dimension+', '+state.distribution+', '+state.normalization+'. Mean '+approx(active.summary.mean)+
      ', relative spread '+approx(active.summary.relativeSpread)+', coefficient of variation '+approx(active.summary.coefficientOfVariation)+'.'};
}
export function deriveBayesLesson(state:BayesState) {
  const active=deriveBayes(state);
  if(state.alpha>10||state.classes.some(c=>c.count>20||c.priorWeight>10))
    throw new RangeError('This ledger supports counts up to 20 and prior weights/smoothing up to 10. Previous state preserved.');
  const originalCounts=state.classes.every((c,j)=>c.count===BAYES_CANONICAL.classes[j]!.count&&c.positive.every((v,k)=>v===BAYES_CANONICAL.classes[j]!.positive[k]));
  const provenance=originalCounts?state.provenance:'Toy counts changed from the original records; '+state.provenance;
  const rows=active.rows.map(row=>({...row,text:{prior:approx(row.prior),logPrior:row.logPrior===null?(row.prior===0?'−∞ · zero prior':'Undefined'):approx(row.logPrior),
    score:row.underflow?'≈ 0 · underflow':approx(row.score),logScore:row.logScore===null?(row.impossible?'−∞ · impossible':'Undefined'):approx(row.logScore),
    posterior:approx(row.posterior),shifted:approx(row.shifted)},
    features:row.features.map(f=>({...f,text:{likelihood:f.underflow?'≈ 0 · underflow':approx(f.likelihood),logLikelihood:f.logLikelihood===null?(f.likelihood===0?'−∞ · zero probability':'Undefined'):approx(f.logLikelihood),
      count:'≈ '+String(f.numerator)+' / '+String(f.denominator)}}))}));
  const scalars=[
    {key:'shift',label:'Largest finite log score m',number:active.shift},
    {key:'normalizer',label:'Sum of shifted exponentials',number:active.normalizer},
    {key:'log-evidence',label:'Log evidence',number:active.logEvidence},
  ].map(v=>({...v,text:approx(v.number)}));
  return {...active,rows,scalars,provenance,
    decisionExplanation:active.prediction===null?'No class decision is defined. '+active.reason:
      active.tiedPosterior?'Exact posterior tie; A is the declared deterministic choice.':'Choose by exact model-score ordering.',
    formula:{tex:'\\ell_c=\\log\\pi_c+\\sum_{j\\in E}\\log P(x_j\\mid c),\\quad P(c\\mid x_E)=\\frac{e^{\\ell_c-m}}{\\sum_r e^{\\ell_r-m}}',
      label:'Log score equals log prior plus observed-feature log likelihoods; subtract a finite maximum before normalization.'},
    inspector:[{label:'Query column',value:shape(active.shapes.query)},{label:'Class prior column',value:shape(active.shapes.priors)},
      {label:'Likelihood ledger',value:shape(active.shapes.likelihoods)},{label:'Posterior column',value:shape(active.shapes.posterior)},
      {label:'Observed evidence',value:state.observed.map((v,j)=>v?'feature '+(j+1):'').filter(Boolean).join(', ')||'Prior only'},
      {label:'Prediction',value:active.prediction??'Undefined',detail:active.reason??'Exact model-score ordering; displayed posteriors are approximate. Exact ties choose A.'}],
    speech:'Smoothing alpha '+state.alpha+'. Evidence '+state.query.join(', ')+'. '+
      active.rows.map(r=>'Class '+r.id+' posterior '+approx(r.posterior)).join('; ')+'. Prediction '+(active.prediction??'undefined')+'. '+(active.reason??'')};
}
export function moveQuery(point:Point,key:string,accelerated=false):Point {
  pointVector(point);
  if(typeof accelerated!=='boolean')throw new RangeError('Keyboard acceleration must be boolean.');
  const step=accelerated ? 0.5 : 0.1;
  return {x:point.x+(key==='ArrowRight'?step:key==='ArrowLeft'?-step:0),
    y:point.y+(key==='ArrowUp'?step:key==='ArrowDown'?-step:0)};
}
export function pointerQuery(clientX:number,clientY:number,rect:{left:number;top:number;width:number;height:number}):Point {
  [clientX,clientY,rect.left,rect.top,rect.width,rect.height].forEach(v=>finite(v,'Pointer geometry'));
  const size=Math.min(rect.width,rect.height);
  if(size<=0)throw new RangeError('Pointer plot bounds must be positive.');
  const u=(clientX-rect.left-(rect.width-size)/2)*PLANE.size/size;
  const v=(clientY-rect.top-(rect.height-size)/2)*PLANE.size/size;
  const snap=(value:number)=>Math.max(-3,Math.min(3,Math.round(value*10)/10));
  return {x:snap((u-PLANE.origin)/PLANE.scale),y:snap((PLANE.origin-v)/PLANE.scale)};
}
