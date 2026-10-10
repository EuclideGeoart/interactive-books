/**
 * Exercises for the Indexed quantities and summation chapter (I.8). Pure, serializable definitions graded by id. Each asks the reader to predict,
 * calculate, construct or choose between explanations, and every wrong answer that matches a known misconception gets a hint that names it.
 * Text is plain (no TeX): unicode symbols only.
 */
import { NEED_NUMBERS, no, ok, parseNumber, parseRational, pick, type Exercise } from '../../platform/exercise';

export type { Exercise };

const isRational = (raw: string | undefined, num: number, den: number): boolean => {
  const r = parseRational(raw);
  return r !== null && r.num === BigInt(num) && r.den === BigInt(den);
};

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'fencepost', kind: 'calculation', title: 'How many terms?',
    prompt: 'How many terms does the sum Σ from i = 4 to 15 of a_i have? Then: what is the value of the sum of i for i from 7 to 3 (the upper bound is below the lower bound)?',
    fields: [{ id: 'count', label: 'number of terms =' }, { id: 'empty', label: 'sum of i from 7 to 3 =' }],
    solution: 'Both bounds are included, so the terms are a_4, a_5, …, a_15. There are 15 − 4 + 1 = 12 of them: subtracting the bounds counts the 11 steps between terms, and the first term is one more. When the upper bound is below the lower bound there are no terms at all, and the sum of no terms is 0 (the starting value of the accumulator), not an error and not a negative count.',
    grade(a) {
      const count = parseNumber(a.count);
      const empty = parseNumber(a.empty);
      if (count === null || empty === null) return NEED_NUMBERS;
      if (count === 12 && empty === 0) return ok('Yes: 15 − 4 + 1 = 12 terms, and a sum with no terms is 0.');
      if (count === 11) return no('11 is 15 − 4, the number of STEPS between the first and last index. Both end terms are included, so there is one more term than there are steps.');
      if (count === 15 || count === 4) return no('The bounds are indices, not the number of terms. Count the indices 4, 5, …, 15.');
      if (count !== 12) return no('Count the indices 4, 5, …, 15, both ends included: n − m + 1.');
      if (empty === 21 || empty === 10 || empty === 25) return no('A sum adds the terms that the bounds select. From 7 to 3 no index qualifies (the loop range(7, 3 + 1) has no values), so nothing is added.');
      if (empty === -4) return no('There is no such thing as a negative number of terms. When n < m the loop never runs and the accumulator keeps its starting value.');
      return no('The loop for i from 7 to 3 never runs, so the accumulator keeps its starting value. What is that value?');
    },
  },
  {
    id: 'loop-range', kind: 'explanation', title: 'Which loop visits the right indices?',
    prompt: 'You want Python to add a_i for i = 2, 3, …, 9, with both ends included. Which loop header visits exactly those indices?',
    choices: [
      { id: 'to-9', label: 'for i in range(2, 9):' },
      { id: 'to-10', label: 'for i in range(2, 10):' },
      { id: 'from-1', label: 'for i in range(1, 9):' },
      { id: 'from-3', label: 'for i in range(3, 10):' },
    ],
    solution: 'range(start, stop) includes start but stops BEFORE stop. To visit 2, 3, …, 9 the stop must be 10 = 9 + 1. In general the loop for Σ from i = m to n is range(m, n + 1).',
    grade: a => pick(a, 'to-10', {
      'to-10': 'Yes: range(2, 10) gives 2, 3, …, 9. The stop value is n + 1 because range excludes it.',
      'to-9': 'range(2, 9) stops BEFORE 9, so it visits 2, …, 8 and the term a_9 is never added. The total is wrong and Python does not warn you.',
      'from-1': 'range(1, 9) visits 1, …, 8: it starts one too early and stops one too early, so the whole window slid down by one.',
      'from-3': 'range(3, 10) visits 3, …, 9 and misses a_2: it starts one too late.',
    }),
  },
  {
    id: 'geometric', kind: 'calculation', title: 'A short geometric sum',
    prompt: 'Compute the sum from i = 0 to 3 of (1/3)^i. Give the exact value as a fraction.',
    fields: [{ id: 'value', label: 'sum =' }],
    solution: 'The four terms are 1, 1/3, 1/9 and 1/27. With the formula (r^m − r^(n+1)) / (1 − r): (1 − 1/81) / (2/3) = (80/81) · (3/2) = 40/27. Adding directly: (27 + 9 + 3 + 1)/27 = 40/27.',
    grade(a) {
      if (parseRational(a.value) === null) return NEED_NUMBERS;
      if (isRational(a.value, 40, 27)) return ok('Yes: 1 + 1/3 + 1/9 + 1/27 = 40/27, and the formula (1 − (1/3)^4)/(1 − 1/3) gives the same.');
      if (isRational(a.value, 3, 2)) return no('3/2 = 1/(1 − r) is the sum of the INFINITE series. This sum stops at i = 3, so the tail from i = 4 on is not included.');
      if (isRational(a.value, 13, 9)) return no('13/9 = 1 + 1/3 + 1/9 stops at i = 2. The index runs from 0 to 3, which is FOUR terms: the last one is (1/3)^3 = 1/27.');
      if (isRational(a.value, 121, 81)) return no('That is the sum for i from 0 to 4 (five terms). The upper bound is 3.');
      if (isRational(a.value, 80, 81)) return no('80/81 = 1 − (1/3)^4 is the numerator of the formula. You still have to divide by 1 − r = 2/3.');
      return no('Write the four terms (1/3)^0, (1/3)^1, (1/3)^2, (1/3)^3 and add them, or use (r^m − r^(n+1))/(1 − r).');
    },
  },
  {
    id: 'ratio-one', kind: 'prediction', title: 'The ratio 1',
    prompt: 'What is the sum from i = 0 to 9 of 1^i? The usual formula (r^0 − r^10)/(1 − r) is available.',
    choices: [
      { id: 'zero', label: '0, because the numerator r^0 − r^10 is 0.' },
      { id: 'ten', label: '10, because every term is 1 and there are 10 terms.' },
      { id: 'nine', label: '9: the terms are 1^0 … 1^9 and the first one is not counted.' },
      { id: 'undef', label: 'Undefined, because the formula divides by 0.' },
    ],
    solution: 'Every term 1^i is 1, and i = 0, 1, …, 9 gives 10 terms, so the sum is 10. The formula cannot be used: for r = 1 both numerator and denominator are 0. The geometric formula needs r ≠ 1; r = 1 is its own case, n − m + 1.',
    grade: a => pick(a, 'ten', {
      ten: 'Yes: ten terms, each equal to 1. The formula (r^m − r^(n+1))/(1 − r) does not apply at r = 1, but the sum itself is perfectly well defined.',
      zero: 'The numerator is 0, but so is the denominator 1 − r, so the formula says 0/0, not 0. The sum is not 0: each of the ten terms is 1.',
      nine: 'The index starts at 0 and the bounds are included: i = 0, 1, …, 9 is ten values, and each term is 1.',
      undef: 'The FORMULA is useless at r = 1, but the sum is not undefined: it is the sum of ten ones. A formula failing does not mean the quantity does.',
    }),
  },
  {
    id: 'shift', kind: 'construction', title: 'Shift the index',
    prompt: 'Rewrite the sum from i = 1 to 5 of i² using the new index j = i + 3. Which expression is equal to it?',
    choices: [
      { id: 'forgot', label: 'the sum from j = 4 to 8 of j²' },
      { id: 'right', label: 'the sum from j = 4 to 8 of (j − 3)²' },
      { id: 'wrong-way', label: 'the sum from j = −2 to 2 of (j + 3)²' },
      { id: 'plus', label: 'the sum from j = 4 to 8 of (j + 3)²' },
    ],
    solution: 'If j = i + 3 then i = j − 3. When i runs from 1 to 5, j runs from 4 to 8, and the term i² becomes (j − 3)². Both the bounds AND the term must change; then the same five numbers 1, 4, 9, 16, 25 are added.',
    grade: a => pick(a, 'right', {
      right: 'Yes: j runs from 4 to 8 and i² = (j − 3)². The terms are 1², 2², …, 5² again, so the sum is unchanged (55).',
      forgot: 'This moves the bounds but keeps j² as the term: it adds 4² + … + 8² = 190, a different sum. Substituting means replacing i everywhere, including inside the term.',
      'wrong-way': 'Those bounds come from j = i − 3, the opposite substitution. With j = i + 3 the bounds go UP by 3.',
      plus: 'The bounds are right, but i = j − 3, not j + 3. (j + 3)² would add 7² + … + 11².',
    }),
  },
  {
    id: 'nested-count', kind: 'calculation', title: 'Counting the cells of a double sum',
    prompt: 'How many terms are added by the sum over i from 1 to 6 of the sum over j from 1 to i of 1 (a triangle of cells)? And what is the value of the sum over i from 1 to 3 of the sum over j from 1 to 4 of i·j?',
    fields: [{ id: 'cells', label: 'cells in the triangle =' }, { id: 'product', label: 'sum of i·j =' }],
    solution: 'Row i of the triangle has i cells, so the total is 1 + 2 + … + 6 = 21 = 6·7/2. The rectangular sum factors: the sum over i of i times the sum over j of j is (1 + 2 + 3)(1 + 2 + 3 + 4) = 6 · 10 = 60, because i does not depend on j.',
    grade(a) {
      const cells = parseNumber(a.cells);
      const product = parseNumber(a.product);
      if (cells === null || product === null) return NEED_NUMBERS;
      if (cells === 21 && product === 60) return ok('Yes: 1 + 2 + … + 6 = 21 cells, and (1 + 2 + 3)(1 + 2 + 3 + 4) = 6 · 10 = 60.');
      if (cells === 36) return no('36 = 6 · 6 would be the full square. A triangle only has the cells with j ≤ i, so row i has i cells, not 6.');
      if (cells === 15) return no('15 = 1 + 2 + … + 5 leaves out row 6. The rows are i = 1, …, 6.');
      if (cells !== 21) return no('Row i has i cells (j runs from 1 to i). Add the row lengths 1 + 2 + … + 6.');
      if (product === 12) return no('12 counts the cells (3 · 4). The question asks for the sum of the entries i·j, not the number of cells.');
      if (product === 36) return no('36 = 6 · 6: you used the sum of i twice. The inner sum is over j, from 1 to 4, which adds to 10.');
      return no('Pull the factor i out of the inner sum: the inner sum of i·j over j = 1, …, 4 is i · 10. Then add over i = 1, 2, 3.');
    },
  },
  {
    id: 'swap-bounds', kind: 'construction', title: 'Swap the order of a triangular sum',
    prompt: 'The sum over i from 1 to n of the sum over j from 1 to i of a_ij adds the cells with j ≤ i. Which double sum adds exactly the same cells with the loops swapped (j outside, i inside)?',
    choices: [
      { id: 'same', label: 'j from 1 to n outside, i from 1 to j inside' },
      { id: 'right', label: 'j from 1 to n outside, i from j to n inside' },
      { id: 'inner-outer', label: 'j from 1 to i outside, i from 1 to n inside' },
      { id: 'square', label: 'j from 1 to n outside, i from 1 to n inside' },
    ],
    solution: 'The cells are all (i, j) with 1 ≤ j ≤ i ≤ n. Fix the outer index j: it runs from 1 to n, and for each j the row index i runs from j (the diagonal) down to n. So the swapped sum has inner bounds i = j … n. An outer bound can never mention the inner variable.',
    grade: a => pick(a, 'right', {
      right: 'Yes: for a fixed column j the cells with j ≤ i have i = j, j + 1, …, n.',
      same: 'This keeps the old shape but with the names exchanged: i from 1 to j means i ≤ j, the OTHER triangle. The condition is j ≤ i, so i starts at j.',
      'inner-outer': 'The outer sum cannot have bounds that depend on the inner variable i: when the loop over j starts, i has no value yet.',
      square: 'That adds all n² cells, not just the triangle. The condition j ≤ i has to appear in the bounds.',
    }),
  },
  {
    id: 'mean-loss', kind: 'calculation', title: 'The mean loss of a batch',
    prompt: 'A model\'s squared errors on a batch are e_0 = 4, e_1 = 1, e_2 = 9, e_3 = 0, e_4 = 6, indexed from 0 as in code. The loss is L = (1/N) times the sum of e_i over the whole batch. What are N and L?',
    fields: [{ id: 'n', label: 'N =' }, { id: 'loss', label: 'L =' }],
    solution: 'The indices run 0, 1, 2, 3, 4, which is 4 − 0 + 1 = 5 terms, so N = 5 (the last index is 4, but there are five of them). The sum is 4 + 1 + 9 + 0 + 6 = 20, so L = 20/5 = 4.',
    grade(a) {
      const n = parseNumber(a.n);
      const loss = parseNumber(a.loss);
      if (n === null || loss === null) return NEED_NUMBERS;
      if (n === 5 && loss === 4) return ok('Yes: five terms (indices 0 to 4), total 20, mean 4.');
      if (n === 4) return no('4 is the last INDEX. Counting from 0, the indices 0, 1, 2, 3, 4 are five terms, so N = n − m + 1 = 4 − 0 + 1.');
      if (n !== 5) return no('Count the examples: e_0, e_1, e_2, e_3, e_4.');
      if (loss === 20) return no('20 is the sum. The loss divides it by N, the number of terms.');
      if (loss === 5) return no('5 is N. The loss is the total (4 + 1 + 9 + 0 + 6) divided by N.');
      return no('Add the five errors, then divide by N = 5.');
    },
  },
  {
    id: 'product-trap', kind: 'explanation', title: 'Which rule is false?',
    prompt: 'Exactly one of these rules about sums is NOT true in general. Which one?',
    choices: [
      { id: 'add', label: 'Σ (a_i + b_i) = Σ a_i + Σ b_i' },
      { id: 'const-out', label: 'Σ c·a_i = c · Σ a_i' },
      { id: 'product', label: 'Σ a_i·b_i = (Σ a_i)·(Σ b_i)' },
      { id: 'const-sum', label: 'the sum of the constant c over n terms is n·c' },
    ],
    solution: 'The sum of a product is not the product of the sums. Take a_i = b_i = 1 for i = 1, 2: the left side is 1 + 1 = 2, the right side is 2 · 2 = 4. The right side has the extra cross terms a_1·b_2 + a_2·b_1. The other three rules are true: addition and a constant factor pass through a sum (linearity), and adding c n times gives n·c.',
    grade: a => pick(a, 'product', {
      product: 'Yes: with a_i = b_i = 1 for i = 1, 2 the left side is 2 and the right side is 4. Multiplying two sums creates cross terms a_i·b_j with i ≠ j.',
      add: 'This one is true: it is linearity. Both sides add the same numbers, only grouped differently.',
      'const-out': 'This one is true: c is a common factor of every term, so it can be pulled out of the sum.',
      'const-sum': 'This one is true: a sum of n copies of c is n·c. It is the sum of a term that does not depend on i.',
    }),
  },
  {
    id: 'float-sum', kind: 'prediction', title: 'Adding a tenth ten times',
    prompt: 'In Python, a loop starts with acc = 0.0 and runs acc += 0.1 ten times. What does the comparison acc == 1.0 evaluate to? Each term is the double 0.1, which is not exactly one tenth.',
    choices: [
      { id: 'true', label: 'True: ten tenths make 1.' },
      { id: 'false', label: 'False: the accumulated total is 0.9999999999999999.' },
      { id: 'error', label: 'It raises an error because 0.1 cannot be added exactly.' },
    ],
    solution: 'Each 0.1 is stored as the nearest double, which is slightly more than one tenth; the partial sums are rounded at every step, and the final total is 0.9999999999999999, not 1.0, so the comparison is False. math.fsum tracks the lost low-order bits and returns 1.0. Floating-point addition is not exact, so sums should be compared with a tolerance, never with ==.',
    grade: a => pick(a, 'false', {
      false: 'Yes: the rounded partial sums end at 0.9999999999999999. Do not compare floating-point sums with ==; use a tolerance, or math.fsum when the order of rounding matters.',
      true: 'On paper yes, but 0.1 is not exactly one tenth and each addition is rounded. The total ends at 0.9999999999999999.',
      error: 'Python never complains about this: it just keeps rounding. That is the danger: the result is silently a little off.',
    }),
  },
];

export const EXERCISE_IDS: readonly string[] = EXERCISES.map(e => e.id);
