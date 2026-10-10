/**
 * I.4 lesson views: every formula the stages can produce renders under strict KaTeX (nothing is skipped), the scenes are what the model says,
 * and the wording tracks the derived object. Sweeps are exhaustive over the stages' reachable states.
 */
import { describe, expect, it } from 'vitest';
import { deriveBalance, solutionPath, tryStep, type BalanceState, type StepSpec } from '../../src/math/algebra/balance';
import { deriveDistribute } from '../../src/math/algebra/expression';
import { deriveExtraneous } from '../../src/math/algebra/extraneous';
import { deriveFallacy } from '../../src/math/algebra/fallacy';
import { deriveReversal } from '../../src/math/algebra/reversal';
import { toNumber } from '../../src/math/quantity/rational';
import { renderTex } from '../../src/platform/tex';
import { AMOUNT_SPEC, BALANCE_PRESETS, BEAM_VIEW, CANONICAL_BALANCE, OP_OPTIONS, TRIAL_SPEC, applyLabel, balanceDescription, balanceFormulas, balanceFrames, balanceRows, balanceSpoken, balanceStateFor, balanceVerdict, beamDescription, beamScene, setScene, verdictIsCaution as balanceCaution } from '../../src/lessons/algebra/balance-lesson';
import { DISTRIBUTE_PRESETS, DA_SPEC, DB_SPEC, DC_SPEC, DX_SPEC, distributeDescription, distributeFormulas, distributeIsCaution, distributeRows, distributeScene, distributeSpoken, distributeVerdict } from '../../src/lessons/algebra/expression-lesson';
import { EXTRANEOUS_PRESETS, EP_SPEC, EQ_SPEC, extraneousCurves, extraneousDescription, extraneousFormulas, extraneousIsCaution, extraneousMarks, extraneousRows, extraneousSpoken, extraneousVerdict, squaredText, sumForm } from '../../src/lessons/algebra/extraneous-lesson';
import { FALLACY_PRESETS, FC_SPEC, FM_SPEC, fallacyCurves, fallacyDescription, fallacyFormulas, fallacyIsCaution, fallacyMarks, fallacyRows, fallacySpoken, fallacyText, fallacyVerdict } from '../../src/lessons/algebra/fallacy-lesson';
import { K_SPEC, P_SPEC, Q_SPEC, REVERSAL_PRESETS, reversalDescription, reversalFormulas, reversalIsCaution, reversalRows, reversalScene, reversalSpoken, reversalVerdict } from '../../src/lessons/algebra/reversal-lesson';
import { WORKED_EXAMPLES } from '../../src/lessons/algebra/worked-lesson';
import { radicalSum } from '../../src/math/algebra/extraneous';
import { operationText } from '../../src/lessons/algebra/format';
import { int, rational } from '../../src/math/quantity/rational';
import { parseParam } from '../../src/platform/params';

const tex = (s: string) => renderTex(s, true);
const range = (lo: number, hi: number, step = 1): number[] => {
  const out: number[] = [];
  for (let i = 0; lo + i * step <= hi + 1e-9; i++) out.push(Number((lo + i * step).toFixed(6)) + 0);
  return out;
};
const strictRows = (rows: { id: string; symbolTex: string; description: { lines: readonly { tex: string }[]; spoken: string } }[]) => {
  for (const r of rows) {
    expect(() => renderTex(r.symbolTex, false), `${r.id}: ${r.symbolTex}`).not.toThrow();
    for (const l of r.description.lines) expect(() => renderTex(l.tex, false), `${r.id}: ${l.tex}`).not.toThrow();
    expect(r.description.spoken.length, r.id).toBeGreaterThan(0);
  }
};

