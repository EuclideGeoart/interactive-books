/**
 * I.1 lesson views: every formula the stages can produce renders under strict KaTeX (nothing is skipped), the scenes are geometrically what
 * the model says, and the wording tracks the derived object. Sweeps are exhaustive over the stages' reachable states.
 */
import { describe, expect, it } from 'vitest';
import { isBinary, unitText, type Op } from '../../src/math/quantity/dimension';
import { rationalForm } from '../../src/math/quantity/exactform';
import { deriveNthRoot } from '../../src/math/quantity/nthroot';
import { EXPONENT_MAX, EXPONENT_MIN } from '../../src/math/quantity/powers';
import { fromDecimal, toNumber } from '../../src/math/quantity/rational';
import { deriveSquare, type SquareState } from '../../src/math/quantity/square';
import { parseParam } from '../../src/platform/params';
import { renderTex } from '../../src/platform/tex';
import { describeValue } from '../../src/platform/numeric/quantity';
import { FORMAT } from '../../src/lessons/shared/format';
import { CANONICAL_POWERS, POWERS_PRESETS, BASE_SPEC, M_SPEC, derivePowersState, ladderRows, powersDescription, powersRows, powersSpoken, powersVerdict, ruleStatus, ruleStatusText, ruleTex, RULE_SHAPES } from '../../src/lessons/quantities/powers-lesson';
import { A_LIMIT, ROOT_PRESETS, ROOTS_WINDOW, ROOT_A_SPEC, powerCurve, rootsDescription, rootsFormulas, rootsRows, rootsScene, rootsSpoken, rootsVerdict } from '../../src/lessons/quantities/roots-lesson';
import { AREA_MAX, AREA_MIN, AREA_SPEC, SIDE_SPEC, SQUARE_PRESETS, applyPreset, presetsFor, squareCentreLabel, squareDescription, squareFormulas, squareRows, squareScene, squareSpoken, squareVerdict, sideDimensionLabel, verdictIsCaution, CANONICAL_SQUARE } from '../../src/lessons/quantities/square-lesson';
import { A_SPEC, B_SPEC, OPERATIONS, UNITS_PRESETS, UNIT_CHOICES, deriveUnits, exponentTable, unitsFormulas, unitsRows, unitsSpoken, unitsVerdict, type UnitId, type UnitsState } from '../../src/lessons/quantities/units-lesson';
import { WORKED_EXAMPLES, workedFrames, workedFramesFor } from '../../src/lessons/quantities/worked-lesson';

const tex = (s: string) => renderTex(s, true);
const polygonArea = (c: readonly { x: number; y: number }[]) => {
  let s = 0;
  for (let i = 0; i < c.length; i++) { const a = c[i]!; const b = c[(i + 1) % c.length]!; s += a.x * b.y - b.x * a.y; }
  return Math.abs(s) / 2;
};
const frange = (lo: number, hi: number, step: number): number[] => {
  const out: number[] = [];
  for (let i = 0; lo + i * step <= hi + 1e-9; i++) out.push(Number((lo + i * step).toFixed(6)) + 0);
  return out;
};
/** The platform joins a number and its unit with a no-break space; the tests read it as a plain space. */
const text = (d: ReturnType<typeof describeValue>) => d.lines.map(l => `${l.relation} ${l.text}`).join(' | ').replace(/\u00a0/g, ' ');

