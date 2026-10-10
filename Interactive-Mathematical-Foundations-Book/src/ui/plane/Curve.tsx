/**
 * Curve and PointMarker — plane primitives for function graphs. Polylines are WORLD-space (precomputed by `sampleCurve` and memoised by the
 * caller on the function's parameters); the viewport converts them. `PointMarker` draws a point with an OPEN or FILLED head, the
 * convention used for excluded/included endpoints.
 */
import { worldToScreen, type Point } from '../../platform/geometry/viewport';
import type { Polyline } from '../../platform/geometry/curve';
import { usePlane } from './PlaneContext';
import type { Role } from './primitives';

export function Curve({ lines, role, dashed = false, width = 3, name }: { lines: readonly Polyline[]; role: Role; dashed?: boolean; width?: number; name?: string }) {
  const { vp } = usePlane();
  const d = lines
    .map(line => line.map((p, i) => { const s = worldToScreen(vp, p); return `${i === 0 ? 'M' : 'L'}${s.x.toFixed(2)} ${s.y.toFixed(2)}`; }).join(' '))
    .join(' ');
  if (!d) return null;
  return <path class={`stroke role-${role}${dashed ? ' dashed' : ''}`} data-part={name} d={d} fill="none" stroke-width={width} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" />;
}

export function PointMarker({ at, role, filled = true, radius = 5.5, name }: { at: Point; role: Role; filled?: boolean; radius?: number; name?: string }) {
  const { vp } = usePlane();
  const p = worldToScreen(vp, at);
  return <circle class={`marker role-${role}${filled ? ' is-filled' : ' is-open'}`} data-part={name} data-filled={filled} cx={p.x} cy={p.y} r={radius} aria-hidden="true" />;
}
