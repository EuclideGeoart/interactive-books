/**
 * Lesson views for "what do units do?": two quantities, one operation, and the exponent vectors that decide whether it means anything.
 *
 *   OperationDerived  →  { inspector rows, exponent table, formulas, verdict, spoken text }
 *
 * The model (`math/quantity/dimension.ts`, `operation.ts`) decides what is allowed and what the result is; this file chooses words and LaTeX.
 */
import { isBinary, unitSpoken, unitTex, unitText, type Dim, type Op, type ResultQuantity } from '../../math/quantity/dimension';
import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { deriveOperation, type OperationDerived } from '../../math/quantity/operation';
import type { ValueDescription } from '../../platform/numeric/quantity';
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned, given } from '../shared/format';
import { describeGiven, describeRational, describeRoot, statement, unitOf } from './values';

export type UnitId = 'none' | 'm' | 's' | 'kg' | 'm2' | 'ms' | 'ms2' | 'm2s2';
export interface UnitChoice { readonly id: UnitId; readonly label: string; readonly dim: Dim }
const unit = (id: UnitId, label: string, dim: Dim): UnitChoice => Object.freeze({ id, label, dim });
export const UNIT_CHOICES: readonly UnitChoice[] = Object.freeze([
  unit('none', 'no unit', [0, 0, 0]),
  unit('m', 'm', [1, 0, 0]),
  unit('s', 's', [0, 1, 0]),
  unit('kg', 'kg', [0, 0, 1]),
  unit('m2', 'm²', [2, 0, 0]),
  unit('ms', 'm/s', [1, -1, 0]),
  unit('ms2', 'm/s²', [1, -2, 0]),
  unit('m2s2', 'm²/s²', [2, -2, 0]),
]);
export const unitChoice = (id: UnitId): UnitChoice => UNIT_CHOICES.find(u => u.id === id)!;

export interface UnitsState {
  readonly op: Op;
  readonly aValue: number;
  readonly aUnit: UnitId;
  readonly bValue: number;
  readonly bUnit: UnitId;
}
export const CANONICAL_UNITS: UnitsState = Object.freeze({ op: 'add', aValue: 3, aUnit: 'm', bValue: 2, bUnit: 'm' });

export function deriveUnits(state: UnitsState): OperationDerived {
  return deriveOperation({ op: state.op, aValue: state.aValue, aDim: unitChoice(state.aUnit).dim, bValue: state.bValue, bDim: unitChoice(state.bUnit).dim });
}

const valueSpec = (id: 'a' | 'b', value: number): ParamSpec => ({
  id, name: `${id} value`, symbolTex: id, symbolText: id, domain: { min: -20, max: 20 }, default: value, step: 1, maxDecimals: 2, onInvalid: 'reject',
});
export const A_SPEC = valueSpec('a', 3);
export const B_SPEC = valueSpec('b', 2);

const operation = (id: Op, label: string, symbol: string) => Object.freeze({ id, label, symbol });
export const OPERATIONS = Object.freeze([
  operation('add', 'add', '+'),
  operation('subtract', 'subtract', '−'),
  operation('multiply', 'multiply', '×'),
  operation('divide', 'divide', '÷'),
  operation('square', 'square', '²'),
  operation('root', 'square root', '√'),
]);

export interface UnitsPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: UnitsState }
const preset = (id: string, label: string, aria: string, state: UnitsState): UnitsPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const UNITS_PRESETS: readonly UnitsPreset[] = Object.freeze([
  preset('add-same', '3 m + 2 m', '3 metres plus 2 metres', { op: 'add', aValue: 3, aUnit: 'm', bValue: 2, bUnit: 'm' }),
  preset('add-clash', '3 m + 2 s', '3 metres plus 2 seconds', { op: 'add', aValue: 3, aUnit: 'm', bValue: 2, bUnit: 's' }),
  preset('add-area', '3 m + 2 m²', '3 metres plus 2 square metres', { op: 'add', aValue: 3, aUnit: 'm', bValue: 2, bUnit: 'm2' }),
  preset('area', '3 m × 3 m', '3 metres times 3 metres', { op: 'multiply', aValue: 3, aUnit: 'm', bValue: 3, bUnit: 'm' }),
  preset('speed', '12 m ÷ 4 s', '12 metres divided by 4 seconds', { op: 'divide', aValue: 12, aUnit: 'm', bValue: 4, bUnit: 's' }),
  preset('ratio', '6 m ÷ 3 m', '6 metres divided by 3 metres', { op: 'divide', aValue: 6, aUnit: 'm', bValue: 3, bUnit: 'm' }),
  preset('root-ok', '√(9 m²)', 'square root of 9 square metres', { op: 'root', aValue: 9, aUnit: 'm2', bValue: 2, bUnit: 'm' }),
  preset('root-bad', '√(9 m)', 'square root of 9 metres', { op: 'root', aValue: 9, aUnit: 'm', bValue: 2, bUnit: 'm' }),
]);

// ---------------------------------------------------------------------------------------------- helpers
const unitedTex = (valueTex: string, dim: Dim): string => (unitTex(dim) ? `${valueTex}\\,${unitTex(dim)}` : valueTex);
const resultTex = (r: ResultQuantity): string => {
  const v = r.value.kind === 'rational' ? rationalForm(r.value.r).tex : rootForm(r.value.root).tex;
  return unitedTex(v, r.dim);
};
export const OP_SYMBOL: Record<Op, string> = { add: '+', subtract: '−', multiply: '×', divide: '÷', square: '²', root: '√' };
const vectorTex = (d: Dim): string => `(${d.join(',\\,')})`;

