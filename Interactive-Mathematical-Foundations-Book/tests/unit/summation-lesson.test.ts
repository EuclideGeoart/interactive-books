/**
 * The I.8 view layer: every string the stages render is built from the models, so this file checks that
 *  - every LaTeX string survives strict KaTeX on the EDGE states (empty sums, undefined terms, negative and fractional terms, the widest windows),
 *  - the trace, the term table and the cell grid agree with the model (frame k is the k-th partial sum; exactly one current cell),
 *  - presets say what their labels say, and invalid input to the list box is rejected rather than repaired,
 *  - the worked traces contain independently known numbers, and each exercise's answer is confirmed by the model, not only by its author.
 */
import { describe, expect, it } from 'vitest';
import { renderTex } from '../../src/platform/tex';
import { form, q } from '../../src/math/summation/rational';
import { DEFAULT_PARAMS, SEQ_IDS } from '../../src/math/summation/sequences';
import { BOUND_MAX, BOUND_MIN, deriveIdentities, deriveSum, termCount } from '../../src/math/summation/sum';
import { NESTED_MAX, cellsInOrder, deriveNested, type NestedKind, type NestedOrder, type NestedRule } from '../../src/math/summation/nested';
import {
  CANONICAL_SUM, DEFAULT_LIST_TEXT, SEQ_OPTIONS, SUM_PRESETS, bodyTex, deriveSumLesson, expansionTex, loopCode, parseList, paramsOf, pythonSentence, sigmaTex, sumDescription, sumFormulas,
  sumPresetMatches, sumRows, sumSpoken, sumVerdict, type SumLessonState,
} from '../../src/lessons/summation/sum-lesson';
import { CANONICAL_LOOPS, LOOP_PRESETS, LOOP_SEQS, deriveLoopLesson, loopPresetMatches, loopRows, loopSpoken, loopVerdict } from '../../src/lessons/summation/loops-lesson';
import {
  CANONICAL_NESTED, NESTED_PRESETS, cellState, deriveNestedLesson, doubleSumTex, nestedCode, nestedFormulas, nestedGridDescription, nestedPresetMatches, nestedRows, nestedSpoken, nestedVerdict,
  type NestedLessonState,
} from '../../src/lessons/summation/nested-lesson';
import {
  CANONICAL_IDENTITIES, IDENTITY_PRESETS, deriveIdentityLesson, gaussLines, identityPresetMatches, identityRows, identitySpoken, linearityFormulas, linearitySentence, shiftFormulas, shiftSentence,
} from '../../src/lessons/summation/identity-lesson';
import { WORKED_EXAMPLES, workedFrames } from '../../src/lessons/summation/worked-lesson';
import { EXERCISES } from '../../src/lessons/summation/exercises';
import { qAscii, qDescription } from '../../src/lessons/summation/view';

