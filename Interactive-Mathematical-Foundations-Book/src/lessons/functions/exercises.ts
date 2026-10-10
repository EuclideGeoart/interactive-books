/**
 * Exercises for I.5. Pure data plus a pure `grade`. The expected answers are COMPUTED by the domain model (`deriveFunction`, `domainOfRule`,
 * `imageOfRule`, `preimages`, `deriveComposition`, `deriveInverse`), never typed in twice, and every wrong answer that matches a known
 * misconception gets a hint that names it.
 */
import { deriveComposition, deriveInverse } from '../../math/functions/compose';
import { rayDown, rayUp, setEquals, type IntervalSet } from '../../math/functions/interval';
import { deriveFunction, domainOfRule, imageOfRule, preimages } from '../../math/functions/rule';
import { numRational, numEqual, rationalNum } from '../../math/functions/value';
import { int, rational, type Rational, ZERO } from '../../math/quantity/rational';
import { byId, no, NEED_NUMBERS, ok, parseRational, pick, type Exercise } from '../../platform/exercise';

const frac = (r: { num: bigint; den: bigint } | null): Rational | null => (r ? rational(r.num, r.den) : null);
const num = (raw: string | undefined): Rational | null => frac(parseRational(raw));
const same = (a: Rational | null, b: Rational): boolean => a !== null && a.num === b.num && a.den === b.den;
const whole = (raw: string | undefined): number | null => {
  const r = num(raw);
  return r && r.den === 1n ? Number(r.num) : null;
};

/** The id of the one choice whose set equals the model's set. */
function matching(choices: readonly { id: string; set: IntervalSet }[], truth: IntervalSet): string {
  const hits = choices.filter(c => setEquals(c.set, truth));
  if (hits.length !== 1) throw new Error('exactly one choice must equal the set computed by the model');
  return hits[0]!.id;
}

