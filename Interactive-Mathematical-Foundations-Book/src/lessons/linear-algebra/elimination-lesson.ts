import { eliminate, inverseExact, solveExact } from '../../math/linear-algebra/elimination';
import { exactVector, matrix, multiplyVector, type Matrix } from '../../math/linear-algebra/matrices';
import { normalizeNumeric } from '../../math/linear-algebra/vectors';
import { isZero, toNumber } from '../../math/quantity/rational';
import { traceFrom } from '../../platform/trace';
import { asPoint, arrow, exactDesc, mtex, mtext, row, scene, spec, undefinedDesc, vtex, vtext, rtex, type CompletionDerived, type CompletionFrame } from './completion-view';

export type EliminationChapter = 'elimination' | 'rank' | 'inverse';
export interface EliminationState {
  mode: 'square' | 'wide' | 'tall' | 'three';
  a11: number; a12: number; a13: number; a21: number; a22: number; a23: number; a31: number; a32: number; a33: number;
  r1: number; r2: number; r3: number; x1: number; x2: number;
}
const BASE: EliminationState = { mode: 'square', a11: 1, a12: 1, a13: 0, a21: 1, a22: -1, a23: 1, a31: 0, a32: 1, a33: 1, r1: 3, r2: 1, r3: 2, x1: 2, x2: 1 };
export const ELIMINATION_CANONICAL: Record<EliminationChapter, EliminationState> = {
  elimination: BASE, rank: { ...BASE, a11: 1, a12: 2, a21: 0, a22: 1 }, inverse: { ...BASE, a11: 2, a12: 1, a21: 1, a22: 1 },
};
export const eliminationMatrix = (s: EliminationState): Matrix => s.mode === 'three' ? matrix([[s.a11, s.a12, s.a13], [s.a21, s.a22, s.a23], [s.a31, s.a32, s.a33]])
  : s.mode === 'wide' ? matrix([[s.a11, s.a12, s.a13], [s.a21, s.a22, s.a23]])
    : s.mode === 'tall' ? matrix([[s.a11, s.a12], [s.a21, s.a22], [s.a31, s.a32]]) : matrix([[s.a11, s.a12], [s.a21, s.a22]]);
export function eliminationFields(chapter: EliminationChapter, s: EliminationState) {
  const fields = ['a11', 'a12', ...(s.mode === 'wide' || s.mode === 'three' ? ['a13'] : []), 'a21', 'a22', ...(s.mode === 'wide' || s.mode === 'three' ? ['a23'] : []),
    ...(s.mode === 'tall' || s.mode === 'three' ? ['a31', 'a32', ...(s.mode === 'three' ? ['a33'] : [])] : [])];
  return [...fields, ...(chapter === 'elimination' ? ['r1', 'r2', ...(s.mode === 'tall' || s.mode === 'three' ? ['r3'] : [])] : chapter === 'inverse' && s.mode === 'square' ? ['x1', 'x2'] : [])];
}
export const eliminationSpecs = (chapter: EliminationChapter) => Object.fromEntries(Object.entries(ELIMINATION_CANONICAL[chapter]).filter(([id]) => id !== 'mode').map(([id, value]) => [id,
  spec(id, value as number, id[0] === 'a' ? `A row ${id[1]}, column ${id[2]}` : id[0] === 'r' ? `right-hand side ${id[1]}` : `input ${id[1]}`, id[0] === 'a' ? `A_{${id.slice(1)}}` : `${id[0] === 'r' ? 'b' : 'x'}_${id[1]}`)]));
