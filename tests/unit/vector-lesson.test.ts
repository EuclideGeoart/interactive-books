import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexMacros } from '../../src/math/katex-macros.mjs';
import { deriveVector2 } from '../../src/math/vector2/vector2';
import { CANONICAL_VECTOR, WINDOW, X_PARAM, Y_PARAM, formulaChain, inspectorRows, sceneOf, spokenSummary, workFrames } from '../../src/lessons/foundation/vector-lesson';
import { fitViewport, worldToScreen } from '../../src/platform/geometry/viewport';
import { MINUS } from '../../src/platform/numeric/format';

const derive = (x: number, y: number) => deriveVector2({ x, y });
const row = (x: number, y: number, id: string) => inspectorRows(derive(x, y)).find(r => r.id === id)!;
const texOf = (r: ReturnType<typeof row>) => r.description.lines.map(l => `${l.relation}${l.text}`);

describe('conventions', () => {
  it('the canonical state is v = (3, 2) and the parameter domains contain it', () => {
    expect(CANONICAL_VECTOR).toEqual({ x: 3, y: 2 });
    for (const [spec, value] of [[X_PARAM, 3], [Y_PARAM, 2]] as const) {
      expect(spec.default).toBe(value);
      expect(spec.domain.min).toBeLessThan(value);
      expect(spec.domain.max).toBeGreaterThan(value);
      expect(spec.domain.max).toBeLessThan(WINDOW.xMax); // the endpoint can never sit on the plane's edge
    }
  });
});

describe('inspector rows — plan §15.3 required live values for (3, 2)', () => {
  it('vector, x, y, magnitude (exact + approximate), angle in radians, angle in degrees', () => {
    const rows = inspectorRows(derive(3, 2));
    expect(rows.map(r => r.id)).toEqual(['vector', 'x', 'y', 'magnitude', 'direction', 'direction-degrees']);
    expect(texOf(row(3, 2, 'vector'))).toEqual(['=(3, 2)']);
    expect(texOf(row(3, 2, 'x'))).toEqual(['=3']);
    expect(texOf(row(3, 2, 'y'))).toEqual(['=2']);
    expect(texOf(row(3, 2, 'magnitude'))).toEqual(['=√13', '≈3.605551…']);
    expect(texOf(row(3, 2, 'direction'))).toEqual(['≈0.588003 rad']);
    expect(texOf(row(3, 2, 'direction-degrees'))).toEqual(['≈33.690068°']); // the degree sign attaches to the number
  });
  it('Pythagorean state (3, 4): magnitude is exactly 5, with no approximation line', () => {
    expect(texOf(row(3, 4, 'magnitude'))).toEqual(['=5']);
  });
  it('(1, 1) → √2 and (2, 2) → 2√2', () => {
    expect(texOf(row(1, 1, 'magnitude'))[0]).toBe('=√2');
    expect(texOf(row(2, 2, 'magnitude'))[0]).toBe('=2√2');
  });
  it('non-integer state: magnitude is "≈" only — no exact form is claimed', () => {
    const lines = row(2.5, 1.5, 'magnitude').description.lines;
    expect(lines).toHaveLength(1);
    expect(lines[0]!.relation).toBe('≈');
  });
  it('the zero vector: magnitude 0, direction UNDEFINED (not 0) in both units', () => {
    expect(texOf(row(0, 0, 'magnitude'))).toEqual(['=0']);
    for (const id of ['direction', 'direction-degrees']) {
      const r = row(0, 0, id);
      expect(r.description.status).toBe('undefined');
      expect(texOf(r)).toEqual(['=undefined']);
      expect(r.description.note).toBe('The zero vector has no direction.');
    }
  });
  it('negative components use U+2212 and never display −0', () => {
    expect(texOf(row(-3, -2, 'vector'))).toEqual([`=(${MINUS}3, ${MINUS}2)`]);
    const z = texOf(row(-0, 5, 'x'));
    expect(z).toEqual(['=0']);
  });
  it('axis-aligned angles: +x is 0 rad, −x is π rad (3.141593), −y is −π/2', () => {
    expect(texOf(row(5, 0, 'direction'))).toEqual(['0 rad'.replace(/^/, '≈')]);
    expect(texOf(row(-5, 0, 'direction'))).toEqual(['≈3.141593 rad']);
    expect(texOf(row(0, -5, 'direction'))).toEqual([`≈${MINUS}1.570796 rad`]);
  });
});

