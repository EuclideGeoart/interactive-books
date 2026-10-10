/**
 * Exercises for I.1. Pure data plus a pure `grade`. The expected answers are COMPUTED by the domain model (`rootOf`, `combine`, `power`,
 * `mul`), never typed in twice, and every wrong answer that matches a known misconception gets a hint that names the mistake.
 */
import { combine, LENGTH, TIME } from '../../math/quantity/dimension';
import { int, mul, parseDecimal, power, rational, toNumber, type Rational } from '../../math/quantity/rational';
import { rootOf } from '../../math/quantity/root';
import { byId, no, NEED_NUMBERS, ok, parseRational, pick, type Exercise } from '../../platform/exercise';

const frac = (r: { num: bigint; den: bigint } | null): Rational | null => (r ? rational(r.num, r.den) : null);
const same = (a: Rational | null, b: Rational): boolean => a !== null && a.num === b.num && a.den === b.den;
const R = (text: string): Rational => parseDecimal(text)!;
/** A whole number typed by the reader, or `null`. */
function wholeNumber(raw: string | undefined): bigint | null {
  const r = frac(parseRational(raw));
  return r && r.den === 1n ? r.num : null;
}

// ---------------------------------------------------------------------------------------------- 1. the root forgets the sign
const sqrtOfSquare: Exercise = {
  id: 'sqrt-of-square',
  kind: 'prediction',
  title: 'Square, then root',
  prompt: 'What is √((−5)²)? Predict the answer first, then check it on the stage above by choosing side −5.',
  choices: [
    { id: 'minus5', label: '−5' },
    { id: 'plus5', label: '5' },
    { id: 'p25', label: '25' },
    { id: 'undef', label: 'It is undefined' },
  ],
  solution: '(−5)² = 25, and √25 is the non-negative number whose square is 25, which is 5. So √((−5)²) = 5 = |−5|. In general √(q²) = |q|, not q.',
  grade: a => pick(a, 'plus5', {
    plus5: 'Yes: (−5)² = 25 and √25 = 5. The square root symbol always returns the non-negative root, so √(q²) = |q|.',
    minus5: 'That assumes the root "undoes" the square. Squaring erased the sign: (−5)² = 25 = 5², and √25 can only return one number, the non-negative one, 5.',
    p25: 'That is the square, not the root. (−5)² = 25, and then √25 asks for the number whose square is 25.',
    undef: 'The square (−5)² = 25 is positive, so its root exists. It is the root of a NEGATIVE number that would not exist.',
  }),
};

// ---------------------------------------------------------------------------------------------- 2. simplify √72
const simplify72: Exercise = {
  id: 'simplify-72',
  kind: 'calculation',
  title: 'Simplify √72',
  prompt: 'Write √72 as a·√b, where b has no square factor left (no 4, 9, 16, … divides it). Enter the whole numbers a and b.',
  fields: [{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }],
  solution: '72 = 36 · 2 = 6² · 2, so √72 = 6√2. Check: (6√2)² = 36 · 2 = 72. The larger square factor is 36; taking out only 4 (72 = 4 · 18) or 9 (72 = 9 · 8) leaves a root that can still be simplified.',
  grade: ans => {
    const a = wholeNumber(ans.a);
    const b = wholeNumber(ans.b);
    if (a === null || b === null) return NEED_NUMBERS;
    const expected = rootOf(int(72), 2);
    if (expected.kind !== 'exact') throw new Error('72 has an exact root form');
    if (a === expected.root.a && b === expected.root.b) return ok(`Yes: √72 = ${a}√${b}. Squaring it gives ${a * a} · ${b} = 72.`);
    if (a <= 0n || b <= 0n) return no('Both numbers are positive whole numbers: the root of 72 is a positive number.');
    if (a * a * b !== 72n) {
      if (a === 36n) return no('36 is the square factor, but it leaves the root as its ROOT, 6: √36 = 6. Squaring a·√b gives a² · b, and 36² · 2 is far more than 72.');
      return no(`Check by squaring: (${a}√${b})² = ${a}² · ${b} = ${a * a * b}, which is not 72.`);
    }
    // a²·b = 72 but not the simplest form: b still contains a square factor.
    const rest = rootOf(rational(b), 2);
    const factor = rest.kind === 'exact' ? rest.root.a : 1n;
    return no(`That is equal to √72, but not fully simplified: b = ${b} still has the square factor ${factor * factor}, because ${b} = ${factor * factor} · ${b / (factor * factor)}. Take out the largest square factor of 72.`);
  },
};

