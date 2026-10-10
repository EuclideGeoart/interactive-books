import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../../src/lessons/coordinates/exercises';
import { derivePoint } from '../../src/math/coordinates/point';
import { deriveSegment } from '../../src/math/coordinates/segment';
import type { Answer } from '../../src/platform/exercise';

const grade = (id: string, answer: Answer) => exerciseById(id)!.grade(answer);
const choice = (id: string, c: string) => grade(id, { choice: c });
const asNumber = (t: string): number => (t.includes('/') ? Number(t.split('/')[0]) / Number(t.split('/')[1]) : Number(t));

describe('I.2 exercise set', () => {
  it('has unique ids, at least eight exercises, and a worked solution and prompt for each', () => {
    const ids = EXERCISES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EXERCISES.length).toBeGreaterThanOrEqual(8);
    for (const e of EXERCISES) {
      expect(e.solution.length).toBeGreaterThan(40);
      expect(e.prompt.length).toBeGreaterThan(20);
      expect(Boolean(e.choices) !== Boolean(e.fields), `${e.id}: choices xor fields`).toBe(true);
    }
    expect(new Set(EXERCISES.map(e => e.kind)).size).toBeGreaterThanOrEqual(3);
  });
  it('every multiple-choice exercise has exactly one correct choice and a distinct, specific message for every wrong one', () => {
    for (const e of EXERCISES.filter(x => x.choices)) {
      const results = e.choices!.map(c => ({ id: c.id, r: e.grade({ choice: c.id }) }));
      expect(results.filter(x => x.r.correct), e.id).toHaveLength(1);
      const messages = results.map(x => x.r.message);
      expect(new Set(messages).size, `${e.id}: distinct feedback`).toBe(messages.length);
      for (const m of messages) expect(m, e.id).not.toBe('Not quite.');
      expect(e.grade({}).correct).toBe(false);
    }
  });
  it('every field exercise refuses empty and junk input without crashing', () => {
    for (const e of EXERCISES.filter(x => x.fields)) {
      for (const junk of ['', 'abc', '1/0', '--2', '   ']) {
        const answer: Record<string, string> = {};
        for (const f of e.fields!) answer[f.id] = junk;
        expect(e.grade(answer).correct, `${e.id} ${junk}`).toBe(false);
      }
      expect(e.grade({}).correct).toBe(false);
    }
  });
});