describe('balance stage (hero)', () => {
  const extra: StepSpec[] = [
    { op: 'add', value: 3 }, { op: 'add', value: -2 }, { op: 'add-x', value: -1 }, { op: 'add-x', value: 2 },
    { op: 'scale', value: 2 }, { op: 'scale', value: -3 }, { op: 'scale', value: 0.5 }, { op: 'divide', value: 2 }, { op: 'divide', value: -4 },
  ];

  it('every preset, with its solution path and every further operation, renders strictly at every trial value', () => {
    for (const p of BALANCE_PRESETS) {
      const base = solutionPath(p.spec);
      for (const more of [[], ...extra.map(e => [e])]) {
        const steps = [...base, ...more];
        for (const trial of [-10, -3, -1.5, 0, 0.25, 2, 4, 10]) {
          const state: BalanceState = { initial: p.spec, steps, trial };
          const d = deriveBalance(state);
          for (let i = 0; i < d.frames.length; i++) {
            for (const t of balanceFormulas(d, i)) expect(() => tex(t), `${p.id} ${i}`).not.toThrow();
            strictRows(balanceRows(d, i, state));
            expect(balanceVerdict(d, i).length).toBeGreaterThan(30);
            expect(balanceSpoken(d, i).length).toBeGreaterThan(10);
            expect(balanceDescription(d, i).length).toBeGreaterThan(30);
            expect(beamDescription(d, i).length).toBeGreaterThan(30);
          }
          for (const f of balanceFrames(d)) {
            expect(() => tex(f.state.tex), `${p.id} frame ${f.index}`).not.toThrow();
            expect(f.state.caption.length).toBeGreaterThan(20);
          }
        }
      }
    }
  });

  it('the first frame is the statement; later frames name the operation, and the reversal sentence appears exactly when the model says reversed', () => {
    const p = BALANCE_PRESETS.find(x => x.id === 'b-neg')!;
    const d = deriveBalance({ initial: p.spec, steps: solutionPath(p.spec), trial: 0 });
    const frames = balanceFrames(d);
    expect(frames).toHaveLength(d.frames.length);
    expect(frames[0]!.state.caption).toMatch(/starting statement/);
    d.frames.forEach((f, i) => {
      if (i === 0) return;
      expect(frames[i]!.state.caption.startsWith(operationText(f.op!))).toBe(true);
      expect(/turns around/.test(frames[i]!.state.caption), `frame ${i}`).toBe(f.reversed);
    });
    expect(d.frames.some(f => f.reversed)).toBe(true);
  });

  it('the beam is level exactly when the sides are equal, tilts to the larger side, grows with the difference, and stays on the page', () => {
    const p = BALANCE_PRESETS[0]!;
    const seen: { diff: number; tilt: number }[] = [];
    for (const trial of range(-10, 10, 0.5)) {
      const d = deriveBalance({ initial: p.spec, steps: [], trial });
      const b = d.beams[0]!;
      const scene = beamScene(b);
      const diff = toNumber(b.diff);
      if (diff === 0) { expect(scene.tiltDeg).toBe(0); expect(scene.left.y).toBe(BEAM_VIEW.pivotY); expect(scene.right.y).toBe(BEAM_VIEW.pivotY); }
      else {
        expect(Math.sign(scene.tiltDeg)).toBe(diff > 0 ? 1 : -1);
        expect(scene.tiltDeg !== 0).toBe(true);
        expect(Math.abs(scene.tiltDeg)).toBeLessThan(BEAM_VIEW.maxTiltDeg);
        // the larger side is the LOWER end (larger y in screen coordinates)
        if (diff > 0) expect(scene.left.y).toBeGreaterThan(scene.right.y); else expect(scene.right.y).toBeGreaterThan(scene.left.y);
      }
      expect(scene.left.x).toBeGreaterThan(0);
      expect(scene.right.x).toBeLessThan(BEAM_VIEW.width);
      expect(scene.left.y).toBeGreaterThan(0);
      expect(scene.left.y).toBeLessThan(BEAM_VIEW.height);
      seen.push({ diff: Math.abs(diff), tilt: Math.abs(scene.tiltDeg) });
    }
    seen.sort((u, v) => u.diff - v.diff);
    for (let i = 1; i < seen.length; i++) expect(seen[i]!.tilt).toBeGreaterThanOrEqual(seen[i - 1]!.tilt);
  });

  it('the inspector says a solution is a solution: the beam is level at x = 4 for 3x + 2 = x + 10, and the solution row is exact', () => {
    const d = deriveBalance({ initial: BALANCE_PRESETS[0]!.spec, steps: [], trial: 4 });
    const rows = balanceRows(d, 0, { ...CANONICAL_BALANCE, trial: 4 });
    const byId = (id: string) => rows.find(r => r.id === id)!;
    expect(byId('left').description.lines[0]!.text).toBe('14');
    expect(byId('right').description.lines[0]!.text).toBe('14');
    expect(byId('diff').description.lines[0]!.text).toBe('0');
    expect(byId('holds').description.lines[0]!.text).toBe('true');
    expect(byId('solution').description.lines[0]!.text).toBe('{4}');
    expect(balanceVerdict(d, 0)).toMatch(/level, so x = 4 is a solution/);
  });

  it('the verdict is a caution for a statement with no solution, and says so for the "0 = c" end of a contradiction', () => {
    const none = BALANCE_PRESETS.find(p => p.id === 'b-none')!;
    const d = deriveBalance({ initial: none.spec, steps: solutionPath(none.spec), trial: 0 });
    expect(balanceCaution(d, 0)).toBe(true);
    const last = d.frames.length - 1;
    expect(balanceFrames(d)[last]!.state.caption).toMatch(/cancelled.*no x/);
    expect(balanceVerdict(d, last)).toMatch(/true exactly when no x/);
    const all = BALANCE_PRESETS.find(p => p.id === 'b-all')!;
    const da = deriveBalance({ initial: all.spec, steps: solutionPath(all.spec), trial: 0 });
    expect(balanceCaution(da, 0)).toBe(false);
    expect(balanceVerdict(da, da.frames.length - 1)).toMatch(/every x/);
  });

  it('the solution set scene follows the set', () => {
    const d = deriveBalance({ initial: BALANCE_PRESETS.find(p => p.id === 'b-ge')!.spec, steps: [{ op: 'add-x', value: -2 }, { op: 'add', value: 1 }, { op: 'divide', value: 3 }], trial: 0 });
    expect(d.finalSolution).toMatchObject({ kind: 'ray', side: 'above', closed: true });
    expect(setScene(d.finalSolution)).toEqual({ kind: 'ray', bound: 3, side: 'above', closed: true });
    expect(setScene(deriveBalance({ initial: BALANCE_PRESETS[0]!.spec, steps: [], trial: 0 }).finalSolution)).toEqual({ kind: 'point', point: 4 });
  });

  it('presets are valid statements, the canonical state is the first, and the controls reject out-of-range or too-precise input', () => {
    expect(CANONICAL_BALANCE).toEqual(balanceStateFor(BALANCE_PRESETS[0]!));
    expect(OP_OPTIONS.map(o => o.id)).toEqual(['add', 'add-x', 'scale', 'divide']);
    expect(applyLabel({ op: 'add-x', value: -1 })).toBe('Subtract x from both sides');
    expect(applyLabel({ op: 'add', value: 3 })).toBe('Add 3 to both sides');
    expect(applyLabel({ op: 'divide', value: -3 })).toBe('Divide both sides by −3');
    expect(applyLabel({ op: 'scale', value: 0.5 })).toBe('Multiply both sides by 0.5');
    expect(parseParam(TRIAL_SPEC, '11').ok).toBe(false);
    expect(parseParam(TRIAL_SPEC, '2.125').ok).toBe(false);
    expect(parseParam(AMOUNT_SPEC, '-12').ok).toBe(true);
    expect(parseParam(AMOUNT_SPEC, '13').ok).toBe(false);
    for (const p of BALANCE_PRESETS) expect(() => deriveBalance(balanceStateFor(p))).not.toThrow();
  });

  it('a rejected operation is never stored: tryStep returns the reason', () => {
    const s = CANONICAL_BALANCE;
    const zero = tryStep(s, { op: 'scale', value: 0 });
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.reason).toMatch(/every equation into 0 = 0/);
    const div = tryStep(s, { op: 'divide', value: 0 });
    expect(div.ok).toBe(false);
    if (!div.ok) expect(div.reason).toMatch(/Division by 0/);
  });
});

