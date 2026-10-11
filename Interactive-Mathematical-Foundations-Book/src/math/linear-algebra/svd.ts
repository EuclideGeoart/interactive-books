/** Checked 2×2 SVD. Exact rank and degeneracy are independent of numerical companions. */
import { abs, isZero, sign, sub, toNumber } from '../quantity/rational';
import { determinant2, multiplyMatrices, transpose, type Matrix } from './matrices';
import { eliminate } from './elimination';
import { normalizeNumeric } from './vectors';
export type NumericVector2 = readonly [number, number];
export type NumericMatrix2 = readonly [NumericVector2, NumericVector2];
export const SVD_TOLERANCE = 256 * Number.EPSILON;
export const action2 = (a: NumericMatrix2, v: NumericVector2): NumericVector2 => [a[0][0]*v[0]+a[0][1]*v[1], a[1][0]*v[0]+a[1][1]*v[1]];
export const transpose2 = (a: NumericMatrix2): NumericMatrix2 => [[a[0][0],a[1][0]],[a[0][1],a[1][1]]];
export const product2 = (a: NumericMatrix2, b: NumericMatrix2): NumericMatrix2 => {
  const first=action2(a,[b[0][0],b[1][0]]),second=action2(a,[b[0][1],b[1][1]]);
  return [[first[0],second[0]],[first[1],second[1]]];
};
export const frobenius2 = (a: NumericMatrix2) => Math.hypot(...a[0],...a[1]);
const difference = (a: NumericMatrix2,b: NumericMatrix2): NumericMatrix2 => [[a[0][0]-b[0][0],a[0][1]-b[0][1]],[a[1][0]-b[1][0],a[1][1]-b[1][1]]];
const I: NumericMatrix2 = [[1,0],[0,1]];
export function svd2(a: Matrix) {
  if(a.rows!==2||a.cols!==2)throw new RangeError('SVD geometry supports 2×2 matrices.');
  const numeric=a.values.map(row=>row.map(toNumber)) as unknown as NumericMatrix2;
  if(numeric.flat().some(x=>!Number.isFinite(x)))throw new RangeError('SVD requires finite numerical companions.');
  const rank=eliminate(a).rank,determinant=determinant2(a);
  const gram=multiplyMatrices(transpose(a),a);if(!gram.ok)throw new Error(gram.reason);
  const g=gram.value,delta=sub(g.values[0]![0]!,g.values[1]![1]!),off=g.values[0]![1]!;
  const repeated=isZero(delta)&&isZero(off);
  let U: NumericMatrix2=I,V: NumericMatrix2=I;
  let singular: NumericVector2=[0,0];
  if(rank>0){
    // Symmetric 2×2 Jacobi angle: exact subtraction avoids losing the small Gram difference first.
    const theta=repeated?0:.5*Math.atan2(2*toNumber(off),toNumber(delta));
    let v1: NumericVector2=[Math.cos(theta),Math.sin(theta)];
    if(v1[0]<0||(v1[0]===0&&v1[1]<0))v1=[-v1[0],-v1[1]];
    const v2: NumericVector2=[-v1[1],v1[0]];
    V=[[v1[0],v2[0]],[v1[1],v2[1]]];
    const mapped=action2(numeric,v1),normal=normalizeNumeric({x:mapped[0],y:mapped[1]});
    if(!normal)throw new Error('A nonzero leading singular direction cannot map to zero.');
    const sigma1=Math.hypot(...mapped);
    // σ₁σ₂=|det A|, computed exactly BEFORE conversion, avoids subtracting almost equal Gram eigenvalues.
    const sigma2=rank===2?(repeated?sigma1:toNumber(abs(determinant))/sigma1):0;
    singular=[sigma1,sigma2];
    const orientation=rank===2?sign(determinant):1;
    U=[[normal.x,-orientation*normal.y],[normal.y,orientation*normal.x]];
  }
  const Sigma: NumericMatrix2=[[singular[0],0],[0,singular[1]]],Vt=transpose2(V);
  const reconstructed=product2(product2(U,Sigma),Vt),norm=frobenius2(numeric),scale=Math.max(1,norm);
  const reconstructionError=frobenius2(difference(numeric,reconstructed));
  const uOrthogonality=frobenius2(difference(product2(transpose2(U),U),I)),vOrthogonality=frobenius2(difference(product2(Vt,V),I));
  const reliable=singular.every(Number.isFinite)&&singular[0]>=singular[1]&&singular[1]>=0&&
    (rank===0||(singular[0]>0&&(rank===1||singular[1]>0)))&&
    reconstructionError/scale<=SVD_TOLERANCE&&uOrthogonality<=SVD_TOLERANCE&&vOrthogonality<=SVD_TOLERANCE;
  const condition=rank===2?singular[0]/singular[1]:Infinity;
  // Refuse inverse recovery if the worst-case rounding budget exceeds 1e-4 relative error. Never truncate σ₂.
  const recoveryReliable=reliable&&(rank<2||condition*SVD_TOLERANCE<1e-4);
  const inverseSigma: NumericMatrix2=[[rank>0?1/singular[0]:0,0],[0,rank===2?1/singular[1]:0]];
  const pseudoinverse=recoveryReliable?product2(product2(V,inverseSigma),transpose2(U)):null;
  const rankOne=product2(product2(U,[[singular[0],0],[0,0]]),Vt);
  const rankOneError=frobenius2(difference(numeric,rankOne));
  const warning=!reliable?'Factor checks exceeded the documented binary64 tolerance; no faithful numerical decomposition is claimed.'
    :!recoveryReliable?'Exactly full rank, but numerical inverse recovery is unreliable at this conditioning. The small singular value is retained; pseudoinverse recovery is withheld.'
      :rank===2&&condition*SVD_TOLERANCE>1e-8?'Ill-conditioned: the small singular direction and recovered input may lose significant digits. Exact rank remains 2.' : null;
  return {a,numeric,gram:g,determinant,rank,repeated,U,Sigma,V,Vt,singular,reconstructed,reconstructionError,
    relativeReconstructionError:reconstructionError/scale,uOrthogonality,vOrthogonality,reliable,condition,recoveryReliable,pseudoinverse,rankOne,rankOneError,warning};
}
export function svdAction(d: ReturnType<typeof svd2>, x: NumericVector2) {
  const input=x,oriented=action2(d.Vt,x),scaled=action2(d.Sigma,oriented),output=action2(d.U,scaled),direct=action2(d.numeric,x);
  const recovered=d.pseudoinverse? action2(d.pseudoinverse,direct):null;
  return {input,oriented,scaled,output,direct,recovered,error:Math.hypot(output[0]-direct[0],output[1]-direct[1])};
}
export function svdCircle(d: ReturnType<typeof svd2>) {
  const input=Array.from({length:65},(_,i)=>[Math.cos(2*Math.PI*i/64),Math.sin(2*Math.PI*i/64)] as NumericVector2);
  const oriented=input.map(v=>action2(d.Vt,v)),scaled=oriented.map(v=>action2(d.Sigma,v)),output=scaled.map(v=>action2(d.U,v)),direct=input.map(v=>action2(d.numeric,v));
  return {input,oriented,scaled,output,direct};
}
