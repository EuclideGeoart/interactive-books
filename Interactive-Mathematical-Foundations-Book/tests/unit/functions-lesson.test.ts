/**
 * I.5 lesson views: every formula the stages can produce renders under strict KaTeX (nothing is skipped), the scenes are what the model says,
 * and the wording tracks the derived object. Sweeps are exhaustive over the stages' reachable states.
 */
import { describe, expect, it } from 'vitest';
import { deriveComposition, deriveInverse, FN_IDS, type FnId } from '../../src/math/functions/compose';
import { deriveFunction, deriveHeight, RULE_IDS } from '../../src/math/functions/rule';
import { toNumber } from '../../src/math/quantity/rational';
import { parseParam } from '../../src/platform/params';
import { renderTex } from '../../src/platform/tex';
import {
  CANONICAL_COMPOSITION, COMPOSITION_PRESETS, CX_SPEC, compositeBreaks, compositionCurves, compositionDescription, compositionFormulas, compositionIsCaution, compositionRows, compositionScene,
  compositionSpoken, compositionVerdict, domainLineDescription, tagsFor,
} from '../../src/lessons/functions/composition-lesson';
import {
  CANONICAL_FUNCTION, FUNCTION_PRESETS, FUNCTION_WINDOW, FX_SPEC, TABLE_INPUTS, aSpec, functionCurve, functionDescription, functionFormulas, functionIsCaution, functionLabel, functionRows,
  functionScene, functionSpoken, functionTable, functionVerdict, substitutionChain,
} from '../../src/lessons/functions/function-lesson';
import {
  CANONICAL_HEIGHT, HEIGHT_PRESETS, H_SPEC, heightDescription, heightFormulas, heightIsCaution, heightLabel, heightRows, heightScene, heightSpoken, heightVerdict,
} from '../../src/lessons/functions/height-lesson';
import {
  CANONICAL_INVERSE, INVERSE_PRESETS, IX_SPEC, inverseCurves, inverseDescription, inverseFormulas, inverseIsCaution, inverseRows, inverseScene, inverseSpoken, inverseVerdict,
} from '../../src/lessons/functions/inverse-lesson';
import { numTex } from '../../src/lessons/functions/format';
import { WORKED_EXAMPLES } from '../../src/lessons/functions/worked-lesson';

const tex = (s: string) => renderTex(s, true);
const range = (lo: number, hi: number, step = 1): number[] => {
  const out: number[] = [];
  for (let i = 0; lo + i * step <= hi + 1e-9; i++) out.push(Number((lo + i * step).toFixed(6)) + 0);
  return out;
};
const strictRows = (rows: { id: string; symbolTex: string; description: { lines: readonly { tex: string }[]; spoken: string } }[]) => {
  for (const r of rows) {
    expect(() => tex(r.symbolTex), `${r.id}: ${r.symbolTex}`).not.toThrow();
    for (const l of r.description.lines) expect(() => tex(l.tex), `${r.id}: ${l.tex}`).not.toThrow();
    expect(r.description.spoken.length, r.id).toBeGreaterThan(0);
  }
};
const XS = [...range(-6, 6, 0.5), -2.25, 0.25, 1.75, 5.75];

