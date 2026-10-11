/** Named two-variable polynomial surfaces and vector maps for III.7–III.9 and III.11 (fixed vocabulary, exact coefficients). */
import { poly2, type Poly2 } from './bivariate';
import { r } from './univariate';

export interface Surface {
  readonly id: string; readonly label: string; readonly f: Poly2;
  /** Height range used for slice plots. */
  readonly z: readonly [number, number];
  /** Level values drawn as contours. */
  readonly levels: readonly number[];
  /** Gradient arrows are drawn at this declared scale so they fit the plane. */
  readonly arrowScale: number;
}
const lv = (from: number, to: number, step: number) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, k) => from + k * step);
export const SURFACES: Readonly<Record<string, Surface>> = {
  bowl: { id: 'bowl', label: 'Bowl x² + y²', f: poly2([2, 0, 1], [0, 2, 1]), z: [-1, 7], levels: lv(0.5, 6, 0.5).concat([0.125]), arrowScale: 0.25 },
  elliptic: { id: 'elliptic', label: 'Valley x²/2 + 2y²', f: poly2([2, 0, r(1, 2)], [0, 2, 2]), z: [-1, 7], levels: lv(0.5, 6, 0.5), arrowScale: 0.25 },
  saddle: { id: 'saddle', label: 'Saddle x² − y²', f: poly2([2, 0, 1], [0, 2, -1]), z: [-4, 4], levels: lv(-4, 4, 0.5), arrowScale: 0.25 },
  product: { id: 'product', label: 'Product xy', f: poly2([1, 1, 1]), z: [-4, 4], levels: lv(-4, 4, 0.5), arrowScale: 0.4 },
  cap: { id: 'cap', label: 'Cap −x² − y²', f: poly2([2, 0, -1], [0, 2, -1]), z: [-7, 1], levels: lv(-6, -0.5, 0.5), arrowScale: 0.25 },
  plane: { id: 'plane', label: 'Tilted plane x + 2y', f: poly2([1, 0, 1], [0, 1, 2]), z: [-6, 6], levels: lv(-6, 6, 1), arrowScale: 0.5 },
  'double-well': { id: 'double-well', label: 'x³ − 3x + y²', f: poly2([3, 0, 1], [1, 0, -3], [0, 2, 1]), z: [-4, 6], levels: lv(-3, 5, 0.5), arrowScale: 0.2 },
  monkey: { id: 'monkey', label: 'Monkey saddle x³ − 3xy²', f: poly2([3, 0, 1], [1, 2, -3]), z: [-6, 6], levels: lv(-6, 6, 0.75), arrowScale: 0.15 },
  quartic: { id: 'quartic', label: 'Flat bottom x⁴ + y⁴', f: poly2([4, 0, 1], [0, 4, 1]), z: [-1, 7], levels: [0.02, 0.1, 0.25, 0.5, 1, 2, 3, 4, 6], arrowScale: 0.15 },
  'cubic-y': { id: 'cubic-y', label: 'x² + y³', f: poly2([2, 0, 1], [0, 3, 1]), z: [-4, 6], levels: lv(-3, 5, 0.5), arrowScale: 0.2 },
};

/** Vector-valued maps for III.9: each component an exact bivariate polynomial. */
export interface VectorMap { readonly id: string; readonly label: string; readonly components: readonly Poly2[]; readonly names: readonly string[] }
export const MAPS: Readonly<Record<string, VectorMap>> = {
  square: { id: 'square', label: 'Complex square (x² − y², 2xy)', components: [poly2([2, 0, 1], [0, 2, -1]), poly2([1, 1, 2])], names: ['F₁', 'F₂'] },
  shear: { id: 'shear', label: 'Bend (x + y²/2, y)', components: [poly2([1, 0, 1], [0, 2, r(1, 2)]), poly2([0, 1, 1])], names: ['F₁', 'F₂'] },
  linear: { id: 'linear', label: 'Linear (2x + y, x − y)', components: [poly2([1, 0, 2], [0, 1, 1]), poly2([1, 0, 1], [0, 1, -1])], names: ['F₁', 'F₂'] },
  lift: { id: 'lift', label: 'Lift to 3D (x, y, xy)', components: [poly2([1, 0, 1]), poly2([0, 1, 1]), poly2([1, 1, 1])], names: ['F₁', 'F₂', 'F₃'] },
};