const tex = (s: string) => expect(() => renderTex(s, true), s).not.toThrow();
const plain = (s: string) => expect(s, s).not.toMatch(/NaN|\[object|Infinity|\bnull\b|\(\s*\)|\$/);
const S = (over: Partial<SumLessonState>): SumLessonState => ({ ...CANONICAL_SUM, ...over });

// ------------------------------------------------------------------------------------------------ the hero stage
describe('sum stage: presets say what their labels say', () => {
  const expected: Record<string, { total: string | null; count: number }> = {
    'first-five': { total: '15', count: 5 },
    squares: { total: '55', count: 5 },
    'through-zero': { total: '0', count: 7 },
    alternating: { total: '−1', count: 5 },
    geometric: { total: '31/16', count: 5 },
    'ratio-one': { total: '5', count: 5 },
    empty: { total: '0', count: 0 },
    single: { total: '4', count: 1 },
    undefined: { total: null, count: 6 },
    list: { total: '13/2', count: 4 },
    'list-past-end': { total: null, count: 6 },
  };
  it('every preset has an expected value in this table, and the model gives it', () => {
    expect(Object.keys(expected).sort()).toEqual(SUM_PRESETS.map(p => p.id).sort());
    for (const p of SUM_PRESETS) {
      const d = deriveSumLesson(p.state).d;
      const e = expected[p.id]!;
      expect(d.total === null ? null : form(d.total).text, p.id).toBe(e.total);
      expect(d.count === 0 ? 0 : p.state.n - p.state.m + 1, p.id).toBe(e.count);
    }
  });
  it('the preset labels and the pressed state are consistent: exactly the current state is pressed, the canonical one at the start', () => {
    expect(SUM_PRESETS.filter(p => sumPresetMatches(CANONICAL_SUM, p)).map(p => p.id)).toEqual(['first-five']);
    for (const p of SUM_PRESETS) expect(SUM_PRESETS.filter(x => sumPresetMatches(p.state, x)).map(x => x.id), p.id).toEqual([p.id]);
  });
  it('the empty preset really has n < m, the single preset really has one term, the undefined preset fails at the first i = 0', () => {
    const empty = deriveSumLesson(SUM_PRESETS.find(p => p.id === 'empty')!.state).d;
    expect(empty.empty).toBe(true);
    expect(empty.total).toEqual(q(0));
    expect(deriveSumLesson(SUM_PRESETS.find(p => p.id === 'single')!.state).d.count).toBe(1);
    expect(deriveSumLesson(SUM_PRESETS.find(p => p.id === 'undefined')!.state).d.failure?.i).toBe(0);
    expect(deriveSumLesson(SUM_PRESETS.find(p => p.id === 'list-past-end')!.state).d.failure).toMatchObject({ i: 5, pythonError: 'IndexError' });
  });
});

describe('sum stage: the trace and the table agree with the model', () => {
  it('frame k holds the k-th partial sum, frames are frozen, and the last frame is the total', () => {
    for (const p of SUM_PRESETS) {
      const lesson = deriveSumLesson(p.state);
      const { d, frames } = lesson;
      expect(frames.every(f => Object.isFrozen(f) && Object.isFrozen(f.state)), p.id).toBe(true);
      expect(frames[0]!.state).toMatchObject({ k: 0, i: null, afterText: '0' });
      if (d.failure === null) {
        expect(frames).toHaveLength(d.count + 1);
        expect(frames.at(-1)!.state.afterText).toBe(form(d.total!).text);
        frames.forEach((f, k) => expect(f.state.k).toBe(k));
      } else {
        const last = frames.at(-1)!.state;
        expect(last.error).not.toBeNull();
        expect(last.python).toBe(d.failure.pythonError);
        expect(last.i).toBe(d.failure.i);
        expect(last.afterText).toBe(frames.at(-2)!.state.afterText); // acc is unchanged at the failing term
      }
    }
  });
  it('a failing term is shown as undefined, never as 0 and never skipped', () => {
    const lesson = deriveSumLesson(S({ seq: 'reciprocal', m: -2, n: 3 }));
    expect(lesson.d.rows.map(r => r.term === null)).toEqual([false, false, true, false, false, false]);
    expect(lesson.frames.map(f => f.state.i)).toEqual([null, -2, -1, 0]);
    const rows = sumRows(lesson);
    expect(rows.find(r => r.id === 'sum')!.description.status).toBe('undefined');
    expect(rows.find(r => r.id === 'sum')!.description.lines[0]!.text).toBe('undefined');
    expect(sumVerdict(lesson).caution).toBe(true);
    expect(sumVerdict(lesson).text).toMatch(/never read as 0/);
    expect(sumSpoken(lesson)).toMatch(/undefined/);
    expect(sumDescription(lesson)).toBe('undefined');
  });
  it('the list that wraps silently is said to wrap, and the one past the end is said to raise', () => {
    expect(pythonSentence('no error (a negative index wraps)')).toMatch(/silently/);
    expect(pythonSentence('IndexError')).toMatch(/raises IndexError/);
    const wrap = deriveSumLesson(S({ seq: 'list', m: 0, n: 2 }));
    expect(wrap.d.failure?.pythonError).toMatch(/^no error/);
    expect(wrap.frames.at(-1)!.state.caption).toMatch(/silently read a different entry/);
  });
  it('rows are exact: "=" lines, "≈" only after an "=" for a fraction, and no rounded double stands in for a value', () => {
    for (const p of SUM_PRESETS) {
      for (const row of sumRows(deriveSumLesson(p.state))) {
        tex(row.symbolTex);
        const rels = row.description.lines.map(l => l.relation);
        expect(rels[0], `${p.id} ${row.id}`).toBe('=');
        if (rels.length === 2) expect(rels[1]).toBe('≈');
        for (const l of row.description.lines) { plain(l.text); if (row.description.status !== 'undefined') tex(l.tex); }
      }
    }
    const frac = qDescription(q(31, 16));
    expect(frac.lines.map(l => l.relation)).toEqual(['=', '≈']);
    expect(frac.lines[0]!.text).toBe('31/16');
    expect(frac.lines[1]!.text).toBe('1.937500');
    expect(qDescription(q(-7)).lines).toHaveLength(1);
  });
  it('strict-KaTeX clean for every sequence, many windows, ratios and the widest range', () => {
    const windows: [number, number][] = [[1, 5], [-5, 20], [0, 0], [5, 2], [-3, 3], [20, 20], [-5, -5], [2, 9]];
    const ratios = [0.5, 1, -1, 2, 0, -0.5, 4.99, 0.01, -5, 5];
    let checked = 0;
    for (const o of SEQ_OPTIONS) for (const [m, n] of windows) for (const r of ratios) {
      const lesson = deriveSumLesson(S({ seq: o.id, m, n, r }));
      for (const f of sumFormulas(lesson)) tex(f.tex);
      for (const f of lesson.frames) { tex(f.state.tex); plain(f.state.caption); }
      tex(sigmaTex(lesson.state, lesson.params));
      tex(bodyTex(lesson.state, lesson.params));
      plain(sumVerdict(lesson).text);
      plain(sumSpoken(lesson));
      plain(loopCode(lesson));
      checked++;
    }
    expect(checked).toBe(SEQ_OPTIONS.length * windows.length * ratios.length);
  });
  it('the expansion lists every term up to seven and abbreviates beyond that', () => {
    expect(expansionTex(deriveSumLesson(S({})).d)).toBe('1+2+3+4+5');
    expect(expansionTex(deriveSumLesson(S({ m: 1, n: 10 })).d)).toBe('1+2+3+\\cdots+10');
    expect(expansionTex(deriveSumLesson(S({ m: 5, n: 2 })).d)).toBe('0');
    expect(expansionTex(deriveSumLesson(S({ m: -1, n: 1 })).d)).toBe('\\left(-1\\right)+0+1');
  });
  it('the Python shown is the Python that was run', () => {
    expect(loopCode(deriveSumLesson(S({})))).toBe('acc = 0\nfor i in range(1, 5 + 1):\n    acc += i');
    expect(loopCode(deriveSumLesson(S({ seq: 'geometric', m: 0, n: 4 })))).toBe('r = Fraction(1, 2)\nacc = 0\nfor i in range(0, 4 + 1):\n    acc += r ** i');
    expect(loopCode(deriveSumLesson(S({ seq: 'list', m: 1, n: 4 })))).toBe('a = [3, -1, Fraction(1, 2), 4]  # a[0] is a_1\nacc = 0\nfor i in range(1, 4 + 1):\n    acc += a[i - 1]');
  });
  it('the closed form is only shown where it applies, and the verdict says whether it agrees', () => {
    const ok = sumFormulas(deriveSumLesson(S({})));
    expect(ok.map(f => f.id)).toEqual(['expansion', 'closed', 'closed-work']);
    expect(sumFormulas(deriveSumLesson(S({ seq: 'reciprocal', m: 1, n: 4 }))).map(f => f.id)).toEqual(['expansion']);
    expect(sumFormulas(deriveSumLesson(S({ m: 5, n: 2 }))).map(f => f.id)).toEqual(['expansion']);
    expect(sumVerdict(deriveSumLesson(S({}))).text).toMatch(/loop gives 15 and the closed form gives 15: they agree exactly/);
    expect(sumVerdict(deriveSumLesson(S({ seq: 'geometric', m: 0, n: 4, r: 1 }))).text).toMatch(/1 − r = 0/);
    expect(sumVerdict(deriveSumLesson(S({ m: 5, n: 2 }))).text).toMatch(/empty sum is a value, not an error/);
  });
  it('the closed form matches the loop for every sequence and window in the stage (the verdict never reports a disagreement)', () => {
    for (const o of SEQ_OPTIONS) for (let m = BOUND_MIN; m <= BOUND_MAX; m += 5) for (let n = BOUND_MIN; n <= BOUND_MAX; n += 5) {
      for (const r of [0.5, -2, 1, 3]) {
        const lesson = deriveSumLesson(S({ seq: o.id, m, n, r }));
        if (lesson.d.closedMatches !== null) expect(lesson.d.closedMatches, `${o.id} ${m}..${n} r=${r}`).toBe(true);
        expect(sumVerdict(lesson).text).not.toMatch(/disagree/);
      }
    }
  });
});

describe('the learner\'s list', () => {
  it('parses whole numbers, decimals and fractions exactly and normalises the text', () => {
    const p = parseList('3, -1, 1/2 , 0.25');
    expect(p.ok).toBe(true);
    if (p.ok) { expect(p.list).toEqual([q(3), q(-1), q(1, 2), q(1, 4)]); expect(p.text).toBe('3, -1, 1/2, 1/4'); }
    const spaced = parseList('1 2 3');
    expect(spaced.ok && spaced.text).toBe('1, 2, 3');
    const unicode = parseList('−2; 5');
    expect(unicode.ok && unicode.text).toBe('-2, 5');
    expect(qAscii(q(-7, 3))).toBe('-7/3');
  });
  it('rejects instead of repairing', () => {
    for (const bad of ['', '  ', 'a, b', '1, 2, x', '1e3', '0.00001', '1/0', '1,2,3,4,5,6,7,8,9']) {
      const r = parseList(bad);
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.reason.length).toBeGreaterThan(10);
    }
    expect(parseList('1,2,3,4,5,6,7,8').ok).toBe(true);
  });
  it('the default text round-trips and gives the default list', () => {
    const p = parseList(DEFAULT_LIST_TEXT);
    expect(p.ok && p.text).toBe(DEFAULT_LIST_TEXT);
    expect(paramsOf(CANONICAL_SUM).list).toEqual(DEFAULT_PARAMS.list);
    expect(paramsOf(S({ r: 0.25 })).r).toEqual(q(1, 4));
    expect(paramsOf(S({ r: -1.5 })).r).toEqual(q(-3, 2));
  });
  it('every sequence option has a short label and a spoken name', () => {
    expect(SEQ_OPTIONS.map(o => o.id)).toEqual([...SEQ_IDS]);
    for (const o of SEQ_OPTIONS) { expect(o.label.length).toBeLessThanOrEqual(10); expect(o.aria.length).toBeGreaterThan(5); }
  });
});