describe('reversal stage', () => {
  it('every reachable state renders strictly and has non-empty words', () => {
    for (const p of range(-6, 6, 1.5)) for (const q of range(-6, 6, 2)) for (const k of range(-3, 3, 0.5)) {
      const state = { p, q, k };
      const d = deriveReversal(state);
      for (const t of reversalFormulas(d)) expect(() => tex(t), `${p},${q},${k}`).not.toThrow();
      strictRows(reversalRows(d, state));
      expect(reversalVerdict(d).length).toBeGreaterThan(40);
      expect(reversalDescription(d).length).toBeGreaterThan(30);
      expect(reversalSpoken(d).length).toBeGreaterThan(10);
    }
  });
  it('the counterexample is stated, and false, exactly when k < 0 and p ≠ q', () => {
    for (const p of range(-6, 6)) for (const q of range(-6, 6)) for (const k of [-3, -1, -0.5, 0, 0.5, 2]) {
      const d = deriveReversal({ p, q, k });
      const v = reversalVerdict(d);
      expect(/Counterexample/.test(v), `${p},${q},${k}`).toBe(k < 0 && p !== q);
      expect(/REVERSED/.test(v)).toBe(k < 0 && p !== q);
      expect(reversalIsCaution(d)).toBe(k === 0 || (k < 0 && p !== q));
      const scene = reversalScene(d);
      expect(scene.kp).toBe(k * p + 0);
      expect(scene.kq).toBe(k * q + 0);
    }
  });
  it('the canonical wording', () => {
    const d = deriveReversal({ p: 2, q: 5, k: -2 });
    expect(reversalVerdict(d)).toMatch(/"2 < 5" becomes "−4 > −10"/);
    expect(reversalVerdict(d)).toMatch(/"−4 < −10", and that is false/);
    expect(reversalVerdict(deriveReversal({ p: 2, q: 5, k: 0 }))).toMatch(/rejected/);
    expect(reversalVerdict(deriveReversal({ p: 2, q: 5, k: 3 }))).toMatch(/order is kept/);
  });
  it('presets and specs', () => {
    for (const p of REVERSAL_PRESETS) expect(() => deriveReversal(p.state)).not.toThrow();
    expect(REVERSAL_PRESETS.some(p => p.state.k === 0)).toBe(true);
    expect(parseParam(K_SPEC, '4').ok).toBe(false);
    expect(parseParam(P_SPEC, '-6').ok).toBe(true);
    expect(parseParam(Q_SPEC, '7').ok).toBe(false);
  });
});

