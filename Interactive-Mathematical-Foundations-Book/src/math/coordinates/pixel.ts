/**
 * Screen versus mathematics, on integer lattice points only.
 *
 * A mathematical plane has y growing UP. An image array img[row, col] has row 0 at the TOP and rows growing DOWN. For an image W pixels wide
 * and H pixels tall, with the lattice point (x, y) standing for the centre of the pixel cell in column x counted from the left and in the
 * y-th row counted from the BOTTOM:
 *
 *     col = x            row = H − 1 − y            flat index = row·W + col
 *     x = col            y = H − 1 − row            (the row formula is its own inverse once H is fixed)
 *
 * Scope: this is the integer-lattice model only. Treating a pixel as an area (corner versus centre, half-pixel offsets, image coordinates
 * measured in continuous units) is a different, larger convention question that this chapter does not model.
 */
export const SIZE_MIN = 2;
export const SIZE_MAX = 10;

export interface PixelState {
  readonly w: number;
  readonly h: number;
  readonly x: number;
  readonly y: number;
}

export interface PixelDerived {
  readonly w: number;
  readonly h: number;
  readonly x: number;
  readonly y: number;
  readonly row: number;
  readonly col: number;
  /** Flat row-major index row·W + col. */
  readonly index: number;
  /** Mapping the pixel back to a point gives the same point. */
  readonly roundTrip: boolean;
  /** The off-by-one slip row = H − y; for y = 0 it is H, one past the last row. */
  readonly naiveRow: number;
  readonly naiveRowInRange: boolean;
  /** The swap slip img[x, y] reads row x and column y; it is a valid index only when x ≤ H − 1 and y ≤ W − 1. */
  readonly swappedInRange: boolean;
}

const isInt = (n: number): boolean => Number.isInteger(n);

export function validatePixel(s: PixelState): void {
  for (const [name, v] of [['w', s.w], ['h', s.h]] as const) {
    if (!isInt(v) || v < SIZE_MIN || v > SIZE_MAX) throw new RangeError(`${name} = ${v} is not a whole number from ${SIZE_MIN} to ${SIZE_MAX}`);
  }
  if (!isInt(s.x) || s.x < 0 || s.x > s.w - 1) throw new RangeError(`x = ${s.x} is outside 0…${s.w - 1}`);
  if (!isInt(s.y) || s.y < 0 || s.y > s.h - 1) throw new RangeError(`y = ${s.y} is outside 0…${s.h - 1}`);
}

export const rowOf = (h: number, y: number): number => h - 1 - y;
export const yOfRow = (h: number, row: number): number => h - 1 - row;

export function derivePixel(state: PixelState): PixelDerived {
  validatePixel(state);
  const { w, h, x, y } = state;
  const row = rowOf(h, y);
  const col = x;
  const naiveRow = h - y;
  return {
    w, h, x, y, row, col, index: row * w + col,
    roundTrip: yOfRow(h, row) === y,
    naiveRow, naiveRowInRange: naiveRow <= h - 1,
    swappedInRange: x <= h - 1 && y <= w - 1,
  };
}

/** Keep the point on the lattice after the image is resized: coordinates beyond the new edge are clamped to it. */
export function resizePixel(state: PixelState, w: number, h: number): PixelState {
  return { w, h, x: Math.min(state.x, w - 1), y: Math.min(state.y, h - 1) };
}

export interface LatticeCell {
  readonly row: number;
  readonly col: number;
  /** The lattice point at the centre of this cell. */
  readonly x: number;
  readonly y: number;
  readonly index: number;
  readonly selected: boolean;
}

/** Every cell of the image in array order (row 0 first = the TOP row), each with the lattice point it stands for; the cell of `state` is marked. */
export function latticeCells(state: PixelState): LatticeCell[][] {
  validatePixel(state);
  const { w, h } = state;
  const chosen = derivePixel(state);
  return Array.from({ length: h }, (_, row) => Array.from({ length: w }, (_, col) => ({
    row, col, x: col, y: yOfRow(h, row), index: row * w + col, selected: row === chosen.row && col === chosen.col,
  })));
}
