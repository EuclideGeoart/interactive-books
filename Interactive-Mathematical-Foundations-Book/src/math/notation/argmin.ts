/**
 * arg min versus min over a visible table (I.9). The loss is L(theta) = g(theta - c) + b on the whole-number grid -4 … 4, so every value is an
 * exact integer. `min` is a VALUE of the loss; `argmin` is the set of grid points where that value is reached (a tie gives several);
 * NumPy's `np.argmin` returns the 0-based POSITION of the FIRST minimum in the array, which is neither of the two.
 */
export type LossKind = 'bowl' | 'two-wells' | 'flat-bottom';
export const LOSS_KINDS: readonly LossKind[] = Object.freeze(['bowl', 'two-wells', 'flat-bottom'] as const);

export const GRID: readonly number[] = Object.freeze([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
export const C_MIN = -3;
export const C_MAX = 3;
export const B_MIN = 0;
export const B_MAX = 6;

export interface ArgminState {
  readonly kind: LossKind;
  /** The shift: where the bowl (or the two wells, or the flat bottom) is centred. */
  readonly c: number;
  /** The offset added to every loss: it moves the minimum VALUE and never the argmin. */
  readonly b: number;
}

/** The shape g(u) before shifting: u^2, (u^2 - 1)^2, or max(|u| - 1, 0)^2. */
export function shape(kind: LossKind, u: number): number {
  switch (kind) {
    case 'bowl': return u * u;
    case 'two-wells': return (u * u - 1) * (u * u - 1);
    case 'flat-bottom': { const m = Math.max(Math.abs(u) - 1, 0); return m * m; }
  }
}

export const loss = (s: ArgminState, theta: number): number => shape(s.kind, theta - s.c) + s.b;

export interface ArgminRow {
  readonly index: number;
  readonly theta: number;
  readonly loss: number;
  readonly isMinimiser: boolean;
}

export interface ArgminDerived {
  readonly rows: readonly ArgminRow[];
  readonly minValue: number;
  readonly argmin: readonly number[];
  readonly tie: boolean;
  /** `np.argmin(L)`: the 0-based position of the first minimum in the array of losses. */
  readonly npIndex: number;
  /** The grid point at that position: `grid[np.argmin(L)]`. */
  readonly npTheta: number;
}

export function deriveArgmin(s: ArgminState): ArgminDerived {
  if (!Number.isInteger(s.c) || s.c < C_MIN || s.c > C_MAX) throw new RangeError(`c must be a whole number from ${C_MIN} to ${C_MAX}`);
  if (!Number.isInteger(s.b) || s.b < B_MIN || s.b > B_MAX) throw new RangeError(`b must be a whole number from ${B_MIN} to ${B_MAX}`);
  const values = GRID.map(t => loss(s, t));
  const minValue = Math.min(...values);
  const rows = GRID.map((theta, index) => ({ index, theta, loss: values[index]!, isMinimiser: values[index] === minValue }));
  const argmin = rows.filter(r => r.isMinimiser).map(r => r.theta);
  const npIndex = values.indexOf(minValue);
  return { rows, minValue, argmin, tie: argmin.length > 1, npIndex, npTheta: GRID[npIndex]! };
}
