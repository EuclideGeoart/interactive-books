/**
 * Exercises for the notation-map chapter (I.9). Pure, serializable definitions graded by id. Each asks the reader to predict, calculate, construct
 * or choose between explanations, and every wrong answer that matches a known misconception gets a hint that names it.
 * Text is plain (no TeX): unicode symbols only. The numbers in the answers are confirmed by the models in the unit tests.
 */
import { NEED_NUMBERS, no, ok, parseNumber, parseRational, pick, type Exercise } from '../../platform/exercise';

export type { Exercise };

const isRational = (raw: string | undefined, num: number, den: number): boolean => {
  const r = parseRational(raw);
  return r !== null && r.num === BigInt(num) && r.den === BigInt(den);
};

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'entry-index', kind: 'calculation', title: 'Which entry is X[2, 3]?',
    prompt: 'A data matrix X has n = 5 examples (rows) and d = 4 features (columns). A line of NumPy code reads X[2, 3]. In the notation of the book, with indices counted from 1, that is the entry X with which example number and which feature number? And at which position does it sit in the flattened array, counting from 0 and reading row by row?',
    fields: [{ id: 'example', label: 'example number i =' }, { id: 'feature', label: 'feature number j =' }, { id: 'position', label: 'position in the flattened array =' }],
    solution: 'NumPy counts from 0 and mathematics from 1, so every index is one more: X[2, 3] is X with i = 3 and j = 4, the third example and the fourth feature. In row-major order each row holds d = 4 entries, so the position is 2 · 4 + 3 = 11 (two complete rows of four, then three more entries).',
    grade(a) {
      const i = parseNumber(a.example);
      const j = parseNumber(a.feature);
      const p = parseNumber(a.position);
      if (i === null || j === null || p === null) return NEED_NUMBERS;
      if (i === 3 && j === 4 && p === 11) return ok('Yes: X[2, 3] is the entry in example 3 and feature 4, and 2 · 4 + 3 = 11.');
      if (i === 2 && j === 3) return no('Those are the NumPy numbers. Mathematical indices start at 1, so each is one larger: the first row is i = 1 and X[0, …] is in it.');
      if (i === 4 && j === 3) return no('You swapped the two indices. The FIRST index picks the row (the example) and the second picks the column (the feature), in both notations.');
      if (i !== 3 || j !== 4) return no('Add 1 to each NumPy index: the first index 2 becomes example 3, the second index 3 becomes feature 4.');
      if (p === 12) return no('12 counts from 1. Positions in the flattened array start at 0: two full rows of four entries come first (positions 0 to 7), so this entry is at 2 · 4 + 3 = 11.');
      if (p === 14) return no('14 uses the wrong row length. The row length is d = 4 (the number of columns), so a step in the row index moves by 4 positions: 2 · 4 + 3.');
      if (p === 5 || p === 6) return no('Each step down a row moves by d = 4 positions, not by 1: the position is (row index) · 4 + (column index).');
      return no('Skip two complete rows of four entries, then three more: row index · d + column index.');
    },
  },
  {
    id: 'last-entry', kind: 'construction', title: 'The last entry',
    prompt: 'X has n = 4 examples and d = 3 features. Name its LAST entry in the book\'s notation, counting from 1, and say where it sits in the flattened array (counting from 0).',
    fields: [{ id: 'i', label: 'i =' }, { id: 'j', label: 'j =' }, { id: 'position', label: 'position =' }],
    solution: 'The last entry is in the last row and the last column: i = n = 4 and j = d = 3, written X with indices 4 and 3. The array holds 4 · 3 = 12 entries, numbered 0 to 11, so the last one is at position 11, which is one less than the number of entries.',
    grade(a) {
      const i = parseNumber(a.i);
      const j = parseNumber(a.j);
      const p = parseNumber(a.position);
      if (i === null || j === null || p === null) return NEED_NUMBERS;
      if (i === 4 && j === 3 && p === 11) return ok('Yes: the last row and the last column, i = 4 and j = 3, at position 4 · 3 − 1 = 11.');
      if (i === 3 && j === 2) return no('Those are the NumPy indices of the last entry, X[3, 2]. In the notation the indices start at 1, so the last row is i = n = 4 and the last column is j = d = 3.');
      if (i === 3 && j === 4) return no('You swapped the indices: the first one is the row (n = 4 examples) and the second one is the column (d = 3 features).');
      if (i !== 4 || j !== 3) return no('The last row is number n and the last column is number d, because the indices start at 1.');
      if (p === 12) return no('There are 12 entries, but the positions are 0, 1, …, 11: the position of the last entry is one less than the count.');
      return no('The flattened array has n · d = 12 entries, numbered from 0. The last one has the largest number.');
    },
  },
  {
    id: 'product-shapes', kind: 'calculation', title: 'The shapes of two products',
    prompt: 'X has shape (6, 4), W has shape (4, 3). Give the shape of X W, and the shape of Xᵀ X.',
    fields: [{ id: 'xw-rows', label: 'X W has rows =' }, { id: 'xw-cols', label: 'X W has columns =' }, { id: 'g-rows', label: 'Xᵀ X has rows =' }, { id: 'g-cols', label: 'Xᵀ X has columns =' }],
    solution: 'For a product the inner dimensions must be equal and the outer dimensions remain. X W is (6 × 4)(4 × 3): the inner 4 and 4 match and disappear, so the shape is 6 × 3. Xᵀ is 4 × 6, so Xᵀ X is (4 × 6)(6 × 4): the inner 6 and 6 match, and the result is 4 × 4, one row and one column for each feature.',
    grade(a) {
      const v = ['xw-rows', 'xw-cols', 'g-rows', 'g-cols'].map(k => parseNumber(a[k]));
      if (v.some(x => x === null)) return NEED_NUMBERS;
      const [r1, c1, r2, c2] = v as number[];
      if (r1 === 6 && c1 === 3 && r2 === 4 && c2 === 4) return ok('Yes: (6 × 4)(4 × 3) gives 6 × 3, and (4 × 6)(6 × 4) gives 4 × 4.');
      if (r1 === 4 && c1 === 4) return no('The inner dimensions (the 4 and 4) match and disappear. What remains is the OUTER pair: the rows of X and the columns of W.');
      if (r1 !== 6 || c1 !== 3) return no('For X W keep the rows of the first factor (6) and the columns of the second (3). The two 4s in the middle cancel.');
      if (r2 === 6 && c2 === 6) return no('6 × 6 would be X Xᵀ, which has one row and one column per EXAMPLE. Xᵀ X puts the transpose on the left, so the inner dimension is 6 and the result has one row and one column per feature.');
      return no('Xᵀ is 4 × 6, so Xᵀ X is (4 × 6)(6 × 4). The inner 6 and 6 match; the outer dimensions are 4 and 4.');
    },
  },
  {
    id: 'product-defined', kind: 'prediction', title: 'Is the product defined?',
    prompt: 'X has shape (5, 3) and w has 5 entries. What happens with X @ w, and what does the transpose do?',
    choices: [
      { id: 'transpose', label: 'X @ w raises an error; Xᵀ @ w is defined and has 3 entries.' },
      { id: 'defined', label: 'X @ w is defined and has 5 entries, one per example.' },
      { id: 'broadcast', label: 'X @ w works because NumPy broadcasts w to fit.' },
      { id: 'never', label: 'No product of X with w can exist, with or without the transpose.' },
    ],
    solution: 'X @ w needs w to have as many entries as X has columns: d = 3, but w has 5. The inner dimensions 3 and 5 differ, so NumPy raises a ValueError (a matrix product does not broadcast the inner dimension). Xᵀ has shape (3, 5), and (3 × 5)(5) is defined: it gives 3 entries, one per feature. A mismatch is a statement about which operand is on which side, not about the two arrays being incompatible for ever.',
    grade: a => pick(a, 'transpose', {
      transpose: 'Yes: (5 × 3)(5) has inner dimensions 3 and 5, so it fails. Xᵀ is 3 × 5, and (3 × 5)(5) is defined with 3 entries.',
      defined: 'One entry per example is what X w gives when w has d = 3 entries. This w has 5 entries, which is n, not d, so the inner dimensions 3 and 5 do not match.',
      broadcast: 'Broadcasting is for elementwise operations such as a * b. The matrix product @ requires the inner dimensions to be equal and raises a ValueError otherwise.',
      never: 'It is the order that is wrong, not the arrays. Transposing X turns it into 3 × 5, whose columns match the 5 entries of w.',
    }),
  },
  {
    id: 'norms', kind: 'calculation', title: 'Three norms of one vector',
    prompt: 'For x = (−6, 8) compute the ℓ₁ norm, the ℓ₂ norm and the ℓ∞ norm.',
    fields: [{ id: 'l1', label: 'ℓ₁ norm =' }, { id: 'l2', label: 'ℓ₂ norm =' }, { id: 'linf', label: 'ℓ∞ norm =' }],
    solution: 'The ℓ₁ norm adds the absolute values: |−6| + |8| = 6 + 8 = 14. The ℓ₂ norm is the Euclidean length: the square root of 36 + 64 = 100, which is 10. The ℓ∞ norm is the largest absolute value, 8. As always, ℓ∞ ≤ ℓ₂ ≤ ℓ₁: 8 ≤ 10 ≤ 14.',
    grade(a) {
      const l1 = parseNumber(a.l1);
      const l2 = parseNumber(a.l2);
      const linf = parseNumber(a.linf);
      if (l1 === null || l2 === null || linf === null) return NEED_NUMBERS;
      if (l1 === 14 && l2 === 10 && linf === 8) return ok('Yes: 6 + 8 = 14, √(36 + 64) = 10, and the largest absolute value is 8.');
      if (l1 === 2) return no('2 is −6 + 8: the signs cancelled. A norm adds the ABSOLUTE values, so 6 + 8 = 14.');
      if (l1 !== 14) return no('The ℓ₁ norm is |−6| + |8|: every entry counts with its sign removed.');
      if (l2 === 14 || l2 === 100) return no('Take the square root of the sum of the squares: √(36 + 64) = √100 = 10. A norm is not the sum, and not the sum of squares.');
      if (l2 !== 10) return no('Square each entry, add, then take the square root: √((−6)² + 8²).');
      if (linf === -6) return no('−6 is the entry with the largest magnitude only if you compare absolute values, but |−6| = 6 < 8. A norm is never negative: the answer is |8| = 8.');
      return no('The ℓ∞ norm is the largest of |−6| and |8|.');
    },
  },
  {
    id: 'argmin-min', kind: 'calculation', title: 'The value and the place',
    prompt: 'The loss L(θ) = (θ − 3)² + 2 is tabulated at the whole numbers θ = −4, −3, …, 4 and stored in an array L in that order. Give the smallest loss (the min), the parameter at which it is reached (the arg min), and the value of np.argmin(L).',
    fields: [{ id: 'min', label: 'min of L =' }, { id: 'argmin', label: 'arg min of L =' }, { id: 'npargmin', label: 'np.argmin(L) =' }],
    solution: 'The square (θ − 3)² is smallest, 0, at θ = 3, so the min is the VALUE 0 + 2 = 2 and the arg min is the PLACE θ = 3. np.argmin returns neither: it returns the 0-based position of the smallest entry in the array. Counting θ = −4, −3, −2, −1, 0, 1, 2, 3 from position 0, the value θ = 3 is at position 7.',
    grade(a) {
      const mn = parseNumber(a.min);
      const am = parseNumber(a.argmin);
      const np = parseNumber(a.npargmin);
      if (mn === null || am === null || np === null) return NEED_NUMBERS;
      if (mn === 2 && am === 3 && np === 7) return ok('Yes: the min is the value 2, the arg min is the place 3, and np.argmin gives the position 7 in an array that starts at θ = −4.');
      if (mn === 3 && am === 2) return no('You swapped the two: the min is a loss VALUE (the height of the bowl, 2) and the arg min is a parameter (where the bowl is lowest, 3).');
      if (mn === 0) return no('The square is 0 at the bottom, but the loss adds 2 to it: the smallest loss is 2, not 0.');
      if (mn !== 2) return no('Evaluate L at its lowest point, θ = 3: (3 − 3)² + 2.');
      if (am !== 3) return no('The arg min is the parameter θ at which the loss is smallest, not the loss itself.');
      if (np === 3) return no('3 is the parameter, not the position. np.argmin counts positions in the array from 0, and the array starts at θ = −4, so the position of θ = 3 is 3 − (−4) = 7.');
      if (np === 8) return no('8 counts from 1. NumPy positions start at 0: θ = −4 is position 0, so θ = 3 is position 7.');
      return no('np.argmin returns an index into the array L, which starts at θ = −4 at position 0.');
    },
  },
  {
    id: 'argmin-tie', kind: 'explanation', title: 'Two equally good minimisers',
    prompt: 'The loss L(θ) = ((θ − 2)² − 1)² is tabulated at θ = −4, −3, …, 4 (an array of nine numbers, in that order). It is smallest at both θ = 1 and θ = 3. What does np.argmin(L) return?',
    choices: [
      { id: 'position', label: '5, the position of the first minimum.' },
      { id: 'first-theta', label: '1, the first minimiser.' },
      { id: 'set', label: 'the list [1, 3] of all the minimisers.' },
      { id: 'value', label: '0, the smallest loss.' },
      { id: 'second', label: '7, the position of the last minimum.' },
    ],
    solution: 'np.argmin returns one integer: the position in the array of the FIRST smallest entry. The array starts at θ = −4 at position 0, so θ = 1 is at position 5, and that is what is returned. It is not the parameter 1, it is not the set of minimisers {1, 3} (the mathematical arg min is a set when there is a tie), and it is not the smallest loss 0. The second minimiser, at position 7, is silently ignored.',
    grade: a => pick(a, 'position', {
      position: 'Yes: np.argmin gives the position of the first minimum, 5 (θ = 1), and says nothing about the tie.',
      'first-theta': 'It finds the first minimiser, but it returns its POSITION in the array (5), not its value (1). The two coincide only by accident.',
      set: 'The mathematical arg min is the set {1, 3}, but np.argmin returns a single integer. To get all the minimisers you would write thetas[L == L.min()].',
      value: '0 is the min, the smallest VALUE of the loss. np.argmin does not return values at all; it returns a position.',
      second: 'np.argmin returns the FIRST minimum it meets, scanning from the start, not the last.',
    }),
  },
  {
    id: 'expectation', kind: 'calculation', title: 'An expectation from counts',
    prompt: 'A game has the possible payoffs −1, 0 and 2. In 10 plays the payoff −1 appeared 2 times, 0 appeared 3 times and 2 appeared 5 times. Treat the counts as weights: the probabilities are the counts divided by their total. What is the expectation E[X] as an exact fraction?',
    fields: [{ id: 'value', label: 'E[X] =' }],
    solution: 'The probabilities are 2/10, 3/10 and 5/10, and they add to 1. The expectation weights each payoff by its probability: (2/10)(−1) + (3/10)(0) + (5/10)(2) = −2/10 + 0 + 10/10 = 8/10 = 4/5. It is not one of the payoffs, and it is not the average of the three payoffs, which would be 1/3.',
    grade(a) {
      if (parseRational(a.value) === null) return NEED_NUMBERS;
      if (isRational(a.value, 4, 5)) return ok('Yes: (2·(−1) + 3·0 + 5·2)/10 = 8/10 = 4/5. The weights are the probabilities 2/10, 3/10, 5/10.');
      if (isRational(a.value, -4, 5)) return no('The sign is reversed. The payoff 2 was seen more often than −1, so the weighted sum is POSITIVE: −2/10 + 10/10.');
      if (isRational(a.value, 1, 3)) return no('1/3 is the plain average of −1, 0 and 2. An expectation weights each value by its probability, and here −1 is much more frequent.');
      if (isRational(a.value, 8, 1)) return no('8 is the sum 2·(−1) + 3·0 + 5·2 before dividing by the total. The expectation uses probabilities, so that sum must be divided by the total number of plays, 10.');
      if (isRational(a.value, 2, 1)) return no('2 is the most frequent payoff (the mode). The expectation is a weighted average of all the payoffs, not the most frequent one.');
      if (isRational(a.value, 8, 3)) return no('That divides by 3 (the number of different payoffs). The probabilities divide each count by the number of plays, 10.');
      return no('Compute p = counts / 10, then add p_i times x_i: (2/10)(−1) + (3/10)(0) + (5/10)(2).');
    },
  },
  {
    id: 'no-data', kind: 'prediction', title: 'No observations',
    prompt: 'You build probabilities from counts by dividing each count by the total, p_i = c_i / (c_1 + … + c_k). Every count is 0. What is the expectation E[X]?',
    choices: [
      { id: 'undefined', label: 'It is undefined: the division is by 0, so there is no distribution.' },
      { id: 'zero', label: '0, because every count is 0.' },
      { id: 'uniform', label: 'The expectation of the uniform distribution: each value gets the same probability.' },
      { id: 'nan-ok', label: 'nan, which is a perfectly good value to carry on with.' },
    ],
    solution: 'The total of the counts is 0, so p_i = c_i / 0 has no value: there is no distribution to take an expectation of. Writing 0 or the uniform expectation would invent data that was never observed. NumPy shows the same thing: counts / counts.sum() produces nan and a RuntimeWarning, and nan then silently poisons every later computation. The honest answer is that E[X] is undefined, with the reason.',
    grade: a => pick(a, 'undefined', {
      undefined: 'Yes: the total is 0, so each p_i = c_i / 0 is undefined and so is the expectation. No value is made up.',
      zero: 'The sum of c_i x_i is 0, but the expectation divides it by the total, which is also 0: it is 0 / 0, not 0. Reporting 0 would claim an average that no data supports.',
      uniform: 'That is a different, invented distribution. Nothing was observed, so nothing says the values are equally likely; replacing a failure with an assumption hides it.',
      'nan-ok': 'nan is NumPy\'s way of saying "undefined", but it is not a value to carry on with: it spreads through every later calculation and the cause is lost. State the problem instead.',
    }),
  },
  {
    id: 'gradient-shape', kind: 'prediction', title: 'The shape of a gradient',
    prompt: 'A model has p = 5 parameters collected in a vector θ in R⁵, and a loss L(θ) that is a single number. What is the shape of the gradient ∇_θ L?',
    choices: [
      { id: 'same', label: 'The same as θ: 5 entries, one partial derivative per parameter.' },
      { id: 'scalar', label: 'A single number, like the loss.' },
      { id: 'square', label: 'A 5 × 5 matrix.' },
      { id: 'pair', label: 'Two vectors of 5 entries, one for the slope and one for the step.' },
    ],
    solution: 'The gradient collects the partial derivatives of L with respect to each of the 5 parameters, so it has exactly one entry per parameter and the shape of θ. That is why a gradient step θ − (step) · ∇_θ L makes sense: the two vectors have the same shape and can be subtracted entry by entry.',
    grade: a => pick(a, 'same', {
      same: 'Yes: one partial derivative per parameter, so ∇_θ L has the shape of θ, and θ minus a multiple of ∇_θ L is well defined.',
      scalar: 'The loss L is a single number, but its gradient is a vector: it records how L changes in each of the 5 parameter directions, not only how large L is.',
      square: 'A 5 × 5 array of second derivatives exists (Part III calls it the Hessian), but the gradient is the vector of first derivatives: 5 entries.',
      pair: 'There is no second vector: the gradient is one vector. A step size is a number that multiplies it, not a part of it.',
    }),
  },
];
