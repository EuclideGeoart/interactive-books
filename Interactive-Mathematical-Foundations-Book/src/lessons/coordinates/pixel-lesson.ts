/**
 * Lesson views for the screen-versus-mathematics stage of I.2: a lattice point (x, y) of the math plane (y up) and the array index
 * img[row, col] of the same pixel (row 0 at the top).
 *
 *   PixelDerived  →  { inspector rows, formulas, verdict, world-space scene, table cells, spoken text }
 *
 * Integer lattice only: the point stands for the centre of a pixel cell. The continuous (corner / half-pixel) conventions are not modelled.
 */
import { SIZE_MAX, SIZE_MIN, latticeCells, yOfRow, type LatticeCell, type PixelDerived, type PixelState } from '../../math/coordinates/pixel';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Point, WorldWindow } from '../../platform/geometry/viewport';
import type { ParamSpec } from '../../platform/params';
import { aligned } from '../shared/format';
import { describeGiven, statement } from '../quantities/values';

export const CANONICAL_PIXEL: PixelState = Object.freeze({ w: 5, h: 4, x: 3, y: 1 });

const intSpec = (id: string, symbolTex: string, symbolText: string, name: string, min: number, max: number, value: number): ParamSpec => ({
  id, name, symbolTex, symbolText, domain: { min, max }, default: value, step: 1, maxDecimals: 0, onInvalid: 'reject',
});
export const W_SPEC = intSpec('w', 'W', 'W', 'image width W (pixels)', SIZE_MIN, SIZE_MAX, CANONICAL_PIXEL.w);
export const H_SPEC = intSpec('h', 'H', 'H', 'image height H (pixels)', SIZE_MIN, SIZE_MAX, CANONICAL_PIXEL.h);
/** x and y depend on the current size: the lattice is 0…W−1 by 0…H−1. */
export const xSpec = (w: number): ParamSpec => intSpec('x', 'x', 'x', 'x-coordinate (column)', 0, w - 1, CANONICAL_PIXEL.x);
export const ySpec = (h: number): ParamSpec => intSpec('y', 'y', 'y', 'y-coordinate (counted from the bottom)', 0, h - 1, CANONICAL_PIXEL.y);

/** The part of the plane to show: the whole image, with room on the right for the row labels. */
export const pixelWindow = (w: number, h: number): WorldWindow => ({ xMin: -1, xMax: w + 1.6, yMin: -1, yMax: h + 0.2 });

export interface PixelPreset { readonly id: string; readonly label: string; readonly aria: string; readonly state: PixelState }
const preset = (id: string, label: string, aria: string, state: PixelState): PixelPreset => Object.freeze({ id, label, aria, state: Object.freeze(state) });
export const PIXEL_PRESETS: readonly PixelPreset[] = Object.freeze([
  preset('px-bottom-left', 'bottom-left (0, 0)', 'the bottom-left pixel, x 0, y 0', { w: 5, h: 4, x: 0, y: 0 }),
  preset('px-top-left', 'top-left (0, 3)', 'the top-left pixel, x 0, y 3', { w: 5, h: 4, x: 0, y: 3 }),
  preset('px-bottom-right', 'bottom-right (4, 0)', 'the bottom-right pixel, x 4, y 0', { w: 5, h: 4, x: 4, y: 0 }),
  preset('px-wide', 'wide image 7 × 3', 'an image 7 wide and 3 tall', { w: 7, h: 3, x: 5, y: 1 }),
  preset('px-tall', 'tall image 3 × 6', 'an image 3 wide and 6 tall', { w: 3, h: 6, x: 2, y: 4 }),
]);

// ---------------------------------------------------------------------------------------------- inspector
export function pixelRows(d: PixelDerived): InspectorRowData[] {
  const slip = d.naiveRowInRange
    ? statement(String(d.naiveRow), String(d.naiveRow), String(d.naiveRow), 'exact', 'a legal row number, but the wrong pixel (one row too low)')
    : statement(String(d.naiveRow), String(d.naiveRow), String(d.naiveRow), 'undefined', `row ${d.naiveRow} does not exist: rows are 0 to ${d.h - 1} (IndexError)`);
  const swapped = d.swappedInRange
    ? statement(`row ${d.x}, col ${d.y}`, `\\text{row }${d.x},\\ \\text{col }${d.y}`, `row ${d.x}, column ${d.y}`, 'exact', 'a legal index, and a different pixel (a silent bug)')
    : statement(`row ${d.x}, col ${d.y}`, `\\text{row }${d.x},\\ \\text{col }${d.y}`, `row ${d.x}, column ${d.y}`, 'undefined', 'outside the array (IndexError)');
  return [
    { id: 'x', role: 'x', symbolTex: 'x', name: 'x (column from the left)', description: describeGiven(d.x) },
    { id: 'y', role: 'y', symbolTex: 'y', name: 'y (from the bottom)', description: describeGiven(d.y) },
    { id: 'row', role: 'derived', symbolTex: '\\mathrm{row}', name: 'row = H − 1 − y', description: describeGiven(d.row) },
    { id: 'col', role: 'derived', symbolTex: '\\mathrm{col}', name: 'column = x', description: describeGiven(d.col) },
    { id: 'index', role: 'primary', symbolTex: '\\mathrm{index}', name: 'flat index = row · W + col', description: describeGiven(d.index) },
    { id: 'slip-row', role: 'caution', symbolTex: 'H-y', name: 'slip: row = H − y', description: slip, secondary: true },
    { id: 'slip-swap', role: 'caution', symbolTex: '\\mathrm{img}[x,y]', name: 'slip: img[x, y]', description: swapped, secondary: true },
  ];
}

