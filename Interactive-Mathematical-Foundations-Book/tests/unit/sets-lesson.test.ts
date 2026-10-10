/**
 * The I.7 view layer: every string the stages render is built from the models, so this file checks that
 *  - every LaTeX string survives strict KaTeX on the EDGE states (empty set, whole line, single point, both rays, reversed ends, empty factors…),
 *  - the picture agrees with the model (the Venn regions highlighted for an operation hold exactly the elements the model gives, tokens never overlap
 *    and sit in the right region of the drawing),
 *  - the sentences say the right thing at the adjacency cases, and each exercise's answer is confirmed by the model, not only by its author,
 *  - the worked traces contain independently known numbers.
 */
import { describe, expect, it } from 'vitest';
import { renderTex } from '../../src/platform/tex';
import { exactDecimal } from '../../src/math/families/rational';
import { FULL_MASK, SET_OPS, UNIVERSE, maskOf, deriveSets } from '../../src/math/sets/finite';
import { setText } from '../../src/math/sets/intervals';
import { deriveProduct, productMask } from '../../src/math/sets/product';
import { presetState, deriveRelation } from '../../src/math/sets/relations';
import {
  OPS, SETS_PRESETS, VENN, opInfo, selectedMatchesRegions, setsDescription, setsFacts, setsFormulas, setsRows, setsSpoken, setsVerdict, vennTokens,
} from '../../src/lessons/sets/sets-lesson';
import {
  CANONICAL_INTERVALS, DECIMALS, END_EDITORS, INTERVAL_OP_INFO, INTERVAL_PRESETS, deriveIntervals, intervalDescription, intervalFormulas, intervalRows, intervalSpoken, intervalVerdict, lineRows, membershipSentence, withEnd,
  type EndKind, type IntervalOp, type IntervalsState,
} from '../../src/lessons/sets/interval-lesson';
import {
  PRODUCT_PRESETS, productDescription, productFormulas, productRows, productSpoken, productTables, productVerdict,
} from '../../src/lessons/sets/product-lesson';
import {
  CANONICAL_RELATION_LESSON, RELATION_PRESETS, applyPreset, cellLabel, deriveRelationLesson, equivalenceLine, functionLine, highlights, propertyLines, relationDescription, relationRows, relationSpoken, relationVerdict, resized, toggled,
  type FocusId, type RelationLessonState,
} from '../../src/lessons/sets/relation-lesson';
import { WORKED_EXAMPLES, workedFrames } from '../../src/lessons/sets/worked-lesson';
import { EXERCISES } from '../../src/lessons/sets/exercises';
import { braces } from '../../src/lessons/sets/view';

const tex = (s: string) => expect(() => renderTex(s, true), s).not.toThrow();
const nbsp = (s: string) => s.replace(/\s+/g, ' ');

