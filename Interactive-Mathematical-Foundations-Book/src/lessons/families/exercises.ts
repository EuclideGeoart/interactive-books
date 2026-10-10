/**
 * Exercises for the Essential function families chapter (I.6). Pure, serializable definitions graded by id. Each asks the reader to predict,
 * calculate, construct or choose between explanations, and every wrong answer that matches a known misconception gets a hint that names it.
 * Text is plain (no TeX): unicode symbols only.
 */
import { NEED_NUMBERS, no, ok, parseNumber, pick, type Exercise } from '../../platform/exercise';

export type { Exercise };
const near = (value: number, target: number, tolerance: number): boolean => Math.abs(value - target) <= tolerance;

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'exp-overtakes-square', kind: 'prediction', title: 'When does 2ˣ overtake x²?',
    prompt: 'Compare 2ᵏ and k² for the whole numbers k = 1, 2, 3, 4, 5, … What is the smallest whole number n such that 2ᵏ is strictly larger than k² for EVERY whole number k ≥ n?',
    fields: [{ id: 'n', label: 'n =' }],
    solution: 'k = 1: 2 > 1. k = 2: 4 = 4. k = 3: 8 < 9. k = 4: 16 = 16. k = 5: 32 > 25, and from then on doubling beats the factor (k+1)²/k², which is below 2 once k ≥ 3, so 2ᵏ stays ahead. The answer is n = 5. (k = 1 does not count: the condition must hold for every k from n onwards, and it fails at k = 2, 3, 4.)',
    grade(a) {
      const n = parseNumber(a.n);
      if (n === null) return NEED_NUMBERS;
      if (n === 5) return ok('Yes. At k = 4 the two are equal (16 = 16), so the strict lead starts at k = 5, and the exponential never loses it again.');
      if (n === 4) return no('At k = 4 they are EQUAL (2⁴ = 16 = 4²), and the question asks for strictly larger. Look one step further.');
      if (n === 3) return no('Check k = 3: 2³ = 8 but 3² = 9, so the square is still ahead.');
      if (n === 1 || n === 2) return no('k = 1 is a coincidence (2 > 1). The condition must hold for EVERY k ≥ n, and it fails at k = 2, 3 and 4.');
      return no('Not yet. Tabulate 2ᵏ and k² for k = 1 to 6 and find the last place where 2ᵏ is not strictly larger.');
    },
  },
  {
    id: 'inverse-domains', kind: 'explanation', title: 'Which round trip always works?',
    prompt: 'Inverse functions undo each other, but only on the right domain. Which of these statements is true for EVERY real number x it makes sense to ask about?',
    choices: [
      { id: 'ln-exp', label: 'ln(eˣ) = x for every real x.' },
      { id: 'exp-ln', label: 'e^(ln x) = x for every real x.' },
      { id: 'sqrt-square', label: '√(x²) = x for every real x.' },
      { id: 'square-sqrt', label: '(√x)² = x for every real x.' },
    ],
    solution: 'eˣ takes every real x to a positive number and ln brings it back, so ln(eˣ) = x for all x. The other three fail somewhere: ln x does not exist for x ≤ 0 (so e^(ln x) needs x > 0), √(x²) = |x| equals x only for x ≥ 0, and √x does not exist for x < 0 (so (√x)² needs x ≥ 0).',
    grade: a => pick(a, 'ln-exp', {
      'ln-exp': 'Yes: eˣ is defined and positive for every x, and ln undoes it everywhere. (The computer is another matter: eˣ overflows near x = 709.78.)',
      'exp-ln': 'ln x is not defined for x ≤ 0, so e^(ln x) cannot even be evaluated there. The identity holds for x > 0 only.',
      'sqrt-square': 'Try x = −3: √((−3)²) = √9 = 3, not −3. Squaring loses the sign, so √(x²) = |x|.',
      'square-sqrt': 'Try x = −4: √(−4) is not a real number, so (√x)² cannot be evaluated. The identity needs x ≥ 0.',
    }),
  },
  {
    id: 'root-of-square', kind: 'calculation', title: 'Square, then root',
    prompt: 'Start with x = −7. Square it, then take the (principal, non-negative) square root of the result. What number do you end with?',
    fields: [{ id: 'result', label: 'result =' }],
    solution: '(−7)² = 49 and √49 = 7. The root returns the NON-NEGATIVE number whose square is 49, so you get |−7| = 7, not −7: squaring cannot remember the sign.',
    grade(a) {
      const n = parseNumber(a.result);
      if (n === null) return NEED_NUMBERS;
      if (n === 7) return ok('Yes: √((−7)²) = √49 = 7 = |−7|. The sign was lost when we squared.');
      if (n === -7) return no('That would be undoing the square perfectly, but √ always returns the non-negative root. Squaring maps both 7 and −7 to 49.');
      if (n === 49) return no('49 is the square. The question asks for what you get after the root as well.');
      return no('Square first: (−7)² = 49. Then take the non-negative square root of 49.');
    },
  },
  {
    id: 'cosine-quadrant', kind: 'calculation', title: 'A cosine from the unit circle',
    prompt: 'Use the unit circle to find cos(5π/6) as a decimal rounded to 3 places. (The angle is in radians, and 5π/6 is 150°.)',
    fields: [{ id: 'cos', label: 'cos(5π/6) ≈' }],
    solution: '5π/6 lies in quadrant II, π/6 short of a half-turn. Its reference angle is π/6, where cos = √3/2 ≈ 0.866. In quadrant II the x-coordinate is negative, so cos(5π/6) = −√3/2 ≈ −0.866.',
    grade(a) {
      const n = parseNumber(a.cos);
      if (n === null) return NEED_NUMBERS;
      if (near(n, -Math.sqrt(3) / 2, 0.0015)) return ok('Yes: cos(5π/6) = −√3/2 ≈ −0.866. The reference angle is π/6 and quadrant II makes the x-coordinate negative.');
      if (near(n, Math.sqrt(3) / 2, 0.0015)) return no('The size is right (0.866) but the sign is not: at 150° the point is to the LEFT of the y-axis, so its x-coordinate, cos, is negative.');
      if (near(n, 0.5, 0.0015) || near(n, -0.5, 0.0015)) return no('0.5 is sin(5π/6) (the height). Cosine is the x-coordinate, the horizontal position of the point.');
      if (near(n, Math.cos(150), 0.0015)) return no('That is cos(150) with 150 read as RADIANS. The angle is 150 degrees, i.e. 5π/6 radians.');
      return no('Not yet. Find the reference angle (the acute angle to the x-axis), take its cosine, then fix the sign from the quadrant.');
    },
  },
  {
    id: 'arcsin-of-sin', kind: 'prediction', title: 'Does arcsin undo sin?',
    prompt: 'Take the angle θ = 2 radians (about 114.6°). Predict the value of asin(sin 2) to 4 decimal places.',
    fields: [{ id: 'value', label: 'asin(sin 2) ≈' }],
    solution: 'asin only returns angles in [−π/2, π/2] ≈ [−1.5708, 1.5708], and 2 is outside it. The sine of 2 equals the sine of π − 2 ≈ 1.1416, which IS inside the interval, so asin(sin 2) = π − 2 ≈ 1.1416.',
    grade(a) {
      const n = parseNumber(a.value);
      if (n === null) return NEED_NUMBERS;
      if (near(n, Math.PI - 2, 0.00006)) return ok('Yes: asin(sin 2) = π − 2 ≈ 1.1416. The sine takes the same value at 2 and at π − 2, and asin reports the one in [−π/2, π/2].');
      if (n === 2) return no('That would need asin to undo sin everywhere, but asin only answers between −π/2 and π/2 (≈ 1.5708). The angle 2 is outside that range.');
      if (near(n, Math.sin(2), 0.0006)) return no('0.9093 is sin 2 itself. The question asks for asin of it: the angle whose sine that is, in [−π/2, π/2].');
      return no('Not yet. Find another angle with the same sine as 2 by reflecting across the y-axis (θ → π − θ), then check it lies in [−π/2, π/2].');
    },
  },
  {
    id: 'sine-solutions', kind: 'prediction', title: 'How many angles have this sine?',
    prompt: 'How many angles θ in the half-open interval [0, 2π) satisfy sin θ = 1/2?',
    fields: [{ id: 'count', label: 'number of angles =' }],
    solution: 'sin θ = 1/2 asks for points on the unit circle at height 1/2. A horizontal line at that height meets the circle twice: at θ = π/6 (quadrant I) and θ = 5π/6 (quadrant II). A calculator\'s arcsin gives only the first.',
    grade(a) {
      const n = parseNumber(a.count);
      if (n === null) return NEED_NUMBERS;
      if (n === 2) return ok('Yes: π/6 and 5π/6. The horizontal line at height 1/2 crosses the circle twice.');
      if (n === 1) return no('That is what arcsin reports, but it reports only one of the two. The point (cos θ, 1/2) can be on either side of the y-axis.');
      if (n === 0) return no('The value 1/2 lies between −1 and 1, so the line at that height does cross the circle.');
      return no('Not yet. Draw the horizontal line at height 1/2 across the unit circle and count the crossings between θ = 0 and θ = 2π.');
    },
  },
  {
    id: 'log-bits', kind: 'calculation', title: 'Bits needed',
    prompt: 'A system must tell 1024 equally likely cases apart. How many bits does that take? (A bit is one answer to a yes/no question, and the number of bits is log₂ of the number of cases.)',
    fields: [{ id: 'bits', label: 'bits =' }],
    solution: '1024 = 2¹⁰, so log₂ 1024 = 10. Equivalently, ln 1024 / ln 2 = 6.9315 / 0.6931 = 10. The natural logarithm ln 1024 ≈ 6.93 measures the same information in nats, not bits.',
    grade(a) {
      const n = parseNumber(a.bits);
      if (n === null) return NEED_NUMBERS;
      if (n === 10) return ok('Yes: 1024 = 2¹⁰, so log₂ 1024 = 10 bits.');
      if (near(n, Math.log(1024), 0.01) || n === 7) return no('6.93 (or 7) is ln 1024, the natural logarithm: that counts in nats. Bits use base 2: divide by ln 2, or ask what power of 2 gives 1024.');
      if (n === 512) return no('512 is 1024 / 2. Dividing by 2 once is one bit; the number of times you can halve 1024 before reaching 1 is what is asked.');
      if (near(n, Math.log10(1024), 0.01) || n === 3) return no('3.01 is log₁₀ 1024: the base-10 logarithm. Bits use base 2.');
      return no('Not yet. Ask: 2 to what power equals 1024? Or halve 1024 repeatedly and count the steps down to 1.');
    },
  },
  {
    id: 'exp-overflow', kind: 'prediction', title: 'What does the computer do with e⁷¹⁰?',
    prompt: 'The largest double is about 1.8 × 10³⁰⁸, and e⁷¹⁰ is just larger than that. In Python, what does math.exp(710.0) do? (NumPy\'s np.exp(710.0) behaves differently from the math module.)',
    choices: [
      { id: 'error', label: 'It raises OverflowError.' },
      { id: 'inf', label: 'It returns inf.' },
      { id: 'big', label: 'It returns the correct value, about 2.2 × 10³⁰⁸, stored in extended precision.' },
      { id: 'wrap', label: 'It wraps around and returns a small number.' },
    ],
    solution: 'Python\'s math.exp raises OverflowError when the result is too large for a double. NumPy follows the IEEE rule instead and returns inf (with a warning), which then poisons later arithmetic: inf / inf is nan. Neither returns the true value, because no double can hold it.',
    grade: a => pick(a, 'error', {
      error: 'Yes: math.exp(710.0) raises OverflowError ("math range error"). NumPy would return inf instead, so the same mathematics fails loudly in one library and silently in the other.',
      inf: 'That is NumPy\'s behaviour. The standard-library math.exp raises OverflowError instead. Either way the true value cannot be stored.',
      big: 'A Python float is a 64-bit double: it cannot hold 2.2 × 10³⁰⁸ at all (the maximum is about 1.8 × 10³⁰⁸). There is no extended precision to fall back on.',
      wrap: 'Floating-point numbers do not wrap around the way integers can in fixed-width arithmetic: the result either fits, or is reported as an overflow (inf or an error).',
    }),
  },
  {
    id: 'softmax-shift', kind: 'explanation', title: 'Why subtract the maximum?',
    prompt: 'Softmax computes eˢⁱ / (eˢ¹ + eˢ² + …). With scores like 1000, 1001, 1002 the exponentials overflow. The stable version computes e^(sᵢ − m) / (e^(s₁ − m) + …) with m the largest score. Why is that the same answer?',
    choices: [
      { id: 'cancel', label: 'Multiplying the top and the bottom by e^(−m) changes neither the ratio nor the probabilities, and all the exponents become ≤ 0 so nothing overflows.' },
      { id: 'approx', label: 'It is only an approximation, accurate when the scores are large.' },
      { id: 'linear', label: 'Because eˣ is a linear function, so shifting the input shifts the output by the same amount.' },
      { id: 'normalise', label: 'Because subtracting the maximum makes the probabilities add up to 1.' },
    ],
    solution: 'e^(s − m) = eˢ · e^(−m), so every term in the numerator and in the sum is multiplied by the same positive number e^(−m), which cancels in the ratio. The exponents s − m are all ≤ 0, so every exponential is at most 1 and cannot overflow; the largest term is exactly e⁰ = 1.',
    grade: a => pick(a, 'cancel', {
      cancel: 'Yes: the factor e^(−m) appears in every term and cancels exactly, so the probabilities are identical, and no exponent is positive, so nothing overflows.',
      approx: 'It is an exact identity, not an approximation: the factor that was removed cancels in the ratio.',
      linear: 'eˣ is not linear. The reason it works is a property of exponentials: e^(s − m) = eˢ · e^(−m), a product, whose common factor cancels.',
      normalise: 'The probabilities add up to 1 because the sum is in the denominator, with or without the shift. The shift is there to keep the exponents small.',
    }),
  },
  {
    id: 'find-the-shift', kind: 'construction', title: 'Read the shift off a logarithm',
    prompt: 'The graph of y = 2·ln(x − h) crosses the x-axis at x = 5. What is h?',
    fields: [{ id: 'h', label: 'h =' }],
    solution: 'ln(x − h) = 0 exactly when x − h = 1, so the crossing is at x = h + 1. Setting h + 1 = 5 gives h = 4. The factor 2 stretches the graph vertically and does not move the zero; the vertical asymptote is at x = h = 4.',
    grade(a) {
      const n = parseNumber(a.h);
      if (n === null) return NEED_NUMBERS;
      if (n === 4) return ok('Yes: ln is 0 where its input is 1, so x − h = 1 at the crossing, giving h = 5 − 1 = 4. The asymptote is at x = 4.');
      if (n === 5) return no('5 is where the graph crosses, not the shift. The zero of ln(x − h) is one unit to the right of the asymptote, at x = h + 1.');
      if (n === 6) return no('Sign slip: x − h = 1 means h = x − 1, not x + 1.');
      if (n === 2.5) return no('Dividing by the factor 2 is not needed: a vertical stretch never moves the zeros of a function.');
      return no('Not yet. Where is ln equal to 0? Then solve x − h = (that input) at x = 5.');
    },
  },
];