// ------------------------------------------------------------------------------------------------ the loops stage
describe('loops stage', () => {
  it('presets are consistent with their labels', () => {
    expect(LOOP_PRESETS.filter(p => loopPresetMatches(CANONICAL_LOOPS, p)).map(p => p.id)).toEqual(['odd']);
    for (const p of LOOP_PRESETS) expect(LOOP_PRESETS.filter(x => loopPresetMatches(p.state, x)).map(x => x.id), p.id).toEqual([p.id]);
    const one = LOOP_PRESETS.find(p => p.id === 'one-term')!.state;
    expect(one.m).toBe(one.n);
    const empty = LOOP_PRESETS.find(p => p.id === 'empty')!.state;
    expect(empty.n).toBeLessThan(empty.m);
  });
  it('five cards for every sequence and window; the correct loop and the shifted-list loop are always right', () => {
    for (const seq of LOOP_SEQS) for (let m = 1; m <= 12; m += 3) for (let n = 1; n <= 12; n += 3) {
      const d = deriveLoopLesson({ seq, m, n });
      expect(d.cards.map(c => c.id)).toEqual(['correct', 'stop-excluded', 'start-shifted', 'list-unshifted', 'list-shifted']);
      expect(d.cards.find(c => c.id === 'correct')!.status).toBe('correct');
      expect(d.cards.find(c => c.id === 'list-shifted')!.status).toBe('correct');
      for (const c of d.cards) { plain(c.result); plain(c.code); plain(c.visited); expect(c.code.startsWith('acc = 0\nfor i in range(')).toBe(true); }
      plain(loopVerdict(d).text);
      plain(loopSpoken(d));
      for (const row of loopRows(d)) tex(row.symbolTex);
    }
  });
  it('the canonical odd numbers 1 … 5 make every mistake visible: stop-excluded 16, slid window 15, unshifted list IndexError', () => {
    const d = deriveLoopLesson(CANONICAL_LOOPS);
    const by = Object.fromEntries(d.cards.map(c => [c.id, c]));
    expect(by['correct']!.result).toBe('total 25: correct');
    expect(by['stop-excluded']).toMatchObject({ status: 'wrong' });
    expect(by['stop-excluded']!.result).toMatch(/total 16, but the sum is 25 \(off by −9\)/);
    expect(by['start-shifted']!.result).toMatch(/total 15, but the sum is 25/);
    expect(by['list-unshifted']).toMatchObject({ status: 'error' });
    expect(by['list-unshifted']!.result).toMatch(/^IndexError: a\[5\]/);
    expect(d.listCode).toBe('a = [1, 3, 5, 7, 9]  # a[0] is a_1');
    expect(loopVerdict(d).caution).toBe(true);
  });
  it('with n < m there are no passes: all five loops return 0 and the verdict says no off-by-one shows', () => {
    const d = deriveLoopLesson({ seq: 'identity', m: 5, n: 2 });
    expect(d.cards.every(c => c.status === 'correct')).toBe(true);
    expect(loopVerdict(d).text).toMatch(/no off-by-one shows/);
    expect(loopVerdict(d).caution).toBe(false);
  });
  it('1/i with the window slid down reaches i = 0 and fails with ZeroDivisionError', () => {
    const d = deriveLoopLesson({ seq: 'reciprocal', m: 1, n: 4 });
    expect(d.cards.find(c => c.id === 'start-shifted')!.result).toMatch(/^ZeroDivisionError/);
  });
});