// ---------------------------------------------------------------------------------------------- 1. evaluate (x − 3)² at −1
const evaluateShift: Exercise = (() => {
  const d = deriveFunction({ rule: 'shift', a: 3, x: -1 });
  const y = numRational(d.output);
  if (y === null) throw new Error('(−1 − 3)² is an integer');
  const slip = (x: number, a: number): Rational => int((x + a) * (x + a)); // the sign slip: x + a instead of x − a
  return {
    id: 'evaluate-shift',
    kind: 'calculation',
    title: 'Evaluate a function',
    prompt: 'The machine is f(x) = (x − 3)²: subtract 3, then square. Enter f(−1).',
    fields: [{ id: 'y', label: 'f(−1)' }],
    solution: 'Write the input where x was: f(−1) = (−1 − 3)². Subtract first: −1 − 3 = −4. Then square: (−4)² = 16. The brackets matter: the whole of −4 is squared, so the minus sign disappears.',
    grade: ans => {
      const v = num(ans.y);
      if (v === null) return NEED_NUMBERS;
      if (same(v, y)) return ok('Yes: −1 − 3 = −4 and (−4)² = 16.');
      if (same(v, int(-4))) return no('−4 is the value after the first step. The machine has a second step: square it. (−4)² = 16.');
      if (same(v, int(-16))) return no('−16 squares only the 4 and keeps the minus sign outside. The brackets put the whole of −4 under the square: (−4)(−4) = +16.');
      if (same(v, slip(-1, 3))) return no('4 comes from (−1 + 3)²: the input was added to 3 instead of having 3 subtracted. The rule subtracts: −1 − 3 = −4.');
      if (same(v, int(-8))) return no('−8 squares the two numbers separately, (−1)² − 3² = 1 − 9. The rule squares the DIFFERENCE: (−1 − 3)² = (−4)².');
      return no('Substitute −1 for x, work inside the brackets first (−1 − 3), then square the result.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 2. the effect of the parameter
const shiftDirection: Exercise = (() => {
  const vertex = (a: number): Rational => {
    const p = preimages('shift', a, ZERO);
    if (p.kind !== 'points' || p.xs.length !== 1 || p.xs[0]!.b !== 1n) throw new Error('(x − a)² = 0 has the one rational solution x = a');
    return p.xs[0]!.u;
  };
  const before = vertex(2);
  const after = vertex(4);
  const moved = Number(after.num - before.num);
  return {
    id: 'shift-direction',
    kind: 'prediction',
    title: 'Which way does the curve move?',
    prompt: 'The graph of f(x) = (x − a)² has its lowest point where the output is 0. When a is increased from 2 to 4, how does the whole graph move?',
    choices: [
      { id: 'right', label: 'right by 2' },
      { id: 'left', label: 'left by 2' },
      { id: 'up', label: 'up by 2' },
      { id: 'down', label: 'down by 2' },
    ],
    solution: 'The output is 0 when x − a = 0, that is, at x = a. So the lowest point is at x = 2 for a = 2 and at x = 4 for a = 4: it moves 2 to the right. The minus sign is what misleads: the input needs to be LARGER to cancel a larger a, so the graph shifts in the positive direction.',
    grade: a => pick(a, moved > 0 ? 'right' : 'left', {
      right: 'Yes: (x − 4)² = 0 at x = 4, while (x − 2)² = 0 at x = 2. The graph moves 2 to the right.',
      left: 'The minus sign suggests "subtract, so go left", but check the lowest point: (x − 4)² is 0 at x = 4, which is to the RIGHT of x = 2, the lowest point when a = 2.',
      up: 'A shift of the INPUT moves the graph sideways, not up. The lowest value stays 0; what moves is the x at which it happens (x = a).',
      down: 'The lowest output is 0 for every a, so nothing moves down. The parameter a sits inside the bracket with x, so it moves the graph sideways.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 3. domain of a square root
const rootDomain: Exercise = (() => {
  const choices = [
    { id: 'ge-3', label: 'x ≥ −3', set: rayUp(int(-3), true) },
    { id: 'gt-3', label: 'x > −3', set: rayUp(int(-3), false) },
    { id: 'ge3', label: 'x ≥ 3', set: rayUp(int(3), true) },
    { id: 'le-3', label: 'x ≤ −3', set: rayDown(int(-3), true) },
  ];
  const right = matching(choices, domainOfRule('root', 3));
  return {
    id: 'root-domain',
    kind: 'prediction',
    title: 'The domain of a square root',
    prompt: 'What is the domain of f(x) = √(x + 3)? That is, for which inputs x can the machine finish?',
    choices: choices.map(c => ({ id: c.id, label: c.label })),
    solution: 'The square root exists only for a number that is not negative, so x + 3 ≥ 0, which gives x ≥ −3. The edge belongs: at x = −3 the machine takes √0 = 0, which is fine. At x = −4 it would take √(−1), which is not a real number.',
    grade: a => pick(a, right, {
      'ge-3': 'Yes: x + 3 ≥ 0 gives x ≥ −3, and x = −3 itself is allowed because √0 = 0.',
      'gt-3': 'The edge is included. At x = −3 the machine takes √(−3 + 3) = √0 = 0, which is a perfectly good number. Only a NEGATIVE radicand is refused.',
      ge3: 'The sign of the bound is wrong: x + 3 ≥ 0 means subtracting 3 from both sides, x ≥ −3. Test x = 0: √3 exists, but 0 is not ≥ 3.',
      'le-3': 'The inequality points the wrong way. Test x = 0: √3 is fine, but 0 is not ≤ −3. The radicand x + 3 must be ≥ 0, so x is at least −3.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 4. domain of 1/(x − 2)
const poleDomain: Exercise = (() => {
  const choices = [
    { id: 'all', label: 'every real number', set: [{ lo: null, loClosed: false, hi: null, hiClosed: false }] as IntervalSet },
    { id: 'not2', label: 'every real number except 2', set: domainOfRule('pole', 2) },
    { id: 'gt2', label: 'x > 2', set: rayUp(int(2), false) },
    { id: 'not0', label: 'every real number except 0', set: domainOfRule('pole', 0) },
  ];
  const right = matching(choices, domainOfRule('pole', 2));
  return {
    id: 'pole-domain',
    kind: 'prediction',
    title: 'Where does the machine divide by zero?',
    prompt: 'What is the domain of f(x) = 1/(x − 2)?',
    choices: choices.map(c => ({ id: c.id, label: c.label })),
    solution: 'The machine first subtracts 2, then takes the reciprocal. The reciprocal of 0 is undefined, and x − 2 = 0 exactly when x = 2. Every other input works, including 0 and every number below 2: the domain is all real numbers except 2.',
    grade: a => pick(a, right, {
      not2: 'Yes: only x = 2 makes the denominator x − 2 equal to 0. Every other number gives an output.',
      all: 'At x = 2 the machine would compute 1/0, which is undefined. One input is refused, so the domain is not all of ℝ.',
      gt2: 'Inputs below 2 are fine: x = 0 gives 1/(−2) = −1/2. Only the single input 2 is refused, not everything on one side of it.',
      not0: 'The denominator is x − 2, not x. At x = 0 the machine computes 1/(0 − 2) = −1/2, which is fine; at x = 2 it computes 1/0.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 5. image of −2x²
const stretchImage: Exercise = (() => {
  const choices = [
    { id: 'le0', label: 'every number y ≤ 0', set: rayDown(int(0), true) },
    { id: 'ge0', label: 'every number y ≥ 0', set: rayUp(int(0), true) },
    { id: 'all', label: 'every real number', set: [{ lo: null, loClosed: false, hi: null, hiClosed: false }] as IntervalSet },
    { id: 'le-2', label: 'every number y ≤ −2', set: rayDown(int(-2), true) },
  ];
  const right = matching(choices, imageOfRule('stretch', -2));
  return {
    id: 'stretch-image',
    kind: 'prediction',
    title: 'The image of −2x²',
    prompt: 'What is the image of f(x) = −2x², the set of all outputs the machine can give?',
    choices: choices.map(c => ({ id: c.id, label: c.label })),
    solution: 'The square x² is never negative and takes every value from 0 upwards. Multiplying by −2 reverses the order, so the outputs are every number from 0 downwards: y ≤ 0. No input gives 1, because −2x² = 1 would need x² = −1/2.',
    grade: a => pick(a, right, {
      le0: 'Yes: x² ≥ 0, and multiplying by −2 reverses the inequality to −2x² ≤ 0. Every number y ≤ 0 is reached by x = √(−y/2).',
      ge0: 'The multiplier −2 is negative, so it reverses the order: −2x² is never positive. Try x = 1: the output is −2.',
      all: 'The codomain may be all of ℝ, but the image is what is actually produced. Positive outputs never appear: −2x² = 1 would need x² = −1/2, and a square is never negative.',
      'le-2': 'The outputs do go as far down as you like, but −2 is not the top: x = 0 gives 0, and x = 1/2 gives −1/2. The largest output is 0.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 6. preimages of 9 under (x − 2)²
const preimageNine: Exercise = (() => {
  const p = preimages('shift', 2, int(9));
  if (p.kind !== 'points' || p.xs.length !== 2) throw new Error('(x − 2)² = 9 has two solutions');
  const [lo, hi] = [p.xs[0]!.u, p.xs[1]!.u];
  return {
    id: 'preimage-nine',
    kind: 'calculation',
    title: 'Which inputs give the output 9?',
    prompt: 'For f(x) = (x − 2)², find ALL inputs x with f(x) = 9. Enter the smaller one and the larger one.',
    fields: [{ id: 'small', label: 'smaller input' }, { id: 'large', label: 'larger input' }],
    solution: '(x − 2)² = 9 means x − 2 = 3 or x − 2 = −3, because both 3 and −3 square to 9. Add 2: x = 5 or x = −1. Check: (5 − 2)² = 9 and (−1 − 2)² = 9. Two inputs share the output 9, so f is not one-to-one.',
    grade: ans => {
      const s = num(ans.small);
      const l = num(ans.large);
      if (s === null || l === null) return NEED_NUMBERS;
      if (same(s, lo) && same(l, hi)) return ok('Yes: (−1 − 2)² = 9 and (5 − 2)² = 9. Two different inputs, one output.');
      if (same(s, hi) && same(l, lo)) return no('Those are the right two numbers in the wrong boxes: the smaller input is −1, the larger is 5.');
      if (same(s, int(-3)) && same(l, int(3))) return no('±3 solves x² = 9. Here the square is of x − 2, so x − 2 = ±3, and then you add 2 to each: −1 and 5.');
      if (same(s, hi) && same(l, hi)) return no('x = 5 is one solution, but the square also has the negative root: x − 2 = −3 gives x = −1. Both inputs give 9.');
      return no('Take the square root of both sides, allowing both signs: x − 2 = 3 or x − 2 = −3. Then add 2 to each. Check by squaring.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 7. composition order
const compositionOrder: Exercise = (() => {
  const d = deriveComposition({ f: 'sq', g: 'lin', x: 3 });
  const fg = numRational(d.fg.output);
  const gf = numRational(d.gf.output);
  if (fg === null || gf === null || numEqual(d.fg.output, d.gf.output)) throw new Error('the two orders differ at x = 3');
  return {
    id: 'composition-order',
    kind: 'calculation',
    title: 'Which machine goes first?',
    prompt: 'Let f(x) = x² and g(x) = 2x − 1. Compute f(g(3)): g acts FIRST, then f. Enter the number.',
    fields: [{ id: 'y', label: 'f(g(3))' }],
    solution: 'Work from the inside: g(3) = 2·3 − 1 = 5. Then f(5) = 5² = 25. In the other order, f(3) = 9 and g(9) = 2·9 − 1 = 17. The two orders give different outputs, so composition is not commutative.',
    grade: ans => {
      const v = num(ans.y);
      if (v === null) return NEED_NUMBERS;
      if (same(v, fg)) return ok('Yes: g(3) = 5 and then f(5) = 25.');
      if (same(v, gf)) return no('17 is g(f(3)): f was applied first. In f(g(3)) the INNER function g acts first, on 3: g(3) = 5, and then f(5) = 25.');
      if (same(v, int(45))) return no('45 multiplies the two outputs, f(3) · g(3) = 9 · 5. A composition feeds the output of one machine into the next; it does not multiply them. g(3) = 5, then f(5) = 25.');
      if (same(v, int(5))) return no('5 is g(3), the value after the first machine. The second machine f must still act on it: f(5) = 25.');
      return no('Start with the innermost: compute g(3) = 2·3 − 1, then put that number into f and square it.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 8. domain of a composite
const compositeDomain: Exercise = (() => {
  const choices = [
    { id: 'ge-half', label: 'x ≥ 1/2', set: rayUp(rational(1n, 2n), true) },
    { id: 'ge0', label: 'x ≥ 0', set: rayUp(int(0), true) },
    { id: 'all', label: 'every real number', set: [{ lo: null, loClosed: false, hi: null, hiClosed: false }] as IntervalSet },
    { id: 'gt-half', label: 'x > 1/2', set: rayUp(rational(1n, 2n), false) },
  ];
  const d = deriveComposition({ f: 'rt', g: 'lin', x: 1 });
  const right = matching(choices, d.fgDomain);
  return {
    id: 'composite-domain',
    kind: 'explanation',
    title: 'The domain of a composite',
    prompt: 'Let f(x) = √x and g(x) = 2x − 1. For which x can the composite f(g(x)) = √(2x − 1) be computed?',
    choices: choices.map(c => ({ id: c.id, label: c.label })),
    solution: 'g accepts every real x, but f accepts only numbers that are not negative, so the output of g must satisfy 2x − 1 ≥ 0. Add 1 and divide by 2 (a positive number, so the relation stays): x ≥ 1/2. The domain of a composite is the part of g\'s domain whose outputs f can accept.',
    grade: a => pick(a, right, {
      'ge-half': 'Yes: 2x − 1 ≥ 0 gives x ≥ 1/2, and at x = 1/2 the machine takes √0 = 0.',
      ge0: 'x ≥ 0 is the domain of f alone. The input of f is g(x) = 2x − 1, and x = 0 gives g(0) = −1, which f refuses. The condition is on 2x − 1, not on x.',
      all: 'g accepts every real number, but f refuses negative inputs, and g(0) = −1 is negative. The composite inherits the restriction.',
      'gt-half': 'The edge is included. At x = 1/2, g(1/2) = 0 and f(0) = √0 = 0: the machine finishes.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 9. construction
const constructAnOutput: Exercise = {
  id: 'construct-output',
  kind: 'construction',
  title: 'Choose the parameter',
  prompt: 'The machine is f(x) = (x − a)². Choose a whole number a from −5 to 5 so that f(1) = 16. Either of the two possible values is accepted.',
  fields: [{ id: 'a', label: 'a' }],
  solution: 'f(1) = (1 − a)² = 16 means 1 − a = 4 or 1 − a = −4, so a = −3 or a = 5. Check: (1 − (−3))² = 4² = 16 and (1 − 5)² = (−4)² = 16. Two parameter values give the same output, for the same reason that two inputs can: a square has two roots.',
  grade: ans => {
    const a = whole(ans.a);
    if (a === null) return NEED_NUMBERS;
    if (Math.abs(a) > 5) return no('Choose a between −5 and 5.');
    const d = deriveFunction({ rule: 'shift', a, x: 1 });
    const out = numRational(d.output);
    if (numEqual(d.output, rationalNum(int(16)))) return ok(`Yes: f(1) = (1 − ${a < 0 ? `(−${-a})` : a})² = ${a === 5 ? '(−4)²' : '4²'} = 16.`);
    return no(`With a = ${a} the output f(1) is ${out === null ? 'not a whole number' : String(out.num)}, not 16. Solve (1 − a)² = 16: take the square root with both signs, 1 − a = 4 or 1 − a = −4.`);
  },
};

// ---------------------------------------------------------------------------------------------- 10. why the square has no inverse
const noSquareInverse: Exercise = (() => {
  const all = deriveInverse({ fn: 'sq', x: 3, restrict: false });
  const half = deriveInverse({ fn: 'sq', x: 3, restrict: true });
  if (all.hasInverse || !half.hasInverse || all.twin === null) throw new Error('x² has no inverse on ℝ but has one on x ≥ 0');
  return {
    id: 'square-inverse',
    kind: 'explanation',
    title: 'Why x² cannot be undone on ℝ',
    prompt: 'Why is there no inverse function for f(x) = x² on all real numbers?',
    choices: [
      { id: 'two', label: 'two different inputs, such as 3 and −3, give the same output 9, so the backward machine would have two answers' },
      { id: 'neg', label: 'x² is not defined for negative x' },
      { id: 'notfn', label: 'x² is not a function' },
      { id: 'nonzero', label: 'x² is 0 at x = 0, and one cannot divide by 0' },
    ],
    solution: 'A function must give exactly one output for each input. Running x² backwards from the output 9 would have to return both 3 and −3, which is two outputs. Restricting the inputs to x ≥ 0 removes the duplicates and the square root becomes the inverse. Every function is a function; being invertible is the extra property that different inputs give different outputs.',
    grade: a => pick(a, 'two', {
      two: 'Yes: f(3) = f(−3) = 9, so f is not one-to-one, and an inverse would have to send 9 back to both. Restricted to x ≥ 0 it has one: the square root.',
      neg: 'x² is defined for every real number: (−3)² = 9. That is the problem: −3 and 3 both give 9, so the output 9 cannot be traced back to one input.',
      notfn: 'x² is a function: each input gives exactly one output. It is the BACKWARD relation, from 9 to {3, −3}, that is not a function.',
      nonzero: 'No division is involved. The obstacle is that 3 and −3 give the same output 9, so the output does not identify the input.',
    }),
  };
})();

export const EXERCISES: readonly Exercise[] = Object.freeze([
  evaluateShift, shiftDirection, rootDomain, poleDomain, stretchImage, preimageNine, compositionOrder, compositeDomain, constructAnOutput, noSquareInverse,
]);
export const exerciseById = (id: string): Exercise | undefined => byId(EXERCISES, id);