// ---------------------------------------------------------------------------------------------- inspector
export function unitsRows(d: OperationDerived, state: UnitsState): InspectorRowData[] {
  const rows: InspectorRowData[] = [
    { id: 'a', role: 'x', symbolTex: 'a', name: 'first quantity', description: describeGiven(state.aValue, unitOf(d.a.dim)) },
  ];
  if (isBinary(d.op)) rows.push({ id: 'b', role: 'y', symbolTex: 'b', name: 'second quantity', description: describeGiven(state.bValue, unitOf(d.b.dim)) });
  rows.push({ id: 'result', role: 'primary', symbolTex: resultSymbol(d.op), name: 'result', description: resultDescription(d) });
  return rows;
}

const resultSymbol = (op: Op): string => ({ add: 'a+b', subtract: 'a-b', multiply: 'a\\times b', divide: 'a\\div b', square: 'a^{2}', root: '\\sqrt{a}' })[op];

function resultDescription(d: OperationDerived): ValueDescription {
  if (!d.outcome.ok) return statement('undefined', '\\text{undefined}', `undefined. ${d.outcome.reason}`, 'undefined', d.outcome.reason);
  const r = d.outcome.result;
  const unit = unitOf(r.dim);
  if (r.value.kind === 'rational') return describeRational(r.value.r, unit);
  return describeRoot({ kind: 'exact', root: r.value.root, approx: r.value.approx }, unit);
}

// ---------------------------------------------------------------------------------------------- exponent table
export interface ExponentRow { readonly id: 'a' | 'b' | 'result'; readonly label: string; readonly unit: string; readonly exponents: readonly (number | null)[] }
/** Rows of the (L, T, M) exponent table; the result row has `null` exponents when the operation has no meaning. */
export function exponentTable(d: OperationDerived): ExponentRow[] {
  const rows: ExponentRow[] = [{ id: 'a', label: 'a', unit: unitText(d.a.dim) || 'no unit', exponents: d.a.dim }];
  if (isBinary(d.op)) rows.push({ id: 'b', label: 'b', unit: unitText(d.b.dim) || 'no unit', exponents: d.b.dim });
  rows.push(d.outcome.ok
    ? { id: 'result', label: 'result', unit: unitText(d.outcome.result.dim) || 'no unit', exponents: d.outcome.result.dim }
    : { id: 'result', label: 'result', unit: 'undefined', exponents: [null, null, null] });
  return rows;
}

// ---------------------------------------------------------------------------------------------- formulas
export function unitsFormulas(d: OperationDerived, state: UnitsState): string[] {
  const a = unitedTex(given(state.aValue), d.a.dim);
  const b = unitedTex(given(state.bValue), d.b.dim);
  const sym: Record<Op, string> = { add: '+', subtract: '-', multiply: '\\times', divide: '\\div', square: '', root: '' };
  const expression =
    d.op === 'square' ? `\\left(${a}\\right)^{2}` : d.op === 'root' ? `\\sqrt{${a}}` : `${a}\\ ${sym[d.op]}\\ ${b}`;
  const first = d.outcome.ok ? aligned([`${expression}&=${resultTex(d.outcome.result)}`]) : aligned([`${expression}&=\\text{undefined}`]);
  const va = vectorTex(d.a.dim);
  const vb = vectorTex(d.b.dim);
  let second: string;
  if (d.op === 'add' || d.op === 'subtract') {
    second = d.outcome.ok ? `${va}=${vb}\\ \\Rightarrow\\ \\text{same unit, kept: }${vectorTex(d.outcome.result.dim)}` : `${va}\\ne ${vb}\\ \\Rightarrow\\ \\text{no common unit}`;
  } else if (d.op === 'multiply') second = `${va}+${vb}=${d.outcome.ok ? vectorTex(d.outcome.result.dim) : '?'}`;
  else if (d.op === 'divide') second = d.outcome.ok ? `${va}-${vb}=${vectorTex(d.outcome.result.dim)}` : `${va}-${vb}\\ \\text{with divisor }0`;
  else if (d.op === 'square') second = `2\\cdot${va}=${d.outcome.ok ? vectorTex(d.outcome.result.dim) : '?'}`;
  else second = d.outcome.ok ? `\\tfrac{1}{2}\\cdot${va}=${vectorTex(d.outcome.result.dim)}` : `\\tfrac{1}{2}\\cdot${va}\\ \\text{is not a whole-number vector}`;
  return [first, `\\text{exponents of }(\\mathrm{m},\\mathrm{s},\\mathrm{kg}):\\quad ${second}`];
}

// ---------------------------------------------------------------------------------------------- verdict
export function unitsVerdict(d: OperationDerived): string {
  return d.outcome.ok ? d.outcome.rule : d.outcome.reason;
}

export function unitsSpoken(d: OperationDerived): string {
  if (!d.outcome.ok) return `Undefined. ${d.outcome.reason}`;
  const r = d.outcome.result;
  const value = r.value.kind === 'rational' ? rationalForm(r.value.r).spoken : rootForm(r.value.root).spoken;
  return `Result ${value} ${unitSpoken(r.dim)}.`;
}