// ------------------------------------------------------------------------------------------------ the nested stage
describe('nested stage', () => {
  const kinds: NestedKind[] = ['rectangular', 'triangular'];
  const rules: NestedRule[] = ['product', 'sum', 'table'];
  const orders: NestedOrder[] = ['rows-first', 'columns-first'];
  it('presets are consistent with their labels', () => {
    expect(NESTED_PRESETS.filter(p => nestedPresetMatches(CANONICAL_NESTED, p)).map(p => p.id)).toEqual(['rectangle']);
    for (const p of NESTED_PRESETS) expect(NESTED_PRESETS.filter(x => nestedPresetMatches(p.state, x)).map(x => x.id), p.id).toEqual([p.id]);
    expect(deriveNestedLesson(NESTED_PRESETS.find(p => p.id === 'rectangle')!.state).d.total).toEqual(q(60));
    expect(deriveNestedLesson(NESTED_PRESETS.find(p => p.id === 'triangle')!.state).d.total).toEqual(q(65));
    expect(deriveNestedLesson(NESTED_PRESETS.find(p => p.id === 'table')!.state).d.total).toEqual(q(25));
    expect(deriveNestedLesson(NESTED_PRESETS.find(p => p.id === 'one-row')!.state).d.cellCount).toBe(5);
  });
  it('every state: strict KaTeX, exactly one current cell per frame, done/todo/outside counts add up', () => {
    let count = 0;
    for (const kind of kinds) for (const rule of rules) for (const order of orders) for (let n = 1; n <= NESTED_MAX; n++) for (const k of [1, 3, 5]) {
      const state: NestedLessonState = { kind, rule, order, n, k };
      const lesson = deriveNestedLesson(state);
      const { d } = lesson;
      for (const f of nestedFormulas(lesson)) tex(f.tex);
      tex(doubleSumTex(kind, order, n, d.cols));
      for (const row of nestedRows(lesson)) tex(row.symbolTex);
      plain(nestedVerdict(lesson).text); plain(nestedSpoken(lesson)); plain(nestedGridDescription(lesson)); plain(nestedCode(state, d.cols));
      for (const f of lesson.frames) { tex(f.state.tex); plain(f.state.caption); }
      for (const cursor of [0, 1, Math.ceil(d.cellCount / 2), d.cellCount]) {
        const states: string[] = [];
        for (let i = 1; i <= n; i++) for (let j = 1; j <= d.cols; j++) states.push(cellState(lesson, cursor, i, j));
        expect(states.filter(s => s === 'current')).toHaveLength(cursor === 0 ? 0 : 1);
        expect(states.filter(s => s === 'done')).toHaveLength(Math.max(0, cursor - 1));
        expect(states.filter(s => s === 'todo')).toHaveLength(Math.max(0, d.cellCount - Math.max(cursor, 1)) + (cursor === 0 ? 1 : 0));
        expect(states.filter(s => s === 'outside')).toHaveLength(n * d.cols - d.cellCount);
      }
      count++;
    }
    expect(count).toBe(2 * 3 * 2 * NESTED_MAX * 3);
  });
  it('the Python shown has the bounds of the chosen shape and order', () => {
    const code = (kind: NestedKind, order: NestedOrder) => nestedCode({ kind, rule: 'product', order, n: 4, k: 3 }, kind === 'triangular' ? 4 : 3);
    expect(code('rectangular', 'rows-first')).toBe('acc = 0\nfor i in range(1, 4 + 1):\n    for j in range(1, 3 + 1):\n        acc += i * j');
    expect(code('rectangular', 'columns-first')).toBe('acc = 0\nfor j in range(1, 3 + 1):\n    for i in range(1, 4 + 1):\n        acc += i * j');
    expect(code('triangular', 'rows-first')).toBe('acc = 0\nfor i in range(1, 4 + 1):\n    for j in range(1, i + 1):\n        acc += i * j');
    expect(code('triangular', 'columns-first')).toBe('acc = 0\nfor j in range(1, 4 + 1):\n    for i in range(j, 4 + 1):\n        acc += i * j');
  });
  it('the swapped-bounds formula is the one the cell order uses', () => {
    expect(doubleSumTex('triangular', 'columns-first', 4, 4)).toBe('\\sum_{j=1}^{4}\\sum_{i=j}^{4}a_{ij}');
    expect(cellsInOrder('triangular', 4, 4, 'columns-first').every(c => c.i >= c.j)).toBe(true);
  });
  it('the verdict explains the swap slip, and says when symmetry hides it', () => {
    const hidden = nestedVerdict(deriveNestedLesson({ kind: 'triangular', rule: 'product', order: 'rows-first', n: 4, k: 4 }));
    expect(hidden.text).toMatch(/OTHER triangle|other triangle/);
    expect(hidden.text).toMatch(/symmetric/);
    const shown = nestedVerdict(deriveNestedLesson({ kind: 'triangular', rule: 'table', order: 'columns-first', n: 3, k: 3 }));
    expect(shown.text).toMatch(/return 4, a different number/);
    expect(nestedVerdict(deriveNestedLesson(CANONICAL_NESTED)).text).not.toMatch(/triangle/);
  });
});

