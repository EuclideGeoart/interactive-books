import { leastSquares } from '../../math/linear-algebra/least-squares';
import { exactVector, matrix } from '../../math/linear-algebra/matrices';
import { rootForm } from '../../math/quantity/exactform';
import { toNumber } from '../../math/quantity/rational';
import { traceFrom } from '../../platform/trace';
import { asPoint, arrow, exactDesc, mtex, mtext, ntex, ntext, ratDesc, row, scene, spec, vtex, vtext, type CompletionDerived, type CompletionFrame } from './completion-view';
export interface LeastSquaresState { mode: 'fit' | 'gram'; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }
export const LS_CANONICAL: LeastSquaresState = { mode: 'fit', x1: -1, y1: 0, x2: 0, y2: 2, x3: 1, y3: 2 };
export const leastSquaresPresets = [
  { id: 'fit', label: 'Noisy data: unique fit', state: LS_CANONICAL },
  { id: 'exact', label: 'Every point fits exactly', state: { ...LS_CANONICAL, y1: 0, y2: 1, y3: 2 } },
  { id: 'rank-deficient', label: 'Same x: nonunique minimizers', state: { ...LS_CANONICAL, x1: 1, x2: 1, x3: 1 } },
  { id: 'near', label: 'Close x: sensitive fit', state: { ...LS_CANONICAL, x1: 1, x2: 1.01, x3: 1.02 } },
  { id: 'gram', label: 'Orthogonalize two directions', state: { mode: 'gram' as const, x1: 1, y1: 1, x2: 1, y2: 0, x3: 2, y3: 1 } },
  { id: 'dependent', label: 'Dependent-vector failure', state: { mode: 'gram' as const, x1: 1, y1: 1, x2: 2, y2: 2, x3: 0, y3: 2 } },
  { id: 'zero-vector', label: 'Zero-vector failure', state: { mode: 'gram' as const, x1: 0, y1: 0, x2: 1, y2: 0, x3: 0, y3: 2 } },
];
export const leastSquaresSpecs = Object.fromEntries(Object.entries(LS_CANONICAL).filter(([id]) => id !== 'mode').map(([id, value]) => [id, spec(id, value as number, `${id[0]} coordinate ${id[1]}`, `${id[0]}_${id[1]}`)]));
export function deriveLeastSquares(s: LeastSquaresState): CompletionDerived {
  const fit = s.mode === 'fit', a = fit ? matrix([[1,s.x1],[1,s.x2],[1,s.x3]]) : matrix([[s.x1,s.x2],[s.y1,s.y2]]);
  const b = fit ? exactVector([s.y1,s.y2,s.y3]) : exactVector([s.x3,s.y3]);
  const d = leastSquares(a,b), failure = d.gs.failures.map(f => `input ${f.index+1}: ${f.kind} vector cannot be normalized`).join('; ');
  const verdict = `${d.unique ? 'Unique least-squares minimizer' : 'Nonunique least-squares minimizers'}: x = ${vtext(d.x)}${d.nullspace.length ? ` plus any combination of ${d.nullspace.map(vtext).join('; ')}` : ''}. ${d.exact ? 'The residual is zero: every original equation is solved exactly.' : `The minimum residual is nonzero: ${vtext(d.residual)}; minimizing it does not solve every equation.`} Aᵀ(b − Ax) = 0 exactly.${failure ? ` Gram–Schmidt: ${failure}. The surviving nonzero directions still form a basis for the actual column space.` : ''}${d.warning ? ` ${d.warning}` : ''}`;
  const plot = scene(fit ? 'Move the data; minimize vertical squared residuals' : 'Subtract projections; build an orthogonal basis', verdict);
  if (fit) {
    const points = [{x:s.x1,y:s.y1},{x:s.x2,y:s.y2},{x:s.x3,y:s.y3}], intercept = toNumber(d.x[0]!), slope = toNumber(d.x[1]!);
    plot.lines.push({name:'fit-line',from:{x:-4,y:intercept-4*slope},to:{x:4,y:intercept+4*slope},role:'primary',width:3});
    for (const [i,p] of points.entries()) {
      plot.lines.push({name:`residual-${i}`,from:p,to:{x:p.x,y:toNumber(d.projected[i]!)},role:'caution',dashed:true,width:2});
      plot.handles.push({id:`data-${i}`,label:`data point ${i+1}`,at:p,xField:`x${i+1}`,yField:`y${i+1}`,role:'x'});
    }
  } else {
    arrow(plot,'data',asPoint(b),'primary','b'); arrow(plot,'projected',asPoint(d.projected),'derived','p');
    arrow(plot,'residual',asPoint(b),'caution','r',asPoint(d.projected));
    for (const [i,u] of d.gs.orthogonal.entries()) arrow(plot,`orthogonal-${i}`,asPoint(u),i?'y':'x',`u${i+1}`);
    plot.handles.push({id:'first',label:'first basis direction',at:{x:s.x1,y:s.y1},xField:'x1',yField:'y1',role:'x'},
      {id:'second',label:'second basis direction',at:{x:s.x2,y:s.y2},xField:'x2',yField:'y2',role:'y'});
  }
  const rows = [row('A','A','Column-space/design matrix',exactDesc(mtext(a),mtex(a))),row('rank','\\operatorname{rank}A','Independent columns',exactDesc(String(d.rank))),
    row('minimizer','\\mathbf x_0','One minimizing coefficient vector',exactDesc(vtext(d.x))),
    row('projected','A\\mathbf x_0','Projection of the data onto col(A)',exactDesc(vtext(d.projected))),
    row('residual','\\mathbf r','Residual b − Ax',exactDesc(vtext(d.residual))),
    row('objective','\\|\\mathbf r\\|^2','Minimum squared error',ratDesc(d.objective)),
    row('orthogonality','A^T\\mathbf r','Exact residual orthogonality',exactDesc(vtext(d.orthogonality)))];
  if (!fit) rows.push(row('gram-status','\\mathcal B','Gram–Schmidt status',exactDesc(failure || 'independent nonzero directions')),
    row('orthonormal','Q','Normalized companion basis (approximate)',{status:'approximate',lines:[{relation:'≈',text:d.gs.orthonormal.map(v=>`(${v.map(n=>ntext(n)).join(', ')})`).join('; '),tex:'Q'}],spoken:'Numerical orthonormal basis; exact orthogonality was checked before normalization.'}));
  const formulas = [`A=${mtex(a)},\\quad b=${vtex(b)}`, `\\mathbf b=${vtex(d.projected)}+${vtex(d.residual)}`,
    `A^T(A\\mathbf x-b)=0,\\quad A^TA=${mtex(d.gram)}`, `\\min_x\\|A\\mathbf x-b\\|^2=${ratDesc(d.objective).lines[0]!.tex}`];
  const frames = traceFrom<CompletionFrame>([
    {state:{semantic:{matrix:a,data:b},title:'The column-space question',detail:'Which linear combination of the columns lies closest to the data vector? Each row is one equation.',formula:formulas[0]!} satisfies CompletionFrame},
    ...d.gs.frames.map(f=>({state:{semantic:f,title:f.phase==='start'?`Start direction ${f.index+1}`:'Subtract a projection',detail:f.phase==='start'?'Keep the original direction; a zero vector cannot become a unit direction.':`Remove the component along earlier nonzero orthogonal direction ${f.onto!+1}. A zero residual signals dependence.`,formula:`\\mathbf u=${vtex(f.residual)}`} satisfies CompletionFrame})),
    {state:{semantic:{basis:d.gs.orthogonal,coefficients:d.coefficients,projected:d.projected,residual:d.residual},title:'Projection and perpendicular residual',detail:`Project onto each surviving orthogonal direction. Residual dot-products against all original columns are ${vtext(d.orthogonality)}.`,formula:formulas[1]!} satisfies CompletionFrame},
    {state:{semantic:{gram:d.gram,rhs:d.normalRhs,x:d.x,nullspace:d.nullspace,objective:d.objective},title:'Normal equations and all minimizers',detail:verdict,formula:`A^TA\\mathbf x=A^Tb,\\quad\\mathbf x_0=${vtex(d.x)}`} satisfies CompletionFrame},
  ]);
  if (!fit) for (const [i,u] of d.gs.orthogonal.entries()) {
    const length = d.gs.lengths[i]!, root = length.kind==='exact'?rootForm(length.root).tex:'\\|u\\|';
    formulas.push(`q_${i+1}=\\frac{${vtex(u)}}{${root}}\\approx\\begin{bmatrix}${d.gs.orthonormal[i]!.map(ntex).join('\\\\')}\\end{bmatrix}`);
  }
  return {rows,formulas,verdict,status:!d.unique?'nonunique':d.exact?'exact':'least-squares',rank:d.rank,scenes:[plot],frames};
}