// ---------------------------------------------------------------------------------------------- 3. construct a side from a decimal area
const constructSide: Exercise = {
  id: 'construct-side',
  kind: 'construction',
  title: 'Build a square',
  prompt: 'A square must have area 0.0049 square metres. Enter a side length, in metres, whose square is exactly 0.0049.',
  fields: [{ id: 'side', label: 'side (m)' }],
  solution: '0.0049 = 49 / 10 000, so the side is √49 / √10 000 = 7 / 100 = 0.07. Check: 0.07 × 0.07 = 0.0049. (−0.07 also squares to 0.0049, so it solves the equation, but a length is positive, so it is not a side.)',
  grade: ans => {
    const side = frac(parseRational(ans.side));
    if (!side) return NEED_NUMBERS;
    const target = R('0.0049');
    if (same(mul(side, side), target)) {
      return side.num < 0n
        ? no('−0.07 does square to 0.0049: it is the other solution of x² = 0.0049. But a side length cannot be negative, so the side is the positive one, 0.07.')
        : ok('Yes: 0.07 × 0.07 = 0.0049 exactly. Squaring doubles the number of decimal places, so the root of a number with 4 decimal places has 2.');
    }
    const tenfold = [R('0.7'), R('0.007')];
    if (same(side, tenfold[0]!)) return no('0.7 squared is 0.49: the digits 7 and 49 are right, but squaring doubles the decimal places (0.7² has 2, not 4).');
    if (same(side, tenfold[1]!)) return no('0.007 squared is 0.000049, with 6 decimal places. You need 4, so the side has 2.');
    if (same(side, R('0.00245'))) return no('That halves the area. Squaring is not doubling: the side is the number that multiplies ITSELF to give the area.');
    return no(`${ans.side?.trim()} × ${ans.side?.trim()} = ${toNumber(mul(side, side))}, not 0.0049. Think of 0.0049 as 49 ten-thousandths.`);
  },
};

// ---------------------------------------------------------------------------------------------- 4. which expression has a meaning
const unitsMeaning: Exercise = {
  id: 'units-meaning',
  kind: 'explanation',
  title: 'Which has a meaning?',
  prompt: 'Exactly one of these expressions is a meaningful quantity in the model of the stage above. Which one?',
  choices: [
    { id: 'add-clash', label: '3 m + 2 s' },
    { id: 'multiply', label: '3 m × 2 s' },
    { id: 'add-area', label: '3 m + 2 m²' },
    { id: 'root-length', label: '√(3 m)' },
    { id: 'divide-zero', label: '5 m ÷ (0 s)' },
  ],
  solution: 'Multiplying always works: the exponents add, 3 m × 2 s = 6 m·s. Adding needs identical units (m and s differ; m and m² differ). A square root needs even exponents, and m has exponent 1. Dividing by a zero quantity is undefined whatever its unit.',
  grade: a => {
    const reasons = {
      'add-clash': 'Metres and seconds are different kinds of quantity: there is no common unit to add in, so the sum is undefined. Only multiplying or dividing mixes them.',
      'add-area': 'A length and an area are different kinds of quantity (exponent 1 and exponent 2 of metres). Adding needs identical units.',
      'root-length': 'A square root halves the exponents: m would become m^(½), a fractional exponent, which this model does not have. A square root keeps a unit only when every exponent is even.',
      'divide-zero': 'Dividing by zero is undefined whatever the unit is: no number multiplied by 0 gives 5.',
    } as const;
    return pick(a, 'multiply', { multiply: 'Yes: multiplication adds the exponent vectors, (1,0,0) + (0,1,0) = (1,1,0), so the result is 6 m·s. It is always defined.', ...reasons });
  },
};