// ------------------------------------------------------------------------------------------------ the identities stage
describe('identities stage', () => {
  it('presets say what their labels say', () => {
    expect(IDENTITY_PRESETS.filter(p => identityPresetMatches(CANONICAL_IDENTITIES, p)).map(p => p.id)).toEqual(['default']);
    for (const p of IDENTITY_PRESETS) expect(IDENTITY_PRESETS.filter(x => identityPresetMatches(p.state, x)).map(x => x.id), p.id).toEqual([p.id]);
    const by = (id: string) => deriveIdentityLesson(IDENTITY_PRESETS.find(p => p.id === id)!.state);
    expect(by('default').id.shift.wrongHolds).toBe(false);
    expect(by('no-shift').id.shift.wrongHolds).toBe(true);
    expect(by('coincidence').id.shift.wrongHolds).toBe(true);
    expect(by('coincidence').id.shift.holds).toBe(true);
    expect(by('ten').gauss!.pairs).toHaveLength(5);
    expect(by('odd-count').gauss!.middle).toEqual({ i: 5, value: q(5) });
    expect(by('empty').gauss).toBeNull();
    expect(by('negative').id.linearity.holds).toBe(true);
  });
  it('strict KaTeX and plain text over a grid of states, including negative bounds and shifts', () => {
    for (let m = BOUND_MIN; m <= BOUND_MAX; m += 5) for (let n = BOUND_MIN; n <= BOUND_MAX; n += 5) for (const c of [-5, -1, 0, 3, 5]) for (const k of [-5, -1, 0, 2, 5]) {
      const d = deriveIdentityLesson({ m, n, c, k });
      for (const f of [...linearityFormulas(d), ...shiftFormulas(d)]) tex(f.tex);
      tex(gaussLines(d).formulaTex);
      for (const row of identityRows(d)) tex(row.symbolTex);
      plain(linearitySentence(d)); plain(shiftSentence(d).text); plain(identitySpoken(d)); plain(gaussLines(d).sentence);
      expect(d.id.linearity.holds && d.id.shift.holds).toBe(true);
    }
  });
  it('the shift sentence tells the truth about the wrong shift', () => {
    expect(shiftSentence(deriveIdentityLesson({ m: 1, n: 4, c: 2, k: 2 })).text).toMatch(/off by 56/); // 9+16+25+36 = 86 against 30
    expect(shiftSentence(deriveIdentityLesson({ m: -3, n: -1, c: 1, k: 4 })).text).toMatch(/coincidence/);
    expect(shiftSentence(deriveIdentityLesson({ m: 1, n: 4, c: 1, k: 0 })).text).toMatch(/shift of 0/);
    expect(shiftSentence(deriveIdentityLesson({ m: 5, n: 2, c: 1, k: 3 })).text).toMatch(/no terms/);
  });
  it('the pairing lines give 1 + 10 = 11 five times for 1 … 10, and a lone middle term for 1 … 9', () => {
    const ten = gaussLines(deriveIdentityLesson({ m: 1, n: 10, c: 0, k: 0 }));
    expect(ten.pairs.map(p => p.text)).toEqual(['1 + 10 = 11', '2 + 9 = 11', '3 + 8 = 11', '4 + 7 = 11', '5 + 6 = 11']);
    expect(ten.formulaTex).toBe('\\sum_{i=1}^{10}i=5\\cdot11=55');
    const nine = gaussLines(deriveIdentityLesson({ m: 1, n: 9, c: 0, k: 0 }));
    expect(nine.middle?.text).toBe('5 is alone');
    expect(nine.formulaTex).toBe('\\sum_{i=1}^{9}i=4\\cdot10+5=45');
  });
});

