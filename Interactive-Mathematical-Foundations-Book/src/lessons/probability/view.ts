import { rationalForm, rootForm } from '../../math/quantity/exactform';
import { rootOf } from '../../math/quantity/root';
import { toNumber, type Rational } from '../../math/quantity/rational';
import { describeValue } from '../../platform/numeric/quantity';
import type { InspectorRowData } from '../../ui/Inspector';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import type { ParamSpec } from '../../platform/params';

const format = { digits: 6, scientificAbove: 1e6, trimZeros: true } as const;
export const exactText = (p: Rational): string => rationalForm(p).text;
export const tex = (p: Rational): string => rationalForm(p).tex;
export const approx = (n: number): string => Number(n.toPrecision(6)).toString();
export const exactRow = (id: string, symbolTex: string, name: string, value: Rational | null, reason = 'The conditioning event has probability zero.', role: InspectorRowData['role'] = 'derived'): InspectorRowData => ({
  id, symbolTex, name, role: value === null ? 'caution' : role,
  description: describeValue(value === null ? { kind: 'undefined', reason } : { kind: 'exact', exact: rationalForm(value), approx: toNumber(value) }, format),
});
export const numericRow = (id: string, symbolTex: string, name: string, value: number | null, reason = 'Zero variance makes this quantity undefined.'): InspectorRowData => ({
  id, symbolTex, name, role: value === null ? 'caution' : 'derived', description: describeValue(value === null ? { kind: 'undefined', reason } : { kind: 'numeric', value }, format),
});
export const rootRow = (id: string, symbolTex: string, name: string, squared: Rational): InspectorRowData => {
  const root = rootOf(squared, 2);
  if (root.kind === 'exact') return { id, symbolTex, name, role: 'derived', description: describeValue({ kind: 'exact', exact: rootForm(root.root), approx: root.approx }, format) };
  return numericRow(id, symbolTex, name, Math.sqrt(toNumber(squared)));
};

export interface MassItem { readonly label: string; readonly mass: Rational; readonly text: string; readonly width: number; readonly role: 'primary' | 'x' | 'y' | 'caution' | 'derived' }
export const massItem = (label: string, mass: Rational, role: MassItem['role'] = 'primary'): MassItem => ({ label, mass, text: exactText(mass), width: toNumber(mass) * 100, role });
export interface StepState { readonly title: string; readonly detail: string; readonly formula: string; readonly masses?: readonly MassItem[]; readonly values?: readonly Rational[]; readonly observations?: readonly number[] }
export const steps = (states: readonly StepState[]): readonly TraceFrame<StepState>[] => traceFrom(states.map(state => ({ state, explanation: state.detail })));
export interface ProbabilityView {
  readonly title: string;
  readonly description: string;
  readonly verdict: string;
  readonly rows: readonly InspectorRowData[];
  readonly formulas: readonly string[];
  readonly trace: readonly TraceFrame<StepState>[];
}
export function parameter(id: string, name: string, symbolTex: string, min: number, max: number, value: number, step = 1, decimals = 0): ParamSpec {
  return { id, name, symbolTex, symbolText: name, domain: { min, max }, default: value, step, maxDecimals: decimals, onInvalid: 'reject' };
}