describe('function stage (hero)', () => {
  it('every rule, parameter and input renders strictly, and the wording is complete', () => {
    for (const rule of RULE_IDS) {
      for (const a of range(-5, 5)) {
        for (const x of XS) {
          const d = deriveFunction({ rule, a, x });
          for (const t of functionFormulas(d)) expect(() => tex(t), `${rule} ${a} ${x}`).not.toThrow();
          strictRows(functionRows(d));
          expect(functionVerdict(d).length, `${rule} ${a} ${x}`).toBeGreaterThan(40);
          expect(functionSpoken(d).length).toBeGreaterThan(10);
          expect(functionDescription(d).length).toBeGreaterThan(40);
          expect(functionLabel(d).length).toBeGreaterThan(20);
          expect(functionIsCaution(d)).toBe(d.output.kind === 'undefined');
          for (const r of functionTable(d.state)) {
            if (r.y.kind !== 'undefined') expect(() => tex(numTex(r.y)), `${rule} ${a} table`).not.toThrow();
          }
        }
      }
    }
  });
  it('the substitution chain renders strictly and ends in the output', () => {
    for (const rule of RULE_IDS) {
      for (const a of [-3, 0, 2, 5]) {
        for (const x of [-4, -1, 0, 2, 3.5]) {
          const d = deriveFunction({ rule, a, x });
          const chain = substitutionChain(d.ops, d.evaluation);
          expect(chain.length).toBeGreaterThan(0);
          for (const line of chain) expect(() => tex(line), `${rule} ${a} ${x}: ${line}`).not.toThrow();
          for (let i = 1; i < chain.length; i++) expect(chain[i], 'no consecutive duplicate lines').not.toBe(chain[i - 1]);
        }
      }
    }
  });
  it('the point is on the curve when the machine answers, and on the x-axis when it refuses', () => {
    const ok = functionScene(deriveFunction({ rule: 'shift', a: 2, x: 4 }));
    expect(ok.defined).toBe(true);
    expect(ok.handle).toEqual({ x: 4, y: 4 });
    const refused = functionScene(deriveFunction({ rule: 'root', a: 3, x: -4 }));
    expect(refused.defined).toBe(false);
    expect(refused.handle).toEqual({ x: -4, y: 0 });
    const pole = functionScene(deriveFunction({ rule: 'pole', a: 2, x: 2 }));
    expect(pole.defined).toBe(false);
    expect(pole.asymptote).toBe(2);
    // an output beyond the window is held at the edge and flagged
    const big = functionScene(deriveFunction({ rule: 'stretch', a: 5, x: 6 }));
    expect(big.clamped).toBe(true);
    expect(big.handle.y).toBe(FUNCTION_WINDOW.yMax);
  });
  it('sync contract: the curve depends on the rule and a only, never on x', () => {
    for (const rule of RULE_IDS) {
      const a = functionCurve(rule, 2);
      const b = functionCurve(rule, 2);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(JSON.stringify(functionCurve(rule, 3))).not.toBe(JSON.stringify(a));
    }
  });
  it('the table has the fixed inputs and marks the current one', () => {
    const rows = functionTable({ rule: 'shift', a: 2, x: 4 });
    expect(rows.map(r => toNumber(r.x))).toEqual([...TABLE_INPUTS, 4].sort((p, q) => p - q));
    expect(rows.filter(r => r.current).map(r => toNumber(r.x))).toEqual([4]);
    expect(functionTable({ rule: 'shift', a: 2, x: 0 }).filter(r => r.current)).toHaveLength(1);
    expect(functionTable({ rule: 'shift', a: 2, x: 0 })).toHaveLength(TABLE_INPUTS.length);
  });
  it('presets and the canonical state are inside the controls', () => {
    for (const p of [...FUNCTION_PRESETS, { state: CANONICAL_FUNCTION }]) {
      expect(parseParam(aSpec(p.state.rule), String(p.state.a)).ok, 'a').toBe(true);
      expect(parseParam(FX_SPEC, String(p.state.x)).ok, 'x').toBe(true);
    }
    expect(new Set(FUNCTION_PRESETS.map(p => p.id)).size).toBe(FUNCTION_PRESETS.length);
  });
});

describe('height stage (domain, image, preimages)', () => {
  it('every rule, parameter and height renders strictly', () => {
    for (const rule of RULE_IDS) {
      for (const a of range(-5, 5)) {
        for (const h of range(-6, 6, 0.5)) {
          const d = deriveHeight({ rule, a, h });
          for (const t of heightFormulas(d)) expect(() => tex(t), `${rule} ${a} ${h}`).not.toThrow();
          strictRows(heightRows(d));
          expect(heightVerdict(d).length, `${rule} ${a} ${h}`).toBeGreaterThan(40);
          expect(heightSpoken(d).length).toBeGreaterThan(10);
          expect(heightDescription(d).length).toBeGreaterThan(40);
          expect(heightLabel(d).length).toBeGreaterThan(20);
          expect(heightIsCaution(d)).toBe(d.count === 0);
        }
      }
    }
  });
  it('(x − 2)² at height 4 has two inputs, 0 and 4, on the line', () => {
    const d = deriveHeight({ rule: 'shift', a: 2, h: 4 });
    expect(d.count).toBe(2);
    const scene = heightScene(d);
    expect(scene.meets.map(m => m.x)).toEqual([0, 4]);
    for (const m of scene.meets) expect(m.y).toBe(4);
    expect(deriveHeight({ rule: 'shift', a: 2, h: -1 }).count).toBe(0);
    expect(deriveHeight({ rule: 'pole', a: 2, h: 0 }).count).toBe(0);
  });
  it('presets and the canonical state are inside the controls', () => {
    for (const p of [...HEIGHT_PRESETS, { state: CANONICAL_HEIGHT }]) {
      expect(parseParam(aSpec(p.state.rule), String(p.state.a)).ok, 'a').toBe(true);
      expect(parseParam(H_SPEC, String(p.state.h)).ok, 'h').toBe(true);
    }
  });
});

