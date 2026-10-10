/**
 * Exercises for the Sets, intervals, and relations chapter (I.7). Pure, serializable definitions graded by id. Each asks the reader to predict,
 * calculate, construct or choose between explanations, and every wrong answer that matches a known misconception gets a hint that names it.
 * Text is plain (no TeX): unicode symbols only.
 */
import { NEED_NUMBERS, no, ok, parseNumber, pick, type Exercise } from '../../platform/exercise';

export type { Exercise };

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'union-count', kind: 'calculation', title: 'Counting a union',
    prompt: 'A class has 20 students in the chess club (set A) and 15 in the debate club (set B). Exactly 6 students are in both clubs. How many students are in at least one of the two clubs?',
    fields: [{ id: 'n', label: '|A ∪ B| =' }],
    solution: 'Adding 20 + 15 = 35 counts each of the 6 students in both clubs twice. Subtract the overlap once: |A ∪ B| = |A| + |B| − |A ∩ B| = 20 + 15 − 6 = 29.',
    grade(a) {
      const n = parseNumber(a.n);
      if (n === null) return NEED_NUMBERS;
      if (n === 29) return ok('Yes: 20 + 15 − 6 = 29. The 6 students in both clubs were counted once in each club, so one copy is removed.');
      if (n === 35) return no('35 is |A| + |B|. The 6 students in both clubs are counted twice there, once for each club. Subtract the overlap once.');
      if (n === 41) return no('The overlap has to be taken OUT, not added: it was already counted twice.');
      if (n === 23) return no('Subtracting the overlap twice removes too much. One subtraction is enough: it fixes the double count of those 6 students.');
      return no('Start from |A| + |B| = 35, which counts the students in both clubs twice, then correct for that.');
    },
  },
  {
    id: 'join-closed', kind: 'explanation', title: 'Which union is one interval?',
    prompt: 'Which of these unions is exactly the single interval [0, 2], with no number missing?',
    choices: [
      { id: 'open-open', label: '(0, 1) ∪ (1, 2)' },
      { id: 'half-half', label: '[0, 1) ∪ (1, 2]' },
      { id: 'closed-closed', label: '[0, 1] ∪ [1, 2]' },
      { id: 'closed-open', label: '[0, 1] ∪ (1, 2)' },
    ],
    solution: '[0, 1] ∪ [1, 2] contains 0, everything up to 1, the point 1 itself (in both pieces), everything up to 2, and 2: it is [0, 2]. The others miss something: (0, 1) ∪ (1, 2) misses 0, 1 and 2; [0, 1) ∪ (1, 2] misses 1; [0, 1] ∪ (1, 2) contains 1 but not 2, so it is [0, 2).',
    grade: a => pick(a, 'closed-closed', {
      'closed-closed': 'Yes: 0 is in the first piece, 2 in the second, and 1 is in both, so no number from 0 to 2 is missing.',
      'open-open': 'Both pieces are open at 1, so 1 is in neither piece. Also 0 and 2 are excluded. Open ends are not part of the set.',
      'half-half': 'The two pieces touch at 1, but 1 belongs to neither: the first is open at 1 (written ")") and the second is open at 1 (written "("). The point 1 is missing, so this is two pieces.',
      'closed-open': 'This one is the single interval [0, 2): the point 1 is in the first piece, so there is no hole, but 2 is excluded by the open end of the second piece.',
    }),
  },
  {
    id: 'complement-interval', kind: 'explanation', title: 'The complement of a half-open interval',
    prompt: 'Take the interval [2, 5) of real numbers: 2 is included and 5 is excluded. What is its complement in the real line ℝ?',
    choices: [
      { id: 'flip', label: '(−∞, 2) ∪ [5, ∞)' },
      { id: 'keep', label: '(−∞, 2] ∪ (5, ∞)' },
      { id: 'drop5', label: '(−∞, 2) ∪ (5, ∞)' },
      { id: 'inside', label: '(2, 5]' },
    ],
    solution: 'The complement contains exactly the numbers that are NOT in [2, 5). The number 2 is in [2, 5), so it is not in the complement: the left ray is open at 2. The number 5 is not in [2, 5), so it IS in the complement: the right ray is closed at 5. Complementing flips every end.',
    grade: a => pick(a, 'flip', {
      flip: 'Yes: complementing flips each end. 2 was inside, so it is outside the complement; 5 was outside, so it is inside the complement.',
      keep: 'The ends do not stay the same. 2 belongs to [2, 5), so it cannot belong to the complement, and 5 does not belong to [2, 5), so it must.',
      drop5: 'Check 5: it is not in [2, 5), so it has to be in the complement. This answer loses it.',
      inside: 'That is a different interval inside [2, 5] with its ends the other way round, not the complement. The complement is everything OUTSIDE [2, 5).',
    }),
  },
  {
    id: 'product-count', kind: 'calculation', title: 'Counting ordered pairs',
    prompt: 'A has 4 elements and B has 3 elements. How many ordered pairs are in A × B? Then, if C has 5 elements, how many ordered pairs are in C × C?',
    fields: [{ id: 'ab', label: '|A × B| =' }, { id: 'cc', label: '|C × C| =' }],
    solution: 'A pair (a, b) is made by choosing the first coordinate from A (4 ways) and the second from B (3 ways), independently, so |A × B| = 4 · 3 = 12. For C × C the same rule gives 5 · 5 = 25: pairs are ordered, so (1, 2) and (2, 1) are different and (1, 1) is allowed.',
    grade(a) {
      const ab = parseNumber(a.ab);
      const cc = parseNumber(a.cc);
      if (ab === null || cc === null) return NEED_NUMBERS;
      if (ab === 12 && cc === 25) return ok('Yes: 4 · 3 = 12 and 5 · 5 = 25. The size of a product is the product of the sizes.');
      if (ab === 7) return no('7 = 4 + 3 is the size of a union of two disjoint sets. A pair uses one element of EACH set, so the sizes multiply.');
      if (cc === 10) return no('10 counts the unordered pairs of different elements. In C × C the pairs are ordered, (1, 2) and (2, 1) are different, and (1, 1) is allowed, so every choice of first coordinate meets every choice of second.');
      if (cc === 20) return no('20 = 5 · 4 forbids a pair from using the same element twice. Nothing in C × C forbids (1, 1): the second coordinate is chosen independently.');
      if (ab !== 12) return no('Choose the first coordinate from A (4 ways) and, independently, the second from B (3 ways). How many choices altogether?');
      return no('For C × C: choose the first coordinate (5 ways) and the second (5 ways), independently.');
    },
  },
  {
    id: 'product-commute', kind: 'explanation', title: 'When is A × B the same as B × A?',
    prompt: 'A and B are sets of numbers. When is A × B = B × A?',
    choices: [
      { id: 'always', label: 'Always: only the order of the sets changes.' },
      { id: 'equal-only', label: 'Only when A = B.' },
      { id: 'equal-or-empty', label: 'When A = B, or when A or B is empty (and in no other case).' },
      { id: 'never', label: 'Never, unless A and B are both empty.' },
    ],
    solution: 'If A = B the two products are literally the same set. If A or B is empty both products are empty. Otherwise take a in A and b in B with A ≠ B: say a is not in B (or b not in A). Then (a, b) is in A × B but not in B × A, because B × A needs a first coordinate from B. So the products differ.',
    grade: a => pick(a, 'equal-or-empty', {
      'equal-or-empty': 'Yes. Equal sets give equal products, an empty factor gives an empty product on both sides, and in every other case there is a pair (a, b) in A × B that is not in B × A.',
      always: 'Try A = {1} and B = {2}: A × B = {(1, 2)} but B × A = {(2, 1)}. The pair (1, 2) is not the pair (2, 1), because order matters in a pair.',
      'equal-only': 'Almost: A = B certainly works. But if one set is empty, both products are the empty set, which are equal even though A and B are different.',
      never: 'If A = B, the two products are the same set. For example A = B = {1, 2}: both products are {(1, 1), (1, 2), (2, 1), (2, 2)}.',
    }),
  },
  {
    id: 'divides-properties', kind: 'explanation', title: 'Divisibility as a relation',
    prompt: 'On the set {1, 2, 3, 4, 5, 6}, say that a is related to b when a divides b (b is a multiple of a). Which description is correct?',
    choices: [
      { id: 'partial-order', label: 'Reflexive, antisymmetric and transitive, but not symmetric.' },
      { id: 'equivalence', label: 'An equivalence relation: reflexive, symmetric and transitive.' },
      { id: 'symmetric-transitive', label: 'Symmetric and transitive, but not reflexive.' },
      { id: 'refl-sym', label: 'Reflexive and symmetric, but not transitive.' },
    ],
    solution: 'Every number divides itself, so it is reflexive. 2 divides 4 but 4 does not divide 2, so it is not symmetric; in fact if a divides b and b divides a with both positive, then a = b, so it is antisymmetric. If a divides b and b divides c then a divides c, so it is transitive.',
    grade: a => pick(a, 'partial-order', {
      'partial-order': 'Yes: reflexive (a divides a), antisymmetric (a | b and b | a force a = b), transitive (a | b and b | c give a | c), and not symmetric because 2 | 4 but 4 ∤ 2.',
      equivalence: 'Not symmetric: 2 divides 4, but 4 does not divide 2. An equivalence relation must work in both directions.',
      'symmetric-transitive': 'Every number divides itself (a = a · 1), so the relation IS reflexive. And it is not symmetric: 2 | 4 but 4 ∤ 2.',
      'refl-sym': 'It is reflexive, but not symmetric (2 | 4 but 4 ∤ 2), and it IS transitive: if b = a · m and c = b · n then c = a · (mn).',
    }),
  },
  {
    id: 'near-not-transitive', kind: 'explanation', title: 'Being close is not an equivalence',
    prompt: 'On {1, 2, 3, 4, 5}, say that a is related to b when |a − b| ≤ 1 (they differ by at most 1). Which statement is true?',
    choices: [
      { id: 'equiv', label: 'It is an equivalence relation.' },
      { id: 'not-transitive', label: 'It is reflexive and symmetric, but not transitive.' },
      { id: 'not-symmetric', label: 'It is transitive, but not symmetric.' },
      { id: 'antisymmetric', label: 'It is reflexive and antisymmetric.' },
    ],
    solution: 'Every number differs from itself by 0, so it is reflexive, and |a − b| = |b − a|, so it is symmetric. But 1 is related to 2 and 2 to 3, while 1 and 3 differ by 2, so 1 is NOT related to 3. Transitivity fails, so it is not an equivalence relation: closeness does not chain.',
    grade: a => pick(a, 'not-transitive', {
      'not-transitive': 'Yes: 1 is close to 2 and 2 is close to 3, but 1 is not close to 3. Reflexive and symmetric are not enough for an equivalence; transitivity is the property that fails.',
      equiv: 'Look for a chain: 1 is related to 2, 2 is related to 3, yet 1 and 3 differ by 2, so (1, 3) is missing. An equivalence relation must be transitive.',
      'not-symmetric': '|a − b| = |b − a|, so if a is related to b then b is related to a: the relation IS symmetric. What fails is transitivity.',
      antisymmetric: '1 is related to 2 and 2 is related to 1, but 1 ≠ 2. Antisymmetric forbids exactly that, so the relation is not antisymmetric.',
    }),
  },
  {
    id: 'count-less-than', kind: 'calculation', title: 'How many pairs?',
    prompt: 'Write down the relation "a < b" on the set {1, 2, 3, 4, 5, 6}: all ordered pairs (a, b) with a less than b. How many pairs are in it?',
    fields: [{ id: 'n', label: '|R| =' }],
    solution: 'Count by the first coordinate: a = 1 has 5 partners (2 to 6), a = 2 has 4, a = 3 has 3, a = 4 has 2, a = 5 has 1 and a = 6 has none: 5 + 4 + 3 + 2 + 1 = 15. Or: the 36 pairs split into a < b, a = b (6 pairs) and a > b, and the first and last groups have the same size, so (36 − 6) / 2 = 15.',
    grade(a) {
      const n = parseNumber(a.n);
      if (n === null) return NEED_NUMBERS;
      if (n === 15) return ok('Yes: 5 + 4 + 3 + 2 + 1 = 15, or (36 − 6) / 2.');
      if (n === 30) return no('30 counts the pairs with a ≠ b, both a < b and a > b. Only half of those have a < b.');
      if (n === 21) return no('21 = 15 + 6 counts a ≤ b. The pairs with a = b (6 of them) are not "a < b".');
      if (n === 36) return no('36 is every ordered pair in {1, …, 6} × {1, …, 6}. Only those with a < b belong to R.');
      return no('Count by the first coordinate: how many b are larger than a = 1? than a = 2? and so on.');
    },
  },
  {
    id: 'de-morgan-count', kind: 'calculation', title: 'Outside both sets',
    prompt: 'In the universe U = {1, 2, …, 12}, let A = {1, 2, 3, 4, 5, 6} and B = {5, 6, 7, 8, 9}. How many elements of U are in neither A nor B? (That is the complement of A ∪ B, or by De Morgan the intersection of the two complements.)',
    fields: [{ id: 'n', label: 'elements in neither =' }],
    solution: 'A ∪ B = {1, 2, …, 9} has 9 elements, so exactly 12 − 9 = 3 elements of U are outside it: {10, 11, 12}. De Morgan says the same set is (U \\ A) ∩ (U \\ B), the elements outside A and outside B.',
    grade(a) {
      const n = parseNumber(a.n);
      if (n === null) return NEED_NUMBERS;
      if (n === 3) return ok('Yes: |A ∪ B| = 6 + 5 − 2 = 9, and 12 − 9 = 3. The elements are 10, 11, 12.');
      if (n === 9) return no('9 is the size of the union. The question asks for what is OUTSIDE it, so subtract from the 12 elements of U.');
      if (n === 1) return no('1 = 12 − 11 uses |A| + |B| = 11 without correcting for the overlap {5, 6}, which was counted twice. Find the size of the union first.');
      return no('Find |A ∪ B| first (the elements 5 and 6 are in both sets), then subtract it from |U| = 12.');
    },
  },
  {
    id: 'split-leak', kind: 'prediction', title: 'Leakage between data splits',
    prompt: 'A machine-learning pipeline reports three lists of row ids: 800 in the training set, 100 in validation and 100 in test (1,000 ids in all). A check finds that exactly 30 ids appear in BOTH the training list and the test list, and no other overlaps. How many different rows were actually used?',
    fields: [{ id: 'n', label: 'distinct rows =' }],
    solution: 'The lists add up to 1,000 ids, but 30 rows appear twice (once in training and once in test), so they were counted twice. The number of distinct rows is 1,000 − 30 = 970. This is inclusion–exclusion on the training and test sets, and the shared 30 rows are leakage: the model is tested on data it has trained on.',
    grade(a) {
      const n = parseNumber(a.n);
      if (n === null) return NEED_NUMBERS;
      if (n === 970) return ok('Yes: 1,000 − 30 = 970 distinct rows. And 30 of them are in both train and test, which is leakage: the test score is optimistic.');
      if (n === 1000) return no('1,000 is the total length of the three lists. The 30 rows that are in two lists were counted twice there.');
      if (n === 940) return no('Subtract the overlap ONCE: the 30 shared rows appear twice in the lists, so only one extra copy must be removed.');
      return no('Add the three list sizes, then remove the extra copies of the rows that appear twice.');
    },
  },
];

export const EXERCISE_IDS: readonly string[] = EXERCISES.map(e => e.id);