// ---------------------------------------------------------------------------------------------- formulas
export function pixelFormulas(d: PixelDerived): string[] {
  return [
    aligned([
      `\\mathrm{col}&=x=${d.col}`,
      `\\mathrm{row}&=H-1-y=${d.h}-1-${d.y}=${d.row}`,
    ]),
    aligned([
      `\\mathrm{index}&=\\mathrm{row}\\cdot W+\\mathrm{col}=${d.row}\\cdot ${d.w}+${d.col}=${d.index}`,
      `y&=H-1-\\mathrm{row}=${d.h}-1-${d.row}=${d.y}`,
    ]),
  ];
}

// ---------------------------------------------------------------------------------------------- verdict
export function pixelVerdict(d: PixelDerived): string {
  const base = `The image is ${d.w} pixels wide and ${d.h} tall. The point (x, y) = (${d.x}, ${d.y}) is in column ${d.col}, and row ${d.row} counted from the TOP, so it is img[${d.row}, ${d.col}], flat index ${d.row} · ${d.w} + ${d.col} = ${d.index}.`;
  const slip = d.naiveRowInRange
    ? ` The slip H − y = ${d.naiveRow} would read the pixel one row lower.`
    : ` The slip H − y = ${d.naiveRow} is not even a row: the bottom row y = 0 is row ${d.h - 1}, and img[${d.naiveRow}, …] raises an IndexError.`;
  return base + slip;
}

// ---------------------------------------------------------------------------------------------- scene
export interface PixelScene {
  readonly p: Point;
  /** The whole image rectangle (cell borders are at half-integers). */
  readonly image: readonly [Point, Point, Point, Point];
  readonly cell: readonly [Point, Point, Point, Point];
  readonly verticals: readonly number[];
  readonly horizontals: readonly number[];
  /** One label per lattice row, at the right edge of the image: row k is the lattice line y = H − 1 − k. */
  readonly rowLabels: ReadonlyArray<{ readonly row: number; readonly at: Point }>;
}

export function pixelScene(d: PixelDerived): PixelScene {
  const p = { x: d.x, y: d.y };
  const range = (n: number) => Array.from({ length: n + 1 }, (_, i) => i - 0.5);
  return {
    p,
    image: [{ x: -0.5, y: -0.5 }, { x: d.w - 0.5, y: -0.5 }, { x: d.w - 0.5, y: d.h - 0.5 }, { x: -0.5, y: d.h - 0.5 }],
    cell: [{ x: d.x - 0.5, y: d.y - 0.5 }, { x: d.x + 0.5, y: d.y - 0.5 }, { x: d.x + 0.5, y: d.y + 0.5 }, { x: d.x - 0.5, y: d.y + 0.5 }],
    verticals: range(d.w),
    horizontals: range(d.h),
    rowLabels: Array.from({ length: d.h }, (_, row) => ({ row, at: { x: d.w - 0.5, y: yOfRow(d.h, row) } })),
  };
}

// ---------------------------------------------------------------------------------------------- table
/** The cells of the array table, from the model: row 0 first (the top row), each with the lattice point it stands for. */
export const pixelCells = (d: PixelDerived): LatticeCell[][] => latticeCells(d);

// ---------------------------------------------------------------------------------------------- text alternatives
export function pixelDescription(d: PixelDerived): string {
  return `The pixel grid of an image ${d.w} wide and ${d.h} tall drawn as a coordinate plane with y up. The selected pixel is at x = ${d.x}, y = ${d.y}, which is column ${d.col} and row ${d.row} counted from the top. The bottom row is y = 0.`;
}
export const pixelSpoken = (d: PixelDerived): string => `x ${d.x}, y ${d.y} is row ${d.row}, column ${d.col}, flat index ${d.index} in an image ${d.w} wide and ${d.h} tall.`;
export const pixelLabel = (d: PixelDerived): string => `Pixel at x = ${d.x}, y = ${d.y}: row ${d.row}, column ${d.col}.`;