// ---------------------------------------------------------------------------------------------- 5. a speed from a distance and a time
const speedUnits: Exercise = {
  id: 'speed-units',
  kind: 'calculation',
  title: 'A speed, with its unit',
  prompt: 'A cart covers 150 m in 12.5 s. Enter its speed as a number of metres per second, and the exponent of seconds in its unit (the unit is m·s^e).',
  fields: [{ id: 'speed', label: 'speed (number)' }, { id: 'exp', label: 'exponent e of s' }],
  solution: '150 m ÷ 12.5 s = 12 m/s. Dividing subtracts the exponent vectors: (1, 0, 0) − (0, 1, 0) = (1, −1, 0), so the unit is m·s⁻¹ = m/s and the exponent of s is −1.',
  grade: ans => {
    const speed = frac(parseRational(ans.speed));
    const e = wholeNumber(ans.exp);
    if (!speed || e === null) return NEED_NUMBERS;
    const outcome = combine('divide', { value: int(150), dim: LENGTH }, { value: R('12.5'), dim: TIME });
    if (!outcome.ok || outcome.result.value.kind !== 'rational') throw new Error('the division is defined');
    const wantSpeed = outcome.result.value.r;
    const wantExp = BigInt(outcome.result.dim[1]);
    if (same(speed, wantSpeed) && e === wantExp) return ok('Yes: 12 m/s, and the seconds sit in the denominator: exponent −1.');
    if (same(speed, mul(int(150), R('12.5')))) return no('That multiplies 150 by 12.5. A speed is distance per time: divide.');
    if (same(speed, wantSpeed) && e === -wantExp) return no('The number is right, but the seconds are in the denominator (per second), so their exponent is −1, not +1. Dividing subtracts exponents.');
    if (same(speed, wantSpeed)) return no(`The number is right. The exponent of seconds is not ${e}: dividing by a time subtracts 1 from the exponent of s, which started at 0.`);
    if (toNumber(speed) > 0 && Math.abs(toNumber(speed) - 12.5 / 150) < 1e-3) return no('That is time divided by distance (seconds per metre). Speed is distance divided by time.');
    return no('Divide 150 m by 12.5 s. Remember 12.5 × 12 = 150.');
  },
};

// ---------------------------------------------------------------------------------------------- 6. a negative exponent
const negativePower: Exercise = {
  id: 'negative-power',
  kind: 'calculation',
  title: 'A negative exponent',
  prompt: 'Compute 2⁻³ exactly. Enter a whole number, a decimal or a fraction such as 3/4.',
  fields: [{ id: 'value', label: '2⁻³ =' }],
  solution: 'Each step down the ladder divides by 2: 2² = 4, 2¹ = 2, 2⁰ = 1, 2⁻¹ = 1/2, 2⁻² = 1/4, 2⁻³ = 1/8. Equivalently 2⁻³ = 1 / 2³ = 1/8 = 0.125.',
  grade: ans => {
    const v = frac(parseRational(ans.value));
    if (!v) return NEED_NUMBERS;
    const p = power(int(2), -3);
    if (p.kind !== 'value') throw new Error('2^-3 is defined');
    if (same(v, p.value)) return ok('Yes: 2⁻³ = 1/2³ = 1/8 = 0.125. A negative exponent means "divide", not "negative".');
    if (same(v, int(-8))) return no('That treats the minus sign as making the number negative. A negative exponent does not change the sign: 2⁻³ is positive. It means the reciprocal of 2³.');
    if (same(v, rational(-1n, 8n))) return no('The 1/8 is right, but the sign is not: no power of a positive number is negative. The minus in the exponent means the reciprocal.');
    if (same(v, int(-6))) return no('That multiplies 2 by −3. An exponent counts how many factors of 2 are multiplied (or divided), it is not a multiplier.');
    if (same(v, int(8))) return no('8 = 2³. The exponent is −3, so the 8 goes in the denominator: 1/8.');
    if (same(v, rational(1n, 6n))) return no('1/6 comes from 1 / (2 × 3). The exponent −3 means three factors of 2 in the denominator: 1/(2 · 2 · 2).');
    return no('Use 2⁻³ = 1 / 2³ and compute 2³ = 2 · 2 · 2 first.');
  },
};

