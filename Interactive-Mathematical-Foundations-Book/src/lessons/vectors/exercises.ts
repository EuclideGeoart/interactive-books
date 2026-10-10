/**
 * Exercises for the Vectors chapter: pure, serializable definitions graded by id. No exercise is cosmetic multiple choice:
 * each asks the reader to predict, calculate, construct or choose between explanations, and every wrong answer that
 * matches a known misconception gets a hint that names it.
 */
import { compareDirections } from '../../math/vector2/direction';

export type ExerciseKind = 'calculation' | 'prediction' | 'explanation' | 'construction';
export interface Choice { readonly id: string; readonly label: string }
export interface Field { readonly id: string; readonly label: string }
export interface Result { readonly correct: boolean; readonly message: string }
export interface Exercise {
  readonly id: string;
  readonly kind: ExerciseKind;
  readonly title: string;
  readonly prompt: string;
  readonly choices?: readonly Choice[];
  readonly fields?: readonly Field[];
  readonly solution: string;
  grade(answer: Readonly<Record<string, string>>): Result;
}

/** Parse a decimal typed by a reader. Accepts the typographic minus and a decimal comma-free form only. */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const text = raw.trim().replace(/−/g, '-');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

const NEED_NUMBERS: Result = { correct: false, message: 'Enter a number in every box (for example 7 or -2.5).' };
const need = (answer: Readonly<Record<string, string>>, ids: readonly string[]): number[] | null => {
  const out = ids.map(id => parseNumber(answer[id]));
  return out.some(n => n === null) ? null : (out as number[]);
};
const ok = (message: string): Result => ({ correct: true, message });
const no = (message: string): Result => ({ correct: false, message });
const pick = (answer: Readonly<Record<string, string>>, correct: string, wrong: Record<string, string>): Result => {
  const chosen = answer.choice;
  if (!chosen) return no('Choose an answer first.');
  if (chosen === correct) return ok(wrong[correct] ?? 'Correct.');
  return no(wrong[chosen] ?? 'Not quite.');
};

