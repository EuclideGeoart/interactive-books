/**
 * Lesson views for the arg min stage: a loss tabulated on the whole numbers -4 … 4. The minimum VALUE, the arg min SET of grid points that reach
 * it, and NumPy's np.argmin (the 0-based position of the FIRST minimum) are three different things, and the stage shows all three side by side.
 *
 *   ArgminState → deriveArgmin → { table rows · inspector · formulas · Python · verdict }
 */
import type { ParamSpec } from '../../platform/params';
import type { InspectorRowData } from '../../ui/Inspector';
import { B_MAX, B_MIN, C_MAX, C_MIN, GRID, deriveArgmin, type ArgminDerived, type ArgminState, type LossKind } from '../../math/notation/argmin';
import { exactText } from './view';

export type ArgminLessonState = ArgminState;
export const CANONICAL_ARGMIN: ArgminLessonState = Object.freeze({ kind: 'bowl', c: 2, b: 1 });

export const LOSS_OPTIONS = Object.freeze([
  { id: 'bowl', label: 'a bowl' },
  { id: 'two-wells', label: 'two wells' },
  { id: 'flat-bottom', label: 'a flat bottom' },
] as const);

const whole = (id: string, name: string, symbol: string, min: number, max: number, def: number): ParamSpec => ({ id, name, symbolTex: symbol, symbolText: symbol, domain: { min, max }, default: def, step: 1, maxDecimals: 0, onInvalid: 'reject' });
export const C_PARAM = whole('shift', 'shift: where the loss is centred', 'c', C_MIN, C_MAX, 2);
export const B_PARAM = whole('offset', 'offset added to every loss', 'b', B_MIN, B_MAX, 1);

export interface ArgminPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: ArgminLessonState }
const P = (id: string, label: string, aria: string, s: Partial<ArgminLessonState>): ArgminPreset => Object.freeze({ id, label, aria, state: Object.freeze({ ...CANONICAL_ARGMIN, ...s }) });
export const ARGMIN_PRESETS: readonly ArgminPreset[] = Object.freeze([
  P('bowl', 'a bowl at 2', 'a bowl centred at two with offset one', {}),
  P('raised', 'same bowl, raised', 'the same bowl lifted by five: the minimum value changes, the arg min does not', { b: 5 }),
  P('wells', 'two wells', 'two equal wells at minus one and one', { kind: 'two-wells', c: 0, b: 0 }),
  P('wells-shifted', 'two wells, shifted', 'two equal wells shifted right by one', { kind: 'two-wells', c: 1, b: 0 }),
  P('flat', 'a flat bottom', 'a loss that is zero on three grid points', { kind: 'flat-bottom', c: 0, b: 0 }),
  P('unique', 'one minimiser at 0', 'a bowl centred at zero', { c: 0, b: 0 }),
]);
export const argminPresetMatches = (s: ArgminLessonState, p: ArgminPreset): boolean => (Object.keys(CANONICAL_ARGMIN) as (keyof ArgminLessonState)[]).every(key => Object.is(s[key], p.state[key]));

export interface ArgminLessonDerived { readonly state: ArgminLessonState; readonly d: ArgminDerived }
export function deriveArgminLesson(state: ArgminLessonState): ArgminLessonDerived {
  return Object.freeze({ state, d: deriveArgmin(state) });
}

const signed = (n: number): string => (n < 0 ? `−${-n}` : String(n));

/** `{−1, 1}`: the arg min as a set, in text. */
export const setText = (xs: readonly number[]): string => `{${xs.map(signed).join(', ')}}`;
export const setTex = (xs: readonly number[]): string => `\\left\\{${xs.join(',\\ ')}\\right\\}`;

/** `(\theta-2)` or `(\theta+2)` or `\theta`, the shifted variable. */
const shiftedTex = (c: number): string => (c === 0 ? '\\theta' : c > 0 ? `\\theta-${c}` : `\\theta+${-c}`);

export function lossTex(s: ArgminLessonState): string {
  const u = shiftedTex(s.c);
  const wrapped = s.c === 0 ? u : `\\left(${u}\\right)`;
  const body = s.kind === 'bowl' ? `${wrapped}^{2}` : s.kind === 'two-wells' ? `\\left(${wrapped}^{2}-1\\right)^{2}` : `\\max\\left(\\lvert ${u}\\rvert-1,\\,0\\right)^{2}`;
  return `L(\\theta)=${body}+${s.b}`;
}

