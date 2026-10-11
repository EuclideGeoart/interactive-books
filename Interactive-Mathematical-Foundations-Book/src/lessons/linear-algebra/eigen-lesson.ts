import { eigen2, EIGEN_TOLERANCE, repeatAction, testEigenvector } from '../../math/linear-algebra/eigenvalues';
import { exactVector, matrix } from '../../math/linear-algebra/matrices';
import { rootForm } from '../../math/quantity/exactform';
import { isZero, neg, toNumber } from '../../math/quantity/rational';
import { traceFrom } from '../../platform/trace';
import { asPoint, arrow, exactDesc, mtex, mtext, ntex, numericDesc, ratDesc, row, rtex, scene, undefinedDesc, vtex, vtext, type CompletionDerived, type CompletionFrame, type PlanarState } from './completion-view';
export const EIGEN_CANONICAL: PlanarState = { a11: 2, a12: 0, a21: 0, a22: -1, x1: 1, x2: 1 };
export const eigenPresets = [
  { id: 'distinct', label: 'Stretch and reversal', state: EIGEN_CANONICAL },
  { id: 'defective', label: 'Repeated: one direction', state: { ...EIGEN_CANONICAL, a11: 1, a12: 1, a21: 0, a22: 1 } },
  { id: 'scalar', label: 'Scalar: every direction', state: { ...EIGEN_CANONICAL, a11: 2, a22: 2 } },
  { id: 'zero-eigenvalue', label: 'Zero eigenvalue', state: { ...EIGEN_CANONICAL, a22: 0 } },
  { id: 'rotation', label: 'Quarter-turn: no real direction', state: { ...EIGEN_CANONICAL, a11: 0, a12: -1, a21: 1, a22: 0 } },
  { id: 'radical', label: 'Radical eigenvalues', state: { ...EIGEN_CANONICAL, a11: 0, a12: 2, a21: 1, a22: 0 } },
  { id: 'zero-vector', label: 'Zero is not an eigenvector', state: { ...EIGEN_CANONICAL, x1: 0, x2: 0 } },
];
export function deriveEigen(s: PlanarState): CompletionDerived {
  const a = matrix([[s.a11, s.a12], [s.a21, s.a22]]), x = exactVector([s.x1, s.x2]);
  const d = eigen2(a), test = testEigenvector(a, x), powers = repeatAction(a, x, 4);
  const verdict = `${d.kind === 'no-real' ? 'No real eigenvector: the exact discriminant is negative. A quarter-turn preserves no real input line; its eigenvalues may be complex.'
    : d.kind === 'scalar' ? 'A scalar matrix: EVERY nonzero vector is an eigenvector. The two drawn axes are only a convenient choice.'
      : d.kind === 'defective' ? 'A repeated eigenvalue with ONE independent eigen-direction: this matrix is defective.' : 'Two distinct real eigenvalues give two independent eigen-directions.'} ${!test.nonzero ? 'The chosen input is zero and is not an eigenvector.' : test.onLine ? `This nonzero input is an exact eigenvector, with λ = ${test.value ? vtext([test.value]) : ''}.` : 'This chosen input leaves its original line.'}${d.warning ? ` ${d.warning}` : ''}`;
  const plot = scene('Find an input line that survives A', verdict, Math.max(4, Math.abs(s.x1)+2, Math.abs(s.x2)+2, ...test.output.map(v => Math.abs(toNumber(v))+2)));
  arrow(plot, 'input', asPoint(x), 'x', 'v'); arrow(plot, 'output', asPoint(test.output), 'primary', 'Av');
  if (d.reliable) for (const [i, pair] of d.pairs.entries()) {
    const u = pair.unit;
    plot.lines.push({ name: `eigen-line-${i}`, from: { x: -4*u[0], y: -4*u[1] }, to: { x: 4*u[0], y: 4*u[1] }, role: 'derived', dashed: true, width: 2 });
  }
  plot.handles.push({ id: 'input', label: 'test vector', at: asPoint(x), xField: 'x1', yField: 'x2', role: 'x' });
  const rows = [row('classification', '\\mathcal E', 'Real eigen-directions', exactDesc(d.kind)), row('trace', '\\operatorname{tr}A', 'Trace', ratDesc(d.trace)),
    row('discriminant', 'D', 'Exact characteristic discriminant', ratDesc(d.discriminant)),
    row('input-eigenvalue', '\\lambda_v', 'Chosen nonzero eigenvector gain', test.value ? ratDesc(test.value) : undefinedDesc(!test.nonzero ? 'An eigenvector must be nonzero.' : 'Av is not a scalar multiple of v.'))];
  const formulas = [`A=${mtex(a)},\\quad A\\mathbf v=${vtex(test.output)}`,
    `\\det(A-\\lambda I)=\\lambda^2-(${rtex(d.trace)})\\lambda+(${rtex(d.determinant)})=0`];
  if (d.kind !== 'no-real') {
    const radical = d.root.kind === 'exact' ? rootForm(d.root.root).tex : `\\frac{\\sqrt{${rtex(d.discriminant)}}}{2}`;
    formulas.push(`\\lambda_{\\pm}=${rtex(d.center)}\\pm ${radical}`);
    for (const [i, pair] of d.pairs.entries()) {
      rows.push(row(`lambda-${i}`, `\\lambda_${i+1}`, 'Eigenvalue', pair.exact ? ratDesc(pair.exact) : numericDesc(pair.value)),
        row(`residual-${i}`, `\\|A\\hat v_${i+1}-\\lambda_${i+1}\\hat v_${i+1}\\|`, 'Numerical eigenpair residual', numericDesc(pair.residual)));
      if (pair.direction) formulas.push(`A${vtex(pair.direction)}=(${rtex(pair.exact!)})${vtex(pair.direction)}`);
      else formulas.push(`\\hat v_${i+1}\\approx\\begin{bmatrix}${ntex(pair.unit[0])}\\\\${ntex(pair.unit[1])}\\end{bmatrix}`);
    }
  } else formulas.push(`\\lambda=${rtex(d.center)}\\pm \\frac{i\\sqrt{${rtex(neg(d.discriminant))}}}{2}`);
  if (test.onLine) formulas.push(`A\\mathbf v=(${rtex(test.value!)})\\mathbf v,\\quad\\mathbf v\\ne0`);
  const frames = traceFrom<CompletionFrame>([
    { state: { semantic: { matrix: a, trace: d.trace, determinant: d.determinant, discriminant: d.discriminant }, title: 'Derive the characteristic equation', detail: `Subtract λ on the diagonal and expand the determinant. The discriminant classifies real roots exactly. A = ${mtext(a)}.`, formula: formulas[1]! } satisfies CompletionFrame },
    { state: { semantic: { classification: d.kind, center: d.center, root: d.root, pairs: d.pairs }, title: 'Inspect the eigenspaces', detail: `${verdict} Numerical residuals are bounded by ${EIGEN_TOLERANCE} times max(1, ‖A‖F).`, formula: formulas[2]! } satisfies CompletionFrame },
    ...powers.map((v, i) => ({ state: { semantic: { power: i, vector: v, matrix: a }, title: `Repeated application ${i}`, detail: `This is the exact vector after ${i} applications. Along an eigen-direction, the gain is λ raised to that power.`, formula: `A^{${i}}\\mathbf v=${vtex(v)}${v.every(isZero) ? '\\quad\\text{collapsed to zero}' : ''}` } satisfies CompletionFrame })),
  ]);
  return { rows, formulas, verdict, status: d.kind, scenes: [plot], frames, result: asPoint(test.output) };
}
