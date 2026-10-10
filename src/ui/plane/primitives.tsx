/**
 * Plane primitives. Every prop that names a position is in WORLD coordinates (y up). Only the `dx`/`dy`
 * label offsets are screen pixels, and are documented as such: they place text, they are not mathematics.
 */
import type { ComponentChildren } from 'preact';
import { arcPoints, worldToScreen, type Point } from '../../platform/geometry/viewport';
import { usePlane } from './PlaneContext';

export type Role = 'primary' | 'x' | 'y' | 'derived' | 'caution';

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** A straight segment between two world points. */
export function Segment({ from, to, role, dashed = false, width = 3.5, name }: { from: Point; to: Point; role: Role; dashed?: boolean; width?: number; name?: string }) {
  const { vp } = usePlane();
  const a = worldToScreen(vp, from);
  const b = worldToScreen(vp, to);
  if (dist(a, b) < 0.5) return null;
  return <line class={`stroke role-${role}${dashed ? ' dashed' : ''}`} data-part={name} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke-width={width} stroke-linecap="round" aria-hidden="true" />;
}

/** An arrow from one world point to another; the head is sized in pixels and shrinks for short arrows. */
export function Arrow({ from, to, role, width = 4, name }: { from: Point; to: Point; role: Role; width?: number; name?: string }) {
  const { vp } = usePlane();
  const a = worldToScreen(vp, from);
  const b = worldToScreen(vp, to);
  const length = dist(a, b);
  if (length < 1) return null;
  const head = Math.min(16, length * 0.6);
  const half = head * 0.38;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  const base = { x: b.x - ux * head, y: b.y - uy * head };
  const shaftEnd = { x: b.x - ux * head * 0.7, y: b.y - uy * head * 0.7 };
  return (
    <g class={`role-${role}`} data-part={name} aria-hidden="true">
      <line class="stroke" x1={a.x} y1={a.y} x2={shaftEnd.x} y2={shaftEnd.y} stroke-width={width} stroke-linecap="round" />
      <path class="fill" d={`M${b.x} ${b.y} L${base.x - uy * half} ${base.y + ux * half} L${base.x + uy * half} ${base.y - ux * half} Z`} />
    </g>
  );
}

/**
 * Right-angle marker at `corner` between the directions toward `towardA` and `towardB` (world points).
 * Directions are measured on screen via the viewport, so no y-flip happens here.
 */
export function RightAngle({ corner, towardA, towardB, size = 9 }: { corner: Point; towardA: Point; towardB: Point; size?: number }) {
  const { vp } = usePlane();
  const c = worldToScreen(vp, corner);
  const a = worldToScreen(vp, towardA);
  const b = worldToScreen(vp, towardB);
  const la = dist(c, a);
  const lb = dist(c, b);
  if (la < size * 2 || lb < size * 2) return null;
  const ua = { x: ((a.x - c.x) / la) * size, y: ((a.y - c.y) / la) * size };
  const ub = { x: ((b.x - c.x) / lb) * size, y: ((b.y - c.y) / lb) * size };
  return <path class="right-angle" d={`M${c.x + ua.x} ${c.y + ua.y} L${c.x + ua.x + ub.x} ${c.y + ua.y + ub.y} L${c.x + ub.x} ${c.y + ub.y}`} fill="none" aria-hidden="true" />;
}

/** A circular arc of `radiusPx` around a world point, between two WORLD angles (radians, counter-clockwise positive). */
export function Arc({ centre, radiusPx, from, to, role, name }: { centre: Point; radiusPx: number; from: number; to: number; role: Role; name?: string }) {
  const { vp } = usePlane();
  const points = arcPoints(vp, centre, radiusPx, from, to, 40);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return <path class={`stroke role-${role}`} data-part={name} d={d} fill="none" stroke-width={3} stroke-linecap="round" stroke-dasharray="0.1 6" aria-hidden="true" />;
}

/** Text anchored at a world point, nudged by `dx`/`dy` SCREEN pixels (+dy is down). */
export function PlaneLabel({ at, dx = 0, dy = 0, role, anchor = 'middle', math = false, name, children }: { at: Point; dx?: number; dy?: number; role?: Role; anchor?: 'start' | 'middle' | 'end'; math?: boolean; name?: string; children: ComponentChildren }) {
  const { vp } = usePlane();
  const p = worldToScreen(vp, at);
  return (
    <text class={`plane-label${role ? ` role-${role}` : ''}${math ? ' math' : ''}`} data-part={name} x={p.x + dx} y={p.y + dy} text-anchor={anchor} dominant-baseline="central" aria-hidden="true">
      {children}
    </text>
  );
}

/** A small filled dot at a world point (e.g. the origin). */
export function Dot({ at, radius = 3.5, role }: { at: Point; radius?: number; role?: Role }) {
  const { vp } = usePlane();
  const p = worldToScreen(vp, at);
  return <circle class={`dot${role ? ` role-${role}` : ''}`} cx={p.x} cy={p.y} r={radius} aria-hidden="true" />;
}

export type DimensionSide = 'above' | 'below' | 'left' | 'right';
const SIDE_OFFSET: Record<DimensionSide, Point> = { above: { x: 0, y: -1 }, below: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/**
 * A drafting-style dimension line: a thin line parallel to the measured segment, offset `distance` SCREEN
 * pixels to one side, with end ticks and an interrupting label. It keeps a measurement's label out of the
 * figure itself (no collisions with the arrow, the angle arc or the axis numerals). `from`/`to` are world points;
 * the offset direction is a screen-side name, because it positions annotation — it is not mathematics.
 */
export function DimensionLine({ from, to, side, distance, role, label, labelMinPx = 0, name }: { from: Point; to: Point; side: DimensionSide; distance: number; role: Role; label?: ComponentChildren; labelMinPx?: number; name?: string }) {
  const { vp } = usePlane();
  const a = worldToScreen(vp, from);
  const b = worldToScreen(vp, to);
  const length = dist(a, b);
  if (length < 14) return null;
  const o = SIDE_OFFSET[side];
  const p = { x: a.x + o.x * distance, y: a.y + o.y * distance };
  const q = { x: b.x + o.x * distance, y: b.y + o.y * distance };
  // End ticks run PERPENDICULAR to the dimension line: vertical ticks on a horizontal line, horizontal on a vertical one.
  const tick = 5;
  const horizontalLine = side === 'above' || side === 'below';
  const tx = horizontalLine ? 0 : tick;
  const ty = horizontalLine ? tick : 0;
  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  return (
    <g class={`dimension role-${role}`} data-part={name} aria-hidden="true">
      <line class="stroke" x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke-width={1.4} />
      <path class="stroke" d={`M${p.x - tx} ${p.y - ty}L${p.x + tx} ${p.y + ty}M${q.x - tx} ${q.y - ty}L${q.x + tx} ${q.y + ty}`} stroke-width={1.4} stroke-linecap="round" />
      {label && length >= labelMinPx && (
        <text class="plane-label math" x={mid.x} y={mid.y} text-anchor="middle" dominant-baseline="central">{label}</text>
      )}
    </g>
  );
}