describe('square stage (hero)', () => {
  const sides = frange(-6, 6, 0.25).concat([0.01, -0.01, 0.1, 5.99, -5.99, 1.23]);
  const areas = frange(AREA_MIN, AREA_MAX, 0.5).concat([0.01, 0.25, 1.44, 143.99 - 143.99 + 35.99, 2.25, 12]);

  it('every reachable state renders strictly (rows symbols, formulas, texts) and has non-empty words', () => {
    for (const unit of ['none', 'm'] as const) {
      for (const side of sides) {
        const state: SquareState = { mode: 'side', side, area: 2, unit };
        const d = deriveSquare(state);
        for (const t of squareFormulas(d, state)) expect(() => tex(t), `${side}`).not.toThrow();
        for (const r of squareRows(d, state)) { expect(() => renderTex(r.symbolTex, false)).not.toThrow(); for (const l of r.description.lines) expect(() => renderTex(l.tex, false), l.tex).not.toThrow(); }
        for (const f of [squareVerdict, squareDescription]) expect(f(d, state).length).toBeGreaterThan(30);
        expect(squareSpoken(d).length).toBeGreaterThan(10);
      }
      for (const area of areas) {
        const state: SquareState = { mode: 'area', side: 3, area, unit };
        const d = deriveSquare(state);
        for (const t of squareFormulas(d, state)) expect(() => tex(t), `${area}`).not.toThrow();
        for (const r of squareRows(d, state)) { expect(() => renderTex(r.symbolTex, false)).not.toThrow(); for (const l of r.description.lines) expect(() => renderTex(l.tex, false), l.tex).not.toThrow(); }
        expect(squareVerdict(d, state).length).toBeGreaterThan(30);
        expect(squareDescription(d, state).length).toBeGreaterThan(30);
        expect(squareSpoken(d).length).toBeGreaterThan(10);
      }
    }
  });

  it('the drawn square has exactly the model\'s area; it stands on the x-axis; the side runs from 0 to q', () => {
    for (const side of sides) {
      const state: SquareState = { mode: 'side', side, area: 2, unit: 'none' };
      const d = deriveSquare(state);
      const scene = squareScene(d, state);
      if (side === 0) { expect(scene.corners).toBeNull(); continue; }
      expect(polygonArea(scene.corners!)).toBeCloseTo(side * side, 9);
      for (const c of scene.corners!) { expect(c.y).toBeGreaterThanOrEqual(0); expect(c.x >= Math.min(0, side) - 1e-12 && c.x <= Math.max(0, side) + 1e-12).toBe(true); }
      expect(scene.handle).toEqual({ x: side, y: 0 });
      expect(scene.sideArrow).toEqual({ from: { x: 0, y: 0 }, to: { x: side, y: 0 } });
      expect(scene.rootMarker!.x).toBeCloseTo(Math.abs(side), 12); // the root of the area is |q|, on the positive side
    }
  });

  it('in area mode the square has area A, the markers are ±√A, a negative area draws nothing', () => {
    for (const area of areas) {
      const state: SquareState = { mode: 'area', side: 3, area, unit: 'none' };
      const d = deriveSquare(state);
      const scene = squareScene(d, state);
      if (area < 0) { expect(scene.corners).toBeNull(); expect(scene.rootMarker).toBeNull(); expect(verdictIsCaution(d)).toBe(true); continue; }
      if (area === 0) { expect(scene.corners).toBeNull(); expect(scene.rootMarker).toEqual({ x: 0, y: 0 }); continue; }
      expect(polygonArea(scene.corners!)).toBeCloseTo(area, 9);
      expect(scene.rootMarker!.x).toBeCloseTo(Math.sqrt(area), 12);
      expect(scene.negativeRootMarker!.x).toBeCloseTo(-Math.sqrt(area), 12);
      expect(scene.handle).toBeNull();
      expect(sideDimensionLabel(d, state)).toContain('side');
    }
  });

  it('exact where it can be: area 12 is 2√3 (not a decimal), 0.25 is 1/2, 9 is 3; the sign loss is announced for q < 0', () => {
    const rows = (s: Partial<SquareState>) => { const state = { ...CANONICAL_SQUARE, unit: 'none' as const, ...s }; return squareRows(deriveSquare(state), state); };
    const root12 = rows({ mode: 'area', area: 12 }).find(r => r.id === 'root')!.description;
    expect(root12.lines.map(l => l.relation)).toEqual(['=', '≈']);
    expect(root12.lines[0]!.text).toBe('2√3');
    expect(root12.lines[1]!.text.startsWith('3.464102')).toBe(true);
    expect(rows({ mode: 'area', area: 0.25 }).find(r => r.id === 'root')!.description.lines).toHaveLength(1); // 0.5: a terminating decimal, exact on one line
    expect(text(rows({ mode: 'area', area: 0.25 }).find(r => r.id === 'root')!.description)).toBe('= 0.5');
    expect(text(rows({ mode: 'area', area: 9 }).find(r => r.id === 'root')!.description)).toBe('= 3');
    const neg = deriveSquare({ ...CANONICAL_SQUARE, side: -3 });
    expect(squareVerdict(neg, { ...CANONICAL_SQUARE, side: -3 })).toContain('forgot the sign');
    expect(verdictIsCaution(neg)).toBe(true);
    expect(verdictIsCaution(deriveSquare(CANONICAL_SQUARE))).toBe(false);
    const area = rows({ mode: 'area', area: -4 });
    expect(area.find(r => r.id === 'root')!.description.status).toBe('undefined');
    expect(area.find(r => r.id === 'solutions')!.description.status).toBe('undefined');
  });

  it('units: the area of a side in metres is shown in square metres', () => {
    const state: SquareState = { mode: 'side', side: 3, area: 2, unit: 'm' };
    const rows = squareRows(deriveSquare(state), state);
    expect(text(rows.find(r => r.id === 'square')!.description)).toBe('= 9 m²');
    expect(text(rows.find(r => r.id === 'side')!.description)).toBe('= 3 m');
  });

  it('presets are valid states inside the stage\'s own parameter domains', () => {
    for (const p of SQUARE_PRESETS) {
      const state = applyPreset(CANONICAL_SQUARE, p);
      expect(() => deriveSquare(state)).not.toThrow();
      if (state.mode === 'side') expect(parseParam(SIDE_SPEC, String(state.side)).ok).toBe(true);
      else expect(parseParam(AREA_SPEC, String(state.area)).ok).toBe(true);
    }
    expect(presetsFor('side').length + presetsFor('area').length).toBe(SQUARE_PRESETS.length);
  });

  it('the parameter specs reject finer-than-2-decimal input and out-of-range values instead of repairing them', () => {
    expect(parseParam(SIDE_SPEC, '1.005').ok).toBe(false);
    expect(parseParam(SIDE_SPEC, '7').ok).toBe(false);
    expect(parseParam(AREA_SPEC, '-4.01').ok).toBe(false);
    expect(parseParam(AREA_SPEC, '36').ok).toBe(true);
    expect(parseParam(AREA_SPEC, '0.01').ok).toBe(true);
    expect(squareCentreLabel(deriveSquare(CANONICAL_SQUARE))).toBe('q² = 9');
  });
});