export function eliminationPresets(chapter: EliminationChapter) {
  const c = ELIMINATION_CANONICAL[chapter];
  const p = (id: string, label: string, state: Partial<EliminationState>) => ({ id, label, state: { ...c, ...state } });
  const common = [p('canonical', 'Independent columns', {}), p('dependent', 'Repeated columns', { a11: 1, a12: 1, a21: 2, a22: 2, r1: 1, r2: 2 }),
    p('zero', 'Zero matrix', { a11: 0, a12: 0, a21: 0, a22: 0, r1: 0, r2: 0 }),
    p('near', 'Exactly independent, close', { a11: 4, a12: 3.99, a21: 3.99, a22: 3.98 }),
    p('three', 'Small 3×3', { mode: 'three', a11: 1, a12: 1, a13: 0, a21: 0, a22: 1, a23: 1, a31: 1, a32: 0, a33: 1, r1: 3, r2: 3, r3: 2 })];
  if (chapter === 'inverse') return common;
  return [...common, p('swap', 'Zero pivot: swap rows', { a11: 0, a12: 1, a21: 2, a22: 1, r1: 1, r2: 3 }),
    p('fraction', 'Fractional pivots', { a11: 0.5, a12: 1, a21: 1, a22: -0.5, r1: 1, r2: 0 }),
    p('skipped', 'Skipped pivot column', { mode: 'wide', a11: 0, a12: 1, a13: 2, a21: 0, a22: 2, a23: 4, r1: 1, r2: 2 }),
    p('inconsistent', 'Contradiction: 0 = 1', { a11: 1, a12: 1, a21: 2, a22: 2, r1: 1, r2: 3 }),
    p('wide', 'Full row rank: 2×3', { mode: 'wide', a11: 1, a12: 0, a13: 1, a21: 0, a22: 1, a23: 1, r1: 1, r2: 2 }),
    p('tall', 'Full column rank: 3×2', { mode: 'tall', a11: 1, a12: 0, a21: 0, a22: 1, a31: 1, a32: 1, r1: 1, r2: 2, r3: 4 })];
}
const equations = (a: Matrix, cols: number) => `\\begin{aligned}${a.values.map(values =>
  `${values.slice(0, cols).map((v, j) => `(${rtex(v)})x_{${j + 1}}`).join('+')}&=${rtex(values[cols]!)}`).join('\\\\')}\\end{aligned}`;
