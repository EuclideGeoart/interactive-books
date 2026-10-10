/**
 * DragPoint — a draggable point on a CoordinatePlane, with every input path equivalent (plan §11.1):
 *   pointer drag · arrow keys (Shift = 5× step) · the numeric inputs elsewhere in the stage.
 *
 * Accessibility (plan §11.2): focusable, named, exposes its current value and how to operate it. It is a
 * `button` with `aria-roledescription="draggable point"` rather than a slider, because a point has two
 * coordinates and a slider has one value; the dynamic label carries both.
 *
 * Touch: only this element sets `touch-action: none`; touching anywhere else on the plane still scrolls
 * the page. The visible handle is ~18 px, its hit target 48 px.
 *
 * Callbacks receive WORLD points. `onChange` fires only when the (snapped, clamped) value actually changes;
 * `onCommit` fires when a gesture ends (key press, pointer release) so callers can announce once.
 */
import { useRef, useState } from 'preact/hooks';
import { screenToWorld, worldToScreen, type Point } from '../../platform/geometry/viewport';
import { clampToDomain, snapToGrid, stepValue, type Grid, type ParamSpec } from '../../platform/params';
import { usePlane } from './PlaneContext';
import type { Role } from './primitives';

export type ChangeSource = 'pointer' | 'keyboard';

export interface DragPointProps {
  value: Point;
  xSpec: ParamSpec;
  ySpec: ParamSpec;
  grid: Grid;
  /** Accessible name, including the current value (rebuilt from the model by the caller). */
  label: string;
  /** Id of an element (rendered by the caller, outside the SVG) that explains how to operate the point. */
  hintId: string;
  role?: Role;
  onChange(next: Point, source: ChangeSource): void;
  /** Called once when a gesture ends, with the value the model now holds. */
  onCommit?(value: Point, source: ChangeSource): void;
}

const ARROWS: Record<string, { axis: 'x' | 'y'; direction: -1 | 1 }> = {
  ArrowLeft: { axis: 'x', direction: -1 },
  ArrowRight: { axis: 'x', direction: 1 },
  ArrowDown: { axis: 'y', direction: -1 },
  ArrowUp: { axis: 'y', direction: 1 }, // world y: up increases
};

export function DragPoint({ value, xSpec, ySpec, grid, label, hintId, role = 'primary', onChange, onCommit }: DragPointProps) {
  const { vp, svgRef } = usePlane();
  const [dragging, setDragging] = useState(false); // styling only
  const active = useRef(false); // the source of truth for gesture logic (pointerup and lostpointercapture both end a drag)
  const grabOffset = useRef<Point>({ x: 0, y: 0 });
  const latest = useRef(value); // the value after the most recent change, even before the next render
  latest.current = value;
  const screen = worldToScreen(vp, value);

  const toWorld = (event: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    return screenToWorld(vp, { x: ((event.clientX - box.left) * vp.width) / box.width, y: ((event.clientY - box.top) * vp.height) / box.height });
  };

  const apply = (target: Point, source: ChangeSource) => {
    const next = {
      x: snapToGrid(clampToDomain(target.x, xSpec.domain), grid),
      y: snapToGrid(clampToDomain(target.y, ySpec.domain), grid),
    };
    // Snapping can push a boundary value past the domain (e.g. 6.4 on a lattice of 1): clamp once more.
    next.x = clampToDomain(next.x, xSpec.domain);
    next.y = clampToDomain(next.y, ySpec.domain);
    if (next.x !== latest.current.x || next.y !== latest.current.y) {
      latest.current = next;
      onChange(next, source);
    }
    return latest.current;
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.currentTarget as SVGGElement;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const pointer = toWorld(event);
    if (!pointer) return;
    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    target.focus({ preventScroll: true });
    grabOffset.current = { x: pointer.x - value.x, y: pointer.y - value.y };
    active.current = true;
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!active.current) return;
    const pointer = toWorld(event);
    if (pointer) apply({ x: pointer.x - grabOffset.current.x, y: pointer.y - grabOffset.current.y }, 'pointer');
  };
  const endDrag = (event: PointerEvent) => {
    const target = event.currentTarget as SVGGElement;
    if (!active.current) return;
    active.current = false;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    setDragging(false);
    onCommit?.(latest.current, 'pointer');
  };
  // `touch-action: none` is not honoured on a bare SVG <g> in every browser, so cancel the touch's default (page
  // scroll / pan / zoom) explicitly — for touches that START on the handle only. Elsewhere on the plane a touch
  // still scrolls the page. Pointer events are unaffected, so the drag itself is handled by the pointer handlers.
  const preventPageScroll = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const arrow = ARROWS[event.key];
    if (!arrow || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const spec = arrow.axis === 'x' ? xSpec : ySpec;
    const stepped = stepValue(latest.current[arrow.axis], arrow.direction, spec, grid, event.shiftKey);
    onCommit?.(apply({ ...latest.current, [arrow.axis]: stepped }, 'keyboard'), 'keyboard');
  };

  return (
      <g
        class={`drag-point role-${role}${dragging ? ' is-dragging' : ''}`}
        transform={`translate(${screen.x} ${screen.y})`}
        role="button"
        tabIndex={0}
        aria-roledescription="draggable point"
        aria-label={label}
        aria-describedby={hintId}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown"
        data-handle
        data-world-x={value.x}
        data-world-y={value.y}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onTouchStart={preventPageScroll}
        onKeyDown={onKeyDown}
      >
        <circle class="hit" r={24} />
        <circle class="focus-ring" r={20} />
        <circle class="halo" r={14} />
        <circle class="ring" r={9.5} />
        <circle class="core" r={3.5} />
      </g>
  );
}