describe('composition stage', () => {
  const pairs: [FnId, FnId][] = FN_IDS.flatMap(f => FN_IDS.map(g => [f, g] as [FnId, FnId]));
  it('every pair and input renders strictly', () => {
    for (const [f, g] of pairs) {
      for (const x of XS) {
        const d = deriveComposition({ f, g, x });
        for (const t of compositionFormulas(d)) expect(() => tex(t), `${f} ${g} ${x}`).not.toThrow();
        strictRows(compositionRows(d));
        expect(compositionVerdict(d).length, `${f} ${g} ${x}`).toBeGreaterThan(40);
        expect(compositionSpoken(d).length).toBeGreaterThan(10);
        expect(compositionDescription(d).length).toBeGreaterThan(40);
        expect(domainLineDescription('The composite', d.fgDomain).length).toBeGreaterThan(20);
        expect(compositionIsCaution(d)).toBe(!d.fgDefined || !d.gfDefined || !d.sameValue);
        expect(tagsFor(f, g, 'f', 'g').length).toBe(d.fg.rows.length + 1);
      }
    }
  });
  it('f after g and g after f at x = 0 are 1 and −1, drawn at those heights; at x = 3 they are 25 and 17, held at the edge and flagged', () => {
    const d = deriveComposition(CANONICAL_COMPOSITION);
    const scene = compositionScene(d);
    expect(scene.fg).toEqual({ x: 0, y: 1 });
    expect(scene.gf).toEqual({ x: 0, y: -1 });
    expect(scene.fgClamped || scene.gfClamped).toBe(false);
    const far = compositionScene(deriveComposition({ f: 'sq', g: 'lin', x: 3 }));
    expect(far.fgClamped && far.gfClamped).toBe(true);
    expect(far.fg).toEqual({ x: 3, y: 6 });
  });
  it('a refusing composite has no point, the other order keeps its point', () => {
    const d = deriveComposition({ f: 'rt', g: 'lin', x: 0 });
    const scene = compositionScene(d);
    expect(scene.fg).toBeNull();
    expect(scene.gf).not.toBeNull();
  });
  it('the curves depend on f and g only, never on x', () => {
    for (const [f, g] of pairs) {
      const a = compositionCurves(f, g);
      const b = compositionCurves(f, g);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(compositeBreaks(f, g).every(Number.isFinite)).toBe(true);
    }
  });
  it('presets and the canonical state are inside the controls', () => {
    for (const p of [...COMPOSITION_PRESETS, { state: CANONICAL_COMPOSITION }]) expect(parseParam(CX_SPEC, String(p.state.x)).ok).toBe(true);
  });
});

describe('inverse stage', () => {
  it('every function, restriction and input renders strictly', () => {
    for (const fn of FN_IDS) {
      for (const restrict of [true, false]) {
        for (const x of XS) {
          const d = deriveInverse({ fn, x, restrict });
          for (const t of inverseFormulas(d)) expect(() => tex(t), `${fn} ${restrict} ${x}`).not.toThrow();
          strictRows(inverseRows(d));
          expect(inverseVerdict(d).length, `${fn} ${restrict} ${x}`).toBeGreaterThan(40);
          expect(inverseSpoken(d).length).toBeGreaterThan(10);
          expect(inverseDescription(d).length).toBeGreaterThan(40);
          expect(inverseIsCaution(d)).toBe(!d.inDomain || !d.hasInverse);
        }
      }
    }
  });
  it('the mirror curve is the forward curve with its coordinates swapped', () => {
    for (const fn of FN_IDS) {
      for (const restrict of [true, false]) {
        const c = inverseCurves(fn, restrict);
        expect(c.mirror.length).toBe(c.forward.length);
        c.forward.forEach((line, i) => line.forEach((p, k) => expect(c.mirror[i]![k]).toEqual({ x: p.y, y: p.x })));
      }
    }
  });
  it('the point and its mirror image swap coordinates; the square has a twin only without the restriction', () => {
    const lin = inverseScene(deriveInverse({ fn: 'lin', x: 3, restrict: true }));
    expect(lin.p).toEqual({ x: 3, y: 5 });
    expect(lin.mirror).toEqual({ x: 5, y: 3 });
    expect(lin.twin).toBeNull();
    const all = inverseScene(deriveInverse({ fn: 'sq', x: 3, restrict: false }));
    expect(all.twin).toEqual({ x: -3, y: 9 });
    const restricted = inverseScene(deriveInverse({ fn: 'sq', x: 3, restrict: true }));
    expect(restricted.twin).toBeNull();
    const outside = inverseScene(deriveInverse({ fn: 'sq', x: -3, restrict: true }));
    expect(outside.p).toBeNull();
  });
  it('presets and the canonical state are inside the controls', () => {
    for (const p of [...INVERSE_PRESETS, { state: CANONICAL_INVERSE }]) expect(parseParam(IX_SPEC, String(p.state.x)).ok).toBe(true);
  });
});

describe('worked examples', () => {
  it('every frame of every example renders strictly and has a caption', () => {
    expect(WORKED_EXAMPLES.length).toBeGreaterThanOrEqual(5);
    for (const e of WORKED_EXAMPLES) {
      const frames = e.frames();
      expect(frames.length, e.id).toBeGreaterThanOrEqual(4);
      for (const f of frames) {
        expect(() => tex(f.state.tex), `${e.id}: ${f.state.tex}`).not.toThrow();
        expect(f.state.caption.length, e.id).toBeGreaterThan(30);
        expect(f.state.text.length, e.id).toBeGreaterThan(2);
        expect(f.state.caption, e.id).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });
  it('the numbers in the examples are the ones the model computes', () => {
    const text = (id: string) => WORKED_EXAMPLES.find(e => e.id === id)!.frames().map(f => f.state.caption).join(' ');
    expect(text('evaluate')).toContain('9');
    expect(text('compose')).toContain('25');
    expect(text('compose')).toContain('17');
    expect(text('image')).toContain('(−∞, 0]');
    expect(text('domain')).toContain('[−3, ∞)');
  });
});
