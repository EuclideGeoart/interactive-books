/**
 * Exercises for I.2. Pure data plus a pure `grade`. The expected answers are COMPUTED by the domain model (`derivePoint`, `deriveLine`,
 * `deriveSegment`, `derivePixel`), never typed in twice, and every wrong answer that matches a known misconception gets a hint that names it.
 */
import { deriveLine } from '../../math/coordinates/numberline';
import { derivePixel } from '../../math/coordinates/pixel';
import { ROMAN, derivePoint, positionOf, quadrantIndex } from '../../math/coordinates/point';
import { deriveSegment } from '../../math/coordinates/segment';
import { add, int, mul, rational, type Rational } from '../../math/quantity/rational';
import { byId, no, NEED_NUMBERS, ok, parseRational, pick, type Exercise } from '../../platform/exercise';

const frac = (r: { num: bigint; den: bigint } | null): Rational | null => (r ? rational(r.num, r.den) : null);
const num = (raw: string | undefined): Rational | null => frac(parseRational(raw));
const same = (a: Rational | null, b: Rational): boolean => a !== null && a.num === b.num && a.den === b.den;
const whole = (raw: string | undefined): bigint | null => {
  const r = num(raw);
  return r && r.den === 1n ? r.num : null;
};
const text = (r: Rational): string => (r.den === 1n ? r.num.toString().replace('-', '−') : `${r.num.toString().replace('-', '−')}/${r.den}`);

