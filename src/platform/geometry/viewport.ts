/**
 * World ↔ screen transform (master plan §3.1, §6.7, §7.3).
 *
 * Three coordinate systems are kept apart:
 *   1. world   — mathematical coordinates: +x right, +y UP. All lesson mathematics lives here.
 *   2. window  — the rectangle of the world a diagram *wants* to show.
 *   3. screen  — SVG user units, +y DOWN. In this module 1 unit = 1 CSS pixel.
 *
 * `worldToScreen` and `screenToWorld` are the ONLY functions that negate y. Nothing else in the code base
 * may flip it. The scale is a single number, so axes can never be stretched: perpendicular world vectors
 * always look perpendicular.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The part of the mathematical plane a diagram wants to be visible. */
export interface WorldWindow {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
  /** Screen pixels per world unit. Uniform on both axes by construction. */
  readonly scale: number;
  /** Screen position of the world origin (0, 0). */
  readonly originX: number;
  readonly originY: number;
}

/** Largest uniform scale that shows the whole `window` inside `size`, centred. */
export function fitViewport(window: WorldWindow, size: Size): Viewport {
  const worldWidth = window.xMax - window.xMin;
  const worldHeight = window.yMax - window.yMin;
  if (!(worldWidth > 0 && worldHeight > 0)) throw new RangeError('World window must have positive width and height');
  if (!(size.width > 0 && size.height > 0)) throw new RangeError('Screen size must have positive width and height');
  const scale = Math.min(size.width / worldWidth, size.height / worldHeight);
  const centreX = (window.xMin + window.xMax) / 2;
  const centreY = (window.yMin + window.yMax) / 2;
  return {
    width: size.width,
    height: size.height,
    scale,
    originX: size.width / 2 - centreX * scale,
    originY: size.height / 2 + centreY * scale, // the y-flip, part 1
  };
}

export function worldToScreen(vp: Viewport, p: Point): Point {
  return { x: vp.originX + p.x * vp.scale, y: vp.originY - p.y * vp.scale }; // the y-flip, part 2
}

export function screenToWorld(vp: Viewport, p: Point): Point {
  return { x: (p.x - vp.originX) / vp.scale, y: (vp.originY - p.y) / vp.scale };
}

/** The world rectangle that is actually visible (may exceed the requested window on one axis). */
export function visibleWorld(vp: Viewport): WorldWindow {
  const topLeft = screenToWorld(vp, { x: 0, y: 0 });
  const bottomRight = screenToWorld(vp, { x: vp.width, y: vp.height });
  return { xMin: topLeft.x, xMax: bottomRight.x, yMin: bottomRight.y, yMax: topLeft.y };
}

/** Convert a length in pixels to world units (for offsets that must stay constant on screen). */
export const pixelsToWorld = (vp: Viewport, pixels: number): number => pixels / vp.scale;

/**
 * Points of a circular arc of radius `radiusPx` (screen pixels) around the world point `centre`, swept
 * from world angle `from` to `to` (radians, counter-clockwise positive). Angles are WORLD angles; the
 * screen flip happens inside `worldToScreen`.
 */
export function arcPoints(vp: Viewport, centre: Point, radiusPx: number, from: number, to: number, segments = 32): Point[] {
  const radiusWorld = pixelsToWorld(vp, radiusPx);
  const out: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = from + ((to - from) * i) / segments;
    out.push(worldToScreen(vp, { x: centre.x + radiusWorld * Math.cos(angle), y: centre.y + radiusWorld * Math.sin(angle) }));
  }
  return out;
}

/** A "nice" tick step (1, 2, 5 × 10ᵏ world units) whose spacing is at least `minPixels` on screen. */
export function niceTickStep(pixelsPerUnit: number, minPixels = 30): number {
  const raw = minPixels / pixelsPerUnit;
  const exponent = Math.floor(Math.log10(raw));
  const base = 10 ** exponent;
  for (const m of [1, 2, 5, 10]) if (m * base >= raw) return m * base;
  return 10 * base;
}

/** Tick positions k·step within [min, max], computed from integers so no floating-point drift accumulates. */
export function tickPositions(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  for (let k = Math.ceil(min / step - 1e-9); k <= Math.floor(max / step + 1e-9); k++) {
    out.push(Number((k * step).toFixed(decimals)) + 0); // `+ 0` turns −0 into +0
  }
  return out;
}
