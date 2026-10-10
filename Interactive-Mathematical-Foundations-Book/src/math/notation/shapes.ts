/**
 * Shapes and indices (I.9). A scalar, a vector in R^d, a matrix in R^(n x d) and a tensor in R^(B x T x d) are objects with a SHAPE; an
 * element is addressed by 1-based mathematical indices and, in NumPy, by the same indices minus one. Everything here is integer arithmetic.
 *
 * Conventions (master plan 3): a vector is a column of d numbers; a data matrix stores n examples as ROWS and d features as COLUMNS; a
 * tensor is a batch of B sequences of T positions with d features each; NumPy stores a matrix in row-major order ("C order").
 *
 * An index outside its axis is reported as invalid with the reason; it is never clamped to the nearest valid index.
 */
export type ObjectKind = 'scalar' | 'vector' | 'matrix' | 'tensor';
export const OBJECT_KINDS: readonly ObjectKind[] = Object.freeze(['scalar', 'vector', 'matrix', 'tensor'] as const);
export const DIM_MIN = 1;
export const DIM_MAX = 8;

export type AxisSymbol = 'n' | 'd' | 'B' | 'T';
export type IndexLetter = 'i' | 'j' | 'k';

export interface ShapeState {
  readonly kind: ObjectKind;
  readonly n: number;
  readonly d: number;
  readonly B: number;
  readonly T: number;
  /** The selected indices, 1-based. Only the letters that belong to the object are used. */
  readonly i: number;
  readonly j: number;
  readonly k: number;
}

export interface Axis {
  readonly symbol: AxisSymbol;
  readonly size: number;
  readonly index: IndexLetter;
  /** What one step along this axis means in a data set. */
  readonly role: string;
}

export interface Slice {
  readonly id: string;
  readonly tex: string;
  readonly numpy: string;
  readonly shape: readonly number[];
  readonly shapeTuple: string;
}

export interface Selection {
  readonly letters: readonly IndexLetter[];
  readonly values1: readonly number[];
  readonly values0: readonly number[];
  readonly valid: boolean;
  readonly problems: readonly string[];
  /** Row-major strides in elements, one per axis. */
  readonly strides: readonly number[];
  /** The 0-based position of the element in the flattened array; `null` when an index is invalid. */
  readonly offset: number | null;
}

export interface ShapeDerived {
  readonly kind: ObjectKind;
  readonly axes: readonly Axis[];
  readonly shape: readonly number[];
  readonly rank: number;
  readonly count: number;
  /** `x` / `\mathbf{x}` / `X` / `\mathcal{X}`. */
  readonly nameTex: string;
  /** The same name in plain text and in Python: `x` or `X`. */
  readonly nameText: string;
  /** `X₂,₃` in plain text, with Unicode subscripts (`null` when an index is invalid or there is no index). */
  readonly elementText: string | null;
  /** `\mathbb{R}`, `\mathbb{R}^{d}`, `\mathbb{R}^{n\times d}`, `\mathbb{R}^{B\times T\times d}` (symbolic) and the same with the chosen sizes. */
  readonly setTex: string;
  readonly setNumbersTex: string;
  /** Python's `.shape`: `()`, `(5,)`, `(4, 3)`, `(2, 3, 4)`. */
  readonly shapeTuple: string;
  readonly selection: Selection | null;
  /** `X_{ij}` with letters, and `X_{2,3}` with the chosen numbers (`null` when an index is invalid). */
  readonly elementSymbolTex: string | null;
  readonly elementTex: string | null;
  /** `X[1, 2]`: the same element in NumPy. `null` when an index is invalid. */
  readonly numpy: string | null;
  /** `(2 - 1) * 3 + (3 - 1) = 5` in ASCII, and the TeX of the same. `null` when an index is invalid. */
  readonly offsetWork: string | null;
  readonly offsetTex: string | null;
  readonly slices: readonly Slice[];
}

export const isDim = (v: number): boolean => Number.isInteger(v) && v >= DIM_MIN && v <= DIM_MAX;

const NAME_TEX: Record<ObjectKind, string> = { scalar: 'x', vector: '\\mathbf{x}', matrix: 'X', tensor: '\\mathcal{X}' };
const NAME_PY: Record<ObjectKind, string> = { scalar: 'x', vector: 'x', matrix: 'X', tensor: 'X' };

export function axesOf(s: ShapeState): readonly Axis[] {
  switch (s.kind) {
    case 'scalar': return [];
    case 'vector': return [{ symbol: 'd', size: s.d, index: 'j', role: 'feature' }];
    case 'matrix': return [{ symbol: 'n', size: s.n, index: 'i', role: 'example (row)' }, { symbol: 'd', size: s.d, index: 'j', role: 'feature (column)' }];
    case 'tensor': return [
      { symbol: 'B', size: s.B, index: 'i', role: 'example in the batch' },
      { symbol: 'T', size: s.T, index: 'j', role: 'position in the sequence' },
      { symbol: 'd', size: s.d, index: 'k', role: 'feature' },
    ];
  }
}

