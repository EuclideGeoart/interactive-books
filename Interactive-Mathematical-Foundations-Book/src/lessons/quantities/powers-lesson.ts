/**
 * Lesson views for integer powers: the ladder bᵏ for k = −3 … 6, and the four rules checked on two chosen exponents.
 *
 *   PowersDerived  →  { ladder rows, rule rows (formula + status), inspector rows, spoken text }
 *
 * Every number shown was computed by the model in exact rational arithmetic (`math/quantity/powers.ts`); the rule statuses are its
 * `applies` / `equal` flags, not claims made here.
 */
import { EXPONENT_MAX, EXPONENT_MIN, derivePowers, type PowersDerived, type RuleCheck, type RuleId } from '../../math/quantity/powers';
import { rationalForm } from '../../math/quantity/exactform';
import { fromDecimal, type PowerResult } from '../../math/quantity/rational';
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { aligned } from '../shared/format';
import { baseTex, describeGiven, describeRational, describeRoot } from './values';

export interface PowersState { readonly base: number; readonly m: number; readonly n: number }
export const CANONICAL_POWERS: PowersState = Object.freeze({ base: 2, m: 3, n: 4 });
export const BASE_DECIMALS = 1;

export function derivePowersState(state: PowersState): PowersDerived {
  const base = fromDecimal(state.base, BASE_DECIMALS);
  if (!base) throw new RangeError(`${state.base} has more than ${BASE_DECIMALS} decimal place`);
  return derivePowers(base, state.m, state.n);
}