// ---------------------------------------------------------------------------------------------- 1. a quadrant
const quadrantBasic: Exercise = (() => {
  const answer = quadrantIndex(derivePoint({ x: -3, y: 2 }).position)!; // 2
  const label = ROMAN[answer];
  return {
    id: 'quadrant-basic',
    kind: 'prediction',
    title: 'Which quadrant?',
    prompt: 'In which quadrant is the point (−3, 2)? Predict first, then check it on the first stage.',
    choices: [
      { id: 'q1', label: 'quadrant I' },
      { id: 'q2', label: 'quadrant II' },
      { id: 'q3', label: 'quadrant III' },
      { id: 'q4', label: 'quadrant IV' },
      { id: 'none', label: 'none: it is on an axis' },
    ],
    solution: `x = −3 is negative and y = 2 is positive. Quadrant I has both positive, II has x negative and y positive, III both negative, IV x positive and y negative, so this point is in quadrant ${label}. (Counting goes counter-clockwise from the top right.)`,
    grade: a => pick(a, `q${answer}`, {
      q2: `Yes: x < 0 and y > 0 is quadrant ${label}.`,
      q1: 'Quadrant I needs BOTH coordinates positive. Here x = −3 is negative.',
      q3: 'Quadrant III needs both coordinates negative. Here y = 2 is positive.',
      q4: 'Quadrant IV has x positive and y negative: the opposite signs of this point (x is negative, y is positive).',
      none: 'A point is on an axis only if one of its coordinates is 0. Neither −3 nor 2 is 0, so it is inside a quadrant.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 2. an axis point
const axisPoint: Exercise = (() => {
  const where = derivePoint({ x: 0, y: -4 }).position.kind; // 'axis-y'
  return {
    id: 'axis-point',
    kind: 'prediction',
    title: 'A point on an axis',
    prompt: 'Which statement is true about the point (0, −4)?',
    choices: [
      { id: 'q3', label: 'it is in quadrant III' },
      { id: 'q4', label: 'it is in quadrant IV' },
      { id: 'axis-y', label: 'it is on the y-axis, and in no quadrant' },
      { id: 'axis-x', label: 'it is on the x-axis, and in no quadrant' },
    ],
    solution: 'x = 0, so the point is on the y-axis (the points with x = 0 form that axis). The quadrants are the four open regions between the axes; the axes themselves belong to none of them. So (0, −4) is in no quadrant, although it is "between" III and IV.',
    grade: a => pick(a, where, {
      'axis-y': 'Yes: x = 0 puts the point on the y-axis, which is a border between quadrants III and IV, and belongs to neither.',
      q3: 'Quadrant III needs x < 0, and x here is exactly 0: not negative. Zero is neither positive nor negative.',
      q4: 'Quadrant IV needs x > 0, and x here is exactly 0: not positive. Zero is neither positive nor negative.',
      'axis-x': 'The x-axis is the set of points with y = 0. Here it is x that is 0, so the point is on the y-axis.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 3. distance to an axis
const axisDistance: Exercise = (() => {
  const p = derivePoint({ x: -3, y: 2 });
  const right = `d${p.distToXAxis.num}`; // |y| = 2
  return {
    id: 'axis-distance',
    kind: 'prediction',
    title: 'How far from the x-axis?',
    prompt: 'The point P = (−3, 2). How far is P from the x-axis?',
    choices: [
      { id: 'd3', label: '3' },
      { id: 'd2', label: '2' },
      { id: 'dm2', label: '−2' },
      { id: 'droot', label: '√13' },
    ],
    solution: 'The distance from P to the x-axis is the length of the perpendicular dropped to it, which runs straight down from P and has length |y| = 2. The coordinate you read ALONG one axis is the distance to the OTHER axis: x = −3 gives the distance 3 to the y-axis, y = 2 gives the distance 2 to the x-axis.',
    grade: a => pick(a, right, {
      d2: 'Yes: the distance to the x-axis is |y| = |2| = 2.',
      d3: 'That is |x|, the distance to the y-axis. The distance to the x-axis is the vertical drop to it, which is |y|.',
      dm2: 'A distance is never negative. The vertical drop from P to the x-axis has length |y| = 2.',
      droot: '√13 is the distance from P to the origin, √(x² + y²). The distance to the x-axis alone is just |y|.',
    }),
  };
})();

// ---------------------------------------------------------------------------------------------- 4. number-line distance
const lineDistance: Exercise = (() => {
  const l = deriveLine({ a: -3, b: 5 });
  return {
    id: 'line-distance',
    kind: 'calculation',
    title: 'Distance on a number line',
    prompt: 'What is the distance between the points −3 and 5 on a number line?',
    fields: [{ id: 'd', label: 'distance' }],
    solution: '|5 − (−3)| = |8| = 8. The point −3 is 3 units left of 0 and 5 is 5 units right of it, so the two pieces add: 3 + 5 = 8. Subtracting the other way gives −3 − 5 = −8, and the absolute value brings it back to 8.',
    grade: ans => {
      const d = num(ans.d);
      if (d === null) return NEED_NUMBERS;
      if (same(d, l.distance)) return ok('Yes: |5 − (−3)| = 8, and the same by |−3 − 5| = 8.');
      if (same(d, l.backward)) return no('−8 is the signed step from 5 to −3: it has a direction. A distance has none, so it is the absolute value, 8.');
      if (same(d, add(l.a, l.b))) return no('2 = −3 + 5 adds the coordinates, which does not measure the gap (it would be right only if −3 were 3). The point −3 is on the other side of 0, so the distance is 3 + 5: subtract, 5 − (−3).');
      return no('Subtract one coordinate from the other, 5 − (−3), and take the absolute value.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 5. signed step
const signedStep: Exercise = (() => {
  const l = deriveLine({ a: 6, b: -2 });
  return {
    id: 'signed-step',
    kind: 'calculation',
    title: 'The signed step, and the distance',
    prompt: 'You walk on a number line from a = 6 to b = −2. Give the signed step b − a and the distance |b − a|.',
    fields: [{ id: 'step', label: 'b − a' }, { id: 'dist', label: '|b − a|' }],
    solution: 'b − a = −2 − 6 = −8: you move 8 units to the LEFT, and moving left is a negative step. The distance |−8| = 8 has no direction. Walking back from −2 to 6 would be the step +8 with the same distance 8.',
    grade: ans => {
      const step = num(ans.step);
      const dist = num(ans.dist);
      if (step === null || dist === null) return NEED_NUMBERS;
      if (same(step, l.forward) && same(dist, l.distance)) return ok('Yes: b − a = −8 (left, so negative) and the distance is 8.');
      if (same(step, l.backward)) return no('+8 is a − b, the step from b back to a. The step from a to b is b − a = −2 − 6.');
      if (same(dist, l.forward)) return no('A distance is never negative: |b − a| = |−8| = 8.');
      if (same(step, l.forward)) return no('The signed step is right. The distance is its absolute value: it drops the sign.');
      return no('Subtract the START from the END: b − a = −2 − 6. The distance is the absolute value of that.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 6. a 3-4-5 distance
const distance345: Exercise = (() => {
  const s = deriveSegment({ ax: 1, ay: 2, bx: 4, by: 6 });
  const expected = s.distance.kind === 'exact' && s.distance.root.b === 1n ? rational(s.distance.root.a, s.distance.root.c) : null;
  return {
    id: 'distance-345',
    kind: 'calculation',
    title: 'Distance between two points',
    prompt: 'What is the distance between A = (1, 2) and B = (4, 6)?',
    fields: [{ id: 'd', label: 'distance |AB|' }],
    solution: 'dx = 4 − 1 = 3 and dy = 6 − 2 = 4. The distance is √(3² + 4²) = √(9 + 16) = √25 = 5. Going along the axes instead would cost 3 + 4 = 7 (the taxicab distance), and 25 is the SQUARED distance: the root is the last step.',
    grade: ans => {
      const d = num(ans.d);
      if (d === null) return NEED_NUMBERS;
      if (expected === null) throw new Error('3-4-5 has a rational distance');
      if (same(d, expected)) return ok('Yes: √(3² + 4²) = √25 = 5.');
      if (same(d, s.taxicab)) return no('7 = 3 + 4 is the taxicab distance, the length of the walk along the axes. The straight-line distance is √(3² + 4²).');
      if (same(d, s.distSq)) return no('25 = 3² + 4² is the SQUARED distance. The distance is its square root.');
      return no('Subtract coordinate by coordinate to get dx and dy, square each, add, and take the square root.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 7. an exact radical distance
const radicalDistance: Exercise = (() => {
  const s = deriveSegment({ ax: -1, ay: 2, bx: 3, by: -4 });
  const root = s.distance.kind === 'exact' ? s.distance.root : null;
  return {
    id: 'radical-distance',
    kind: 'calculation',
    title: 'An exact radical distance',
    prompt: 'Write the distance between A = (−1, 2) and B = (3, −4) as a·√b, where b has no square factor left. Enter the whole numbers a and b.',
    fields: [{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }],
    solution: 'dx = 3 − (−1) = 4 and dy = −4 − 2 = −6, so the squared distance is 16 + 36 = 52 = 4 · 13. Then √52 = √4 · √13 = 2√13 ≈ 7.211103. The sign of dy disappears when it is squared.',
    grade: ans => {
      const a = whole(ans.a);
      const b = whole(ans.b);
      if (a === null || b === null) return NEED_NUMBERS;
      if (root === null) throw new Error('52 has an exact root form');
      if (a === root.a && b === root.b) return ok(`Yes: (${a}√${b})² = ${a * a} · ${b} = 52, and 13 has no square factor.`);
      if (a <= 0n || b <= 0n) return no('Both numbers are positive whole numbers: a distance is a positive length.');
      if (a * a * b === 52n) return no(`Not fully simplified: ${a}√${b} does square to 52, but ${b} still has a square factor you can take out.`);
      return no(`Check by squaring: (${a}√${b})² = ${a * a * b}. It must equal the squared distance, dx² + dy² = 4² + (−6)² = 52.`);
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 8. midpoint
const midpoint: Exercise = (() => {
  const s = deriveSegment({ ax: -3, ay: 4, bx: 5, by: -2 });
  return {
    id: 'midpoint',
    kind: 'calculation',
    title: 'The midpoint',
    prompt: 'What is the midpoint of A = (−3, 4) and B = (5, −2)? Enter its two coordinates.',
    fields: [{ id: 'mx', label: 'x of the midpoint' }, { id: 'my', label: 'y of the midpoint' }],
    solution: 'Average each coordinate: ((−3 + 5)/2, (4 + (−2))/2) = (1, 1). Half of the displacement, (4, −3), is the vector from A to the midpoint, not the midpoint itself: A plus that half step lands on (1, 1).',
    grade: ans => {
      const x = num(ans.mx);
      const y = num(ans.my);
      if (x === null || y === null) return NEED_NUMBERS;
      if (same(x, s.midpoint.x) && same(y, s.midpoint.y)) return ok('Yes: the midpoint is the average of the coordinates, (1, 1).');
      const halfDx = rational(s.dx.num, s.dx.den * 2n);
      const halfDy = rational(s.dy.num, s.dy.den * 2n);
      if (same(x, halfDx) && same(y, halfDy)) return no('(4, −3) is HALF THE DISPLACEMENT, the step from A to the midpoint. The midpoint is the point you arrive at: add that step to A.');
      if (same(x, add(s.a.x, s.b.x)) && same(y, add(s.a.y, s.b.y))) return no('That is the SUM of the coordinates; the midpoint is the average, so divide by 2.');
      return no('Average each coordinate separately: (x_A + x_B)/2 and (y_A + y_B)/2.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 9. construct a point
const constructPoint: Exercise = {
  id: 'construct-point',
  kind: 'construction',
  title: 'Build a point',
  prompt: 'Give a point (x, y) in quadrant III whose distance from the origin is exactly 5. Fractions and decimals are allowed.',
  fields: [{ id: 'x', label: 'x' }, { id: 'y', label: 'y' }],
  solution: 'Quadrant III needs x < 0 and y < 0, and distance 5 needs x² + y² = 25. The integer answers are (−3, −4) and (−4, −3), from 3² + 4² = 25. There are infinitely many others, such as (−1.4, −4.8): 1.96 + 23.04 = 25.',
  grade: ans => {
    const x = num(ans.x);
    const y = num(ans.y);
    if (x === null || y === null) return NEED_NUMBERS;
    const position = positionOf(x, y);
    const squared = add(mul(x, x), mul(y, y));
    if (position.kind !== 'quadrant') return no(`The point is ${position.kind === 'origin' ? 'at the origin' : 'on an axis'}, which is in no quadrant: both coordinates must be non-zero.`);
    if (position.index !== 3) return no(`That point is in quadrant ${ROMAN[position.index]}. Quadrant III needs x < 0 and y < 0.`);
    if (!same(squared, int(25))) return no(`In quadrant III, but x² + y² = ${text(squared)}, and the distance 5 needs x² + y² = 25.`);
    return ok(`Yes: quadrant III and x² + y² = ${text(squared)}, so the distance is exactly 5.`);
  },
};

// ---------------------------------------------------------------------------------------------- 10. row and column
const pixelRow: Exercise = (() => {
  const p = derivePixel({ w: 6, h: 4, x: 4, y: 1 });
  return {
    id: 'pixel-row',
    kind: 'calculation',
    title: 'Row and column of a pixel',
    prompt: 'An image is 6 pixels wide and 4 tall. The point (x, y) = (4, 1) is measured with y going UP from the bottom row. Which row (counted from the top, starting at 0) and which column hold that pixel?',
    fields: [{ id: 'row', label: 'row' }, { id: 'col', label: 'col' }],
    solution: 'col = x = 4, and row = H − 1 − y = 4 − 1 − 1 = 2. The bottom row (y = 0) is row 3, the top row (y = 3) is row 0. In NumPy: img[2, 4], flat index 2 · 6 + 4 = 16.',
    grade: ans => {
      const row = whole(ans.row);
      const col = whole(ans.col);
      if (row === null || col === null) return NEED_NUMBERS;
      if (row === BigInt(p.row) && col === BigInt(p.col)) return ok('Yes: col = x = 4 and row = H − 1 − y = 2, so the pixel is img[2, 4].');
      if (row === BigInt(p.naiveRow)) return no('That is H − y, which is off by one: the bottom row y = 0 must map to the last row H − 1, so use H − 1 − y.');
      if (row === BigInt(p.y)) return no('row = y forgets the flip: y counts from the BOTTOM and the row counts from the TOP.');
      if (row === BigInt(p.x) && col === BigInt(p.y)) return no('Swapped: img[row, col] takes the row first and the column second, the opposite order of (x, y). The column is x.');
      if (col !== BigInt(p.col)) return no('The column is x: columns are counted from the left, the same way x is.');
      return no('The row counts from the top: row = H − 1 − y.');
    },
  };
})();

// ---------------------------------------------------------------------------------------------- 11. NumPy indexing
const imgIndexing: Exercise = {
  id: 'img-indexing',
  kind: 'prediction',
  title: 'Index into the array',
  prompt: 'In NumPy, img has shape (H, W), with row 0 at the top of the picture. Which expression reads the pixel at the mathematical point (x, y), where y is measured up from the bottom row?',
  choices: [
    { id: 'xy', label: 'img[x, y]' },
    { id: 'yx', label: 'img[y, x]' },
    { id: 'hy', label: 'img[H - y, x]' },
    { id: 'h1y', label: 'img[H - 1 - y, x]' },
  ],
  solution: 'img[row, col] takes the row first. The column is x. The row counts from the top, so row = H − 1 − y: img[H - 1 - y, x]. img[y, x] would be right only for an array already flipped to put row 0 at the bottom (np.flipud(img)[y, x] is the same pixel).',
  grade: a => pick(a, 'h1y', {
    h1y: 'Yes: the column is x and the row is H − 1 − y, so the bottom row y = 0 is the last row, H − 1.',
    xy: 'Swapped: NumPy indexes img[row, col], row first. This reads row x and column y, which is a different pixel, and often an out-of-range index.',
    yx: 'This forgets the flip. y counts up from the bottom but the row counts down from the top, so this reads the pixel mirrored top-to-bottom.',
    hy: 'Off by one: with y = 0 it reads img[H, x], and row H does not exist (the rows are 0 … H − 1): an IndexError.',
  }),
};

// ---------------------------------------------------------------------------------------------- 12. taxicab versus straight
const taxicab: Exercise = {
  id: 'taxicab',
  kind: 'explanation',
  title: 'Along the axes, or straight?',
  prompt: 'The taxicab distance is |dx| + |dy| and the straight-line distance is √(dx² + dy²). Which statement is always true?',
  choices: [
    { id: 'less', label: 'taxicab is smaller than straight' },
    { id: 'equal', label: 'they are always equal' },
    { id: 'axis', label: 'taxicab ≥ straight, with equality exactly when dx = 0 or dy = 0' },
    { id: 'point', label: 'taxicab ≥ straight, with equality only when the two points coincide' },
  ],
  solution: '(|dx| + |dy|)² = dx² + dy² + 2|dx||dy|, which is the squared straight distance plus 2|dx||dy| ≥ 0. So taxicab ≥ straight, and the extra term is 0 exactly when dx = 0 or dy = 0: for points on a horizontal or vertical line the two agree.',
  grade: a => pick(a, 'axis', {
    axis: 'Yes. Squaring the taxicab distance gives the squared straight distance plus 2|dx||dy|, and that extra term is 0 exactly when a leg is 0.',
    less: 'Squaring |dx| + |dy| gives dx² + dy² + 2|dx||dy|, which is at least dx² + dy². The taxicab distance is never the smaller one.',
    equal: 'Try (0, 0) and (1, 1): the taxicab distance is 2, the straight distance is √2 ≈ 1.414.',
    point: 'Points on a horizontal or vertical line also give equality: for (0, 0) and (3, 0) both distances are 3. Equality needs only dx = 0 or dy = 0.',
  }),
};

// ---------------------------------------------------------------------------------------------- 13. equal distances
const equalDistance: Exercise = (() => {
  const a = derivePoint({ x: 0.1, y: 0.7 });
  const b = derivePoint({ x: 0.5, y: 0.5 });
  const equal = same(a.distSq, b.distSq);
  return {
    id: 'equal-distance',
    kind: 'explanation',
    title: 'Equal distances, decided exactly',
    prompt: 'Are the points (0.1, 0.7) and (0.5, 0.5) the same distance from the origin? Decide it without a calculator, by comparing squared distances.',
    choices: [
      { id: 'yes', label: 'yes: both squared distances equal 0.5 exactly' },
      { id: 'no', label: 'no: 0.1² + 0.7² is slightly smaller than 0.5' },
      { id: 'close', label: 'they are close, but equality cannot be decided with decimals' },
    ],
    solution: '0.1² + 0.7² = 0.01 + 0.49 = 0.50 and 0.5² + 0.5² = 0.25 + 0.25 = 0.50, so the squared distances, and therefore the distances (both are √0.5 = √2/2), are exactly equal. In binary doubles 0.1 and 0.7 are stored with tiny errors and Python prints 0.1**2 + 0.7**2 as 0.49999999999999994: that comparison is false, the mathematics is true.',
    grade: ans => pick(ans, equal ? 'yes' : 'no', {
      yes: 'Yes: 0.01 + 0.49 = 0.25 + 0.25 = 0.50 exactly. Compare squared distances (a root adds nothing, since both sides are non-negative) and do the arithmetic in exact decimals or fractions.',
      no: 'That is what binary doubles say (0.49999999999999994 against 0.5), but those are rounding errors of the machine: with exact decimals 0.01 + 0.49 = 0.50.',
      close: 'It can be decided: these are decimals with two places, so the squares are exact decimals (0.01 + 0.49 and 0.25 + 0.25). Only a floating-point comparison is unreliable.',
    }),
  };
})();

export const EXERCISES: readonly Exercise[] = Object.freeze([
  quadrantBasic, axisPoint, axisDistance, lineDistance, signedStep, distance345, radicalDistance, midpoint, constructPoint, pixelRow, imgIndexing, taxicab, equalDistance,
]);
export const exerciseById = (id: string): Exercise | undefined => byId(EXERCISES, id);