// ---------------------------------------------------------------------------------------------- 7. a power of a power
const powerOfPower: Exercise = {
  id: 'power-of-power',
  kind: 'calculation',
  title: 'A power of a power',
  prompt: '(2³)² can be written as 2^k. Enter k, and then the value of (2³)².',
  fields: [{ id: 'k', label: 'exponent k' }, { id: 'value', label: 'value' }],
  solution: '(2³)² = 2³ · 2³ = 2⁶ = 64. A power of a power multiplies the exponents: 3 × 2 = 6. (Adding gives 2⁵ = 32, which is 2³ · 2², a product of powers, a different expression.)',
  grade: ans => {
    const k = wholeNumber(ans.k);
    const v = frac(parseRational(ans.value));
    if (k === null || !v) return NEED_NUMBERS;
    const inner = power(int(2), 3);
    const outer = inner.kind === 'value' ? power(inner.value, 2) : inner;
    if (outer.kind !== 'value') throw new Error('defined');
    if (k === 6n && same(v, outer.value)) return ok('Yes: (2³)² = 2⁶ = 64. Exponents multiply when a power is raised to a power.');
    if (k === 5n) return no('You added the exponents. That rule belongs to a PRODUCT: 2³ · 2² = 2⁵. Here the whole 2³ is squared: 2³ · 2³ = 2⁶.');
    if (k === 9n) return no('3² = 9 would be 2 raised to the power 3²: 2^(3²) = 2⁹, which is a different expression. In (2³)² the 2 is raised to 3 first, and that result is squared.');
    if (k === 6n) return no(`k = 6 is right. The value of 2⁶ is 2·2·2·2·2·2 = ${outer.value.num}.`);
    return no('Write it out: (2³)² = 2³ · 2³ = (2·2·2)·(2·2·2), six factors of 2 in total.');
  },
};

// ---------------------------------------------------------------------------------------------- 8. the zero base
const zeroBase: Exercise = {
  id: 'zero-base',
  kind: 'explanation',
  title: 'Where a rule goes silent',
  prompt: 'On the powers stage, choose base 0 with m = −1 and n = 1. The product rule bᵐ·bⁿ = bᵐ⁺ⁿ would say 0⁻¹ · 0¹ = 0⁰. Which statement is correct?',
  choices: [
    { id: 'false-rule', label: 'The product rule is false for b = 0.' },
    { id: 'silent', label: 'The rule makes no claim: 0⁻¹ is undefined, so the left side does not exist.' },
    { id: 'zero', label: '0⁻¹ = 0, so both sides equal 0.' },
    { id: 'infinity', label: '0⁻¹ is ∞, which is a number, so the rule holds.' },
  ],
  solution: 'A negative power means a reciprocal, and 0 has no reciprocal (1/0 is undefined), so 0⁻¹ does not exist and neither does the product 0⁻¹ · 0¹. The rule is a statement about two things that both exist; where one does not, it says nothing. (Whenever both sides exist the rule holds, for every base, which the stage checks.)',
  grade: a => pick(a, 'silent', {
    silent: 'Yes. The rule never gets to make a claim: 0⁻¹ = 1/0 does not exist. "The rule is false" would need two numbers that differ, and here there is only one side.',
    'false-rule': 'A rule is false only if both sides exist and differ. Here the left side does not exist at all, so there is nothing to compare: the rule is silent, not wrong.',
    zero: '0⁻¹ would be 1/0¹ = 1/0, and dividing by zero is undefined. It is not 0: 0 · x = 1 has no solution x.',
    infinity: '∞ is not a real number, and the model works with real numbers. 1/0 is undefined, not infinite.',
  }),
};

// ---------------------------------------------------------------------------------------------- 9. an odd root of a negative number
const oddRoot: Exercise = {
  id: 'odd-root',
  kind: 'calculation',
  title: 'A cube root of a negative number',
  prompt: 'Compute ∛(−27), the real number whose cube is −27. Enter a number (or the word undefined if you think there is none).',
  fields: [{ id: 'value', label: '∛(−27) =' }],
  solution: '(−3)³ = (−3)(−3)(−3) = 9 · (−3) = −27, so ∛(−27) = −3. An odd power keeps the sign, so an odd root of a negative number exists and is negative. (Only EVEN roots of negative numbers have no real value.)',
  grade: ans => {
    const raw = (ans.value ?? '').trim().toLowerCase();
    if (/undef|none|no real|not exist/.test(raw)) return no('Only an EVEN root of a negative number is undefined, because even powers are never negative. An odd power keeps the sign: (−3)³ = −27, so ∛(−27) exists.');
    const v = frac(parseRational(ans.value));
    if (!v) return NEED_NUMBERS;
    const root = rootOf(int(-27), 3);
    if (root.kind !== 'exact') throw new Error('exact');
    if (same(v, rational(root.root.a, root.root.c))) return ok('Yes: (−3)³ = −27, so the cube root is −3.');
    if (same(v, int(3))) return no('3³ = +27, not −27. A positive number cubed is positive; to get −27 the number itself has to be negative.');
    if (same(v, int(-9))) return no('That divides −27 by 3. A cube root is the number multiplied by itself THREE times to give −27: (−3) · (−3) · (−3).');
    return no('Look for a number that, multiplied by itself three times, gives −27. The sign of an odd power is the sign of the base.');
  },
};

