/**
 * The I.6 view layer: every string the stages render is built from the model, so this file checks that
 *  - every LaTeX string survives strict KaTeX on the EDGE states (undefined, overflow, base 1, a = 0, every exact angle…), not just the canonical one,
 *  - the exactness policy shows up in the rows ("=" only for exact values, "≈" for doubles, an explicit note for overflow),
 *  - scenes depend only on what they should (curves never on x), and labels sit on their curves,
 *  - the worked traces contain independently known numbers.
 */
import { describe, expect, it } from 'vitest';
import { renderTex } from '../../src/platform/tex';
import { CANONICAL_COMPARE, FAMILY_IDS, deriveCompare, curveFn, type CompareState } from '../../src/math/families/families';
import { exactAngle, freeAngle, deriveCircle, switchMode, TWELFTHS_LIMIT, RADIANS_LIMIT } from '../../src/math/families/circle';
import { roundTrip } from '../../src/math/families/roundtrip';
import { deriveGrowth, type GrowthState } from '../../src/math/families/growth';
import { deriveIdentities } from '../../src/math/families/identities';
import {
  COMPARE_PRESETS, COMPARE_WINDOW, compareCurves, compareDescription, compareFacts, compareFormulas, compareMarkers, compareRows, compareSpoken, compareVerdict, curveKey, labelFor, lnGap, toggled, withFamilies, zeroMarkers,
} from '../../src/lessons/families/compare-lesson';
import { UNDO_PRESETS, undoClaimTex, undoDescription, undoFormula, undoLabels, undoPoints, undoRows, undoScene, undoSpoken, undoVerdict, offPlane } from '../../src/lessons/families/undo-lesson';
import { CIRCLE_PRESETS, circleDescription, circleFormulas, circleRows, circleScene, circleSpoken, circleVerdict, graphDescription, graphMarkers, trigGraphs, GRAPH_RANGE } from '../../src/lessons/families/circle-lesson';
import { GROWTH_PRESETS, GROWTH_WINDOW, growthDescription, growthFormulas, growthLabels, growthMarkers, growthRows, growthSpoken, growthVerdict, identityCards, identityFormula, identitySpoken, sampleBase } from '../../src/lessons/families/base-lesson';
import { WORKED_EXAMPLES, workedFrames } from '../../src/lessons/families/worked-lesson';
import { describeFamily, describeOverflow, describeStep, describeUnderflow, intervalText } from '../../src/lessons/families/view';
import { rat } from '../../src/math/families/rational';

const tex = (s: string) => expect(() => renderTex(s, true), s).not.toThrow();
const cmp = (over: Partial<CompareState>): CompareState => ({ ...CANONICAL_COMPARE, ...over });
const ALL = withFamilies(CANONICAL_COMPARE, FAMILY_IDS);

