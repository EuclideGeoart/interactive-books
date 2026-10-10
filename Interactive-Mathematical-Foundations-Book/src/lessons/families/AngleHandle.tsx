/**
 * AngleHandle — the draggable point on the unit circle. A chapter-local twin of the platform's `DragPoint`, because a point that is
 * constrained to a circle has ONE degree of freedom (the angle): the pointer maps to the angle through `angleTowards`, the arrow keys
 * map to `stepAngle`, and the numeric inputs elsewhere in the stage are the third, equivalent path.
 *
 * The markup and classes are DragPoint's (`drag-point`, a 48 px `.hit`, `data-handle`), so the shared styling, the generic touch-target
 * and name checks, and the focus ring all apply unchanged. Left / Down turn clockwise, Right / Up turn counter-clockwise; Shift is coarse.
 */
import { useRef, useState } from 'preact/hooks';
import { angleTowards, stepAngle, type CircleState } from '../../math/families/circle';
import { screenToWorld, worldToScreen, type Point } from '../../platform/geometry/viewport';
import { usePlane } from '../../ui/plane/PlaneContext';
import type { Role } from '../../ui/plane/primitives';

export interface AngleHandleProps {
  /** Where the handle sits (the point (cos θ, sin θ) from the model). */
  at: Point;
  state: CircleState;
  snap: 'exact' | 'free';
  label: string;
  hintId: string;
  role?: Role;
  onChange(next: CircleState): void;
  onCommit?(next: CircleState): void;
}

const KEYS: Record<string, -1 | 1> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };

export function AngleHandle({ at, state, snap, label, hintId, role = 'primary', onChange, onCommit }: AngleHandleProps) {
  const { vp, svgRef } = usePlane();
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const latest = useRef(state);
  latest.current = state;
  const screen = worldToScreen(vp, at);

  const toWorld = (event: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    return screenToWorld(vp, { x: ((event.clientX - box.left) * vp.width) / box.width, y: ((event.clientY - box.top) * vp.height) / box.height });
  };
  const apply = (next: CircleState) => {
    const now = latest.current;
    if (next.mode === now.mode && next.twelfths === now.twelfths && next.radians === now.radians) return now;
    latest.current = next;
    onChange(next);
    return next;
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.currentTarget as SVGGElement;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    target.focus({ preventScroll: true });
    active.current = true;
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!active.current) return;
    const p = toWorld(event);
    if (!p) return;
    const next = angleTowards(latest.current, p, snap);
    if (next) apply(next);
  };
  const endDrag = (event: PointerEvent) => {
    const target = event.currentTarget as SVGGElement;
    if (!active.current) return;
    active.current = false;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    setDragging(false);
    onCommit?.(latest.current);
  };
  const preventPageScroll = (event: TouchEvent) => { if (event.cancelable) event.preventDefault(); };
  const onKeyDown = (event: KeyboardEvent) => {
    const direction = KEYS[event.key];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    onCommit?.(apply(stepAngle(latest.current, direction, event.shiftKey)));
  };

  return (
    <g
      class={`drag-point role-${role}${dragging ? ' is-dragging' : ''}`}
      transform={`translate(${screen.x} ${screen.y})`}
      role="button"
      tabIndex={0}
      aria-roledescription="angle handle"
      aria-label={label}
      aria-describedby={hintId}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown"
      data-handle
      data-world-x={at.x}
      data-world-y={at.y}
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
