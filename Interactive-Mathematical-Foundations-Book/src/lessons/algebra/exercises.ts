/**
 * Exercises for I.4. Pure data plus a pure `grade`. The expected answers are COMPUTED by the domain model (`deriveBalance`, `solve`,
 * `deriveExtraneous`, `deriveFallacy`, `deriveDistribute`), never typed in twice, and every wrong answer that matches a known misconception
 * gets a hint that names it.
 */
import { deriveBalance, type StatementSpec } from '../../math/algebra/balance';
import { classify, deriveDistribute } from '../../math/algebra/expression';
import { deriveExtraneous } from '../../math/algebra/extraneous';
import { deriveFallacy } from '../../math/algebra/fallacy';
import { applyOperation, linear, solve, statement } from '../../math/algebra/linear';
import { int, rational, toNumber, type Rational } from '../../math/quantity/rational';
import { byId, no, NEED_NUMBERS, ok, parseRational, pick, type Exercise } from '../../platform/exercise';

const frac = (r: { num: bigint; den: bigint } | null): Rational | null => (r ? rational(r.num, r.den) : null);
const num = (raw: string | undefined): Rational | null => frac(parseRational(raw));
const same = (a: Rational | null, b: Rational): boolean => a !== null && a.num === b.num && a.den === b.den;
const whole = (raw: string | undefined): number | null => {
  const r = num(raw);
  return r && r.den === 1n ? Number(r.num) : null;
};
const half = (n: bigint, d: bigint): Rational => rational(n, d);