describe('extraneous-roots stage', () => {
  const all: { p: number; q: number }[] = [];
  for (const p of range(-6, 6)) for (const q of range(-6, 6)) all.push({ p, q });

  it('every (p, q) renders strictly and has non-empty words', () => {
    for (const state of all) {
      const d = deriveExtraneous(state);
      for (const t of extraneousFormulas(d)) expect(() => tex(t), JSON.stringify(state)).not.toThrow();
      strictRows(extraneousRows(d, state));
      expect(extraneousVerdict(d).length).toBeGreaterThan(40);
      expect(extraneousDescription(d).length).toBeGreaterThan(40);
      expect(extraneousSpoken(d).length).toBeGreaterThan(10);
      expect(squaredText(d)).toMatch(/^x² .*= 0$|^x² = 0$/);
    }
  });

  it('every marked root lies on the line y = x + q, on the solid branch when valid and the dashed branch when extraneous', () => {
    for (const state of all) {
      const d = deriveExtraneous(state);
      const marks = extraneousMarks(d);
      expect(marks).toHaveLength(d.roots.length);
      marks.forEach((m, i) => {
        expect(m.at.y).toBeCloseTo(m.at.x + state.q, 9);
        expect(Math.abs(m.at.y)).toBeCloseTo(Math.sqrt(m.at.x + state.p), 7);
        expect(m.valid).toBe(d.roots[i]!.status === 'valid');
        expect(m.valid ? m.at.y >= -1e-9 : m.at.y < 0).toBe(true);
      });
      expect(extraneousIsCaution(d)).toBe(d.extraneousCount > 0 || d.roots.length === 0);
    }
  });

  it('the curves depend on p, q and the window only, and are the same polylines when asked twice', () => {
    expect(extraneousCurves(2, 0)).toEqual(extraneousCurves(2, 0));
    expect(extraneousCurves(2, 0).upper).not.toEqual(extraneousCurves(3, 0).upper);
    expect(extraneousCurves(2, 0).line).not.toEqual(extraneousCurves(2, 1).line);
    for (const line of extraneousCurves(2, 0).upper) for (const pt of line) expect(pt.y).toBeGreaterThanOrEqual(0);
    for (const line of extraneousCurves(2, 0).lower) for (const pt of line) expect(pt.y).toBeLessThanOrEqual(0);
  });

  it('exact forms and the canonical wording', () => {
    expect(sumForm(radicalSum(rational(1n, 2n), rational(1n, 2n), 5n)).text).toBe('(1 + √5)/2');
    expect(sumForm(radicalSum(rational(1n, 2n), rational(-1n, 2n), 5n)).tex).toBe('\\frac{1-\\sqrt{5}}{2}');
    expect(sumForm(radicalSum(int(3), int(0), 1n)).text).toBe('3');
    const d = deriveExtraneous({ p: 2, q: 0 });
    expect(extraneousVerdict(d)).toMatch(/Root 1, x = −1: the right-hand side x equals −1, which is negative/);
    expect(extraneousVerdict(d)).toMatch(/Extraneous\./);
    expect(extraneousVerdict(d)).toMatch(/Root 2, x = 2:.*Valid\./);
    expect(squaredText(d)).toBe('x² − x − 2 = 0');
    expect(extraneousVerdict(deriveExtraneous({ p: 0, q: 1 }))).toMatch(/D = −3 is negative|no real root/);
  });
  it('presets and specs', () => {
    for (const p of EXTRANEOUS_PRESETS) expect(() => deriveExtraneous(p.state)).not.toThrow();
    expect(parseParam(EP_SPEC, '7').ok).toBe(false);
    expect(parseParam(EQ_SPEC, '1.5').ok).toBe(false);
    expect(parseParam(EQ_SPEC, '-6').ok).toBe(true);
  });
});

