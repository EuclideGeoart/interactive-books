/** Exact weighted descriptive covariance and unweighted simple regression; small bounded datasets. */
import { add, div, eq, isZero, mul, sub, toNumber } from '../quantity/rational';
import { decimal, finiteMoments } from '../probability/moments';
import { weightedSpace, sum } from '../probability/finite';
import { integer } from '../probability/seeded';
import { eigen2 } from '../linear-algebra/eigenvalues';
export interface ScatterInput { xs:readonly number[]; ys:readonly number[]; weights:readonly number[] }
export function scatter(input:ScatterInput,weighted=true) {
  const {xs,ys,weights}=input;integer(xs.length,1,12,'Observation count');
  if(ys.length!==xs.length||weights.length!==xs.length||typeof weighted!=='boolean')throw new RangeError('Each observed pair needs a weight.');
  for(const w of weights)integer(w,0,9,'Weight');
  const x=xs.map(v=>{if(Math.abs(v)>8)throw new RangeError('Coordinates lie in [-8,8].');return decimal(v);}),y=ys.map(v=>{if(Math.abs(v)>8)throw new RangeError('Coordinates lie in [-8,8].');return decimal(v);});
  const probabilities=weightedSpace(weighted?weights:weights.map(()=>1)),mx=finiteMoments(x,probabilities),my=finiteMoments(y,probabilities);
  const covariance=sum(mx.deviations.map((v,i)=>mul(probabilities[i]!,mul(v,my.deviations[i]!))));
  const determinant=sub(mul(mx.variance,my.variance),mul(covariance,covariance));
  if(determinant.num<0n)throw new Error('Exact covariance must be positive semidefinite.');
  const matrix={rows:2,cols:2,values:[[mx.variance,covariance],[covariance,my.variance]]};
  const spectral=eigen2(matrix),repeated=isZero(covariance)&&eq(mx.variance,my.variance),rank=isZero(mx.variance)&&isZero(my.variance)?0:isZero(determinant)?1:2;
  const principal=spectral.pairs[0]!,secondary=spectral.pairs[1]!,center={x:toNumber(mx.mean),y:toNumber(my.mean)};
  if(!spectral.reliable)throw new Error('Covariance principal directions failed their numerical residual check.');
  const ellipse=Array.from({length:97},(_,i)=>{const t=i/96*2*Math.PI,a=Math.sqrt(principal.value)*Math.cos(t),b=Math.sqrt(secondary.value)*Math.sin(t);return {x:center.x+a*principal.unit[0]+b*secondary.unit[0],y:center.y+a*principal.unit[1]+b*secondary.unit[1]};});
  const correlation=isZero(mx.variance)||isZero(my.variance)?null:toNumber(covariance)/Math.sqrt(toNumber(mul(mx.variance,my.variance)));
  return {input,x,y,probabilities,mx,my,covariance,determinant,matrix,spectral,repeated,rank,center,ellipse,correlation,orientation:repeated?null:Math.atan2(principal.unit[1],principal.unit[0]),axis:repeated?null:principal.unit};
}
export function regression(input:ScatterInput) {
  const d=scatter(input,false),slope=isZero(d.mx.variance)?null:div(d.covariance,d.mx.variance),intercept=slope===null?null:sub(d.my.mean,mul(slope,d.mx.mean));
  const predicted=d.x.map(x=>slope===null?d.my.mean:add(intercept!,mul(slope,x))),residuals=d.y.map((y,i)=>sub(y,predicted[i]!)),rss=sum(residuals.map(x=>mul(x,x)));
  const residualSum=sum(residuals),orthogonality=sum(d.x.map((x,i)=>mul(x,residuals[i]!)));
  if(!isZero(residualSum)||!isZero(orthogonality))throw new Error('Exact least-squares residuals must be orthogonal to the design columns.');
  return {...d,slope,intercept,predicted,residuals,rss,residualSum,orthogonality,unique:slope!==null};
}