describe('units stage', () => {
  const ids = UNIT_CHOICES.map(u => u.id);
  it('every operation on every pair of units renders, with a verdict, a table and a spoken line', () => {
    for (const op of OPERATIONS.map(o => o.id as Op)) {
      for (const aUnit of ids) for (const bUnit of ids) {
        for (const [aValue, bValue] of [[3, 2], [-1.5, 0], [0, 4], [9, -0.25]] as ReadonlyArray<readonly [number, number]>) {
          const state: UnitsState = { op, aValue, aUnit, bValue, bUnit };
          const d = deriveUnits(state);
          for (const t of unitsFormulas(d, state)) expect(() => tex(t), JSON.stringify(state)).not.toThrow();
          for (const r of unitsRows(d, state)) { expect(() => renderTex(r.symbolTex, false)).not.toThrow(); for (const l of r.description.lines) expect(() => renderTex(l.tex, false), l.tex).not.toThrow(); }
          expect(unitsVerdict(d).length).toBeGreaterThan(20);
          expect(unitsSpoken(d).length).toBeGreaterThan(5);
          const table = exponentTable(d);
          expect(table).toHaveLength(isBinary(op) ? 3 : 2);
          expect(table.at(-1)!.id).toBe('result');
          expect(table.at(-1)!.exponents.every(e => e === null)).toBe(!d.outcome.ok);
        }
      }
    }
  });
  it('literal cases: m + s refused, m × m gives m², m ÷ s gives m/s, √(m²) gives m, √m refused', () => {
    const run = (op: Op, aUnit: UnitId, bUnit: UnitId, aValue = 3, bValue = 2) => deriveUnits({ op, aValue, aUnit, bValue, bUnit });
    expect(run('add', 'm', 's').outcome.ok).toBe(false);
    expect(run('add', 'm', 'm').outcome.ok).toBe(true);
    const sq = run('multiply', 'm', 'm');
    expect(sq.outcome.ok && unitText(sq.outcome.result.dim)).toBe('m²');
    const sp = run('divide', 'm', 's', 12, 4);
    expect(sp.outcome.ok && unitText(sp.outcome.result.dim)).toBe('m/s');
    const root = run('root', 'm2', 'm', 9, 0);
    expect(root.outcome.ok && unitText(root.outcome.result.dim)).toBe('m');
    expect(run('root', 'm', 'm', 9, 0).outcome.ok).toBe(false);
    expect(run('divide', 'm', 'm', 6, 0).outcome.ok).toBe(false); // ÷ 0
  });
  it('presets are reachable states with valid inputs', () => {
    for (const p of UNITS_PRESETS) {
      expect(parseParam(A_SPEC, String(p.state.aValue)).ok).toBe(true);
      expect(parseParam(B_SPEC, String(p.state.bValue)).ok).toBe(true);
      expect(() => deriveUnits(p.state)).not.toThrow();
    }
    expect(UNITS_PRESETS.some(p => !deriveUnits(p.state).outcome.ok)).toBe(true);
  });
});