describe('expression stage', () => {
  it('every reachable state renders strictly, with both forms', () => {
    for (const a of range(-3, 3)) for (const b of range(-3, 3)) for (const c of range(-5, 5, 2.5)) for (const x of [-6, -1.5, 0, 2, 6]) for (const form of ['correct', 'slip'] as const) {
      const state = { a, b, c: Math.round(c), x, form };
      const d = deriveDistribute(state);
      for (const t of distributeFormulas(d)) expect(() => tex(t), JSON.stringify(state)).not.toThrow();
      strictRows(distributeRows(d, state));
      expect(distributeVerdict(d).length).toBeGreaterThan(40);
      expect(distributeDescription(d).length).toBeGreaterThan(40);
      expect(distributeSpoken(d).length).toBeGreaterThan(10);
      expect(distributeIsCaution(d)).toBe(!d.agreesHere);
    }
  });
  it('the correct form is always an identity and always agrees; the slip is a contradiction unless a = 1 or c = 0', () => {
    for (const a of range(-3, 3)) for (const b of range(-3, 3)) for (const c of range(-5, 5)) for (const x of [-6, 0, 1, 5.5]) {
      const ok = deriveDistribute({ a, b, c, x, form: 'correct' });
      expect(ok.kind).toBe('identity');
      expect(ok.agreesHere).toBe(true);
      const slip = deriveDistribute({ a, b, c, x, form: 'slip' });
      const harmless = a === 1 || c === 0;
      expect(slip.kind, `${a},${b},${c}`).toBe(harmless ? 'identity' : 'contradiction');
      expect(distributeVerdict(slip), `${a},${b},${c}`).toMatch(harmless ? /harmless here only because|They agree|not by luck/ : /contradiction/);
    }
  });
  it('the scene lines carry the slopes and intercepts of the model', () => {
    const s = distributeScene(deriveDistribute({ a: 2, b: 1, c: 3, x: 2, form: 'slip' }));
    expect(s.lhs).toEqual({ slope: 2, intercept: 6 });
    expect(s.rhs).toEqual({ slope: 2, intercept: 3 });
    expect(s.product).toBe(10);
    expect(s.expanded).toBe(7);
  });
  it('presets and specs', () => {
    for (const p of DISTRIBUTE_PRESETS) expect(() => deriveDistribute(p.state)).not.toThrow();
    expect(parseParam(DA_SPEC, '4').ok).toBe(false);
    expect(parseParam(DB_SPEC, '-3').ok).toBe(true);
    expect(parseParam(DC_SPEC, '6').ok).toBe(false);
    expect(parseParam(DX_SPEC, '2.5').ok).toBe(true);
  });
});