// ------------------------------------------------------------------------------------------------ worked examples
describe('worked examples', () => {
  it('every frame is strict-KaTeX clean and every caption is plain', () => {
    for (const e of WORKED_EXAMPLES) {
      const frames = workedFrames(e.id);
      expect(frames.length).toBeGreaterThanOrEqual(5);
      for (const f of frames) { tex(f.state.tex); plain(f.state.caption); }
    }
    expect(() => workedFrames('nope')).toThrow(RangeError);
  });
  it('contain independently known numbers', () => {
    const count = workedFrames('count');
    expect(count[3]!.state.tex).toBe('n-m+1=11-3+1=9');
    expect(termCount(3, 11)).toBe(9);
    expect(count.at(-1)!.state.tex).toContain('-2<0');
    const gauss = workedFrames('gauss');
    expect(gauss[3]!.state.tex).toContain('5\\ \\text{pairs}\\times 11=55');
    expect(gauss.at(-2)!.state.tex).toContain('\\frac{10\\cdot11}{2}');
    const geo = workedFrames('geometric');
    expect(geo[2]!.state.tex).toContain('\\frac{31}{32}');
    expect(geo[4]!.state.tex).toContain('\\frac{31}{16}');
    expect(geo.at(-1)!.state.tex).toContain('=5');
    const shift = workedFrames('shift');
    expect(shift[0]!.state.tex).toContain('=30');
    expect(shift[3]!.state.tex).toContain('=30');
    expect(shift[4]!.state.tex).toContain('=86');
    const tri = workedFrames('triangle');
    expect(tri[1]!.state.tex).toContain('=13');
    expect(tri[3]!.state.tex).toContain('=13');
    expect(tri[4]!.state.tex).toContain('=4\\ne 13');
  });
  it('agree with the models they narrate', () => {
    expect(deriveIdentities(1, 4, 1, 2).shift).toMatchObject({ original: q(30), shifted: q(30), wrong: q(86) });
    expect(deriveNested({ kind: 'triangular', n: 3, k: 3, rule: 'table', order: 'rows-first' }).total).toEqual(q(13));
    expect(deriveSum({ seq: 'geometric', params: { ...DEFAULT_PARAMS, r: q(1, 2) }, m: 0, n: 4 }).total).toEqual(q(31, 16));
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
  it('the statements in the prompts are confirmed by the models', () => {
    // fencepost
    expect(termCount(4, 15)).toBe(12);
    expect(deriveSum({ seq: 'identity', params: DEFAULT_PARAMS, m: 7, n: 3 }).total).toEqual(q(0));
    expect(fields('fencepost', { count: '12', empty: '0' }).correct).toBe(true);
    expect(fields('fencepost', { count: '11', empty: '0' }).message).toMatch(/STEPS/);
    expect(fields('fencepost', { count: '12', empty: '-4' }).message).toMatch(/negative number of terms/);
    expect(fields('fencepost', { count: 'x', empty: '0' }).correct).toBe(false);
    // loop-range: range(2, 10) visits 2 … 9, the others do not
    const visits = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo) }, (_, a) => lo + a);
    expect(visits(2, 10)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    for (const wrong of [visits(2, 9), visits(1, 9), visits(3, 10)]) expect(wrong).not.toEqual(visits(2, 10));
    expect(choice('loop-range', 'to-10').correct).toBe(true);
    expect(choice('loop-range', 'to-9').message).toMatch(/a_9 is never added/);
    // geometric
    const g = deriveSum({ seq: 'geometric', params: { ...DEFAULT_PARAMS, r: q(1, 3) }, m: 0, n: 3 });
    expect(g.total).toEqual(q(40, 27));
    expect(g.closedMatches).toBe(true);
    expect(fields('geometric', { value: '40/27' }).correct).toBe(true);
    expect(fields('geometric', { value: '1.4814814' }).correct).toBe(false);
    expect(fields('geometric', { value: '3/2' }).message).toMatch(/INFINITE/);
    expect(fields('geometric', { value: '13/9' }).message).toMatch(/FOUR terms/);
    expect(deriveSum({ seq: 'geometric', params: { ...DEFAULT_PARAMS, r: q(1, 3) }, m: 0, n: 4 }).total).toEqual(q(121, 81));
    expect(fields('geometric', { value: '121/81' }).message).toMatch(/five terms/);
    expect(fields('geometric', { value: 'abc' }).correct).toBe(false);
    // ratio-one
    expect(deriveSum({ seq: 'geometric', params: { ...DEFAULT_PARAMS, r: q(1) }, m: 0, n: 9 }).total).toEqual(q(10));
    expect(choice('ratio-one', 'ten').correct).toBe(true);
    expect(choice('ratio-one', 'zero').message).toMatch(/0\/0/);
    // shift: the right rewrite keeps the sum, the forgetful one does not
    const sh = deriveIdentities(1, 5, 1, 3).shift;
    expect(sh.original).toEqual(q(55));
    expect(sh.shifted).toEqual(q(55));
    expect(sh.wrong).toEqual(q(190));
    expect(choice('shift', 'right').correct).toBe(true);
    expect(choice('shift', 'forgot').message).toMatch(/190/);
    // nested-count
    expect(deriveSum({ seq: 'identity', params: DEFAULT_PARAMS, m: 1, n: 6 }).total).toEqual(q(21)); // row i of the triangle has i cells
    expect(deriveNested({ kind: 'rectangular', n: 3, k: 4, rule: 'product', order: 'rows-first' }).total).toEqual(q(60));
    expect(fields('nested-count', { cells: '21', product: '60' }).correct).toBe(true);
    expect(fields('nested-count', { cells: '36', product: '60' }).message).toMatch(/full square/);
    expect(fields('nested-count', { cells: '21', product: '12' }).message).toMatch(/number of cells/);
    // swap-bounds: the right choice's cells are exactly the triangle j <= i; the "same" choice's cells are the other triangle
    const tri = new Set(cellsInOrder('triangular', 5, 5, 'rows-first').map(c => `${c.i},${c.j}`));
    const swapped = new Set(cellsInOrder('triangular', 5, 5, 'columns-first').map(c => `${c.i},${c.j}`));
    expect(swapped).toEqual(tri);
    expect([...swapped].every(key => { const [i, j] = key.split(',').map(Number); return i! >= j!; })).toBe(true);
    expect(deriveNested({ kind: 'triangular', n: 5, k: 5, rule: 'table', order: 'rows-first' }).swapMistake!.differs).toBe(true);
    expect(choice('swap-bounds', 'right').correct).toBe(true);
    expect(choice('swap-bounds', 'same').message).toMatch(/OTHER triangle/);
    // mean-loss
    expect(termCount(0, 4)).toBe(5);
    const loss = deriveSum({ seq: 'list', params: { ...DEFAULT_PARAMS, list: [4, 1, 9, 0, 6].map(x => q(x)) }, m: 1, n: 5 });
    expect(loss.total).toEqual(q(20));
    expect(fields('mean-loss', { n: '5', loss: '4' }).correct).toBe(true);
    expect(fields('mean-loss', { n: '4', loss: '4' }).message).toMatch(/last INDEX/);
    expect(fields('mean-loss', { n: '5', loss: '20' }).message).toMatch(/divides it by N/);
    // product-trap: a counter-example on two terms
    const a = [1, 1];
    const b = [1, 1];
    const sumOfProducts = a.reduce((acc, x, i) => acc + x * b[i]!, 0);
    const productOfSums = a.reduce((x, y) => x + y, 0) * b.reduce((x, y) => x + y, 0);
    expect([sumOfProducts, productOfSums]).toEqual([2, 4]);
    expect(choice('product-trap', 'product').correct).toBe(true);
    expect(choice('product-trap', 'add').correct).toBe(false);
    // float-sum: the same double arithmetic as Python
    let acc = 0;
    for (let i = 0; i < 10; i++) acc += 0.1;
    expect(acc === 1).toBe(false);
    expect(acc).toBe(0.9999999999999999);
    expect(choice('float-sum', 'false').correct).toBe(true);
    expect(choice('float-sum', 'true').correct).toBe(false);
  });
});