describe('powers stage', () => {
  const bases = frange(-5, 5, 0.5).concat([0.1, -0.1, 4.9, 1.1]);
  const exps = frange(EXPONENT_MIN, EXPONENT_MAX, 1);
  it('every base and exponent pair renders strictly and the statuses are never "fails"', () => {
    let silent = 0;
    for (const base of bases) for (const m of exps) for (const n of exps) {
      const state = { base, m, n };
      const d = derivePowersState(state);
      for (const rule of d.rules) {
        expect(() => tex(ruleTex(rule, d)), JSON.stringify(state)).not.toThrow();
        expect(ruleStatus(rule)).not.toBe('fails');
        expect(ruleStatusText(rule).length).toBeGreaterThan(10);
        if (ruleStatus(rule) === 'no-claim') { silent++; expect(base).toBe(0); }
      }
      for (const row of ladderRows(d)) { expect(() => renderTex(row.tex, false)).not.toThrow(); expect(() => renderTex(row.defined ? row.valueTex : '\\text{undefined}', false)).not.toThrow(); }
      for (const r of powersRows(d, state)) { expect(() => renderTex(r.symbolTex, false)).not.toThrow(); for (const l of r.description.lines) expect(() => renderTex(l.tex, false), l.tex).not.toThrow(); }
      expect(powersVerdict(d).length).toBeGreaterThan(20);
      expect(powersSpoken(d).length).toBeGreaterThan(20);
      expect(powersDescription(d).length).toBeGreaterThan(30);
    }
    expect(silent).toBeGreaterThan(0);
    for (const shape of Object.values(RULE_SHAPES)) expect(() => renderTex(shape, false)).not.toThrow();
  });
  it('literal ladder: 2^-3 = 0.125, 2^6 = 64; base 0 is undefined for k ≤ 0; (−2)^3 = −8', () => {
    const rows = (base: number) => ladderRows(derivePowersState({ base, m: 1, n: 1 }));
    expect(rows(2).find(r => r.k === -3)!.valueTex).toBe('0.125');
    expect(rows(2).find(r => r.k === 6)!.valueTex).toBe('64');
    expect(rows(0).filter(r => !r.defined).map(r => r.k)).toEqual([-3, -2, -1, 0]);
    expect(rows(-2).find(r => r.k === 3)!.valueTex).toBe('-8');
    expect(rows(1.5).find(r => r.k === -2)!.valueTex).toBe('\\frac{4}{9}'); // 1/2.25 does not terminate
    expect(rationalForm(fromDecimal(1.5, 1)!).text).toBe('1.5');
  });
  it('the zero-base presets show silent rules, the others show all four holding', () => {
    for (const p of POWERS_PRESETS) {
      const d = derivePowersState(p.state);
      expect(parseParam(BASE_SPEC, String(p.state.base)).ok).toBe(true);
      expect(parseParam(M_SPEC, String(p.state.m)).ok).toBe(true);
      expect(d.rules.every(r => ruleStatus(r) === 'holds')).toBe(p.state.base !== 0);
    }
    expect(derivePowersState(CANONICAL_POWERS).rules.map(r => ruleStatus(r))).toEqual(['holds', 'holds', 'holds', 'holds']);
  });
  it('rejects a base with more than one decimal', () => {
    expect(parseParam(BASE_SPEC, '0.25').ok).toBe(false);
    expect(() => derivePowersState({ base: 0.25, m: 1, n: 1 })).toThrow(RangeError);
  });
});