export const BASE_SPEC: ParamSpec = { id: 'base', name: 'base b', symbolTex: 'b', symbolText: 'b', domain: { min: -5, max: 5 }, default: 2, step: 1, maxDecimals: BASE_DECIMALS, onInvalid: 'reject' };
const exponentSpec = (id: 'm' | 'n', value: number): ParamSpec => ({ id, name: `exponent ${id}`, symbolTex: id, symbolText: id, domain: { min: EXPONENT_MIN, max: EXPONENT_MAX }, default: value, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const M_SPEC = exponentSpec('m', 3);
export const N_SPEC = exponentSpec('n', 4);

export interface PowersPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: PowersState }
const preset = (id: string, label: string, aria: string, state: PowersState): PowersPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const POWERS_PRESETS: readonly PowersPreset[] = Object.freeze([
  preset('two', '2: m=3, n=4', 'base 2, m 3, n 4', { base: 2, m: 3, n: 4 }),
  preset('negative', '2: m=−3, n=3', 'base 2, m minus 3, n 3', { base: 2, m: -3, n: 3 }),
  preset('half', '0.5: m=2, n=−3', 'base 0.5, m 2, n minus 3', { base: 0.5, m: 2, n: -3 }),
  preset('minus-two', '−2: m=3, n=2', 'base minus 2, m 3, n 2', { base: -2, m: 3, n: 2 }),
  preset('zero-product', '0: m=−1, n=1', 'base 0, m minus 1, n 1', { base: 0, m: -1, n: 1 }),
  preset('zero-power', '0: m=−1, n=−1', 'base 0, m minus 1, n minus 1', { base: 0, m: -1, n: -1 }),
]);

// ---------------------------------------------------------------------------------------------- pieces
const valueTex = (p: PowerResult): string => (p.kind === 'value' ? rationalForm(p.value).tex : '\\text{undefined}');
const valueText = (p: PowerResult): string => (p.kind === 'value' ? rationalForm(p.value).text : 'undefined');
const at = (d: PowersDerived, k: number): PowerResult => d.ladder.find(e => e.k === k)!.result;
const exp = (k: number): string => `{${k}}`;

export interface LadderRow { readonly k: number; readonly tex: string; /** the row heading in words, for assistive technology */ readonly spoken: string; readonly valueTex: string; readonly valueText: string; readonly defined: boolean; readonly isM: boolean; readonly isN: boolean }
export function ladderRows(d: PowersDerived): LadderRow[] {
  const base = baseTex(d.base);
  const spokenBase = rationalForm(d.base).spoken;
  return d.ladder.map(({ k, result }) => ({ k, tex: `${base}^${exp(k)}`, spoken: `${spokenBase} to the power ${k < 0 ? `minus ${-k}` : k}`, valueTex: valueTex(result), valueText: valueText(result), defined: result.kind === 'value', isM: k === d.m, isN: k === d.n }));
}

export const RULE_NAMES: Record<RuleId, string> = {
  product: 'Product of powers',
  'power-of-power': 'Power of a power',
  zero: 'Zero exponent',
  negative: 'Negative exponent',
};
export const RULE_SHAPES: Record<RuleId, string> = {
  product: 'b^{m}\\cdot b^{n}=b^{m+n}',
  'power-of-power': '\\left(b^{m}\\right)^{n}=b^{mn}',
  zero: 'b^{0}=1',
  negative: 'b^{-n}=\\dfrac{1}{b^{n}}',
};

/** The two sides of one rule with the base and exponents substituted, as an aligned display equation. */
export function ruleTex(rule: RuleCheck, d: PowersDerived): string {
  const B = baseTex(d.base);
  const { m, n } = d;
  const bm = valueTex(at(d, m));
  const bn = valueTex(at(d, n));
  switch (rule.id) {
    case 'product':
      return aligned([`${B}^{${m}}\\cdot ${B}^{${n}}&=${bm}\\cdot ${bn}=${valueTex(rule.left)}`, `${B}^{${m}+${n}}&=${B}^{${m + n}}=${valueTex(rule.right)}`]);
    case 'power-of-power':
      return aligned([`\\left(${B}^{${m}}\\right)^{${n}}&=\\left(${bm}\\right)^{${n}}=${valueTex(rule.left)}`, `${B}^{${m}\\cdot ${n}}&=${B}^{${m * n}}=${valueTex(rule.right)}`]);
    case 'zero':
      return aligned([`${B}^{0}&=${valueTex(rule.left)}`, `&\\text{the rule says }1`]);
    case 'negative':
      return aligned([`${B}^{${-n}}&=${valueTex(rule.left)}`, `\\dfrac{1}{${B}^{${n}}}&=\\dfrac{1}{${bn}}=${valueTex(rule.right)}`]);
  }
}

export type RuleStatus = 'holds' | 'no-claim' | 'fails';
export const ruleStatus = (r: RuleCheck): RuleStatus => (!r.applies ? 'no-claim' : r.equal ? 'holds' : 'fails');
export function ruleStatusText(r: RuleCheck): string {
  const status = ruleStatus(r);
  if (status === 'holds') return `Both sides are equal: ${valueText(r.left)}.`;
  if (status === 'fails') return `The two sides differ: ${valueText(r.left)} and ${valueText(r.right)}.`;
  return r.note ?? 'The rule makes no claim here.';
}

// ---------------------------------------------------------------------------------------------- inspector
export function powersRows(d: PowersDerived, state: PowersState): InspectorRowData[] {
  const as = (k: number) => at(d, k);
  const describe = (p: PowerResult) => (p.kind === 'value' ? describeRational(p.value) : describeRoot({ kind: 'undefined', reason: p.reason }));
  return [
    { id: 'base', role: 'x', symbolTex: 'b', name: 'base', description: describeGiven(state.base) },
    { id: 'power-m', role: 'primary', symbolTex: `b^{${d.m}}`, name: `b to the power ${d.m}`, description: describe(as(d.m)) },
    { id: 'power-n', role: 'y', symbolTex: `b^{${d.n}}`, name: `b to the power ${d.n}`, description: describe(as(d.n)) },
  ];
}

export function powersVerdict(d: PowersDerived): string {
  const failing = d.rules.filter(r => ruleStatus(r) === 'fails');
  if (failing.length) return `A rule failed: ${failing.map(r => RULE_NAMES[r.id]).join(', ')}.`;
  const silent = d.rules.filter(r => ruleStatus(r) === 'no-claim');
  if (silent.length === 0) return 'All four rules hold for these numbers: each pair of sides is exactly equal.';
  return `${silent.map(r => RULE_NAMES[r.id]).join(', ')}: a side is undefined for this base, so that rule makes no claim here. A rule is never false where it applies; it is silent where a side does not exist.`;
}

export function powersSpoken(d: PowersDerived): string {
  const rules = d.rules.map(r => `${RULE_NAMES[r.id]} ${ruleStatus(r) === 'holds' ? 'holds' : ruleStatus(r) === 'no-claim' ? 'makes no claim' : 'fails'}`).join('. ');
  return `Base ${rationalForm(d.base).spoken}, m ${d.m}, n ${d.n}. ${rules}.`;
}

export function powersDescription(d: PowersDerived): string {
  return `The powers of ${rationalForm(d.base).text} from exponent ${EXPONENT_MIN} to ${EXPONENT_MAX}, with the rows for exponents ${d.m} and ${d.n} marked.`;
}
