import { action2, svd2, svdAction, svdCircle, SVD_TOLERANCE, type NumericMatrix2, type NumericVector2 } from '../../math/linear-algebra/svd';
import { matrix } from '../../math/linear-algebra/matrices';
import { traceFrom } from '../../platform/trace';
import { arrow, exactDesc, mtex, ntex, ntext, numericDesc, row, scene, undefinedDesc, type CompletionDerived, type CompletionFrame, type PlanarState } from './completion-view';
export const SVD_CANONICAL: PlanarState = {a11:3,a12:1,a21:0,a22:1,x1:1,x2:1};
export const svdPresets = [
  {id:'shear',label:'Full-rank shear and scaling',state:SVD_CANONICAL},
  {id:'rank-one',label:'Rank one: ellipse to segment',state:{...SVD_CANONICAL,a11:1,a12:2,a21:2,a22:4}},
  {id:'zero',label:'Zero: circle to point',state:{...SVD_CANONICAL,a11:0,a12:0,a21:0,a22:0}},
  {id:'repeated',label:'Repeated values: directions not unique',state:{...SVD_CANONICAL,a11:2,a12:0,a21:0,a22:2}},
  {id:'reflection',label:'Reflection',state:{...SVD_CANONICAL,a11:0,a12:2,a21:2,a22:0}},
  {id:'near',label:'Ill-conditioned, exactly rank two',state:{...SVD_CANONICAL,a11:4,a12:3.99,a21:3.99,a22:3.98}},
  {id:'thin',label:'One weak axis',state:{...SVD_CANONICAL,a11:4,a12:0,a21:0,a22:.01}},
];
const point=(v:NumericVector2)=>({x:v[0],y:v[1]});
const matrixTex=(a:NumericMatrix2)=>`\\begin{bmatrix}${a.map(row=>row.map(ntex).join('&')).join('\\\\')}\\end{bmatrix}`;
const matrixText=(a:NumericMatrix2)=>`[${a.map(row=>row.map(ntext).join(', ')).join('; ')}]`;
const approximateMatrix=(a:NumericMatrix2)=>({status:'approximate' as const,lines:[{relation:'≈' as const,text:matrixText(a),tex:matrixTex(a)}],spoken:`Approximately ${matrixText(a)}`});
const approximateVector=(v:NumericVector2)=>({status:'approximate' as const,lines:[{relation:'≈' as const,text:`(${v.map(ntext).join(', ')})`,tex:`\\begin{bmatrix}${v.map(ntex).join('\\\\')}\\end{bmatrix}`}],spoken:`Approximately ${v.map(ntext).join(', ')}`});
export function deriveSVD(s:PlanarState):CompletionDerived {
 const a=matrix([[s.a11,s.a12],[s.a21,s.a22]]),d=svd2(a),action=svdAction(d,[s.x1,s.x2]),circle=svdCircle(d);
 const verdict=`Exact rank ${d.rank}: the unit circle becomes ${d.rank===2?'an ellipse':d.rank===1?'a segment':'the origin'}. Singular values are sorted and nonnegative. ${d.repeated?'Repeated singular values: the displayed singular directions are one convenient orthogonal choice, not mathematically unique. ':''}${d.rank<2?'Zero singular values erase input directions; their orthogonal completion is also nonunique. ':''}${d.warning??'All reconstruction and orthogonality checks pass the documented binary64 tolerance.'}`;
 const points=[action.input,action.oriented,action.scaled,action.output],curves=[circle.input,circle.oriented,circle.scaled,circle.output];
 const radius=Math.max(4,...points.flat().map(v=>Math.abs(v)+1),d.singular[0]+1);
 const titles=['Input: the unit circle','1. Vᵀ: rotate / reflect','2. Σ: perpendicular scaling','3. U: rotate / reflect'];
 const scenes=d.reliable?curves.map((curve,i)=>{
  const plot=scene(titles[i]!,`${verdict} The selected vector is approximately (${points[i]!.map(ntext).join(', ')}). All four panes use the same coordinate scale.`,radius);
  for(let j=0;j<curve.length-1;j++)plot.lines.push({name:`circle-${i}-${j}`,from:point(curve[j]!),to:point(curve[j+1]!),role:i===0?'ink':'primary',width:2});
  arrow(plot,`vector-${i}`,point(points[i]!),i===0?'x':'primary',i===0?'x':i===1?'Vᵀx':i===2?'ΣVᵀx':'UΣVᵀx');
  if(i===0){
   arrow(plot,'right-1',{x:d.V[0][0],y:d.V[1][0]},'derived','v₁');arrow(plot,'right-2',{x:d.V[0][1],y:d.V[1][1]},'y','v₂');
   plot.handles.push({id:'input',label:'input vector',at:point(action.input),xField:'x1',yField:'x2',role:'x'});
  }
  if(i===3){
   for(let j=0;j<circle.direct.length-1;j++)plot.lines.push({name:`direct-A-${j}`,from:point(circle.direct[j]!),to:point(circle.direct[j+1]!),role:'ink',dashed:true,width:1});
   arrow(plot,'left-1',{x:d.U[0][0]*d.singular[0],y:d.U[1][0]*d.singular[0]},'derived','σ₁u₁');
   arrow(plot,'left-2',{x:d.U[0][1]*d.singular[1],y:d.U[1][1]*d.singular[1]},'y','σ₂u₂');
   const leading={x:d.U[0][0]*d.singular[0],y:d.U[1][0]*d.singular[0]},approximation=point(action2(d.rankOne,action.input));
   plot.lines.push({name:'rank-one-image',from:{x:-leading.x,y:-leading.y},to:leading,role:'y',dashed:true,width:3});
   plot.lines.push({name:'discarded-component',from:approximation,to:point(action.output),role:'y',dashed:true,width:2});
   plot.description+=' The dashed teal segment is the image of the unit circle under the rank-one approximation. Its teal connector to the selected output shows the discarded component.';
  }
  return plot;
 }):[];
 const rows=[row('rank','\\operatorname{rank}A','Exact rank (no threshold)',exactDesc(String(d.rank))),
  row('sigma-1','\\sigma_1','Strongest singular value',numericDesc(d.singular[0])),row('sigma-2','\\sigma_2','Weakest singular value',numericDesc(d.singular[1])),
  row('condition','\\kappa_2(A)','2-norm condition number',d.rank===2?numericDesc(d.condition):undefinedDesc('Infinite for a singular matrix: an input direction is lost.')),
  row('U','U','Left singular frame',approximateMatrix(d.U)),row('Vt','V^T','Right frame transpose',approximateMatrix(d.Vt)),
  row('reconstruction-error','\\|A-U\\Sigma V^T\\|_F','Frobenius reconstruction error',numericDesc(d.reconstructionError)),
  row('u-orthogonality','\\|U^TU-I\\|_F','U orthogonality error',numericDesc(d.uOrthogonality)),row('v-orthogonality','\\|V^TV-I\\|_F','V orthogonality error',numericDesc(d.vOrthogonality)),
  row('rank-one-error','\\|A-A_1\\|_F','Measured companion error (Frobenius)',numericDesc(d.rankOneError)),
  row('pseudoinverse','A^+','Pseudoinverse companion',d.pseudoinverse?approximateMatrix(d.pseudoinverse):undefinedDesc(d.warning!)),
  row('recovered','A^+(A\\mathbf x)','Minimum-norm recovered input',action.recovered?approximateVector(action.recovered):undefinedDesc('Conditioning exceeds the recovery budget; exact rank is retained.'))];
 const formulas=[`A=${mtex(a)},\\quad A\\approx U\\Sigma V^T`,
  `U\\approx${matrixTex(d.U)},\\quad\\Sigma\\approx${matrixTex(d.Sigma)}`,
  `V^T\\approx${matrixTex(d.Vt)}`,`U\\Sigma V^T\\approx${matrixTex(d.reconstructed)}`,
  `A_1=\\sigma_1u_1v_1^T\\approx${matrixTex(d.rankOne)}`,
  `\\|A-A_1\\|_F=\\sigma_2\\approx${ntex(d.singular[1])}`,
  `A^+=V\\Sigma^+U^T,\\quad\\sigma_j^+=\\begin{cases}1/\\sigma_j&\\sigma_j>0\\\\0&\\sigma_j=0\\end{cases}`];
 const frames=traceFrom<CompletionFrame>([
  {state:{semantic:{matrix:a,gram:d.gram,rank:d.rank},title:'Right directions from AᵀA',detail:'AᵀA is symmetric and positive semidefinite. Its orthogonal eigen-directions are the right singular directions; squared singular values are its eigenvalues.',formula:`A^TA=${mtex(d.gram)}`}},
  ...points.map((v,i)=>({state:{semantic:{stage:i,vector:v,factor:i===0?d.numeric:i===1?d.Vt:i===2?d.Sigma:d.U,circle:curves[i]},title:titles[i]!,detail:i===0?'Keep the original input vector and circle.':i===1?'Read the input in the orthogonal right frame.':i===2?'Scale perpendicular coordinates by sorted nonnegative singular values.':'Apply the orthogonal left frame; compare with the original action of A.',formula:`\\mathbf z_${i}\\approx\\begin{bmatrix}${v.map(ntex).join('\\\\')}\\end{bmatrix}`}})),
  {state:{semantic:{reconstructed:d.reconstructed,error:d.reconstructionError,U:d.U,V:d.V,orthogonality:[d.uOrthogonality,d.vOrthogonality]},title:'Validate the composed transformation',detail:`${verdict} Relative Frobenius reconstruction error and both orthogonality errors must be at most 256ε = ${SVD_TOLERANCE}.`,formula:formulas[3]!}},
  {state:{semantic:{rankOne:d.rankOne,error:d.rankOneError,pseudoinverse:d.pseudoinverse,recovered:action.recovered},title:'Discard an axis or recover an input',detail:'Dropping the weaker term gives a best rank-one approximation. In the pseudoinverse, invert only mathematically nonzero singular values; never divide by zero. Lost directions stay unrecoverable.',formula:formulas[4]!}},
 ]);
 return{rows,formulas,verdict,status:d.reliable?'verified':'numerical-limit',rank:d.rank,scenes,frames,result:point(action.direct)};
}