// ------------------------------------------------------------------------------------------------ the finite-sets stage
describe('sets stage: the picture agrees with the model', () => {
  const samples = [0, FULL_MASK, 0b101010101010, 0b000000011111, 0b000011110000];
  let seed = 99;
  const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % (FULL_MASK + 1); };
  const states = [
    ...samples.flatMap(a => samples.map(b => ({ a, b }))),
    ...Array.from({ length: 300 }, () => ({ a: next(), b: next() })),
  ];
  it('for every operation, the highlighted regions hold exactly the model\'s result', () => {
    for (const st of states) for (const op of SET_OPS) expect(selectedMatchesRegions(deriveSets({ ...st, op })), `${st.a},${st.b},${op}`).toBe(true);
  });
  it('twelve tokens, one per element, inside the box; tokens never overlap; each sits in the right part of the drawing', () => {
    const { ax, bx, cy, r, token, width, height } = VENN;
    const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x1 - x2, y1 - y2);
    for (const st of states) {
      const d = deriveSets({ ...st, op: 'union' });
      const tokens = vennTokens(d);
      expect(tokens.map(t => t.element)).toEqual([...UNIVERSE]);
      for (const t of tokens) {
        expect(t.x - token).toBeGreaterThanOrEqual(0);
        expect(t.x + token).toBeLessThanOrEqual(width);
        expect(t.y - token).toBeGreaterThanOrEqual(0);
        expect(t.y + token).toBeLessThanOrEqual(height);
        const inA = dist(t.x, t.y, ax, cy) + token <= r;
        const inB = dist(t.x, t.y, bx, cy) + token <= r;
        const outA = dist(t.x, t.y, ax, cy) - token >= r;
        const outB = dist(t.x, t.y, bx, cy) - token >= r;
        if (t.region === 'onlyA') expect(inA && outB, `onlyA ${t.element} at ${t.x},${t.y}`).toBe(true);
        if (t.region === 'both') expect(inA && inB, `both ${t.element} at ${t.x},${t.y}`).toBe(true);
        if (t.region === 'onlyB') expect(inB && outA, `onlyB ${t.element} at ${t.x},${t.y}`).toBe(true);
        if (t.region === 'neither') expect(outA && outB, `neither ${t.element} at ${t.x},${t.y}`).toBe(true);
      }
      for (let i = 0; i < tokens.length; i++) for (let j = i + 1; j < tokens.length; j++) {
        expect(dist(tokens[i]!.x, tokens[i]!.y, tokens[j]!.x, tokens[j]!.y), `${tokens[i]!.element} vs ${tokens[j]!.element}`).toBeGreaterThanOrEqual(2 * token);
      }
    }
  });
  it('rows, facts, formulas, verdict and speech are plain, exact and strict-KaTeX clean for every preset and operation', () => {
    for (const p of SETS_PRESETS) for (const op of SET_OPS) {
      const d = deriveSets({ ...p.state, op });
      for (const row of setsRows(d)) { tex(row.symbolTex); expect(row.description.lines.every(l => l.relation === '=')).toBe(true); }
      for (const f of setsFormulas(d)) tex(f.tex);
      expect(setsFacts(d)).toHaveLength(4);
      for (const text of [setsVerdict(d), setsSpoken(d), setsDescription(d)]) { expect(text).not.toMatch(/undefined|NaN|\[object|\.\.|null/); }
      expect(setsDescription(d)).toMatch(/not to scale/);
    }
  });
  it('operations are labelled with U written out, and every operation has a name and a spoken form', () => {
    expect(OPS).toHaveLength(SET_OPS.length);
    expect(opInfo('complement-a').tex).toBe('U\\setminus A');
    expect(OPS.every(o => o.aria.length > 10 && o.name.length > 0)).toBe(true);
  });
  it('the canonical state reads correctly', () => {
    const d = deriveSets(SETS_PRESETS[0]!.state);
    expect(nbsp(setsVerdict(d))).toContain('A ∪ B = {1, 2, 3, 4, 5, 6, 7}');
    const facts = setsFacts(d);
    expect(facts.find(f => f.id === 'a-in-b')).toMatchObject({ holds: false });
    expect(facts.find(f => f.id === 'a-in-b')!.why).toBe('1 is in A but not in B');
    const [ie] = setsFormulas(d);
    expect(ie!.tex).toContain('5+4-2=7');
    expect(braces([]).tex).toBe('\\varnothing');
  });
  it('the empty set and the whole universe are written without Unicode TeX', () => {
    for (const st of [{ a: 0, b: 0 }, { a: FULL_MASK, b: FULL_MASK }, { a: 0, b: FULL_MASK }]) for (const op of SET_OPS) {
      for (const f of setsFormulas(deriveSets({ ...st, op }))) { tex(f.tex); expect(f.tex).not.toMatch(/[^\x20-\x7e]/); }
    }
    // the complement of the whole universe is the empty set, written \varnothing
    expect(setsFormulas(deriveSets({ a: FULL_MASK, b: FULL_MASK, op: 'union' })).map(f => f.tex).join(' ')).toContain('\\varnothing');
  });
});

