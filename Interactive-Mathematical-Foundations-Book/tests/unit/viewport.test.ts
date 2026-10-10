import { describe, expect, it } from 'vitest';
import { arcPoints, fitViewport, niceTickStep, pixelsToWorld, screenToWorld, tickPositions, visibleWorld, worldToScreen } from '../../src/platform/geometry/viewport';

const WINDOW = { xMin: -7, xMax: 7, yMin: -7, yMax: 7 };

/** Deterministic PRNG so property tests are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('fitViewport / worldToScreen — the single place y is flipped', () => {
  const vp = fitViewport(WINDOW, { width: 560, height: 560 });
  it('has scale 40 px per unit and the origin at the centre', () => {
    expect(vp.scale).toBe(40);
    expect(worldToScreen(vp, { x: 0, y: 0 })).toEqual({ x: 280, y: 280 });
  });
  it('maps (3, 2) to the right of and ABOVE the origin on screen', () => {
    const p = worldToScreen(vp, { x: 3, y: 2 });
    expect(p).toEqual({ x: 400, y: 200 });
    expect(p.x).toBeGreaterThan(280);
    expect(p.y).toBeLessThan(280); // +y is up, so screen y decreases
  });
  it('maps the four window corners to the four canvas corners', () => {
    expect(worldToScreen(vp, { x: -7, y: 7 })).toEqual({ x: 0, y: 0 });
    expect(worldToScreen(vp, { x: 7, y: -7 })).toEqual({ x: 560, y: 560 });
  });
  it('round-trips random points (screen → world → screen and world → screen → world)', () => {
    const rnd = mulberry32(1);
    for (let i = 0; i < 500; i++) {
      const w = { x: (rnd() - 0.5) * 20, y: (rnd() - 0.5) * 20 };
      const back = screenToWorld(vp, worldToScreen(vp, w));
      expect(back.x).toBeCloseTo(w.x, 12);
      expect(back.y).toBeCloseTo(w.y, 12);
    }
  });
  it('uses ONE scale on both axes: lengths scale uniformly and perpendicular stays perpendicular', () => {
    const rnd = mulberry32(2);
    for (let i = 0; i < 200; i++) {
      const a = { x: rnd() * 6 - 3, y: rnd() * 6 - 3 };
      const dx = rnd() * 4 + 0.5;
      const dy = rnd() * 4 + 0.5;
      // world segments u = (dx, 0) and v = (0, dy) are perpendicular
      const o = worldToScreen(vp, a);
      const u = worldToScreen(vp, { x: a.x + dx, y: a.y });
      const v = worldToScreen(vp, { x: a.x, y: a.y + dy });
      expect(Math.hypot(u.x - o.x, u.y - o.y)).toBeCloseTo(dx * vp.scale, 10);
      expect(Math.hypot(v.x - o.x, v.y - o.y)).toBeCloseTo(dy * vp.scale, 10);
      expect((u.x - o.x) * (v.x - o.x) + (u.y - o.y) * (v.y - o.y)).toBeCloseTo(0, 8);
    }
  });
  it('non-square canvases keep the aspect ratio and reveal more world on the longer axis', () => {
    const wide = fitViewport(WINDOW, { width: 800, height: 400 });
    expect(wide.scale).toBeCloseTo(400 / 14, 12);
    const seen = visibleWorld(wide);
    expect(seen.yMin).toBeCloseTo(-7, 12);
    expect(seen.yMax).toBeCloseTo(7, 12);
    expect(seen.xMin).toBeLessThan(-7);
    expect(seen.xMax).toBeGreaterThan(7);
    expect(worldToScreen(wide, { x: 0, y: 0 })).toEqual({ x: 400, y: 200 });
  });
  it('rejects degenerate windows and sizes', () => {
    expect(() => fitViewport({ xMin: 1, xMax: 1, yMin: 0, yMax: 1 }, { width: 10, height: 10 })).toThrow(RangeError);
    expect(() => fitViewport(WINDOW, { width: 0, height: 10 })).toThrow(RangeError);
  });
  it('pixelsToWorld is the inverse of scaling a length', () => {
    expect(pixelsToWorld(vp, 40)).toBe(1);
  });
});

describe('arcPoints — angles are WORLD angles', () => {
  const vp = fitViewport(WINDOW, { width: 560, height: 560 });
  it('starts on +x and a quarter turn later ends straight UP on screen', () => {
    const pts = arcPoints(vp, { x: 0, y: 0 }, 40, 0, Math.PI / 2, 8);
    expect(pts[0]).toEqual({ x: 320, y: 280 });
    const end = pts[pts.length - 1]!;
    expect(end.x).toBeCloseTo(280, 9);
    expect(end.y).toBeCloseTo(240, 9);
  });
  it('a negative sweep goes below the axis', () => {
    const pts = arcPoints(vp, { x: 0, y: 0 }, 40, 0, -Math.PI / 2, 8);
    expect(pts[pts.length - 1]!.y).toBeCloseTo(320, 9);
  });
  it('every point lies at the requested pixel radius from the centre', () => {
    for (const p of arcPoints(vp, { x: 1, y: 1 }, 33, 0.3, 2.1, 20)) {
      const c = worldToScreen(vp, { x: 1, y: 1 });
      expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeCloseTo(33, 9);
    }
  });
});

describe('ticks', () => {
  it('chooses 1-2-5 steps with at least the requested pixel spacing', () => {
    expect(niceTickStep(40, 30)).toBe(1);
    expect(niceTickStep(24, 30)).toBe(2);
    expect(niceTickStep(100, 30)).toBe(0.5);
    for (const ppu of [8, 17, 24, 40, 63, 100, 333]) expect(niceTickStep(ppu, 30) * ppu).toBeGreaterThanOrEqual(30 - 1e-9);
  });
  it('produces exact multiples without drift, and never −0', () => {
    expect(tickPositions(-7, 7, 1)).toHaveLength(15);
    expect(tickPositions(-1, 1, 0.5)).toEqual([-1, -0.5, 0, 0.5, 1]);
    const zero = tickPositions(-2, 2, 1)[2]!;
    expect(Object.is(zero, 0)).toBe(true);
    expect(tickPositions(0, 1, 0.1)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  });
});