describe('compare stage', () => {
  it('curves depend on the visible set, a and h only: moving x never changes them, and the cache key ignores x', () => {
    const a = compareCurves(cmp({ x: -5 }));
    const b = compareCurves(cmp({ x: 4.75 }));
    expect(a).toEqual(b);
    expect(curveKey(cmp({ x: -5 }))).toBe(curveKey(cmp({ x: 4.75 })));
    expect(curveKey(cmp({ a: 2 }))).not.toBe(curveKey(cmp({})));
    expect(curveKey(cmp({ h: 1 }))).not.toBe(curveKey(cmp({})));
    expect(curveKey(toggled(CANONICAL_COMPARE, 'sin'))).not.toBe(curveKey(CANONICAL_COMPARE));
  });
  it('draws exactly the visible families, in the fixed family order', () => {
    expect(compareCurves(CANONICAL_COMPARE).map(c => c.id)).toEqual(['exp', 'ln', 'sin']);
    expect(compareCurves(ALL).map(c => c.id)).toEqual([...FAMILY_IDS]);
    expect(compareCurves(withFamilies(CANONICAL_COMPARE, [])).length).toBe(0);
  });
  it('every sampled point lies on the family function (the view draws what the model says)', () => {
    for (const c of compareCurves(ALL)) {
      const f = curveFn(c.id, 1, 0);
      for (const line of c.lines) for (const p of line.slice(0, 60)) if (Math.abs(p.y) < 100) expect(p.y).toBeCloseTo(f(p.x) as number, 9);
    }
  });
  it('a label sits ON its curve, inside the window, whenever the curve is visible there', () => {
    for (const a of [-3, -1.5, -0.25, 0.25, 1, 2, 3]) for (const h of [-4, -1.25, 0, 0.5, 3, 4]) for (const id of FAMILY_IDS) {
      const spot = labelFor(id, a, h);
      const f = curveFn(id, a, h);
      const visible = Array.from({ length: 49 }, (_, i) => -6 + i * 0.25).some(x => { const y = f(x); return y !== null && Math.abs(y) <= 6; });
      if (!visible) continue;
      expect(spot, `${id} a=${a} h=${h}`).not.toBeNull();
      expect(spot!.at.y).toBeCloseTo(f(spot!.at.x) as number, 12);
      expect(spot!.at.x).toBeGreaterThan(COMPARE_WINDOW.xMin);
      expect(spot!.at.x).toBeLessThan(COMPARE_WINDOW.xMax);
      expect(Math.abs(spot!.at.y)).toBeLessThanOrEqual(6);
    }
  });
  it('rows keep the exactness policy: "=" for exact values, "≈" for doubles, undefined with a reason for ln', () => {
    const d = deriveCompare(withFamilies(cmp({ x: 0, h: 0 }), FAMILY_IDS));
    const row = (id: string) => compareRows(d).find(r => r.id === id)!;
    expect(row('value-exp').description.lines[0]!.relation).toBe('='); // e⁰ = 1 exactly
    expect(row('value-linear').description.lines[0]!.relation).toBe('=');
    expect(row('value-ln').description.status).toBe('undefined');
    expect(row('value-ln').description.note).toMatch(/not positive/);
    const e = deriveCompare(cmp({ x: 1 }));
    expect(compareRows(e).find(r => r.id === 'value-exp')!.description.lines[0]!.relation).toBe('≈');
    expect(compareRows(e).find(r => r.id === 'value-ln')!.description.lines[0]!.text).toBe('0'); // ln 1 = 0 exactly
    expect(compareRows(e).find(r => r.id === 'value-ln')!.description.lines[0]!.relation).toBe('=');
    expect(compareRows(e).map(r => r.id)).toEqual(['x', 'u', 'value-exp', 'value-ln', 'value-sin']);
  });
  it('markers appear only for finite values inside the window, never for an undefined ln', () => {
    const d = deriveCompare(withFamilies(cmp({ x: -2 }), ['ln', 'exp']));
    expect(compareMarkers(d).map(m => m.id)).toEqual(['exp']);
    const big = deriveCompare(withFamilies(cmp({ x: 6, a: 3 }), ['exp']));
    expect(compareMarkers(big)).toEqual([]);
    expect(lnGap(deriveCompare(cmp({ h: 2 })))).toEqual({ from: { x: -7, y: 0 }, to: { x: 2, y: 0 } });
    expect(lnGap(deriveCompare(cmp({ h: -4 })))).toEqual({ from: { x: -7, y: 0 }, to: { x: -4, y: 0 } });
    expect(lnGap(deriveCompare(cmp({ h: -7 })))).toBeNull();
    expect(lnGap(deriveCompare(withFamilies(cmp({ h: 2 }), ['exp'])))).toBeNull();
  });
  it('the verdict names the undefined family and says why', () => {
    expect(compareVerdict(deriveCompare(cmp({ x: -1 }))).caution).toBe(true);
    expect(compareVerdict(deriveCompare(cmp({ x: -1 }))).text).toMatch(/ln has no value/);
    expect(compareVerdict(deriveCompare(cmp({ x: 2 }))).caution).toBe(false);
    expect(compareVerdict(deriveCompare(withFamilies(CANONICAL_COMPARE, []))).text).toMatch(/No family/);
  });
  it('every LaTeX string, fact and sentence is well-formed over the edge states', () => {
    let count = 0;
    for (const a of [-3, -0.25, 0, 1, 2.75]) for (const h of [-4, -1.5, 0, 0.25, 4]) for (const x of [-6, -1, 0, 1, 2, 6]) {
      const d = deriveCompare({ ...ALL, a, h, x });
      for (const f of compareFormulas(d)) { tex(f.tex); count++; }
      for (const card of compareFacts(d)) for (const r of card.rows) { expect(r.text.length).toBeGreaterThan(0); expect(r.text).not.toMatch(/NaN|undefined|\[object/); }
      for (const row of compareRows(d)) { tex(row.symbolTex); for (const l of row.description.lines) tex(l.tex); }
      expect(compareDescription(d).length).toBeGreaterThan(30);
      expect(compareSpoken(d)).not.toMatch(/NaN/);
      zeroMarkers(d);
    }
    expect(count).toBeGreaterThan(600);
  });
  it('facts read correctly for a known case: 2·ln(x − 1)', () => {
    const d = deriveCompare(withFamilies(cmp({ a: 2, h: 1, x: 5 }), ['ln']));
    const card = compareFacts(d)[0]!;
    const get = (label: string) => card.rows.find(r => r.label === label)!.text;
    expect(get('Domain')).toBe('x > 1');
    expect(get('Range')).toBe('all real numbers');
    expect(get('Zeros')).toBe('x = 2');
    expect(get('Asymptote')).toBe('the vertical line x = 1');
    expect(get('Behaviour')).toMatch(/increasing/);
    const sinus = compareFacts(deriveCompare(withFamilies(cmp({ a: 3, h: 0.5 }), ['sin'])))[0]!;
    expect(sinus.rows.find(r => r.label === 'Range')!.text).toBe('[−3, 3]');
    expect(sinus.rows.find(r => r.label === 'Zeros')!.text).toBe('x = 0.5 + kπ for every integer k');
    const square = compareFacts(deriveCompare(withFamilies(cmp({ a: -1 }), ['square'])))[0]!;
    expect(square.rows.find(r => r.label === 'Range')!.text).toBe('(−∞, 0]');
    expect(compareFacts(deriveCompare(withFamilies(cmp({ a: 0 }), ['exp'])))[0]!.rows.find(r => r.label === 'Zeros')!.text).toMatch(/every x/);
  });
  it('presets turn on exactly their families and every family has a preset somewhere', () => {
    for (const p of COMPARE_PRESETS) {
      const s = withFamilies(CANONICAL_COMPARE, p.on);
      expect(FAMILY_IDS.filter(id => s[id])).toEqual(FAMILY_IDS.filter(id => p.on.includes(id)));
    }
    expect(new Set(COMPARE_PRESETS.flatMap(p => p.on))).toEqual(new Set(FAMILY_IDS));
  });
});

describe('view helpers: overflow and underflow are described by hand, never as a plain "∞"', () => {
  it('overflow is "=" of the STORED double with a note naming the true value', () => {
    const o = describeOverflow();
    expect(o.status).toBe('not-finite');
    expect(o.lines).toEqual([{ relation: '=', text: '∞', tex: '\\infty' }]);
    expect(o.note).toMatch(/true value is finite but larger than the largest double/);
    const u = describeUnderflow();
    expect(u.lines[0]).toMatchObject({ relation: '=', text: '0' });
    expect(u.note).toMatch(/positive but smaller than the smallest double/);
    expect(describeFamily({ kind: 'overflow' })).toEqual(o);
    expect(describeStep({ kind: 'lost', reason: 'because' }).status).toBe('undefined');
  });
  it('interval text uses brackets for closed ends and parentheses for open ones', () => {
    expect(intervalText(null, null, true, true)).toBe('all real numbers');
    expect(intervalText(rat(0), null, true, true)).toBe('(0, ∞)');
    expect(intervalText(rat(-1), rat(1), false, false)).toBe('[−1, 1]');
    expect(intervalText(null, rat(0), true, false)).toBe('(−∞, 0]');
    expect(intervalText(rat(0), rat(0), false, false)).toBe('{0}');
  });
});

describe('undo stage', () => {
  const sweepX = [-800, -745.14, -745.13, -700, -3, -2, -0.5, 0, 0.5, 1, 1.5, 4, 5, 700, 709.78, 709.79, 800];
  it('formulas, claims, rows and sentences are well-formed for every pair, order and edge input', () => {
    for (const family of ['exp', 'square'] as const) for (const order of ['forward-first', 'inverse-first'] as const) for (const x of sweepX) {
      const rt = roundTrip({ family, order, x });
      tex(undoFormula(rt)); tex(undoClaimTex(rt));
      for (const r of undoRows(rt)) { tex(r.symbolTex); for (const l of r.description.lines) tex(l.tex); }
      expect(undoVerdict(rt).text.length).toBeGreaterThan(30);
      expect(undoSpoken(rt)).not.toMatch(/\.\.|\[object/);
      expect(undoDescription(rt, family).length).toBeGreaterThan(30);
    }
    for (const p of UNDO_PRESETS) tex(undoFormula(roundTrip(p.state)));
  });
  it('pins the overflow row: "=" ∞ as a stored double, with the note, and the lost second step', () => {
    const rt = roundTrip({ family: 'exp', order: 'forward-first', x: 800 });
    const rows = undoRows(rt);
    expect(rows.find(r => r.id === 'step-1')!.description.lines[0]).toEqual({ relation: '=', text: '∞', tex: '\\infty' });
    expect(rows.find(r => r.id === 'step-1')!.description.note).toMatch(/larger than the largest double/);
    expect(rows.find(r => r.id === 'step-2')!.description.status).toBe('undefined');
    expect(undoVerdict(rt).tone).toBe('false');
    expect(undoVerdict(rt).text).toMatch(/mathematics|identity holds/i);
    const under = undoRows(roundTrip({ family: 'exp', order: 'forward-first', x: -800 }));
    expect(under.find(r => r.id === 'step-1')!.description.lines[0]).toEqual({ relation: '=', text: '0', tex: '0' });
    expect(under.find(r => r.id === 'step-1')!.description.note).toMatch(/smaller than the smallest double/);
  });
  it('the points: mirror images across y = x, and the lost sign is shown where √ lands', () => {
    const fine = undoPoints(roundTrip({ family: 'exp', order: 'forward-first', x: 1.5 }));
    expect(fine.onFirst!.y).toBeCloseTo(Math.exp(1.5), 12);
    expect(fine.reflected).toEqual({ x: fine.onFirst!.y, y: fine.onFirst!.x });
    expect(fine.returned).toBeNull();
    const lost = undoPoints(roundTrip({ family: 'square', order: 'forward-first', x: -2 }));
    expect(lost.onFirst).toEqual({ x: -2, y: 4 });
    expect(lost.reflected).toEqual({ x: 4, y: -2 });
    expect(lost.returned).toEqual({ x: 4, y: 2 });
    expect(undoPoints(roundTrip({ family: 'square', order: 'forward-first', x: 2 })).returned).toBeNull();
    expect(undoPoints(roundTrip({ family: 'exp', order: 'inverse-first', x: -1 })).onFirst).toBeNull();
    expect(undoPoints(roundTrip({ family: 'exp', order: 'forward-first', x: 4 })).onFirst).toBeNull(); // e⁴ ≈ 54.6 is off the plane
    expect(offPlane(roundTrip({ family: 'exp', order: 'forward-first', x: 4 }))).toBe(true);
    expect(offPlane(roundTrip({ family: 'exp', order: 'forward-first', x: 1 }))).toBe(false);
  });
  it('the scene depends on the family only; the reflection of the forward curve swaps coordinates', () => {
    const s = undoScene('exp');
    expect(s.reflected[0]![5]).toEqual({ x: s.curves.forward[0]![5]!.y, y: s.curves.forward[0]![5]!.x });
    expect(undoScene('square').curves.otherBranch.length).toBeGreaterThan(0);
    expect(undoScene('exp').curves.otherBranch.length).toBe(0);
    const labels = undoLabels('square');
    expect(labels.forward.y).toBeCloseTo(labels.forward.x ** 2, 12);
    expect(labels.inverse).toEqual({ x: labels.forward.y, y: labels.forward.x });
    expect(labels.other).toEqual({ x: labels.forward.y, y: -labels.forward.x });
  });
});

describe('circle stage', () => {
  it('every exact angle from −2π to 2π: formulas, rows and sentences are well-formed, and exact values are shown with "="', () => {
    for (let k = -TWELFTHS_LIMIT; k <= TWELFTHS_LIMIT; k++) {
      const d = deriveCircle(exactAngle(k));
      for (const f of circleFormulas(d)) tex(f);
      const rows = circleRows(d);
      for (const r of rows) { tex(r.symbolTex); for (const l of r.description.lines) tex(l.tex); }
      expect(rows.find(r => r.id === 'cos')!.description.lines[0]!.relation).toBe('=');
      expect(rows.find(r => r.id === 'sin')!.description.lines[0]!.relation).toBe('=');
      expect(rows.find(r => r.id === 'pythagoras')!.description.lines[0]).toMatchObject({ relation: '=', text: '1' });
      expect(circleVerdict(d).length).toBeGreaterThan(30);
      expect(circleSpoken(d)).not.toMatch(/NaN/);
      expect(circleDescription(d).length).toBeGreaterThan(30);
      expect(graphDescription(d).length).toBeGreaterThan(30);
    }
  });
  it('free angles, including 0 and the limits, are "≈" except where the model knows the value exactly', () => {
    for (const r of [-RADIANS_LIMIT, -3.14, -0.001, 0, 0.001, 0.524, 1.571, 3.142, 6.283]) {
      const d = deriveCircle(freeAngle(r));
      for (const f of circleFormulas(d)) tex(f);
      const rows = circleRows(d);
      for (const row of rows) { tex(row.symbolTex); for (const l of row.description.lines) tex(l.tex); }
      const cosRel = rows.find(x => x.id === 'cos')!.description.lines[0]!.relation;
      expect(cosRel).toBe(r === 0 ? '=' : '≈');
      expect(circleVerdict(d).length).toBeGreaterThan(30);
    }
  });
  it('reads known values: π/6 gives √3/2 and 1/2; 7π/6 gives −√3/2 and −1/2', () => {
    const rows = circleRows(deriveCircle(exactAngle(2)));
    expect(rows.find(r => r.id === 'cos')!.description.lines[0]!.text).toBe('√3/2');
    expect(rows.find(r => r.id === 'sin')!.description.lines[0]!.text).toBe('1/2');
    expect(rows.find(r => r.id === 'theta')!.description.lines[0]!.text.replace(/\s/g, ' ')).toBe('π/6 rad');
    expect(rows.find(r => r.id === 'degrees')!.description.lines[0]!.text).toBe('30°');
    const third = circleRows(deriveCircle(exactAngle(14)));
    expect(third.find(r => r.id === 'cos')!.description.lines[0]!.text).toBe('−√3/2');
    expect(third.find(r => r.id === 'arcsin')!.description.lines[0]!.text.replace(/\s/g, ' ')).toBe('−π/6 rad');
  });
  it('the verdict names the quadrant, the reference angle, and when arcsin and atan2 do not return θ', () => {
    expect(circleVerdict(deriveCircle(exactAngle(2)))).toMatch(/quadrant I:.*cos θ > 0.*sin θ > 0/);
    expect(circleVerdict(deriveCircle(exactAngle(2)))).toMatch(/arcsin\(sin θ\) = θ here/);
    const q2 = circleVerdict(deriveCircle(exactAngle(10)));
    expect(q2).toMatch(/quadrant II/);
    expect(q2).toMatch(/arcsin\(sin θ\) = π\/6, not θ/);
    expect(circleVerdict(deriveCircle(exactAngle(-18)))).toMatch(/atan2.*plus or minus whole turns/);
    expect(circleVerdict(deriveCircle(exactAngle(0)))).toMatch(/on the positive x-axis/);
  });
  it('the scene: 24 ticks on the circle, the foot of the cosine leg, an arc only for visible angles', () => {
    const s = circleScene(deriveCircle(exactAngle(5)));
    expect(s.ticks).toHaveLength(24);
    for (const t of s.ticks) expect(Math.hypot(t.x, t.y)).toBeCloseTo(1, 12);
    expect(s.cosFoot).toEqual({ x: s.point.x, y: 0 });
    expect(s.arc).toEqual({ from: 0, to: 5 * Math.PI / 12 });
    expect(circleScene(deriveCircle(exactAngle(0))).arc).toBeNull();
    expect(circleScene(deriveCircle(freeAngle(0.02))).arc).toBeNull();
    for (const p of s.ring[0]!) expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 12);
  });
  it('the graphs: sine and cosine sampled over [−2π, 2π] with the marker at θ', () => {
    const g = trigGraphs();
    expect(g.sin[0]![0]!.x).toBeCloseTo(GRAPH_RANGE.xMin, 12);
    expect(g.sin[0]!.some(p => Math.abs(p.x - Math.PI / 2) < 1e-9 && Math.abs(p.y - 1) < 1e-12)).toBe(true);
    expect(g.cos[0]!.some(p => Math.abs(p.x) < 1e-9 && Math.abs(p.y - 1) < 1e-12)).toBe(true);
    expect(trigGraphs()).toBe(g);
    const d = deriveCircle(exactAngle(-9));
    const m = graphMarkers(d);
    expect(m.theta).toBeCloseTo(-3 * Math.PI / 4, 12);
    expect(m.sin.y).toBe(d.point.y);
    expect(m.cos.y).toBe(d.point.x);
  });
  it('presets are exact angles within the model range; switching mode keeps the point (to the stated rounding)', () => {
    for (const p of CIRCLE_PRESETS) { expect(Math.abs(p.k)).toBeLessThanOrEqual(TWELFTHS_LIMIT); tex(deriveCircle(exactAngle(p.k)).piMultiple!.tex); }
    expect(switchMode(exactAngle(2), 'free')).toEqual(freeAngle(0.524));
    expect(switchMode(freeAngle(0.524), 'exact')).toEqual(exactAngle(2));
    expect(switchMode(freeAngle(RADIANS_LIMIT), 'exact')).toEqual(exactAngle(24));
    expect(switchMode(exactAngle(-24), 'free')).toEqual(freeAngle(-RADIANS_LIMIT));
    expect(switchMode(exactAngle(3), 'exact')).toEqual(exactAngle(3));
    for (let k = -24; k <= 24; k++) expect(switchMode(switchMode(exactAngle(k), 'free'), 'exact')).toEqual(exactAngle(k));
  });
});

describe('base stage', () => {
  const states: GrowthState[] = [];
  for (const preset of ['half', 'two', 'e', 'ten'] as const) for (const x of [-4, -1, 0, 0.5, 1, 2, 3, 8]) states.push({ preset, custom: 3, x });
  for (const custom of [0.01, 0.25, 1, 3, 20]) for (const x of [-4, 0, 1, 2.5, 8]) states.push({ preset: 'custom', custom, x });
  it('formulas, rows, verdict and sentences are well-formed for every base and input, including base 1 and x ≤ 0', () => {
    for (const s of states) {
      const d = deriveGrowth(s);
      for (const f of growthFormulas(d)) tex(f);
      for (const r of growthRows(d)) { tex(r.symbolTex); for (const l of r.description.lines) tex(l.tex); }
      expect(growthVerdict(d).text.length).toBeGreaterThan(30);
      expect(growthVerdict(d).text).not.toMatch(/NaN/);
      expect(growthSpoken(d)).not.toMatch(/NaN/);
      expect(growthDescription(d).length).toBeGreaterThan(30);
      growthMarkers(d);
    }
    for (const p of GROWTH_PRESETS) for (const f of growthFormulas(deriveGrowth(p.state))) tex(f);
  });
  it('base 1 is flagged, x ≤ 0 has no logarithm, and exact cases use "="', () => {
    const one = deriveGrowth({ preset: 'custom', custom: 1, x: 2 });
    expect(growthVerdict(one).caution).toBe(true);
    expect(growthVerdict(one).text).toMatch(/not an exponential function/);
    expect(growthRows(one).find(r => r.id === 'log')!.description.status).toBe('undefined');
    expect(growthRows(one).find(r => r.id === 'period')!.description.status).toBe('undefined');
    const neg = deriveGrowth({ preset: 'two', custom: 3, x: -1 });
    expect(growthVerdict(neg).caution).toBe(true);
    expect(growthRows(neg).find(r => r.id === 'log')!.description.status).toBe('undefined');
    expect(growthRows(neg).find(r => r.id === 'power')!.description.lines[0]).toMatchObject({ relation: '=', text: '0.5' });
    const eight = growthRows(deriveGrowth({ preset: 'two', custom: 3, x: 8 }));
    expect(eight.find(r => r.id === 'log')!.description.lines[0]).toMatchObject({ relation: '=', text: '3' });
    expect(eight.find(r => r.id === 'bits')!.description.lines[0]!.text).toBe('3');
    expect(eight.find(r => r.id === 'period')!.description.lines[0]).toMatchObject({ relation: '=', text: '1' });
  });
  it('markers stay inside the window; the curves are a function of the base only and the logarithm is the mirror of the power', () => {
    for (const s of states) {
      const m = growthMarkers(deriveGrowth(s));
      for (const p of [m.power, m.log]) if (p) { expect(p.x).toBeGreaterThanOrEqual(GROWTH_WINDOW.xMin); expect(p.y).toBeLessThanOrEqual(GROWTH_WINDOW.yMax); }
    }
    expect(sampleBase(2, GROWTH_WINDOW)).toEqual(sampleBase(2, GROWTH_WINDOW));
    expect(sampleBase(1, GROWTH_WINDOW).logarithm).toEqual([]);
    const { exponential, logarithm } = sampleBase(2, GROWTH_WINDOW);
    expect(exponential.length).toBeGreaterThan(0);
    // log₂ 8 = 3 and 2³ = 8: the point (3, 8) on the power curve mirrors to (8, 3) on the log curve
    const nearest = (lines: readonly (readonly { x: number; y: number }[])[], x: number) => lines.flat().reduce((p, q) => (Math.abs(q.x - x) < Math.abs(p.x - x) ? q : p));
    expect(nearest(logarithm, 8).y).toBeCloseTo(3, 1);
    expect(nearest(exponential, 3).y).toBeCloseTo(8, 0);
  });
  it('identity cards: checked cards show both sides, the difference and the tolerance; undefined cards say why', () => {
    for (const a of [-10, 0, 0.01, 1, 6, 1000]) for (const b of [-10, 0, 1, 4, 1000]) for (const k of [-20, 0, 3, 20]) {
      const d = deriveIdentities({ a, b, k });
      const cards = identityCards(d);
      expect(cards).toHaveLength(4);
      for (const c of cards) {
        tex(c.statementTex);
        if (c.status === 'checked') {
          expect(c.lines.map(l => l.label.split(',')[0])).toEqual(['left side', 'right side', 'difference', 'tolerance (a few units in the last place)']);
          expect(c.lines.every(l => l.text.length > 2)).toBe(true);
        } else {
          expect(c.lines).toEqual([]);
          expect(c.outcome).toMatch(/^undefined: /);
        }
        expect(c.outcome).not.toMatch(/NaN/);
      }
      expect(identitySpoken(d)).toMatch(/of 4 identities/);
    }
    tex(identityFormula());
    const canonical = identityCards(deriveIdentities({ a: 6, b: 4, k: 3 }));
    expect(canonical.every(c => c.status === 'checked' && c.within === true)).toBe(true);
    expect(canonical[0]!.lines[0]!.text).toMatch(/^≈ 3\.17805/); // ln 24 = 3.1780538…
    const bad = identityCards(deriveIdentities({ a: -1, b: 4, k: 3 }));
    expect(bad.map(c => c.status)).toEqual(['undefined', 'undefined', 'undefined', 'undefined']);
  });
});

describe('worked examples', () => {
  it('every example is a non-empty immutable trace whose LaTeX is well-formed', () => {
    for (const e of WORKED_EXAMPLES) {
      const frames = workedFrames(e.id);
      expect(frames.length).toBeGreaterThanOrEqual(4);
      expect(frames.map(f => f.index)).toEqual(frames.map((_, i) => i));
      for (const f of frames) { tex(f.state.tex); expect(f.state.caption.length).toBeGreaterThan(20); expect(Object.isFrozen(f.state)).toBe(true); }
    }
    expect(() => workedFrames('nope')).toThrow(RangeError);
  });
  it('the numbers are the independently known ones', () => {
    const shift = workedFrames('shift').map(f => f.state.tex).join(' | ');
    expect(shift).toContain('\\ln(4)\\approx 1.386294'); // ln 4 = 1.3862943611…
    expect(shift).toContain('2.772589'); // 2 ln 4 = 2.7725887222…
    expect(shift).toContain('x=2'); // zero of 2 ln(x − 1)
    const undo = workedFrames('undo').map(f => f.state.tex).join(' | ');
    expect(undo).toContain('\\ln 5\\approx 1.609438'); // ln 5 = 1.6094379124…
    const circle = workedFrames('circle').map(f => f.state.tex).join(' | ');
    expect(circle).toContain('210^{\\circ}');
    expect(circle).toContain('-\\frac{\\sqrt{3}}{2}');
    expect(circle).toContain('-\\frac{1}{2}');
    const base = workedFrames('base').map(f => f.state.tex).join(' | ');
    expect(base).toContain('3.321928'); // log₂ 10 = 3.3219280948…
    expect(base).toContain('2.302585'); // ln 10
    expect(base).toContain('0.693147'); // ln 2
  });
});

describe('base stage: direct labels and the doubling-time sentence', () => {
  it('labels sit on their curves inside the window for every base that has a visible stretch, and are absent for base 1', () => {
    for (const base of [0.01, 0.1, 0.5, 0.9, 1.1, 1.5, 2, Math.E, 3, 10, 20]) {
      const { power, log } = growthLabels(base, base < 1 ? 'decay' : 'growth');
      if (power) { expect(power.at.y).toBeCloseTo(base ** power.at.x, 9); expect(power.at.y).toBeLessThanOrEqual(GROWTH_WINDOW.yMax - 1); }
      if (log) { expect(log.at.y).toBeCloseTo(Math.log(log.at.x) / Math.log(base), 9); expect(log.at.y).toBeGreaterThanOrEqual(GROWTH_WINDOW.yMin + 1); }
    }
    expect(growthLabels(2, 'growth').power).not.toBeNull();
    expect(growthLabels(2, 'growth').log).not.toBeNull();
    expect(growthLabels(1, 'constant')).toEqual({ power: null, log: null });
  });
  it('the verdict says "1 unit" for an exact period, "about" for a rounded one, and never prints a bare relation sign', () => {
    expect(growthVerdict(deriveGrowth({ preset: 'two', custom: 3, x: 2 })).text).toBe('b > 1: b^x grows, and doubles every 1 unit of x.');
    expect(growthVerdict(deriveGrowth({ preset: 'e', custom: 3, x: 2 })).text).toMatch(/doubles about every 0\.693147 units of x\./);
    expect(growthVerdict(deriveGrowth({ preset: 'half', custom: 3, x: 2 })).text).toBe('0 < b < 1: b^x shrinks, and halves every 1 unit of x.');
    for (const preset of ['half', 'two', 'e', 'ten'] as const) expect(growthVerdict(deriveGrowth({ preset, custom: 3, x: 1 })).text).not.toMatch(/every [=≈]|about about/);
  });
});