describe('I.2 grading against the model', () => {
  it('quadrant of (−3, 2): II, and each other answer names its sign error', () => {
    expect(derivePoint({ x: -3, y: 2 }).position).toEqual({ kind: 'quadrant', index: 2 });
    expect(choice('quadrant-basic', 'q2').correct).toBe(true);
    expect(choice('quadrant-basic', 'q1').message).toMatch(/BOTH coordinates positive/);
    expect(choice('quadrant-basic', 'q3').message).toMatch(/both coordinates negative/);
    expect(choice('quadrant-basic', 'q4').message).toMatch(/opposite signs/);
    expect(choice('quadrant-basic', 'none').message).toMatch(/Neither −3 nor 2 is 0/);
  });
  it('(0, −4) is on the y-axis and in no quadrant', () => {
    expect(derivePoint({ x: 0, y: -4 }).position.kind).toBe('axis-y');
    expect(choice('axis-point', 'axis-y').correct).toBe(true);
    expect(choice('axis-point', 'axis-x').message).toMatch(/y = 0/);
    expect(choice('axis-point', 'q3').message).toMatch(/Zero is neither/);
    expect(choice('axis-point', 'q4').correct).toBe(false);
  });
  it('distance from (−3, 2) to the x-axis is |y| = 2; the swap |x| = 3 is named', () => {
    expect(choice('axis-distance', 'd2').correct).toBe(true);
    expect(choice('axis-distance', 'd3').message).toMatch(/y-axis/);
    expect(choice('axis-distance', 'dm2').message).toMatch(/never negative/);
    expect(choice('axis-distance', 'droot').message).toMatch(/origin/);
  });
  it('number-line distance −3 to 5: 8; −8 and the sum 2 are named', () => {
    expect(grade('line-distance', { d: '8' }).correct).toBe(true);
    expect(grade('line-distance', { d: '-8' }).message).toMatch(/direction/);
    expect(grade('line-distance', { d: '−8' }).message).toMatch(/direction/);
    expect(grade('line-distance', { d: '2' }).message).toMatch(/adds the coordinates/);
    expect(grade('line-distance', { d: '3' }).correct).toBe(false);
    expect(grade('line-distance', { d: '16/2' }).correct).toBe(true);
  });
  it('signed step from 6 to −2: −8 and distance 8', () => {
    expect(grade('signed-step', { step: '-8', dist: '8' }).correct).toBe(true);
    expect(grade('signed-step', { step: '8', dist: '8' }).message).toMatch(/a − b/);
    expect(grade('signed-step', { step: '-8', dist: '-8' }).message).toMatch(/never negative/);
    expect(grade('signed-step', { step: '-8', dist: '5' }).message).toMatch(/absolute value/);
  });
  it('(1,2) → (4,6): 5; the taxicab 7 and the squared distance 25 are named', () => {
    expect(grade('distance-345', { d: '5' }).correct).toBe(true);
    expect(grade('distance-345', { d: '5.0' }).correct).toBe(true);
    expect(grade('distance-345', { d: '7' }).message).toMatch(/taxicab/);
    expect(grade('distance-345', { d: '25' }).message).toMatch(/SQUARED/);
    expect(grade('distance-345', { d: '4' }).correct).toBe(false);
  });
  it('(−1,2) → (3,−4): 2√13, the expected values come from the model; partial simplifications are named', () => {
    const s = deriveSegment({ ax: -1, ay: 2, bx: 3, by: -4 });
    if (s.distance.kind !== 'exact') throw new Error('exact');
    expect(grade('radical-distance', { a: String(s.distance.root.a), b: String(s.distance.root.b) }).correct).toBe(true);
    expect(grade('radical-distance', { a: '1', b: '52' }).message).toMatch(/Not fully simplified/);
    expect(grade('radical-distance', { a: '2', b: '13' }).correct).toBe(true);
    expect(grade('radical-distance', { a: '4', b: '13' }).message).toMatch(/208/);
    expect(grade('radical-distance', { a: '-2', b: '13' }).correct).toBe(false);
    expect(grade('radical-distance', { a: '2.5', b: '13' }).correct).toBe(false);
  });
  it('midpoint of (−3,4) and (5,−2): (1,1); half the displacement and the sum are named', () => {
    expect(grade('midpoint', { mx: '1', my: '1' }).correct).toBe(true);
    expect(grade('midpoint', { mx: '4', my: '-3' }).message).toMatch(/HALF THE DISPLACEMENT/);
    expect(grade('midpoint', { mx: '2', my: '2' }).message).toMatch(/SUM/);
    expect(grade('midpoint', { mx: '1', my: '2' }).correct).toBe(false);
  });
  it('construct a point in quadrant III at distance 5: integers, decimals and fractions all pass the model check', () => {
    for (const [x, y] of [['-3', '-4'], ['-4', '-3'], ['-1.4', '-4.8'], ['-7/5', '-24/5']] as const) {
      expect(grade('construct-point', { x, y }).correct, `${x},${y}`).toBe(true);
      const d = derivePoint({ x: asNumber(x), y: asNumber(y) });
      expect(d.position).toEqual({ kind: 'quadrant', index: 3 });
    }
    expect(grade('construct-point', { x: '3', y: '4' }).message).toMatch(/quadrant I\b/);
    expect(grade('construct-point', { x: '-3', y: '4' }).message).toMatch(/quadrant II/);
    expect(grade('construct-point', { x: '0', y: '-5' }).message).toMatch(/on an axis/);
    expect(grade('construct-point', { x: '0', y: '0' }).message).toMatch(/origin/);
    expect(grade('construct-point', { x: '-1', y: '-1' }).message).toMatch(/x² \+ y² = 2/);
    expect(grade('construct-point', { x: '-3', y: '-4.01' }).correct).toBe(false);
  });
  it('pixel (4,1) in a 6×4 image: row 2, column 4; the named slips', () => {
    expect(grade('pixel-row', { row: '2', col: '4' }).correct).toBe(true);
    expect(grade('pixel-row', { row: '3', col: '4' }).message).toMatch(/off by one/);
    expect(grade('pixel-row', { row: '1', col: '4' }).message).toMatch(/forgets the flip/);
    expect(grade('pixel-row', { row: '4', col: '1' }).message).toMatch(/Swapped/);
    expect(grade('pixel-row', { row: '2', col: '1' }).message).toMatch(/column is x/);
  });
  it('NumPy indexing: img[H - 1 - y, x]; the swap, the missing flip and the off-by-one are named', () => {
    expect(choice('img-indexing', 'h1y').correct).toBe(true);
    expect(choice('img-indexing', 'xy').message).toMatch(/row first/);
    expect(choice('img-indexing', 'yx').message).toMatch(/forgets the flip/);
    expect(choice('img-indexing', 'hy').message).toMatch(/IndexError/);
  });
  it('taxicab versus straight: equality exactly when a leg is zero', () => {
    expect(choice('taxicab', 'axis').correct).toBe(true);
    expect(choice('taxicab', 'point').message).toMatch(/horizontal or vertical/);
    expect(choice('taxicab', 'equal').message).toMatch(/1\.414/);
    const s = deriveSegment({ ax: 0, ay: 0, bx: 1, by: 1 });
    expect(s.taxicabEqualsDistance).toBe(false);
  });
  it('equal distances: the model decides it exactly (both 1/2), the doubles do not', () => {
    const a = derivePoint({ x: 0.1, y: 0.7 }).distSq;
    const b = derivePoint({ x: 0.5, y: 0.5 }).distSq;
    expect(`${a.num}/${a.den}`).toBe(`${b.num}/${b.den}`);
    expect(0.1 * 0.1 + 0.7 * 0.7).not.toBe(0.5 * 0.5 + 0.5 * 0.5);
    expect(choice('equal-distance', 'yes').correct).toBe(true);
    expect(choice('equal-distance', 'no').message).toMatch(/binary doubles/);
    expect(choice('equal-distance', 'close').correct).toBe(false);
  });
});