/** Row-major strides, in elements: the last axis moves by 1, the one before it by the size of the last, and so on. */
export function stridesOf(shape: readonly number[]): readonly number[] {
  const out: number[] = new Array(shape.length).fill(1);
  for (let m = shape.length - 2; m >= 0; m--) out[m] = out[m + 1]! * shape[m + 1]!;
  return out;
}

/** The 0-based flattened position of a 0-based multi-index (every index must be inside its axis). */
export function flatten0(shape: readonly number[], at: readonly number[]): number {
  if (at.length !== shape.length) throw new RangeError('One index per axis is needed');
  const st = stridesOf(shape);
  return at.reduce((acc, a, m) => {
    if (!Number.isInteger(a) || a < 0 || a >= shape[m]!) throw new RangeError(`Index ${a} is outside axis ${m} of size ${shape[m]}`);
    return acc + a * st[m]!;
  }, 0);
}

/** The inverse of `flatten0`: the 0-based multi-index of the element at a flattened position. */
export function unflatten(shape: readonly number[], offset: number): readonly number[] {
  const count = shape.reduce((a, b) => a * b, 1);
  if (!Number.isInteger(offset) || offset < 0 || offset >= count) throw new RangeError(`Offset ${offset} is outside 0 … ${count - 1}`);
  const st = stridesOf(shape);
  const out: number[] = [];
  let rest = offset;
  for (const stride of st) { out.push(Math.floor(rest / stride)); rest %= stride; }
  return out;
}

export const tupleText = (shape: readonly number[]): string => (shape.length === 0 ? '()' : shape.length === 1 ? `(${shape[0]},)` : `(${shape.join(', ')})`);
const timesTex = (parts: readonly (string | number)[]): string => parts.join('\\times ');

function setTexOf(kind: ObjectKind, sizes: (axis: Axis) => string, axes: readonly Axis[]): string {
  if (kind === 'scalar') return '\\mathbb{R}';
  return `\\mathbb{R}^{${timesTex(axes.map(sizes))}}`;
}

export function deriveShape(s: ShapeState): ShapeDerived {
  const axes = axesOf(s);
  const shape = axes.map(a => a.size);
  const count = shape.reduce((a, b) => a * b, 1);
  const nameTex = NAME_TEX[s.kind];
  const py = NAME_PY[s.kind];
  const strides = stridesOf(shape);
  const letters = axes.map(a => a.index);
  const chosen = letters.map(l => s[l]);
  const problems: string[] = [];
  axes.forEach((a, m) => {
    const v = chosen[m]!;
    if (!Number.isInteger(v)) problems.push(`${a.index} = ${v} is not a whole number`);
    else if (v < 1 || v > a.size) problems.push(`${a.index} = ${v} is outside 1 … ${a.size}: this axis has ${a.size} ${a.size === 1 ? 'entry' : 'entries'}`);
  });
  const valid = problems.length === 0;
  const values1 = chosen;
  const values0 = chosen.map(v => v - 1);
  const offset = valid ? flatten0(shape, values0) : null;
  const selection: Selection | null = axes.length === 0
    ? null
    : { letters, values1, values0, valid, problems, strides, offset };
  const lettersTex = letters.join('');
  const elementSymbolTex = axes.length === 0 ? null : `${nameTex}_{${lettersTex}}`;
  const elementTex = !valid || axes.length === 0 ? null : `${nameTex}_{${values1.join(',')}}`;
  const numpy = !valid || axes.length === 0 ? null : `${py}[${values0.join(', ')}]`;
  let offsetWork: string | null = null;
  let offsetTex: string | null = null;
  if (valid && axes.length > 0 && offset !== null) {
    const termsAscii = values0.map((a, m) => (strides[m] === 1 ? `${a}` : `${a} * ${strides[m]}`));
    const termsTex = values0.map((a, m) => (strides[m] === 1 ? `${a}` : `${a}\\cdot ${strides[m]}`));
    offsetWork = `${termsAscii.join(' + ')} = ${offset}`;
    offsetTex = `${termsTex.join('+')}=${offset}`;
  }
  const slices: Slice[] = [];
  if (valid) {
    if (s.kind === 'matrix') {
      slices.push({ id: 'row', tex: `X_{${s.i},:}`, numpy: `X[${s.i - 1}, :]`, shape: [s.d], shapeTuple: tupleText([s.d]) });
      slices.push({ id: 'column', tex: `X_{:,${s.j}}`, numpy: `X[:, ${s.j - 1}]`, shape: [s.n], shapeTuple: tupleText([s.n]) });
    } else if (s.kind === 'tensor') {
      slices.push({ id: 'example', tex: `\\mathcal{X}_{${s.i},:,:}`, numpy: `X[${s.i - 1}]`, shape: [s.T, s.d], shapeTuple: tupleText([s.T, s.d]) });
      slices.push({ id: 'position', tex: `\\mathcal{X}_{${s.i},${s.j},:}`, numpy: `X[${s.i - 1}, ${s.j - 1}, :]`, shape: [s.d], shapeTuple: tupleText([s.d]) });
    }
  }
  return {
    kind: s.kind,
    axes,
    shape,
    rank: shape.length,
    count,
    nameTex,
    nameText: py,
    elementText: !valid || axes.length === 0 ? null : `${py}${values1.join(',').replace(/[0-9]/g, c => '₀₁₂₃₄₅₆₇₈₉'[Number(c)]!)}`,
    setTex: setTexOf(s.kind, a => a.symbol, axes),
    setNumbersTex: setTexOf(s.kind, a => String(a.size), axes),
    shapeTuple: tupleText(shape),
    selection,
    elementSymbolTex,
    elementTex,
    numpy,
    offsetWork,
    offsetTex,
    slices,
  };
}