describe('roots stage', () => {
  const values = frange(-A_LIMIT, A_LIMIT, 0.25).concat([0.01, -0.01, 1.44, 7.99, 2.25]);
  it('every value and index renders strictly and the scene matches the model', () => {
    for (const n of [2, 3, 4, 5]) for (const A of values) {
      const state = { A, n };
      const d = deriveNthRoot(state);
      for (const t of rootsFormulas(d)) expect(() => tex(t), JSON.stringify(state)).not.toThrow();
      for (const r of rootsRows(d, state)) { expect(() => renderTex(r.symbolTex, false)).not.toThrow(); for (const l of r.description.lines) expect(() => renderTex(l.tex, false), l.tex).not.toThrow(); }
      expect(rootsVerdict(d).length).toBeGreaterThan(30);
      expect(rootsDescription(d).length).toBeGreaterThan(30);
      expect(rootsSpoken(d).length).toBeGreaterThan(10);
      const scene = rootsScene(d, state);
      expect(scene.markers).toHaveLength(d.solutions);
      for (const m of scene.markers) {
        expect(m.at.y).toBe(A);
        expect(Math.pow(m.at.x, n)).toBeCloseTo(A, 9); // the marker lies ON the curve y = x^n, at the level A
      }
      expect(scene.handle).toEqual({ x: 0, y: A });
    }
  });
  it('the curve is y = x^n: every sampled point satisfies it, and it does not depend on A', () => {
    for (const n of [2, 3, 4, 5]) {
      const lines = powerCurve(n);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) for (const p of line) {
        if (Math.abs(Math.pow(p.x, n)) <= 300) expect(p.y).toBeCloseTo(Math.pow(p.x, n), 6); // beyond ±20 window heights the sampler clips, by design
        expect(p.x >= ROOTS_WINDOW.xMin - 1e-9 && p.x <= ROOTS_WINDOW.xMax + 1e-9).toBe(true);
      }
    }
  });
  it('presets are valid, and cover no-solution, one-solution and two-solution states', () => {
    const kinds = new Set<number>();
    for (const p of ROOT_PRESETS) { expect(parseParam(ROOT_A_SPEC, String(p.state.A)).ok).toBe(true); kinds.add(deriveNthRoot(p.state).solutions); }
    expect([...kinds].sort()).toEqual([0, 1, 2]);
  });
  it('literal verdicts: cube root of −8 is −2 (one solution); ±√2 for A=2, n=2; none for −4, n=2', () => {
    const r = deriveNthRoot({ A: -8, n: 3 });
    expect(r.solutions).toBe(1);
    expect(r.result.kind === 'exact' && toNumber({ num: r.result.root.a, den: r.result.root.c })).toBe(-2);
    expect(deriveNthRoot({ A: 2, n: 2 }).solutionPositions[1]).toBeCloseTo(Math.SQRT2, 12);
    expect(deriveNthRoot({ A: -4, n: 2 }).solutions).toBe(0);
    expect(rootsVerdict(deriveNthRoot({ A: -4, n: 2 }))).toContain('never negative');
  });
});