// ---------------------------------------------------------------------------------------------- 1. solve a linear equation
const solveLinear: Exercise = (() => {
  const spec: StatementSpec = { a1: 3, b1: 2, rel: '=', a2: 1, b2: 10 };
  const set = deriveBalance({ initial: spec, steps: [], trial: 0 }).initialSolution;
  if (set.kind !== 'point') throw new Error('3x + 2 = x + 10 has one solution');
  const x = set.x;
  return {
    id: 'solve-linear',
    kind: 'calculation',
    title: 'Solve a linear equation',
    prompt: 'Solve 3x + 2 = x + 10. Enter the value of x. Check it by putting it back into BOTH sides.',
    fields: [{ id: 'x', label: 'x' }],
    solution: 'Subtract x from both sides: 2x + 2 = 10. Subtract 2 from both sides: 2x = 8. Divide both sides by 2: x = 4. Check in the original: 3·4 + 2 = 14 and 4 + 10 = 14.',
    grade: ans => {
      const v = num(ans.x);
      if (v === null) return NEED_NUMBERS;
      if (same(v, x)) return ok('Yes: x = 4, and both sides equal 14.');
      if (same(v, half(8n, 3n))) return no('8/3 comes from dividing 8 by 3 and forgetting the x on the right side. Subtract x from both sides FIRST, so that the x terms are together: 3x − x = 2x.');
      if (same(v, int(6))) return no('6 adds the 2 instead of subtracting it: from 2x + 2 = 10 you subtract 2 from both sides (the same operation on both sides undoes the + 2), giving 2x = 8.');
      if (same(v, int(-4))) return no('−4 has the right size and the wrong sign: 2x = 8 gives x = +4 (the constants were moved the wrong way: 10 − 2 = 8, not 2 − 10).');
      if (same(v, int(2))) return no('2 adds the x terms, 3x + x = 4x, instead of subtracting x from both sides. Subtracting x from 3x gives 2x.');
      return no('Do the same thing to both sides. Subtract x, then subtract 2, then divide by what is left in front of x. Then substitute your answer to check.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 2. no solution
const noSolution: Exercise = (() => {
  const set = solve(statement(linear(int(2), int(3)), '=', linear(int(2), int(7))));
  return {
    id: 'no-solution',
    kind: 'prediction',
    title: 'What happens to the x?',
    prompt: 'Predict the solution set of 2x + 3 = 2x + 7 before you work on it.',
    choices: [
      { id: 'x2', label: 'x = 2' },
      { id: 'none', label: 'there is no solution' },
      { id: 'all', label: 'every x is a solution' },
      { id: 'x0', label: 'x = 0' },
    ],
    solution: 'Subtract 2x from both sides: 3 = 7. That statement does not involve x, and it is false, so no value of x can make the original true. A false "0 = c" end of the working means no solution; a true one (3 = 3) would mean every x.',
    grade: a => pick(a, set.kind, {
      none: 'Yes: subtracting 2x leaves 3 = 7, false for every x. At any x the left side is exactly 4 less than the right side.',
      x2: 'Try x = 2: the left side is 7 and the right side is 11, which are not equal. In fact the left side is always 4 less than the right side.',
      all: 'Every x would make the sides equal, but the right side is always 4 more than the left side: subtracting 2x leaves 3 = 7, a false statement.',
      x0: 'Try x = 0: the left side is 3 and the right side is 7. They are not equal, and no other x helps, because the sides always differ by 4.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 3. reversal
const reversePredict: Exercise = (() => {
  const result = applyOperation(statement(linear(int(-3), int(0)), '<', linear(int(0), int(6))), { kind: 'divide', k: int(-3) });
  if (result.kind !== 'ok') throw new Error('dividing by −3 is allowed');
  const set = solve(result.next);
  if (set.kind !== 'ray') throw new Error('x > −2 is a ray');
  const right = `${set.side === 'above' ? 'gt' : 'lt'}${toNumber(set.bound)}`;
  return {
    id: 'reverse-predict',
    kind: 'prediction',
    title: 'Dividing by a negative number',
    prompt: 'From −3x < 6, divide both sides by −3. What is the result?',
    choices: [
      { id: 'lt-2', label: 'x < −2' },
      { id: 'gt-2', label: 'x > −2' },
      { id: 'lt2', label: 'x < 2' },
      { id: 'gt2', label: 'x > 2' },
    ],
    solution: '6 ÷ (−3) = −2. Dividing both sides by a NEGATIVE number reverses the inequality, so "<" becomes ">": x > −2. Check with x = 0: −3·0 = 0 < 6 is true and 0 > −2 is true; with x = −5: 15 < 6 is false and −5 > −2 is false.',
    grade: a => pick(a, right, {
      'gt-2': 'Yes: 6 ÷ (−3) = −2 and the relation reverses. Test x = 0: it satisfies −3x < 6, and it satisfies x > −2.',
      'lt-2': 'The number is right but the relation was not reversed. Test x = −5: −3·(−5) = 15 < 6 is false, yet −5 < −2 is true, so the two statements disagree. Dividing by a negative reverses the order.',
      lt2: 'The sign of the bound is wrong and the relation was not reversed. 6 divided by −3 is −2, not 2.',
      gt2: 'The relation was reversed correctly, but the bound has the wrong sign: 6 ÷ (−3) = −2, not 2. Test x = 0: it satisfies −3x < 6, but not x > 2.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 4. why not x0
const multiplyByZero: Exercise = (() => {
  const result = applyOperation(statement(linear(int(1), int(0)), '=', linear(int(0), int(3))), { kind: 'scale', k: int(0) });
  if (result.kind !== 'rejected') throw new Error('×0 is rejected');
  return {
    id: 'multiply-zero',
    kind: 'explanation',
    title: 'Why not multiply both sides by 0?',
    prompt: 'Why does the balance refuse "multiply both sides by 0"?',
    choices: [
      { id: 'false', label: 'it makes the equation false' },
      { id: 'lost', label: 'it turns every equation into 0 = 0, so it cannot be undone and the solution set changes' },
      { id: 'zero', label: '0 is not a number' },
      { id: 'ineq', label: 'it is only allowed for inequalities' },
    ],
    solution: 'Starting from x = 3, multiplying both sides by 0 gives 0 = 0, which is true for EVERY x. The original had one solution; the new statement has all of them, and since you cannot divide by 0 to get back, the step is not reversible. Balanced steps must keep the solution set; this one throws it away.',
    grade: a => pick(a, 'lost', {
      lost: 'Yes. x = 3 becomes 0 = 0, true for every x: the solution set grew from one number to all numbers, and dividing by 0 cannot bring it back.',
      false: 'The result is not false, it is TRUE for every x: 0 = 0. That is exactly the problem: it no longer says anything about x.',
      zero: '0 is a number, and multiplying by it is a perfectly good operation. The trouble is that it cannot be undone: nothing can be divided by 0 to recover the original equation.',
      ineq: 'For an inequality it is worse: it turns "p < q" into "0 < 0", which is false. Multiplying by 0 is not a balanced step in either case.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 5. a valid root
const validRoot: Exercise = (() => {
  const d = deriveExtraneous({ p: 6, q: -6 });
  const valid = d.roots.filter(r => r.status === 'valid');
  const bad = d.roots.filter(r => r.status === 'extraneous');
  if (valid.length !== 1 || bad.length !== 1) throw new Error('p = 6, q = −6 has one valid and one extraneous root');
  const good = valid[0]!.x.u;
  const wrong = bad[0]!.x.u;
  return {
    id: 'valid-root',
    kind: 'calculation',
    title: 'Square, solve, then check',
    prompt: 'Solve √(x + 6) = x − 6. Squaring gives two candidates; enter the one that solves the ORIGINAL equation.',
    fields: [{ id: 'x', label: 'the solution' }],
    solution: 'Squaring: x + 6 = (x − 6)², so x² − 13x + 30 = 0, with roots 3 and 10. Substitute into the original: x = 3 gives √9 = 3 on the left but 3 − 6 = −3 on the right (extraneous: it solves −√(x + 6) = x − 6). x = 10 gives √16 = 4 and 10 − 6 = 4: valid.',
    grade: ans => {
      const v = num(ans.x);
      if (v === null) return NEED_NUMBERS;
      if (same(v, good)) return ok('Yes: √16 = 4 and 10 − 6 = 4.');
      if (same(v, wrong)) return no('3 is a root of the squared equation, but in the original equation the right side is 3 − 6 = −3 while √9 = +3. A square root is never negative, so 3 is extraneous.');
      return no('Square both sides to get a quadratic, find its roots, then substitute EACH into the original equation: the right-hand side must not be negative.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 6. construct
const constructExtraneous: Exercise = {
  id: 'construct-extraneous',
  kind: 'construction',
  title: 'Build an equation with an extraneous root',
  prompt: 'Choose whole numbers p and q, each from −6 to 6, so that √(x + p) = x + q has two candidates after squaring and exactly ONE of them is extraneous.',
  fields: [{ id: 'p', label: 'p' }, { id: 'q', label: 'q' }],
  solution: 'Squaring gives t² = t + (p − q) for t = x + q, so the two candidates have t = (1 ± √D)/2 with D = 4p − 4q + 1. The candidate with the minus sign is negative (extraneous) as soon as D > 1, which happens when p > q: for example p = 2, q = 0 gives x = −1 (extraneous) and x = 2 (valid). If p = q then D = 1 and both candidates, t = 0 and t = 1, are valid; if p < q then D < 0 for q − p ≥ 1 and there are no candidates.',
  grade: ans => {
    const p = whole(ans.p);
    const q = whole(ans.q);
    if (p === null || q === null) return NEED_NUMBERS;
    if (Math.abs(p) > 6 || Math.abs(q) > 6) return no('Choose p and q between −6 and 6.');
    const d = deriveExtraneous({ p, q });
    if (d.roots.length === 0) return no(`D = 4p − 4q + 1 = ${d.discriminant} is negative: squaring gives no real candidate at all. You need D > 0, which means p ≥ q.`);
    if (d.extraneousCount === 0) return no('Both candidates solve the original equation here (p = q gives t = 0 and t = 1, both non-negative). Make p larger than q, so that one candidate has a negative right-hand side.');
    if (d.extraneousCount === 2) throw new Error('at least one candidate is always valid');
    return ok(`Yes: D = ${d.discriminant}, two candidates, and exactly one of them has a negative right-hand side x + q, so it is extraneous.`);
  },
};

// ---------------------------------------------------------------------------------------------- 7. the lost root
const lostRoot: Exercise = (() => {
  const d = deriveFallacy({ c: 2, m: 3 });
  const [lo, hi] = d.solutions as [Rational, Rational];
  return {
    id: 'lost-root',
    kind: 'calculation',
    title: 'Do not divide by (x − 2)',
    prompt: 'Find ALL solutions of x(x − 2) = 3(x − 2). Enter the smaller solution and the larger one.',
    fields: [{ id: 'small', label: 'smaller solution' }, { id: 'large', label: 'larger solution' }],
    solution: 'Move everything to one side: x(x − 2) − 3(x − 2) = 0, so (x − 2)(x − 3) = 0 and x = 2 or x = 3. Dividing both sides by (x − 2) gives only x = 3, because it divides by 0 at x = 2, where both sides are 0.',
    grade: ans => {
      const s = num(ans.small);
      const l = num(ans.large);
      if (s === null || l === null) return NEED_NUMBERS;
      if (same(s, lo) && same(l, hi)) return ok('Yes: both x = 2 and x = 3 make the two sides equal (0 = 0 and 3 = 3).');
      if (same(s, hi) && same(l, lo)) return no('Those are the right two numbers in the wrong boxes: the smaller solution is 2, the larger is 3.');
      if (same(s, hi) && same(l, hi)) return no('That is only x = 3, the result of dividing by (x − 2). At x = 2 both sides are 0, so 2 is a solution that the division loses.');
      return no('Move everything to one side and factor: (x − 2)(x − 3) = 0. A product is 0 exactly when one of its factors is 0.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 8. distribute
const distributeExpand: Exercise = (() => {
  const d = deriveDistribute({ a: 4, b: 1, c: -3, x: 0, form: 'correct' });
  const constant = d.rhs.b; // a·c
  return {
    id: 'distribute-expand',
    kind: 'prediction',
    title: 'Expand 4(x − 3)',
    prompt: 'Which expression equals 4(x − 3) for every x?',
    choices: [
      { id: 'c-3', label: '4x − 3' },
      { id: `c${constant.num}`, label: '4x − 12' },
      { id: 'c12', label: '4x + 12' },
      { id: 'x-12', label: 'x − 12' },
    ],
    solution: 'The 4 multiplies EVERY term in the bracket: 4·x = 4x and 4·(−3) = −12, so 4(x − 3) = 4x − 12. Check at x = 5: 4·2 = 8 and 4·5 − 12 = 8. The slip 4x − 3 gives 17 instead of 8.',
    grade: a => pick(a, `c${constant.num}`, {
      [`c${constant.num}`]: 'Yes: 4·x − 4·3 = 4x − 12. At x = 5 both are 8.',
      'c-3': 'Only the first term was multiplied. At x = 5 the bracket gives 4·2 = 8, but 4x − 3 gives 17. The 4 must multiply the −3 as well.',
      c12: 'The sign was lost: 4·(−3) = −12, not +12. At x = 5 the bracket gives 8 and 4x + 12 gives 32.',
      'x-12': 'The 4 multiplied only the −3. It must multiply the x too: 4·x = 4x, not x. At x = 5 the bracket gives 8 and x − 12 gives −7.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 9. identity
const pickIdentity: Exercise = (() => {
  const options = [
    { id: 'a', label: '3(x + 1) = 3x + 3', s: statement(linear(int(3), int(3)), '=', linear(int(3), int(3))) },
    { id: 'b', label: '3(x + 1) = 3x + 1', s: statement(linear(int(3), int(3)), '=', linear(int(3), int(1))) },
    { id: 'c', label: '3(x + 1) = x + 3', s: statement(linear(int(3), int(3)), '=', linear(int(1), int(3))) },
  ];
  const kinds = options.map(o => classify(o.s));
  if (kinds.filter(k => k === 'identity').length !== 1) throw new Error('exactly one option is an identity');
  const right = options[kinds.indexOf('identity')]!.id;
  return {
    id: 'pick-identity',
    kind: 'prediction',
    title: 'Which one is an identity?',
    prompt: 'An identity is an equation that is true for every x. Which of these is one?',
    choices: options.map(o => ({ id: o.id, label: o.label })),
    solution: '3(x + 1) = 3x + 3 by the distributive law, so the two sides are the same expression and the equation holds for every x. 3(x + 1) = 3x + 1 says 3x + 3 = 3x + 1, which is never true (the sides differ by 2 at every x). 3(x + 1) = x + 3 says 3x + 3 = x + 3, true only for x = 0.',
    grade: a => pick(a, right, {
      a: 'Yes: expanding 3(x + 1) gives 3x + 3, so both sides are the same expression.',
      b: 'Expand the left side: 3x + 3. Then the equation says 3x + 3 = 3x + 1, and the sides differ by 2 for every x: it is never true (a contradiction), not always.',
      c: 'Expand the left side: 3x + 3. The equation becomes 3x + 3 = x + 3, which holds only at x = 0 (subtract x and 3 from both sides: 2x = 0). It is a conditional equation.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 10. learning rate
const learningRate: Exercise = (() => {
  const factor = (eta: number): number => Math.abs(1 - 2 * eta);
  const grid: number[] = [];
  for (let i = -8; i <= 12; i++) grid.push(i / 4);
  const contracts = grid.filter(e => factor(e) < 1);
  // the inequality −1 < 1 − 2η < 1 is solved by 0 < η < 1: check the claim against the grid
  const claim = (e: number): boolean => e > 0 && e < 1;
  if (grid.some(e => claim(e) !== (factor(e) < 1)) || contracts.length === 0) throw new Error('0 < η < 1 is the contraction range');
  return {
    id: 'learning-rate',
    kind: 'explanation',
    title: 'Which learning rates converge?',
    prompt: 'Gradient descent on f(w) = (w − c)² multiplies the distance to the minimiser by |1 − 2η| at every step. For which η does the distance shrink, |1 − 2η| < 1?',
    choices: [
      { id: 'pos', label: 'every η > 0' },
      { id: 'unit', label: '0 < η < 1' },
      { id: 'below', label: 'every η < 1' },
      { id: 'nonzero', label: 'every η other than 0' },
    ],
    solution: '|1 − 2η| < 1 means −1 < 1 − 2η < 1. Subtract 1 from all three parts: −2 < −2η < 0. Divide all three parts by −2, which REVERSES both inequalities: 1 > η > 0, that is, 0 < η < 1. Check: η = 1/2 gives factor 0 (one step lands on c), while η = 2 gives |1 − 4| = 3 and η = −1 gives |1 + 2| = 3, both growing.',
    grade: a => pick(a, 'unit', {
      unit: 'Yes: subtracting 1 gives −2 < −2η < 0, and dividing by −2 reverses the order, so 0 < η < 1.',
      pos: `A large η overshoots: η = 2 gives the factor |1 − 4| = ${factor(2)}, so the distance triples at every step. The upper bound η < 1 comes from the reversal when dividing by −2.`,
      below: `A negative η moves AWAY from the minimiser: η = −1 gives the factor |1 + 2| = ${factor(-1)}. The lower bound η > 0 is needed as well.`,
      nonzero: `η = 2 gives the factor ${factor(2)} and η = −1 gives ${factor(-1)}, both larger than 1, so these η make the distance grow.`,
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 11. an inequality's boundary
const inequalityBoundary: Exercise = (() => {
  const set = solve(statement(linear(int(5), int(-1)), '≥', linear(int(2), int(8))));
  if (set.kind !== 'ray' || !set.closed || set.side !== 'above') throw new Error('5x − 1 ≥ 2x + 8 is x ≥ 3');
  const bound = set.bound;
  return {
    id: 'inequality-boundary',
    kind: 'calculation',
    title: 'The boundary of an inequality',
    prompt: 'The solutions of 5x − 1 ≥ 2x + 8 are all x ≥ b. Enter b.',
    fields: [{ id: 'b', label: 'b' }],
    solution: 'Subtract 2x from both sides: 3x − 1 ≥ 8. Add 1 to both sides: 3x ≥ 9. Divide by 3, a POSITIVE number, so the relation stays: x ≥ 3. The boundary 3 belongs to the solution set (the relation is ≥, not >): 5·3 − 1 = 14 = 2·3 + 8.',
    grade: ans => {
      const v = num(ans.b);
      if (v === null) return NEED_NUMBERS;
      if (same(v, bound)) return ok('Yes: x ≥ 3, and x = 3 itself is a solution because both sides equal 14 there.');
      if (same(v, half(7n, 3n))) return no('7/3 subtracts the 1 instead of adding it: from 3x − 1 ≥ 8 you ADD 1 to both sides.');
      if (same(v, half(9n, 7n))) return no('9/7 adds the x terms, 5x + 2x. To collect them, subtract 2x from both sides: 5x − 2x = 3x.');
      if (same(v, int(-3))) return no('−3 has the wrong sign. The divisor is +3, positive, so nothing is reversed and the bound stays +3.');
      return no('Subtract 2x from both sides, add 1 to both sides, then divide by the positive number left in front of x.');
    },
  };
})();

export const EXERCISES: readonly Exercise[] = Object.freeze([
  solveLinear, noSolution, reversePredict, multiplyByZero, validRoot, constructExtraneous, lostRoot, distributeExpand, pickIdentity, learningRate, inequalityBoundary,
]);
export const exerciseById = (id: string): Exercise | undefined => byId(EXERCISES, id);