describe('formula chain reads the same derived values as the inspector', () => {
  it('(3, 2): the column vector, then ‖v‖ and θ as aligned derivations', () => {
    expect(formulaChain(derive(3, 2))).toEqual([
      '\\mathbf{v}=\\begin{bmatrix}3\\\\2\\end{bmatrix}',
      '\\begin{aligned}\\norm{\\mathbf{v}}&=\\sqrt{x^{2}+y^{2}}\\\\&=\\sqrt{3^{2}+2^{2}}\\\\&=\\sqrt{13}\\\\&\\approx 3.605551\\ldots\\end{aligned}',
      '\\begin{aligned}\\theta&=\\atantwo(y,x)\\\\&=\\atantwo(2,3)\\\\&\\approx 0.588003\\ \\mathrm{rad}\\\\&\\approx 33.690068^{\\circ}\\end{aligned}',
    ]);
  });
  it('(3, 4) simplifies √25 to 5 and has no approximation line', () => {
    expect(formulaChain(derive(3, 4))[1]).toBe('\\begin{aligned}\\norm{\\mathbf{v}}&=\\sqrt{x^{2}+y^{2}}\\\\&=\\sqrt{3^{2}+4^{2}}\\\\&=\\sqrt{25}\\\\&=5\\end{aligned}');
  });
  it('(2, 2) shows √8 = 2√2 and then the approximation', () => {
    expect(formulaChain(derive(2, 2))[1]).toContain('&=\\sqrt{8}\\\\&=2\\sqrt{2}\\\\&\\approx 2.828427\\ldots');
  });
  it('negative components are parenthesised before squaring', () => {
    expect(formulaChain(derive(-3, -2))[1]).toContain('\\sqrt{(-3)^{2}+(-2)^{2}}');
  });
  it('zero vector: the direction line says it is undefined', () => {
    expect(formulaChain(derive(0, 0))[2]).toContain('\\text{undefined: the zero vector has no direction}');
    expect(formulaChain(derive(0, 0))[2]).not.toContain('\\approx');
  });
  it('every formula for 3000 states (grid, decimals, extremes, zero) renders in KaTeX without error (strict)', () => {
    const states: [number, number][] = [[0, 0], [-0, -0], [6, -6], [-6, 6], [0.1, 0.2], [1e-7, -1e-7], [5.999999, 0.000001], [2.5, 1.5]];
    for (let x = -6; x <= 6; x += 0.5) for (let y = -6; y <= 6; y += 0.5) states.push([x, y]);
    for (let i = 0; i < 2300; i++) states.push([Math.round((Math.sin(i * 12.9898) * 6) * 10) / 10, Math.round((Math.cos(i * 78.233) * 6) * 10) / 10]);
    for (const [x, y] of states) {
      const d = derive(x, y);
      const all = [...formulaChain(d), ...workFrames(d).map(f => f.state.tex), ...inspectorRows(d).flatMap(r => [r.symbolTex, ...r.description.lines.map(l => l.tex)])];
      for (const tex of all) {
        expect(() => katex.renderToString(tex, { throwOnError: true, strict: 'error', macros: katexMacros(), output: 'htmlAndMathml' }), `${x},${y}: ${tex}`).not.toThrow();
      }
    }
  });
});