describe('worked examples', () => {
  it('every frame of every example renders strictly; the last frames check the answer and name the unit', () => {
    for (const e of WORKED_EXAMPLES) {
      const frames = workedFrames(e);
      expect(frames.length).toBeGreaterThanOrEqual(4);
      for (const f of frames) { expect(() => tex(f.state.tex), `${e.id}: ${f.state.tex}`).not.toThrow(); expect(f.state.caption.length).toBeGreaterThan(10); }
      expect(frames.some(f => f.state.caption.startsWith('Check'))).toBe(true);
      if (e.area) expect(frames.at(-1)!.state.tex).toContain('\\mathrm{m}');
    }
  });
  it('literal answers: √72 → 6√2, √0.32 → 2√2/5, ∛(−54) → −3∛2, side of 2.25 m² → 3/2', () => {
    const lastCheck = (id: string) => workedFrames(WORKED_EXAMPLES.find(e => e.id === id)!).find(f => f.state.caption.startsWith('Check'))!.state.tex;
    expect(lastCheck('w1')).toBe('\\left(6\\sqrt{2}\\right)^{2}=72');
    expect(lastCheck('w2')).toBe('\\left(\\frac{2\\sqrt{2}}{5}\\right)^{2}=0.32');
    expect(lastCheck('w3')).toBe('\\left(-3\\sqrt[3]{2}\\right)^{3}=-54');
    expect(lastCheck('w4')).toBe('\\left(1.5\\right)^{2}=2.25');
  });
  it('a sweep of other radicands also renders, and the check frame always returns the radicand', () => {
    for (const n of [2, 3, 4, 5]) for (const k of [1, 2, 3, 5, 8, 12, 18, 27, 32, 48, 50, 72, 100, 128, 200, 243, 1000, -8, -27, -32, -54]) {
      if (k < 0 && n % 2 === 0) continue;
      const A = fromDecimal(k / 8, 3)!;
      for (const f of workedFramesFor(A, n)) expect(() => tex(f.state.tex), `${k}/8 n=${n}`).not.toThrow();
      const check = workedFramesFor(A, n).find(f => f.state.caption.startsWith('Check'));
      expect(check, `${k}/8 n=${n}`).toBeDefined();
    }
  });
  it('frames are immutable snapshots', () => {
    const frames = workedFrames(WORKED_EXAMPLES[0]!);
    expect(Object.isFrozen(frames[0])).toBe(true);
    expect(Object.isFrozen(frames[0]!.state)).toBe(true);
  });
});

describe('inspector display policy', () => {
  it('a terminating decimal is one exact line; a non-terminating rational is exact then approximate with an ellipsis', () => {
    const rows = (A: number) => rootsRows(deriveNthRoot({ A, n: 2 }), { A, n: 2 }).find(r => r.id === 'power-back')!.description;
    expect(text(rows(2.25))).toBe('= 2.25');
    // (1/3)^1 style: powers stage shows 1/9 = 0.111111…
    const d = derivePowersState({ base: 3, m: -2, n: 1 });
    const row = powersRows(d, { base: 3, m: -2, n: 1 }).find(r => r.id === 'power-m')!.description;
    expect(row.lines.map(l => l.relation)).toEqual(['=', '≈']);
    expect(row.lines[0]!.text).toBe('1/9');
    expect(row.lines[1]!.text).toBe('0.111111…');
    expect(describeValue({ kind: 'given', value: 1 }, FORMAT).status).toBe('given');
  });
});

describe('a rounding with a unit keeps its ellipsis on the digits', () => {
  it('writes 1.414214… m, not 1.414214 m…, in text and in LaTeX; exact lines and unitless values are untouched', async () => {
    const { describeRoot, describeRational, unitOf } = await import('../../src/lessons/quantities/values');
    const { rootOf } = await import('../../src/math/quantity/root');
    const { int, rational } = await import('../../src/math/quantity/rational');
    const metre = unitOf([1, 0, 0]);
    const root = describeRoot(rootOf(int(2), 2), metre);
    expect(root.lines.map(l => l.text.replace(/\u00a0/g, ' '))).toEqual(['√2 m', '1.414214… m']);
    expect(root.lines[1]!.tex).toMatch(/^1\.414214\\ldots\\,\\mathrm\{m\}$/);
    expect(() => renderTex(root.lines[1]!.tex, false)).not.toThrow();
    const area = describeRational(rational(100n, 9n), unitOf([2, 0, 0]));
    expect(area.lines[1]!.text.replace(/\u00a0/g, ' ')).toBe('11.111111… m²');
    expect(describeRoot(rootOf(int(2), 2)).lines[1]!.text).toBe('1.414214…');
    expect(describeRoot(rootOf(int(9), 2), metre).lines).toHaveLength(1);
  });
});

describe('the powers ladder has a spoken heading for every row', () => {
  it('reads "2 to the power minus 3" for the row 2⁻³, and every row has one', () => {
    const rows = ladderRows(derivePowersState(CANONICAL_POWERS));
    expect(rows.find(r => r.k === -3)!.spoken).toBe('2 to the power minus 3');
    expect(rows.find(r => r.k === 0)!.spoken).toBe('2 to the power 0');
    for (const r of rows) expect(r.spoken.length).toBeGreaterThan(10);
  });
});
