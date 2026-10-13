import { formatNumber } from '../../platform/format';
import { derivePipeline, deriveFeatures, deriveTask, type PipelineState, type FeatureState, type TaskState } from './model/foundations';
import { deriveCapacity, type CapacityState } from './model/capacity';
import { deriveSplit, leakageExample, type SplitState } from './model/splits';
import { predictRegression } from '../p02/model/linear-regression';

export const approx = (value: number | null) => value === null ? 'Undefined' : `≈ ${formatNumber(value)}`;
const tex = (value: number) => formatNumber(value).replace('−','-');
const shape = (value: readonly number[] | null) => value ? value.join(' × ') : 'Absent';
export function derivePipelineLesson(state: PipelineState) {
  const active = derivePipeline(state), r = active.state.regression;
  return { ...active,
    metricLabels:{prediction:state.mode==='training'?'Selected observation prediction':'Inference query prediction',residual:state.mode==='training'?'Selected observation residual':'Inference query residual',loss:state.mode==='training'?'Training batch MSE':'Inference query loss · no observed target'},
    lossScope:state.mode==='training'?'training-batch':'inference-query',
    nodes: [
      { label: '1 · Input', value: String(active.x), detail: state.mode === 'training' ? `Observed sample ${state.sampleId}` : 'Unlabelled query' },
      { label: '2 · Features', value: `[${active.x}]`, detail: '1 × 1 column' },
      { label: '3 · Prediction', value: approx(active.prediction), detail: 'Shared affine predictor' },
      { label: '4 · Error', value: approx(active.residual), detail: state.mode === 'training' ? 'Prediction − target' : 'No observed target' },
      { label: '5 · Update', value: state.mode === 'training' ? `w ${approx(active.numerical.next.weight)}; b ${approx(active.numerical.next.bias)}` : 'Parameters fixed', detail: state.mode === 'training' ? 'Proposed batch update' : 'Inference ends at prediction' },
    ],
    formula: { tex: String.raw`\hat y=wx+b,\quad w\approx${tex(r.weight)},\quad b\approx${tex(r.bias)},\quad \hat y\approx${tex(active.prediction)}`,
      label: `Prediction approximately ${formatNumber(active.prediction)}; weight ${r.weight}, bias ${r.bias}` },
    inspector: [{label:'Query column',value:shape(active.inputShape)},{label:'Batch X',value:shape(active.batchShape)},
      {label:'Weight W',value:shape(active.weightShape)},{label:'Training targets',value:shape(active.numerical.shapes.targets)},
      {label:'Current mode',value:state.mode,detail:active.reason ?? 'Targets are observed; an update can be proposed.'}],
    speech: `Weight ${r.weight}, bias ${r.bias}, learning rate ${r.learningRate}. Mode ${state.mode}. Input ${active.x}. Prediction approximately ${formatNumber(active.prediction)}. ${active.target === null ? active.reason : `Target ${active.target}. Batch loss approximately ${formatNumber(active.loss!)}.`}`,
  };
}
export function deriveFeatureLesson(state: FeatureState) {
  const active=deriveFeatures(state);
  return {...active, inspector:[{label:'X · sample rows, feature columns',value:shape(active.shapes.X)},
    {label:'Illustrative weights',value:shape(active.shapes.weights),detail:'A compatible linear predictor would use a weight column; this schema inspector fits no model.'},
    {label:'y · targets',value:shape(active.shapes.targets),detail:active.targetReason ?? `Semantic type: ${state.targetKind}`},
    {label:'Bias convention',value:'Separate scalar',detail:'No intercept column has been added to X.'}],
    speech:`${state.sampleCount} samples and ${state.featureCount} features. X is ${shape(active.shapes.X)}. Target type ${state.targetKind}.`};
}
export function deriveTaskLesson(state: TaskState) {
  const active=deriveTask(state);
  return {...active,inspector:[{label:'Goal',value:active.supervision},{label:'X',value:shape(active.shapes.X)},
    {label:'Targets used by this goal',value:shape(active.shapes.targets),detail:active.reason}],
    speech:`${active.scenario.name}. Your choice ${state.choice} is ${active.correct?'correct':'not correct for this goal'}. ${active.reason}`};
}
export function deriveSplitLesson(state: SplitState) {
  const active=deriveSplit(state), leakage=leakageExample(state.seed);
  return {...active,leakage,
    tableRows:active.rows.map(row=>{const prediction=active.subsets.find(set=>set.partition===row.partition)!.predictions.find(p=>p.id===row.id);return {...row,prediction:prediction?.prediction??null,residual:prediction?.residual??null};}),
    inspector:active.subsets.map(row=>({label:`${row.partition} X/y`,value:shape(row.shape),detail:row.reason??`${row.count} samples; ${row.outOfRange.length} outside training x range.`})),
    speech:`Seed ${state.seed}, source ${state.source}. ${active.subsets.map(row=>`${row.partition} ${row.count}`).join('; ')}. ${active.groupLeaks.length} group leaks, ${active.duplicateLeaks.length} duplicate signatures cross partitions. Training mean ${approx(active.baselineMean)}.`};
}
// All geometry is a projection; the renderer receives no coordinate arithmetic.
export function deriveCapacityLesson(state: CapacityState, renderedWidth=320) {
  if(!Number.isFinite(renderedWidth)||renderedWidth<=0)throw new RangeError('Plot width must be positive and finite.');
  const active=deriveCapacity(state);
  const allTrain={...active.split.state,assignments:Object.fromEntries(active.rows.map(row=>[row.id,'train' as const]))};
  const wholeMean=deriveSplit(allTrain).baselineMean!;
  const leakage=active.errors.map(error=>{
    const data=active.rows.filter(row=>row.partition===error.partition);
    return {partition:error.partition, honestMSE:error.baselineMSE,
      leakedMSE:data.length?data.reduce((sum,row)=>sum+(predictRegression(row.x,0,wholeMean)-row.y)**2,0)/data.length:null};
  });
  const projectX=(x:number)=>48+(x+1.1)*544/2.2, projectY=(y:number)=>352-(y+3)*304/7;
  const path=(key:'prediction'|'truth'|'baseline')=>active.curve.filter(row=>row[key]!==null).map((row,i)=>`${i?'L':'M'} ${projectX(row.x)} ${projectY(row[key]!)}`).join(' ');
  const points=active.rows.map(row=>{
    const cx=projectX(row.x),cy=projectY(row.y),py=row.prediction===null?null:projectY(row.prediction);
    const glyph=row.partition==='train'?`M ${cx-5} ${cy-5} h 10 v 10 h -10 Z`:row.partition==='test'?`M ${cx} ${cy-6} L ${cx+6} ${cy+5} L ${cx-6} ${cy+5} Z`:null;
    return {...row,cx,cy,glyph,r:5,residualLine:py===null?null:{x1:cx,y1:cy,x2:cx,y2:py},
      name:`${row.id}, ${row.partition}, x ${row.x}, target ${row.y}, prediction ${approx(row.prediction)}`};
  });
  const ticks=[-1,0,1].map(x=>({x:projectX(x),y:378,text:String(x)}));
  const yTicks=[-2,0,2,4].map(y=>({x:35,y:projectY(y)+5,text:String(y)}));
  return {...active,leakage:{wholeMean,errors:leakage,reason:'Invalid comparison: the whole-target mean reads validation and test labels. It must never replace the training-only baseline.'},
    plot:{fontSize:Math.max(16,14*640/renderedWidth),viewBox:'0 0 640 400',clip:{x:48,y:48,width:544,height:304},points,
      paths:{fit:path('prediction'),truth:path('truth'),baseline:path('baseline')},
      axes:[{x1:48,y1:projectY(0),x2:592,y2:projectY(0)},{x1:projectX(0),y1:48,x2:projectX(0),y2:352}],
      ticks,yTicks,labels:[{x:604,y:378,text:'x'},{x:22,y:28,text:'y'}],
      projection:'viewBox 0 0 640 400; cx=48+(x+1.1)·544/2.2; cy=352−(y+3)·304/7. Axis units use different scales. y outside [−3,4] is clipped; table keeps every value.'},
    formula:{tex:String.raw`\hat y=\sum_{j=0}^{${state.degree}}\theta_j x^j,\quad L_{\mathrm{train}}=\frac{1}{n_{\mathrm{train}}}\sum_{i\in\mathrm{train}}(\hat y_i-y_i)^2`,
      label:`Degree ${state.degree} polynomial; ${active.trainingIds.length} training samples.`},
    inspector:[{label:'Training IDs',value:active.trainingIds.join(', ')||'Empty'},{label:'Design X (includes column 1)',value:shape(active.shapes.X)},
      {label:'Coefficient column θ',value:shape(active.shapes.weights)},{label:'Training targets',value:shape(active.shapes.targets)},
      {label:'Solver',value:'Two-pass MGS QR',detail:'Column residual cutoff: 1e−12 × design Frobenius norm.'}],
    speech:`Noise seed ${state.seed}, noise amplitude ${state.noise}, degree ${state.degree}, assignments ${state.source??'interleaved'}. ${active.trainingIds.length} training samples. Training loss ${approx(active.errors[0]!.mse)}, validation loss ${approx(active.errors[1]!.mse)}. ${active.reason??''}`};
}