export function deriveElimination(chapter: EliminationChapter, s: EliminationState): CompletionDerived {
  const a = eliminationMatrix(s), b = exactVector(a.rows === 3 ? [s.r1, s.r2, s.r3] : [s.r1, s.r2]);
  const solution = chapter === 'elimination' ? solveExact(a, b) : null;
  const inverse = chapter === 'inverse' ? inverseExact(a) : null;
  const d = solution ?? inverse ?? eliminate(a);
  const status = solution?.kind ?? (inverse ? inverse.inverse ? 'invertible' : 'singular' : `rank-${d.rank}`);
  const rows = [row('A', 'A', 'Original coefficient matrix', exactDesc(mtext(a), mtex(a))),
    row('rank', '\\operatorname{rank}A', 'Pivot count / image dimension', exactDesc(String(d.rank))),
    row('nullity', '\\dim\\ker A', 'Independent null directions', exactDesc(String(d.nullity))),
    row('nullspace', '\\ker A', 'Null-space basis', exactDesc(d.nullspace.length ? d.nullspace.map(vtext).join('; ') : 'none: only the zero vector'))];
  const formulas = [`A=${mtex(a)}`, `\\operatorname{rank}A+\\dim\\ker A=${d.rank}+${d.nullity}=${a.cols}`];
  let verdict = `Rank ${d.rank}: ${d.rank} independent image directions and ${d.nullity} null directions. ${a.rows === a.cols ? d.fullColumnRank ? 'Full rank: the square map is invertible.' : 'This square map is singular.' : `Rectangular map: ${d.fullColumnRank ? 'full column rank' : 'not full column rank'}, ${d.fullRowRank ? 'full row rank' : 'not full row rank'}; ordinary two-sided invertibility requires a square matrix.`}`;
  const scenes = [];
  if (solution) {
    verdict = solution.kind === 'none' ? 'No solutions: a zero coefficient row has a nonzero right-hand side.' : solution.kind === 'unique' ? `One exact solution ${vtext(solution.particular!)}. Substitution into the ORIGINAL system verifies Ax = b.`
      : `Infinitely many solutions: x = ${vtext(solution.particular!)} plus any combination of the displayed null directions. The particular solution and every null direction are verified in the original A.`;
    rows.push(row('classification', '\\mathcal S', 'Solution set', exactDesc(solution.kind === 'none' ? 'no solutions' : solution.kind === 'unique' ? 'one solution' : 'infinitely many solutions')),
      row('solution', '\\mathbf x_0', 'Particular solution (free variables 0)', solution.particular ? exactDesc(vtext(solution.particular), vtex(solution.particular)) : undefinedDesc('The original constraints are inconsistent.')),
      row('substitution', 'A\\mathbf x_0', 'Original-system verification', solution.particular ? exactDesc(solution.verified ? vtext(b) : 'failed') : undefinedDesc('There is no solution to substitute.')));
    formulas.push(`A\\mathbf x=\\mathbf b,\\quad\\mathbf b=${vtex(b)}`);
    if (solution.particular) formulas.push(`A${vtex(solution.particular)}=${vtex(b)}`);
  }
  if (inverse) {
    rows.push(row('inverse', 'A^{-1}', 'Inverse from [A | I]', inverse.inverse ? exactDesc(mtext(inverse.inverse), mtex(inverse.inverse)) : undefinedDesc('Rank is below the square dimension: no inverse exists.')),
      row('identities', 'A^{-1}A,AA^{-1}', 'Both multiplication checks', inverse.inverse ? exactDesc(inverse.leftIdentity && inverse.rightIdentity ? 'I and I, exactly' : 'failed') : undefinedDesc('A singular map cannot be undone uniquely.')));
    if (inverse.inverse) {
      formulas.push(`A^{-1}=${mtex(inverse.inverse)}`, `A^{-1}A=AA^{-1}=I`);
      if (a.rows === 2) {
        const x = exactVector([s.x1, s.x2]), output = multiplyVector(a, x);
        if (output.ok) {
          const recovered = multiplyVector(inverse.inverse, output.value);
          if (recovered.ok) {
            const plot = scene('Apply A, then undo with A⁻¹', `Original x ${vtext(x)}, transformed Ax ${vtext(output.value)}, reconstructed ${vtext(recovered.value)}.`, Math.max(4, ...output.value.map(v => Math.abs(toNumber(v)) + 2)));
            arrow(plot, 'input', asPoint(x), 'x', 'x = A⁻¹Ax'); arrow(plot, 'output', asPoint(output.value), 'primary', 'Ax');
            plot.handles.push({ id: 'input', label: 'input vector', at: asPoint(x), xField: 'x1', yField: 'x2', role: 'x' }); scenes.push(plot);
            rows.push(row('recovered', 'A^{-1}A\\mathbf x', 'Reconstructed input', exactDesc(vtext(recovered.value))));
          }
        }
      }
    }
  }
  if (chapter === 'rank' && a.rows === 2) {
    const col = (j: number) => asPoint(a.values.map(values => values[j]!));
    const plot = scene('Image of a bounded input square', `${verdict} A null-input arrow, when present, is a normalized approximate input direction, not an output in the image space.`, a.cols===2?Math.max(6,Math.abs(s.a11)+Math.abs(s.a12)+1,Math.abs(s.a21)+Math.abs(s.a22)+1):6);
    const apply = (x: number, y: number) => ({ x: x * s.a11 + y * s.a12, y: x * s.a21 + y * s.a22 });
    if (a.cols === 2) plot.polygons.push({ name: 'image-square', role: 'derived', corners: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => apply(x!, y!)) });
    for (let j = 0; j < a.cols; j++) arrow(plot, `column-${j}`, col(j), j === 0 ? 'x' : 'y', `a${j + 1}`);
    plot.handles.push({ id: 'column-2', label: 'second column', at: col(1), xField: 'a12', yField: 'a22', role: 'y' });
    if (a.cols === 2 && d.nullspace[0]) {
      const direction=normalizeNumeric(asPoint(d.nullspace[0]));
      if(direction){arrow(plot, 'null-direction', direction, 'caution', 'z ≈');plot.arrows.at(-1)!.labelDx=-12;}
      verdict+=' The gold z arrow is a normalized approximate null INPUT direction, not an output in the image space.';
    }
    scenes.push(plot);
  }
  const frames = traceFrom(d.frames.map(frame => {
    const state = frame.state;
    const formula = chapter === 'elimination' ? equations(state.matrix, a.cols) : mtex(state.matrix);
    const title = state.phase === 'input' ? chapter === 'inverse' ? 'Begin with [A | I]' : 'Original mathematical state' : state.phase === 'echelon' ? 'Echelon form' : state.phase === 'back-substitution' ? 'Back substitution' : state.phase === 'reduced' ? 'Reduced form' : 'A legitimate row operation';
    return { state: { semantic: state, title, formula: state.solution ? `${formula}\\quad ${state.solved!.map(j => `x_{${j + 1}}=${rtex(state.solution![j]!)}`).join(',\\;')}` : formula,
      detail: `${frame.explanation}${chapter === 'inverse' ? ' The same operation acts on all columns of [A | I].' : ''}`,
      matrix: state.matrix, coefficientCols: a.cols, pivots: state.pivots } satisfies CompletionFrame, explanation: frame.explanation };
  }));
  // Exact pivot classification remains intact even if a printed decimal companion is visually tiny.
  if (a.values.flat().every(isZero)) verdict += ' All columns are zero; the image is the origin.';
  return { rows, formulas, verdict, status, scenes, frames, rank: d.rank, ...(solution?.particular?.length === 2 ? { result: asPoint(solution.particular) } : {}) };
}