// ------------------------------------------------------------------------------------------------ the interval stage
const iv = (over: Partial<IntervalsState>): IntervalsState => ({ ...CANONICAL_INTERVALS, ...over });
describe('interval stage', () => {
  it('canonical state: (0,1) ∪ (1,2) with the test point 1, which is in neither', () => {
    const d = deriveIntervals(CANONICAL_INTERVALS);
    expect(d.result).toHaveLength(2);
    expect(d.inResult.member).toBe(false);
    expect(d.inResult.kind).toBe('open-end');
    const v = intervalVerdict(d);
    expect(v.caution).toBe(true);
    expect(v.text).toMatch(/belongs to neither/);
    expect(membershipSentence('A ∪ B', d.result, d.inResult, d.x)).toMatch(/hole/);
  });
  it('every adjacency case is explained correctly', () => {
    const touch = (bKind: EndKind, cKind: EndKind) => intervalVerdict(deriveIntervals(iv({ aKind: 'closed', bKind, cKind, dKind: 'open', a: 0, b: 1, c: 1, d: 2 })));
    expect(touch('open', 'open').text).toMatch(/neither/); // [0,1) and (1,2): 1 is in neither
    expect(touch('closed', 'open').text).toMatch(/belongs to one of them.*single interval \[0, 2\)/); // [0,1] and (1,2)
    expect(touch('open', 'closed').text).toMatch(/belongs to one of them.*single interval \[0, 2\)/); // [0,1) and [1,2)
    expect(touch('closed', 'closed').text).toMatch(/overlap.*\[0, 2\)/); // [0,1] and [1,2) share the point 1
    const apart = intervalVerdict(deriveIntervals(iv({ a: 0, b: 1, c: 3, d: 4, op: 'union' })));
    expect(apart.text).toMatch(/gap/);
    const overlap = intervalVerdict(deriveIntervals(iv({ a: 0, b: 2, c: 1, d: 3, op: 'union' })));
    expect(overlap.text).toMatch(/overlap/);
  });
  it('intersections: a single point, empty with the right reason', () => {
    const point = intervalVerdict(deriveIntervals(iv({ aKind: 'closed', bKind: 'closed', cKind: 'closed', dKind: 'closed', op: 'intersection' })));
    expect(point.text).toBe('A ∩ B = {1}: a single point, the end that both intervals include.');
    const hole = intervalVerdict(deriveIntervals(iv({ aKind: 'closed', bKind: 'open', cKind: 'closed', dKind: 'closed', op: 'intersection' })));
    expect(hole.text).toMatch(/only one of them includes/);
    const neither = intervalVerdict(deriveIntervals(iv({ op: 'intersection' })));
    expect(neither.text).toMatch(/belongs to neither/);
    const far = intervalVerdict(deriveIntervals(iv({ a: 0, b: 1, c: 3, d: 4, op: 'intersection' })));
    expect(far.text).toMatch(/gap/);
  });
  it('reversed ends: the interval is the empty set and the readout says why', () => {
    const d = deriveIntervals(iv({ a: 3, b: 1, aKind: 'closed', bKind: 'closed' }));
    expect(d.A).toHaveLength(0);
    expect(d.emptyA).toMatch(/greater than the right end/);
    const rows = intervalRows(d);
    expect(rows[0]!.description.lines[0]!.text).toBe('∅');
    expect(rows[0]!.description.note).toMatch(/Empty:/);
    expect(intervalVerdict(d).text).toMatch(/empty/);
    expect(nbsp(membershipSentence('A', d.A, d.inA, d.x))).toMatch(/empty set has no members/);
  });
  it('unbounded ends: rays, the whole line, complements', () => {
    const rays = deriveIntervals(iv({ aKind: 'infinite', b: 1, bKind: 'open', c: 1, cKind: 'open', dKind: 'infinite', op: 'union' }));
    expect(rays.result).toHaveLength(2);
    const whole = deriveIntervals(iv({ aKind: 'infinite', bKind: 'infinite', op: 'complement-a' }));
    expect(whole.result).toHaveLength(0);
    expect(intervalVerdict(whole).text).toMatch(/∅/);
    const point = deriveIntervals(iv({ a: 1, b: 1, aKind: 'closed', bKind: 'closed', op: 'complement-a' }));
    expect(point.result).toHaveLength(2);
    expect(intervalVerdict(point).text).toMatch(/2 pieces/);
    const empty = deriveIntervals(iv({ a: 3, b: 1, aKind: 'closed', bKind: 'closed', op: 'complement-a' }));
    expect(intervalVerdict(empty).text).toMatch(/whole line/);
  });
  it('strict KaTeX on every preset × operation and on the edge states; formulas are ASCII TeX', () => {
    const edge: Partial<IntervalsState>[] = [
      {}, { aKind: 'infinite', bKind: 'infinite' }, { a: 1, b: 1, aKind: 'closed', bKind: 'closed' }, { a: 3, b: 1, aKind: 'closed', bKind: 'closed' },
      { aKind: 'infinite', cKind: 'infinite', b: 1, c: 1 }, { a: -5, b: 5, aKind: 'closed', bKind: 'closed', c: -2.75, d: 0.05, cKind: 'open', dKind: 'closed' },
      { a: 0.1, b: 0.3, c: 0.2, d: 0.5, aKind: 'closed', bKind: 'closed', cKind: 'open', dKind: 'closed' }, { a: 1, b: 1, aKind: 'open', bKind: 'closed' },
    ];
    const states = [...INTERVAL_PRESETS.map(p => p.state), ...edge.map(e => iv(e))];
    for (const st of states) for (const op of INTERVAL_OP_INFO.map(o => o.id as IntervalOp)) {
      const d = deriveIntervals({ ...st, op });
      for (const f of intervalFormulas(d)) { tex(f.tex); expect(f.tex, f.tex).not.toMatch(/[^\x20-\x7e]/); }
      for (const row of intervalRows(d)) tex(row.symbolTex);
      for (const text of [intervalVerdict(d).text, intervalSpoken(d), intervalDescription(d)]) expect(text).not.toMatch(/undefined|NaN|\[object|null/);
      for (const row of lineRows(d)) for (const p of row.pieces) {
        if (p.lo !== null && p.hi !== null) expect(p.lo).toBeLessThanOrEqual(p.hi);
      }
    }
  });
  it('typed endpoints with two decimals are exact: 0.1, 0.2, 0.3 behave as the rationals they name', () => {
    const d = deriveIntervals(iv({ a: 0.1, b: 0.3, aKind: 'closed', bKind: 'closed', c: 0.3, d: 0.5, cKind: 'closed', dKind: 'closed', x: 0.3, op: 'intersection' }));
    expect(d.result).toHaveLength(1);
    expect(d.inResult.member).toBe(true);
    expect(d.inResult.kind).toBe('closed-end');
    // x = 0.1 + 0.2 typed as a decimal is 0.3 exactly (typed values are never snapped or rounded)
    expect(exactDecimal(0.3, DECIMALS).num).toBe(3n);
    expect(() => exactDecimal(0.123, DECIMALS)).toThrow();
  });
  it('withEnd edits one end only, and the four editors cover a, b, c and d', () => {
    expect(END_EDITORS.map(e => e.valueKey)).toEqual(['a', 'b', 'c', 'd']);
    const e = END_EDITORS[1]!;
    expect(withEnd(CANONICAL_INTERVALS, e, { value: 4 })).toEqual({ ...CANONICAL_INTERVALS, b: 4 });
    expect(withEnd(CANONICAL_INTERVALS, e, { kind: 'closed' })).toEqual({ ...CANONICAL_INTERVALS, bKind: 'closed' });
  });
  it('every preset does what its label says (the label names the operation and the result is written out here, independently)', () => {
    const expected: Record<string, { a: string; b: string; result: string }> = {
      'open-open': { a: '(0, 1)', b: '(1, 2)', result: '(0, 1) ∪ (1, 2)' },
      'closed-open': { a: '[0, 1]', b: '(1, 2)', result: '[0, 2)' },
      'touch-point': { a: '[0, 1]', b: '[1, 2]', result: '{1}' },
      'touch-empty': { a: '[0, 1)', b: '[1, 2]', result: '∅' },
      'point-complement': { a: '{1}', b: '(1, 2)', result: '(−∞, 1) ∪ (1, ∞)' },
      rays: { a: '(−∞, 1)', b: '(1, ∞)', result: '(−∞, 1) ∪ (1, ∞)' },
      carve: { a: '[0, 5]', b: '(2, 3)', result: '[0, 2] ∪ [3, 5]' },
    };
    for (const p of INTERVAL_PRESETS) {
      const want = expected[p.id];
      if (!want) continue;
      const d = deriveIntervals(p.state);
      expect(setText(d.A), `${p.id}: A`).toBe(want.a);
      expect(setText(d.B), `${p.id}: B`).toBe(want.b);
      expect(setText(d.result), `${p.id}: result`).toBe(want.result);
    }
    expect(INTERVAL_PRESETS.filter(p => expected[p.id]).length).toBe(7);
  });
  it('state is primitives only (so the lesson hook can compare it with Object.is)', () => {
    for (const p of INTERVAL_PRESETS) for (const v of Object.values(p.state)) expect(['number', 'string']).toContain(typeof v);
    expect(Object.keys(INTERVAL_PRESETS[0]!.state)).toEqual(Object.keys(CANONICAL_INTERVALS));
  });
});

// ------------------------------------------------------------------------------------------------ products
describe('product stage', () => {
  it('canonical state and verdict wording', () => {
    const d = deriveProduct(PRODUCT_PRESETS[0]!.state);
    const v = productVerdict(d);
    expect(v.text).toContain('|A × B| = 6 = |A| · |B| = 3 · 2');
    expect(v.text).toMatch(/\(1, 3\) is in A × B, but it is not in B × A/);
    expect(v.caution).toBe(true);
    const [product, reversed] = productTables(d);
    expect(product!.rows).toEqual([1, 2, 3]);
    expect(product!.columns).toEqual([3, 4]);
    expect(reversed!.rows).toEqual([3, 4]);
    expect(reversed!.columns).toEqual([1, 2, 3]);
  });
  it('the cells flagged "only in this product" are exactly the pairs missing from the other one', () => {
    for (let a = 0; a < 64; a += 3) for (let b = 0; b < 64; b += 5) {
      const d = deriveProduct({ a, b });
      const [p, q] = productTables(d);
      const inB = new Set(q!.rows.flatMap(r => q!.columns.map(c => `${r},${c}`)));
      const inA = new Set(p!.rows.flatMap(r => p!.columns.map(c => `${r},${c}`)));
      for (const k of p!.extra) { expect(inA.has(k)).toBe(true); expect(inB.has(k)).toBe(false); }
      for (const k of q!.extra) { expect(inB.has(k)).toBe(true); expect(inA.has(k)).toBe(false); }
      expect(p!.extra.size === 0 && q!.extra.size === 0).toBe(d.commutes);
    }
  });
  it('every preset, including empty factors, reads cleanly and its TeX passes strict KaTeX', () => {
    for (const p of PRODUCT_PRESETS) {
      const d = deriveProduct(p.state);
      for (const f of productFormulas(d)) { tex(f.tex); expect(f.tex).not.toMatch(/[^\x20-\x7e]/); }
      for (const row of productRows(d)) tex(row.symbolTex);
      for (const text of [productVerdict(d).text, productSpoken(d), productDescription(d)]) expect(text).not.toMatch(/undefined|NaN|\[object|null/);
    }
    const empty = deriveProduct({ a: 0, b: productMask([1, 2]) });
    expect(productVerdict(empty).text).toMatch(/no pairs/);
    expect(productFormulas(empty)[1]!.tex).toContain('\\varnothing');
  });
});

// ------------------------------------------------------------------------------------------------ relations
describe('relation stage', () => {
  const lesson = (over: Partial<RelationLessonState> = {}): RelationLessonState => ({ ...CANONICAL_RELATION_LESSON, ...over });
  it('the property lines match the model and carry a witness sentence when they fail', () => {
    const d = deriveRelationLesson(CANONICAL_RELATION_LESSON).d;
    const lines = propertyLines(d);
    expect(lines.map(l => [l.id, l.holds])).toEqual([['reflexive', false], ['symmetric', false], ['antisymmetric', true], ['transitive', true]]);
    expect(lines[0]!.sentence).toMatch(/1 is not related to itself/);
    expect(lines[1]!.sentence).toBe('(1, 2) is in R but (2, 1) is not.');
    expect(equivalenceLine(d)).toMatch(/not an equivalence relation: it is not reflexive and not symmetric/);
  });
  it('an equivalence relation is announced with its classes', () => {
    const d = deriveRelation(presetState('same-parity', 5, 5));
    expect(equivalenceLine(d)).toBe('It is an equivalence relation: it is reflexive, symmetric and transitive, and it splits A into 2 classes: {1, 3, 5}, {2, 4}.');
    expect(relationVerdict(d).text).toContain('13 pairs out of 25');
  });
  it('properties are "not applicable" with a reason when A and B differ in size, and the function test still works', () => {
    const d = deriveRelationLesson(resized(lesson(), 3, 2)).d;
    const lines = propertyLines(d);
    expect(lines.every(l => l.holds === null && /one set/.test(l.sentence))).toBe(true);
    expect(equivalenceLine(d)).toMatch(/same size/);
    expect(functionLine(d).sentence).toMatch(/Yes|No/);
    expect(highlights(d, 'reflexive')).toEqual([]);
  });
  it('function test: names the failing element', () => {
    const none = deriveRelation({ n: 3, k: 2, cells: '100010' });
    expect(functionLine(none)).toEqual({ holds: false, sentence: 'No: 3 is not related to any element of B, so R assigns it no value.' });
    const many = deriveRelation({ n: 2, k: 2, cells: '1110' });
    expect(functionLine(many).sentence).toMatch(/1 is related to 2 elements of B \(1, 2\)/);
    expect(functionLine(deriveRelation(presetState('equal', 4, 4))).holds).toBe(true);
  });
  it('highlighted witness cells are exactly the cells of the witness, with the right present/missing kind', () => {
    const d = deriveRelation(presetState('less', 4, 4));
    expect(highlights(d, 'none')).toEqual([]);
    expect(highlights(d, 'reflexive')).toEqual([{ a: 1, b: 1, kind: 'missing' }]);
    expect(highlights(d, 'symmetric')).toEqual([{ a: 1, b: 2, kind: 'present' }, { a: 2, b: 1, kind: 'missing' }]);
    expect(highlights(d, 'antisymmetric')).toEqual([]);
    const near = deriveRelation({ n: 5, k: 5, cells: (() => { let c = ''; for (let b = 1; b <= 5; b++) for (let a = 1; a <= 5; a++) c += Math.abs(a - b) <= 1 ? '1' : '0'; return c; })() });
    const t = highlights(near, 'transitive');
    expect(t).toHaveLength(3);
    expect(t.filter(h => h.kind === 'missing')).toHaveLength(1);
    const eq = deriveRelation(presetState('equal', 3, 3));
    expect(highlights(eq, 'reflexive')).toEqual([{ a: 1, b: 1, kind: 'present' }, { a: 2, b: 2, kind: 'present' }, { a: 3, b: 3, kind: 'present' }]);
  });
  it('toggling a cell and resizing keep the state valid; presets apply to the current sizes; focus is cleared when sizes change', () => {
    const s = toggled(lesson({ focus: 'reflexive' }), 1, 1);
    expect(deriveRelationLesson(s).d.reflexive!.holds).toBe(false); // (1,1) is now present but 2,2.. are still missing
    expect(s.focus).toBe('reflexive');
    const bigger = resized(s, 6, 6);
    expect(bigger.focus).toBe('none');
    expect(bigger.cells).toHaveLength(36);
    expect(applyPreset(bigger, 'all').cells).toBe('1'.repeat(36));
    const rect = applyPreset(resized(CANONICAL_RELATION_LESSON, 2, 3), 'less');
    expect(rect.cells).toHaveLength(6);
    expect(deriveRelation({ n: 2, k: 3, cells: rect.cells }).pairs).toEqual([[1, 2], [1, 3], [2, 3]]);
  });
  it('every preset, size and focus reads cleanly (no NaN, no raw objects) and the TeX passes strict KaTeX', () => {
    for (const p of RELATION_PRESETS) for (const [n, k] of [[1, 1], [2, 3], [4, 4], [6, 6]] as const) {
      const s = applyPreset({ ...resized(CANONICAL_RELATION_LESSON, n, k), focus: 'none' }, p.id);
      const { d } = deriveRelationLesson(s);
      tex(p.tex);
      for (const row of relationRows(d)) { tex(row.symbolTex); tex(row.description.lines[0]!.tex); }
      for (const text of [relationVerdict(d).text, relationSpoken(d), relationDescription(d), equivalenceLine(d), functionLine(d).sentence, ...propertyLines(d).map(l => l.sentence)]) {
        expect(text).not.toMatch(/undefined|NaN|\[object|null/);
      }
      for (const f of ['reflexive', 'symmetric', 'antisymmetric', 'transitive'] as FocusId[]) {
        for (const h of highlights(d, f)) { expect(h.a).toBeGreaterThanOrEqual(1); expect(h.a).toBeLessThanOrEqual(n); expect(h.b).toBeLessThanOrEqual(n); }
      }
    }
    expect(cellLabel(2, 3, true)).toMatch(/related/);
  });
});

// ------------------------------------------------------------------------------------------------ worked examples
describe('worked examples', () => {
  it('every frame is strict-KaTeX clean and every caption is plain', () => {
    for (const e of WORKED_EXAMPLES) {
      const frames = workedFrames(e.id);
      expect(frames.length).toBeGreaterThanOrEqual(4);
      for (const f of frames) { tex(f.state.tex); expect(f.state.caption).not.toMatch(/undefined|NaN|\[object|\(\s*\)/); }
    }
    expect(() => workedFrames('nope')).toThrow(RangeError);
  });
  it('contain independently known numbers', () => {
    const holes = workedFrames('holes').map(f => f.state.tex);
    expect(holes[2]).toContain('(0,\\,1)\\cup (1,\\,2)');
    expect(holes[4]).toContain('[0,\\,2)');
    expect(workedFrames('holes')[2]!.state.caption).toContain('2 pieces');
    const count = workedFrames('count').map(f => f.state.tex).join(' ');
    expect(count).toContain('5+4-2=7');
    const dm = workedFrames('de-morgan').map(f => f.state.tex).join(' ');
    expect(dm).toContain('\\{7,8,9,10,11,12\\}');
    const parity = workedFrames('parity');
    expect(parity[1]!.state.tex).toContain('13');
    expect(parity.at(-1)!.state.tex).toContain('\\{1,3,5\\}');
    expect(parity.at(-1)!.state.tex).toContain('\\{2,4\\}');
  });
});

// ------------------------------------------------------------------------------------------------ exercises
describe('exercises', () => {
  const byId = (id: string) => EXERCISES.find(e => e.id === id)!;
  const choice = (id: string, c: string) => byId(id).grade({ choice: c });
  const fields = (id: string, a: Record<string, string>) => byId(id).grade(a);

  it('there are at least eight, each with a unique id, a prompt, a worked solution, and a way to answer', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.prompt.length).toBeGreaterThan(30);
      expect(e.solution.length).toBeGreaterThan(40);
      expect(Boolean(e.choices) !== Boolean(e.fields), e.id).toBe(true);
    }
  });
  it('every multiple-choice exercise has exactly one correct choice and a specific hint for each wrong one', () => {
    for (const e of EXERCISES.filter(x => x.choices)) {
      const results = e.choices!.map(c => e.grade({ choice: c.id }));
      expect(results.filter(r => r.correct), e.id).toHaveLength(1);
      expect(new Set(results.map(r => r.message)).size, e.id).toBe(results.length);
      expect(e.grade({}).correct).toBe(false);
    }
  });
  it('the numeric answers are confirmed by the models, not only by their author', () => {
    // union-count by inclusion–exclusion
    expect(fields('union-count', { n: String(20 + 15 - 6) }).correct).toBe(true);
    expect(fields('union-count', { n: '35' }).message).toMatch(/twice/);
    // product-count
    expect(deriveProduct({ a: productMask([1, 2, 3, 4]), b: productMask([1, 2, 3]) }).pairs).toHaveLength(12);
    expect(deriveProduct({ a: productMask([1, 2, 3, 4, 5]), b: productMask([1, 2, 3, 4, 5]) }).pairs).toHaveLength(25);
    expect(fields('product-count', { ab: '12', cc: '25' }).correct).toBe(true);
    expect(fields('product-count', { ab: '7', cc: '25' }).correct).toBe(false);
    expect(fields('product-count', { ab: '12', cc: '10' }).message).toMatch(/unordered/);
    // count-less-than
    const lt = deriveRelation(presetState('less', 6, 6)).size;
    expect(lt).toBe(15);
    expect(fields('count-less-than', { n: String(lt) }).correct).toBe(true);
    expect(fields('count-less-than', { n: '21' }).message).toMatch(/a ≤ b/);
    // de-morgan-count on the universe of the stage
    const d = deriveSets({ a: maskOf([1, 2, 3, 4, 5, 6]), b: maskOf([5, 6, 7, 8, 9]), op: 'union' });
    expect(d.deMorgan.unionComplement).toEqual([10, 11, 12]);
    expect(fields('de-morgan-count', { n: '3' }).correct).toBe(true);
    expect(fields('de-morgan-count', { n: '9' }).message).toMatch(/union/);
    expect(fields('de-morgan-count', { n: '1' }).message).toMatch(/overlap/);
    // split-leak: inclusion–exclusion on the train and test id lists
    expect(fields('split-leak', { n: String(1000 - 30) }).correct).toBe(true);
    expect(fields('split-leak', { n: '1000' }).message).toMatch(/twice/);
    for (const id of ['union-count', 'count-less-than', 'de-morgan-count', 'split-leak']) expect(fields(id, { n: 'abc' }).correct).toBe(false);
  });
  it('the relation exercises: divisibility and "differs by at most 1" are classified as the exercise says', () => {
    const divides = deriveRelation(presetState('divides', 6, 6));
    expect([divides.reflexive!.holds, divides.symmetric!.holds, divides.antisymmetric!.holds, divides.transitive!.holds]).toEqual([true, false, true, true]);
    expect(choice('divides-properties', 'partial-order').correct).toBe(true);
    let cells = '';
    for (let b = 1; b <= 5; b++) for (let a = 1; a <= 5; a++) cells += Math.abs(a - b) <= 1 ? '1' : '0';
    const near = deriveRelation({ n: 5, k: 5, cells });
    expect([near.reflexive!.holds, near.symmetric!.holds, near.antisymmetric!.holds, near.transitive!.holds]).toEqual([true, true, false, false]);
    expect(near.transitive!.witness).toBeTruthy();
    expect(choice('near-not-transitive', 'not-transitive').correct).toBe(true);
    expect(choice('near-not-transitive', 'antisymmetric').correct).toBe(false);
  });
  it('the interval exercises agree with the interval model', () => {
    const pieces = (a: IntervalsState) => deriveIntervals(a).result;
    const lc = { aKind: 'closed', bKind: 'closed', cKind: 'closed', dKind: 'closed' } as const;
    // [0,1] ∪ [1,2] is [0,2]; the other three choices are not
    const joined = pieces(iv({ ...lc }));
    expect(joined).toHaveLength(1);
    expect(joined[0]!.loClosed && joined[0]!.hiClosed).toBe(true);
    expect(pieces(iv({ aKind: 'open', bKind: 'open', cKind: 'open', dKind: 'open' }))).toHaveLength(2);
    expect(pieces(iv({ aKind: 'closed', bKind: 'open', cKind: 'open', dKind: 'closed' }))).toHaveLength(2);
    const halfOpen = pieces(iv({ aKind: 'closed', bKind: 'closed', cKind: 'open', dKind: 'open' }));
    expect(halfOpen).toHaveLength(1);
    expect(halfOpen[0]!.hiClosed).toBe(false);
    expect(choice('join-closed', 'closed-closed').correct).toBe(true);
    // complement of [2,5) = (−∞,2) ∪ [5,∞)
    const comp = deriveIntervals(iv({ a: 2, b: 5, aKind: 'closed', bKind: 'open', op: 'complement-a' })).result;
    expect(comp).toHaveLength(2);
    expect(comp[0]!.hiClosed).toBe(false);
    expect(comp[1]!.loClosed).toBe(true);
    expect(choice('complement-interval', 'flip').correct).toBe(true);
  });
  it('the product exercise: A × B = B × A exactly when A = B or a factor is empty (checked on all 64 × 64 pairs elsewhere)', () => {
    expect(deriveProduct({ a: productMask([1]), b: productMask([2]) }).commutes).toBe(false);
    expect(deriveProduct({ a: productMask([1, 2]), b: productMask([1, 2]) }).commutes).toBe(true);
    expect(deriveProduct({ a: 0, b: productMask([1, 2]) }).commutes).toBe(true);
    expect(choice('product-commute', 'equal-or-empty').correct).toBe(true);
    expect(choice('product-commute', 'always').message).toMatch(/\(1, 2\)/);
  });
});