describe('division stage', () => {
  it('every (c, m) renders strictly and has non-empty words', () => {
    for (const c of range(-6, 6)) for (const m of range(-6, 6)) {
      const state = { c, m };
      const d = deriveFallacy(state);
      for (const t of fallacyFormulas(d)) expect(() => tex(t), JSON.stringify(state)).not.toThrow();
      strictRows(fallacyRows(d, state));
      expect(fallacyVerdict(d).length).toBeGreaterThan(40);
      expect(fallacyDescription(d).length).toBeGreaterThan(40);
      expect(fallacySpoken(d).length).toBeGreaterThan(10);
      expect(fallacyIsCaution(d)).toBe(c !== m);
      const marks = fallacyMarks(d);
      expect(marks).toHaveLength(d.solutions.length);
      for (const mk of marks) expect(mk.at.y).toBeCloseTo(mk.at.x * (mk.at.x - c), 9);
      expect(marks.filter(mk => mk.lost)).toHaveLength(c === m ? 0 : 1);
    }
  });
  it('the equation reads x(x − 2) = 3(x − 2), and the c = 0 case does not read like a bracket (x − 0)', () => {
    expect(fallacyText(deriveFallacy({ c: 2, m: 3 }))).toBe('x(x − 2) = 3(x − 2)');
    expect(fallacyText(deriveFallacy({ c: -1, m: 4 }))).toBe('x(x + 1) = 4(x + 1)');
    expect(fallacyText(deriveFallacy({ c: 0, m: 2 }))).toBe('x · x = 2x');
    expect(fallacyVerdict(deriveFallacy({ c: 2, m: 3 }))).toMatch(/two solutions, \{2, 3\}.*throws away x = 2.*0 = 0/);
  });
  it('curves depend on (c, m) only', () => {
    expect(fallacyCurves(2, 3)).toEqual(fallacyCurves(2, 3));
    expect(fallacyCurves(2, 3).left).not.toEqual(fallacyCurves(3, 3).left);
  });
  it('presets and specs', () => {
    for (const p of FALLACY_PRESETS) expect(() => deriveFallacy(p.state)).not.toThrow();
    expect(parseParam(FC_SPEC, '7').ok).toBe(false);
    expect(parseParam(FM_SPEC, '-6').ok).toBe(true);
  });
});

describe('worked examples', () => {
  it('every frame renders strictly and is described in words', () => {
    for (const e of WORKED_EXAMPLES) {
      const frames = e.frames();
      expect(frames.length, e.id).toBeGreaterThanOrEqual(4);
      frames.forEach((f, i) => {
        expect(f.index).toBe(i);
        expect(() => tex(f.state.tex), `${e.id} ${i}: ${f.state.tex}`).not.toThrow();
        expect(f.state.caption.length, `${e.id} ${i}`).toBeGreaterThan(20);
      });
    }
  });
  it('the linear examples end by checking the answer in the original statement', () => {
    const solve = WORKED_EXAMPLES.find(e => e.id === 'w-solve')!.frames();
    expect(solve[solve.length - 1]!.state.caption).toMatch(/at x = 4 the left side is 14 and the right side is 14/);
    const frac = WORKED_EXAMPLES.find(e => e.id === 'w-frac')!.frames();
    expect(frac[frac.length - 1]!.state.caption).toMatch(/x = 2\/3/);
    const neg = WORKED_EXAMPLES.find(e => e.id === 'w-neg')!.frames();
    expect(neg.map(f => f.state.caption).join(' ')).toMatch(/relation turns around/);
    expect(neg[neg.length - 2]!.state.text).toBe('x > −2');
  });
  it('the root example finds −1 extraneous and 2 valid; the division example loses x = 2', () => {
    const root = WORKED_EXAMPLES.find(e => e.id === 'w-root')!.frames().map(f => f.state.caption).join(' | ');
    expect(root).toMatch(/x₁ = −1 and x₂ = 2/);
    expect(root).toMatch(/extraneous/);
    expect(root).toMatch(/The solutions of the original equation: x = 2\./);
    const div = WORKED_EXAMPLES.find(e => e.id === 'w-div')!.frames().map(f => f.state.caption).join(' | ');
    expect(div).toMatch(/division by 0/);
    expect(div).toMatch(/IT IS|it IS a solution/i);
  });
  it('example ids are unique', () => {
    expect(new Set(WORKED_EXAMPLES.map(e => e.id)).size).toBe(WORKED_EXAMPLES.length);
  });
});
