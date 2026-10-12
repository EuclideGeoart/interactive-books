/** Four explicit vocabulary tokens and at most four contributing sequence positions. */
import {integer} from '../probability/seeded';
import {softmaxPipeline} from './softmax';
export const VOCABULARY=Object.freeze(['the','cat','sat','<eos>']);
export interface TokenPosition {readonly logits:readonly number[];readonly target:number;readonly ignored:boolean}
export function sequenceLoss(positions:readonly TokenPosition[]) {
  integer(positions.length,1,4,'Sequence position count');
  const rows=positions.map((position,index)=>{
    integer(position.target,0,VOCABULARY.length-1,'Target token index');
    if(typeof position.ignored!=='boolean'||position.logits.length!==VOCABULARY.length)throw new RangeError('Each position needs four logits, a vocabulary target, and an explicit boolean mask.');
    if(position.logits.some(z=>Number.isFinite(z)&&Math.abs(z)>1000))throw new RangeError('Toy token scores lie in [−1000,1000], with optional explicit −∞ exclusions.');
    const pipeline=softmaxPipeline(position.logits);
    if(pipeline.status!=='valid')throw new RangeError(`Position ${index+1}: ${pipeline.reason}`);
    const nll=-pipeline.logProbabilities[position.target]!+0;
    const oneHotTerms=pipeline.logProbabilities.map((log,i)=>i===position.target?-log+0:0);
    return {index,position,pipeline,nll,oneHotTerms,oneHotCross:oneHotTerms.reduce((a,b)=>a+b,0),targetToken:VOCABULARY[position.target]!};
  });
  const contributing=rows.filter(row=>!row.position.ignored),count=contributing.length,total=contributing.reduce((s,row)=>s+row.nll,0),mean=count?total/count:null;
  return {rows,count,total,mean,reason:count?'Mean uses exactly the contributing positions.':'All positions are masked: the mean is undefined because its denominator is zero.'};
}