export const ARGMIN_TEX = '\\argmin_{\\theta}L(\\theta)';
export const MIN_TEX = '\\min_{\\theta}L(\\theta)';

export function argminRows(derived: ArgminLessonDerived): InspectorRowData[] {
  const { d } = derived;
  return [
    { id: 'min', role: 'primary', symbolTex: MIN_TEX, name: 'the smallest loss: a VALUE', description: exactText(String(d.minValue), String(d.minValue)) },
    { id: 'argmin', role: 'y', symbolTex: ARGMIN_TEX, name: d.tie ? 'where the loss is smallest: a SET of points (a tie)' : 'where the loss is smallest: a POINT', description: exactText(setText(d.argmin), setTex(d.argmin), `the set ${d.argmin.map(signed).join(' and ')}`) },
    { id: 'np-index', role: 'derived', symbolTex: '\\texttt{np.argmin}', name: 'np.argmin(L): the 0-based POSITION of the first minimum', description: exactText(String(d.npIndex), String(d.npIndex)) },
    { id: 'np-theta', role: 'x', symbolTex: '\\texttt{thetas[\\ ]}', name: 'thetas[np.argmin(L)]: the parameter at that position', description: exactText(signed(d.npTheta), String(d.npTheta)), secondary: true },
  ];
}

export function argminFormulas(derived: ArgminLessonDerived): { id: string; label: string; tex: string }[] {
  const { d, state: s } = derived;
  return [
    { id: 'loss', label: 'The loss, scrollable', tex: lossTex(s) },
    { id: 'min', label: 'The minimum value, scrollable', tex: `${MIN_TEX}=${d.minValue}` },
    { id: 'argmin', label: 'The arg min, scrollable', tex: `${ARGMIN_TEX}=${setTex(d.argmin)}` },
  ];
}

const shiftPy = (c: number): string => (c === 0 ? 'thetas' : c > 0 ? `thetas - ${c}` : `thetas + ${-c}`);
export function argminCode(derived: ArgminLessonDerived): string {
  const { d, state: s } = derived;
  const u = shiftPy(s.c);
  const wrapped = s.c === 0 ? u : `(${u})`;
  const body = s.kind === 'bowl' ? `${wrapped} ** 2` : s.kind === 'two-wells' ? `(${wrapped} ** 2 - 1) ** 2` : `np.maximum(np.abs(${u}) - 1, 0) ** 2`;
  return [
    'import numpy as np',
    '',
    'thetas = np.arange(-4, 5)',
    `L = ${body} + ${s.b}`,
    `np.min(L)                # ${d.minValue}: a value`,
    `thetas[np.argmin(L)]     # ${d.npTheta}: a parameter`,
    `np.argmin(L)             # ${d.npIndex}: a position`,
  ].join('\n');
}

export function argminVerdict(derived: ArgminLessonDerived): { text: string; caution: boolean } {
  const { d } = derived;
  let text = `The minimum is the VALUE ${d.minValue}. The arg min is the PLACE where it is reached: ${d.tie ? `the set ${setText(d.argmin)}, because ${d.argmin.length} grid points tie` : `the point ${signed(d.argmin[0]!)}`}.`;
  text += ` np.argmin(L) returns neither: it returns the position ${d.npIndex} (counting from 0) of the FIRST minimum, and thetas[${d.npIndex}] = ${signed(d.npTheta)}.`;
  if (d.tie) text += ` It reports only ${signed(d.npTheta)}; the other minimiser${d.argmin.length > 2 ? 's are' : ' is'} silently left out.`;
  return { text, caution: d.tie };
}

export function argminSpoken(derived: ArgminLessonDerived): string {
  const { d } = derived;
  return `Minimum value ${signed(d.minValue)}. Arg min ${d.tie ? `is the set ${d.argmin.map(signed).join(' and ')}` : `is the point ${signed(d.argmin[0]!)}`}. np.argmin gives position ${d.npIndex}.`;
}

export const GRID_POINTS = GRID;
export type { LossKind };