// ------------------------------------------------------------------------------------------------ the shape algebra
export type AlgebraOp = 'matvec' | 'matmul' | 'transpose' | 'gram';
export const ALGEBRA_OPS: readonly AlgebraOp[] = Object.freeze(['matvec', 'matmul', 'transpose', 'gram'] as const);

export interface AlgebraState {
  readonly op: AlgebraOp;
  /** X is n x d. */
  readonly n: number;
  readonly d: number;
  /** The second operand: a vector of length p (matvec) or a p x q matrix (matmul). */
  readonly p: number;
  readonly q: number;
}

export interface AlgebraDerived {
  readonly op: AlgebraOp;
  readonly valid: boolean;
  /** The exact reason a product is not defined; `null` when it is. */
  readonly reason: string | null;
  readonly left: readonly [number, number];
  readonly right: readonly number[] | null;
  readonly result: readonly number[] | null;
  readonly expressionTex: string;
  /** `(4\times 3)(3\times 2)\to 4\times 2`, with the chosen sizes. */
  readonly ruleTex: string;
  readonly numpy: string;
  readonly resultTuple: string | null;
  /** The sentence of the rule that was applied. */
  readonly rule: string;
}

const sizeTex = (shape: readonly number[]): string => shape.join('\\times ');

export function deriveAlgebra(a: AlgebraState): AlgebraDerived {
  const left: readonly [number, number] = [a.n, a.d];
  const leftTex = `\\left(${sizeTex(left)}\\right)`;
  switch (a.op) {
    case 'transpose':
      return {
        op: a.op, valid: true, reason: null, left, right: null, result: [a.d, a.n], expressionTex: 'X^{\\top}',
        ruleTex: `${leftTex}\\to \\left(${sizeTex([a.d, a.n])}\\right)`, numpy: 'X.T', resultTuple: tupleText([a.d, a.n]),
        rule: 'Transposing swaps the two axes: rows become columns. It is always defined.',
      };
    case 'gram':
      return {
        op: a.op, valid: true, reason: null, left, right: null, result: [a.d, a.d], expressionTex: 'X^{\\top}X',
        ruleTex: `\\left(${sizeTex([a.d, a.n])}\\right)\\left(${sizeTex([a.n, a.d])}\\right)\\to \\left(${sizeTex([a.d, a.d])}\\right)`, numpy: 'X.T @ X', resultTuple: tupleText([a.d, a.d]),
        rule: 'X transposed is d × n and X is n × d, so the inner dimensions are both n and the result is d × d, one row and one column per feature.',
      };
    case 'matvec': {
      const right = [a.p];
      const valid = a.d === a.p;
      const rightTex = `\\left(${a.p}\\right)`;
      return {
        op: a.op, valid,
        reason: valid ? null : `The inner dimensions differ: X has d = ${a.d} columns but w has p = ${a.p} entries, and ${a.d} ≠ ${a.p}.`,
        left, right, result: valid ? [a.n] : null, expressionTex: 'X\\mathbf{w}',
        ruleTex: valid ? `${leftTex}${rightTex}\\to \\left(${a.n}\\right)` : `${leftTex}${rightTex}\\ \\text{is not defined}`,
        numpy: 'X @ w', resultTuple: valid ? tupleText([a.n]) : null,
        rule: 'A matrix times a vector needs as many columns as the vector has entries (d = p). The result has one entry per row: one number per example.',
      };
    }
    case 'matmul': {
      const right = [a.p, a.q];
      const valid = a.d === a.p;
      const rightTex = `\\left(${sizeTex(right)}\\right)`;
      return {
        op: a.op, valid,
        reason: valid ? null : `The inner dimensions differ: X has d = ${a.d} columns but W has p = ${a.p} rows, and ${a.d} ≠ ${a.p}.`,
        left, right, result: valid ? [a.n, a.q] : null, expressionTex: 'XW',
        ruleTex: valid ? `${leftTex}${rightTex}\\to \\left(${sizeTex([a.n, a.q])}\\right)` : `${leftTex}${rightTex}\\ \\text{is not defined}`,
        numpy: 'X @ W', resultTuple: valid ? tupleText([a.n, a.q]) : null,
        rule: 'For (n × d)(p × q) the inner dimensions must agree (d = p). The outer dimensions are what remain: the result is n × q.',
      };
    }
  }
}