// ---------------------------------------------------------------------------------------------- 10. an even power is never negative
const evenRootCount: Exercise = {
  id: 'even-root-count',
  kind: 'prediction',
  title: 'How many real solutions?',
  prompt: 'How many real numbers x satisfy x⁴ = −16? Predict, then check on the roots stage with n = 4 and A = −8.',
  choices: [
    { id: 'zero', label: 'None' },
    { id: 'one', label: 'One' },
    { id: 'two', label: 'Two: x = 2 and x = −2' },
    { id: 'four', label: 'Four' },
  ],
  solution: 'x⁴ = (x²)² and a square is never negative, so x⁴ ≥ 0 for every real x: the equation has no real solution. (2⁴ = (−2)⁴ = +16, so ±2 solve x⁴ = 16, not x⁴ = −16.)',
  grade: a => pick(a, 'zero', {
    zero: 'Yes: x⁴ = (x²)² is a square of a real number, so it is never negative. On the graph, the curve y = x⁴ never goes below the x-axis, so the line y = −16 misses it.',
    two: 'That solves x⁴ = +16: 2⁴ = 16 and (−2)⁴ = 16. The sign matters: no real x has x⁴ negative.',
    one: 'There is no real solution. For an ODD index there would be exactly one; for an even index the curve y = xⁿ lies on or above the x-axis.',
    four: 'A real equation x⁴ = A has at most two real solutions (the other two roots of the polynomial are complex). Here the right side is negative, so it has none.',
  }),
};

// ---------------------------------------------------------------------------------------------- 11. Python and the real cube root
const pythonCubeRoot: Exercise = {
  id: 'python-cube-root',
  kind: 'prediction',
  title: 'What does Python say?',
  prompt: 'In Python 3, what does (-8) ** (1/3) evaluate to? Predict, then see the reference code below.',
  choices: [
    { id: 'minus2', label: '−2.0, the real cube root' },
    { id: 'complex', label: 'A complex number, about 1.0 + 1.732j' },
    { id: 'error', label: 'It raises a ValueError' },
    { id: 'two', label: '2.0' },
  ],
  solution: 'For a negative base, Python\'s ** with a fractional exponent returns the PRINCIPAL complex root: 2 · (cos 60° + i sin 60°) = 1 + 1.732i. It does not return −2. To get the real cube root, take the root of the size and restore the sign (-(8 ** (1/3))) or use math.cbrt.',
  grade: a => pick(a, 'complex', {
    complex: 'Yes. Python switches to complex numbers for a negative base with a fractional exponent: (−8) ** (1/3) is about 1.0000000000000002+1.7320508075688772j, a different number system. For the real cube root use -((8) ** (1/3)) or math.cbrt(-8).',
    minus2: 'The real cube root is −2, but Python\'s ** does not return it: for a negative base and a fractional exponent it returns the principal complex root.',
    error: 'math.sqrt(-1) raises a ValueError, but the ** operator does not: it returns a complex number instead of failing.',
    two: 'Check the sign: 2³ = +8, so 2.0 would be a cube root of +8, not −8. And ** here returns a complex number.',
  }),
};

export const EXERCISES: readonly Exercise[] = Object.freeze([
  sqrtOfSquare, simplify72, constructSide, unitsMeaning, speedUnits, negativePower, powerOfPower, zeroBase, oddRoot, evenRootCount, pythonCubeRoot,
]);
export const exerciseById = (id: string): Exercise | undefined => byId(EXERCISES, id);
