/** Small values shared by the I.9 stages. */
import type { Grid } from '../../platform/params';

/** A free grid: a typed value is never snapped, and an arrow press moves by the parameter's own step. */
export const GRID_FREE: Grid = { kind: 'free' };