/** y/x = −2/3 ⇔ 2x + 3y = 0. The residual is judged RELATIVE to the size of its own terms, so it scales with the input. */
export const sameRatio = (x: number, y: number): boolean => Math.abs(2 * x + 3 * y) <= 1e-12 * (2 * Math.abs(x) + 3 * Math.abs(y));

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'magnitude-5-12', kind: 'calculation', title: 'A length from components',
    prompt: 'The vector v has components x = 5 and y = 12. What is its length ‖v‖?',
    fields: [{ id: 'length', label: '‖v‖ =' }],
    solution: '‖v‖ = √(5² + 12²) = √(25 + 144) = √169 = 13. The components are the legs of a right triangle and the length is its hypotenuse.',
    grade(a) {
      const n = need(a, ['length']); if (!n) return NEED_NUMBERS;
      const [len] = n as [number];
      if (len === 13) return ok('Yes: √(25 + 144) = √169 = 13 exactly.');
      if (len === 17) return no('17 is 5 + 12: that adds the components. Lengths add only along a straight line; here the legs meet at a right angle, so square first.');
      if (len === 169) return no('169 is ‖v‖², the sum of the squares. The length is the square root of that.');
      if (len === 7) return no('7 is the difference of the components. Square each component, add, then take the square root.');
      return no('Not yet. Square each component, add the squares, and take the square root.');
    },
  },
  {
    id: 'exact-vs-approx', kind: 'explanation', title: 'Exact or rounded?',
    prompt: 'The vector v = (1, 2) has ‖v‖² = 5. Which statement is correct?',
    choices: [
      { id: 'decimal', label: '‖v‖ = 2.236, and that is exact.' },
      { id: 'radical', label: '‖v‖ = √5 exactly, and √5 ≈ 2.236 is a rounded approximation.' },
      { id: 'three', label: '‖v‖ = 3, because 1 + 2 = 3.' },
    ],
    solution: '5 is not a perfect square, so ‖v‖ = √5 is irrational: its decimal expansion never ends. 2.236 is a rounding. Write = for √5 and ≈ for the decimal.',
    grade: a => pick(a, 'radical', {
      radical: 'Correct: √5 is the exact length; any decimal for it is a rounding, so it takes ≈.',
      decimal: 'A decimal that stops cannot equal √5: √5 is irrational. 2.236² = 4.999696, not 5.',
      three: '1 + 2 adds the components. Square them first: 1² + 2² = 5, so the length is √5.',
    }),
  },
  {
    id: 'atan-predict', kind: 'prediction', title: 'Predict before you run it',
    prompt: 'For v = (−1, 1), what does arctan(y/x) return? (The true direction is 135°, up and to the left.)',
    choices: [
      { id: 'three-quarter', label: '3π/4 (135°)' },
      { id: 'minus-quarter', label: '−π/4 (−45°)' },
      { id: 'quarter', label: 'π/4 (45°)' },
      { id: 'undefined', label: 'It is undefined.' },
    ],
    solution: 'y/x = 1/(−1) = −1 and arctan(−1) = −π/4: down and to the RIGHT, the exact opposite of v. The vector (1, −1) has the same ratio −1. Adding π (x < 0, y ≥ 0) gives −π/4 + π = 3π/4, which is what atan2(1, −1) returns.',
    grade: a => pick(a, 'minus-quarter', {
      'minus-quarter': 'Correct, and wrong as a direction: arctan only knows the ratio −1, so it answers in the right half-plane, opposite to v. atan2 adds π to repair it.',
      'three-quarter': 'That is the TRUE direction, which atan2 returns. arctan(y/x) sees only y/x = −1, and arctan(−1) is −π/4.',
      quarter: 'The ratio is −1, not +1: x is negative. arctan(−1) = −π/4.',
      undefined: 'The ratio is fine here: x = −1 ≠ 0. Undefined needs x = 0.',
    }),
  },
  {
    id: 'atan2-value', kind: 'calculation', title: 'Compute atan2',
    prompt: 'Give atan2(2, −3) in radians, to three decimals. (v = (−3, 2) is in quadrant II.)',
    fields: [{ id: 'theta', label: 'θ =' }],
    solution: 'arctan(2/(−3)) ≈ −0.588. The tip is in the left half-plane above the x-axis, so add π: −0.588 + 3.142 ≈ 2.554 rad (about 146.3°).',
    grade(a) {
      const n = need(a, ['theta']); if (!n) return NEED_NUMBERS;
      const [t] = n as [number];
      const truth = compareDirections({ x: -3, y: 2 }).atan2Radians as number;
      if (Math.abs(t - truth) <= 0.0015) return ok('Yes: ≈ 2.554 rad, which is arctan(−2/3) + π.');
      if (Math.abs(t - (truth - Math.PI)) <= 0.0015) return no('That is arctan(2/(−3)) ≈ −0.588: the naive angle, half a turn short. The vector is in the left half-plane, so add π.');
      if (Math.abs(t - (truth * 180) / Math.PI) <= 0.2) return no('That looks like degrees. Give radians: about 2.554.');
      return no('Not yet. Find arctan(2/(−3)), notice the sign of x, and correct by π.');
    },
  },
  {
    id: 'same-ratio', kind: 'construction', title: 'Same ratio, opposite way',
    prompt: 'Build a vector w that has the SAME ratio y/x as v = (−3, 2) but points the opposite way. Enter integers or decimals.',
    fields: [{ id: 'x', label: 'w x =' }, { id: 'y', label: 'w y =' }],
    solution: 'Any w = t·(3, −2) with t > 0 works, for example (3, −2) or (1.5, −1): y/x = −2/3 for both, and x > 0 means w points the opposite way to v. This is why one ratio cannot determine a direction: v and −v share it.',
    grade(a) {
      const n = need(a, ['x', 'y']); if (!n) return NEED_NUMBERS;
      const [x, y] = n as [number, number];
      if (x === 0) return no('x = 0 makes the ratio y/x undefined. Choose x ≠ 0.');
      if (!sameRatio(x, y)) return no(`The ratio of your vector is ${Number((y / x).toPrecision(6))}; v has ratio ${Number((-2 / 3).toPrecision(6))}. The components must keep y/x = −2/3.`);
      // With y/x = −2/3 fixed, w is a multiple t·(3, −2); it points the same way as v = (−3, 2) exactly when t < 0, i.e. x < 0.
      if (x < 0) return no('That has the same ratio and points the SAME way (it is a positive multiple of v). Flip both signs.');
      return ok('Yes: same ratio, opposite direction. arctan(y/x) cannot tell w from v.');
    },
  },
  {
    id: 'translation', kind: 'calculation', title: 'Slide the arrow',
    prompt: 'The displacement v = (3, 2) starts at the point P = (1, −1). Find the tip Q, then slide the arrow so that it starts at P′ = (−2, 4) and find its new tip Q′, and the length ‖v‖² of the displacement afterward.',
    fields: [{ id: 'qx', label: 'Q x =' }, { id: 'qy', label: 'Q y =' }, { id: 'q2x', label: 'Q′ x =' }, { id: 'q2y', label: 'Q′ y =' }, { id: 'len2', label: '‖v‖² after =' }],
    solution: 'Q = P + v = (4, 1). Q′ = P′ + v = (1, 6). Sliding does not change v, so ‖v‖² is still 3² + 2² = 13. Only the points move.',
    grade(a) {
      const n = need(a, ['qx', 'qy', 'q2x', 'q2y', 'len2']); if (!n) return NEED_NUMBERS;
      const [qx, qy, q2x, q2y, len2] = n as [number, number, number, number, number];
      if (qx !== 4 || qy !== 1) return no('Q = P + v: add the components of v to the coordinates of P.');
      if (q2x !== 1 || q2y !== 6) return no('Q′ = P′ + v, with the same v. The displacement did not change when you slid the arrow.');
      if (len2 !== 13) return no('v is unchanged by sliding, so ‖v‖² = 3² + 2² = 13, not something that depends on P.');
      return ok('All correct. Points move; the displacement, its length and its direction stay.');
    },
  },
  {
    id: 'same-magnitude', kind: 'construction', title: 'Another vector of length √13',
    prompt: 'The vector (3, 2) has length √13. Enter a DIFFERENT vector with integer components and exactly the same length.',
    fields: [{ id: 'x', label: 'x =' }, { id: 'y', label: 'y =' }],
    solution: 'Only x² + y² = 13 matters, and 13 = 9 + 4 only: so (±3, ±2) and (±2, ±3). For example (−3, 2) or (2, 3). Same length, different direction: a length does not determine a vector.',
    grade(a) {
      const n = need(a, ['x', 'y']); if (!n) return NEED_NUMBERS;
      const [x, y] = n as [number, number];
      if (!Number.isInteger(x) || !Number.isInteger(y)) return no('Use whole numbers.');
      if (x === 3 && y === 2) return no('That is the vector we started with. Find a different one.');
      if (x * x + y * y === 13) return ok('Yes: x² + y² = 13, so the length is √13 exactly.');
      return no(`Your vector has ‖v‖² = ${x * x + y * y}. You need x² + y² = 13.`);
    },
  },
  {
    id: 'numerics', kind: 'prediction', title: 'A tiny vector',
    prompt: 'In Python, v = (1e-200, 1e-200). What does math.sqrt(x*x + y*y) return, versus math.hypot(x, y)?',
    choices: [
      { id: 'both', label: 'Both return about 1.414e-200.' },
      { id: 'underflow', label: 'sqrt(x*x + y*y) returns 0.0 (the squares underflow); hypot returns about 1.414e-200.' },
      { id: 'error', label: 'sqrt(x*x + y*y) raises an exception.' },
    ],
    solution: '(1e-200)² = 1e-400 is smaller than the smallest double, so x*x is 0.0 and the naive formula reports 0.0: a nonzero vector with length zero. hypot scales internally and returns 1.4142…e-200.',
    grade: a => pick(a, 'underflow', {
      underflow: 'Correct: the squares underflow to 0.0 before the square root runs. hypot avoids it by scaling.',
      both: 'The squares are 1e-400, below the smallest double (about 5e-324), so they become 0.0.',
      error: 'Floating-point underflow is silent: no exception, just 0.0. That is what makes it dangerous.',
    }),
  },
  {
    id: 'zero-direction', kind: 'explanation', title: 'The zero vector',
    prompt: 'What does math.atan2(0.0, 0.0) return in Python, and what does that tell you?',
    choices: [
      { id: 'zero', label: '0.0, with no error: the call "works", but the zero vector has no direction, so the 0.0 means nothing.' },
      { id: 'error', label: 'It raises ZeroDivisionError, like y / x does.' },
      { id: 'nan', label: 'It returns nan, which signals that there is no direction.' },
    ],
    solution: 'atan2 follows a convention (the IEEE one) and returns 0.0 for (0, 0). That is a silent wrong answer for a direction. Check for the zero vector explicitly and return None or raise.',
    grade: a => pick(a, 'zero', {
      zero: 'Correct. A function that returns 0.0 for (0, 0) tells you nothing: guard the zero vector yourself.',
      error: 'atan2 does not divide, so there is no ZeroDivisionError; it quietly returns 0.0.',
      nan: 'It returns 0.0, not nan. That is the trap: the zero vector looks like it points along +x.',
    }),
  },
];

export const exerciseById = (id: string): Exercise | undefined => EXERCISES.find(e => e.id === id);