describe('world-space scene is the model (formula ↔ visual identity, plan §2.3)', () => {
  it('(3, 2): handle and arrow tip are at (3, 2); legs run along the axis then up; the arc ends at the model angle', () => {
    const d = derive(3, 2);
    const s = sceneOf(d);
    expect(s.handle).toEqual({ x: 3, y: 2 });
    expect(s.arrow).toEqual({ from: { x: 0, y: 0 }, to: { x: 3, y: 2 } });
    expect(s.xLeg).toEqual({ from: { x: 0, y: 0 }, to: { x: 3, y: 0 } });
    expect(s.yLeg).toEqual({ from: { x: 3, y: 0 }, to: { x: 3, y: 2 } });
    expect(s.corner).toEqual({ x: 3, y: 0 });
    expect(s.arc).toEqual({ from: 0, to: d.directionRadians });
  });
  it('the legs are perpendicular and the leg lengths are |x| and |y|', () => {
    for (const [x, y] of [[3, 2], [-4, 5], [0.5, -2.5]] as const) {
      const s = sceneOf(derive(x, y));
      expect(s.xLeg.to.x - s.xLeg.from.x).toBe(x);
      expect(s.yLeg.to.y - s.yLeg.from.y).toBe(y);
      expect((s.xLeg.to.x - s.xLeg.from.x) * (s.yLeg.to.x - s.yLeg.from.x) + (s.xLeg.to.y - s.xLeg.from.y) * (s.yLeg.to.y - s.yLeg.from.y)).toBe(0);
    }
  });
  it('the zero vector has no arrow and no angle arc (nothing fabricated), but the handle stays at the origin', () => {
    const s = sceneOf(derive(0, 0));
    expect(s.arrow).toBeNull();
    expect(s.arc).toBeNull();
    expect(s.handle).toEqual({ x: 0, y: 0 });
  });
  it('a vector on +x has no arc (angle exactly 0), but a vector on −x has one', () => {
    expect(sceneOf(derive(4, 0)).arc).toBeNull();
    expect(sceneOf(derive(-4, 0)).arc).toEqual({ from: 0, to: Math.PI });
  });
  it('through the viewport the handle lands where an independent formula says (x right, y up)', () => {
    const vp = fitViewport(WINDOW, { width: 700, height: 700 }); // 50 px per unit
    const p = worldToScreen(vp, sceneOf(derive(-4, 3)).handle);
    expect(p).toEqual({ x: 350 + -4 * 50, y: 350 - 3 * 50 });
  });
});

describe('spoken summary (plan §11.2)', () => {
  it('matches the specified wording for (3, 2)', () => {
    expect(spokenSummary(derive(3, 2))).toBe('Vector endpoint. x = 3, y = 2. Magnitude approximately 3.606. Angle approximately 0.588 radians.');
  });
  it('says exactly when the magnitude is an integer', () => {
    expect(spokenSummary(derive(3, 4))).toBe('Vector endpoint. x = 3, y = 4. Magnitude exactly 5. Angle approximately 0.927 radians.');
  });
  it('zero vector: direction undefined, with the reason', () => {
    expect(spokenSummary(derive(0, 0))).toBe('Vector endpoint. x = 0, y = 0. Magnitude exactly 0. Direction undefined: the zero vector has no direction.');
  });
  it('negative values are spoken as "minus"', () => {
    expect(spokenSummary(derive(-3, 2))).toContain('x = minus 3, y = 2');
  });
});

describe('work frames — a deterministic trace of ‖v‖', () => {
  it('has four frames: components → squares → sum → root', () => {
    const frames = workFrames(derive(3, 2));
    expect(frames.map(f => f.index)).toEqual([0, 1, 2, 3]);
    expect(frames[1]!.state.tex).toBe('x^{2}=3^{2}=9,\\qquad y^{2}=2^{2}=4');
    expect(frames[2]!.state.tex).toBe('x^{2}+y^{2}=9+4=13');
    expect(frames[3]!.state.tex).toBe('\\norm{\\mathbf{v}}=\\sqrt{13}\\approx 3.605551\\ldots');
  });
  it('is a pure function of the state: same input, identical frames', () => {
    expect(workFrames(derive(-3, 2))).toEqual(workFrames(derive(-3, 2)));
  });
  it('non-integer states use ≈ (the squares are floating-point results), not =', () => {
    const f = workFrames(derive(2.5, 1.5));
    expect(f[1]!.state.tex).toContain('\\approx');
    expect(f[1]!.state.tex).toBe('x^{2}=2.5^{2}\\approx6.25,\\qquad y^{2}=1.5^{2}\\approx2.25');
  });
});
