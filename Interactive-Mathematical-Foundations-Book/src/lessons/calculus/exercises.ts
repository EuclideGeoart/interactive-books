/**
 * Graded exercises for Part III. Each asks the reader to calculate, predict or choose between explanations; a wrong answer that matches a known
 * misconception receives a hint naming it. Numeric answers accept exact fractions (7/2) or decimals and compare EXACTLY as rationals.
 */
import { NEED_NUMBERS, no, ok, parseRational, pick, type Answer, type Exercise, type ExerciseKind } from '../../platform/exercise';

export function calculate(id: string, title: string, prompt: string, labels: readonly string[], expected: readonly string[], solution: string, hint: string, kind: ExerciseKind = 'calculation'): Exercise {
  return { id, title, prompt, kind, fields: labels.map((label, i) => ({ id: `n${i}`, label })), solution,
    grade(answer: Answer) {
      const values = labels.map((_, i) => parseRational(answer[`n${i}`]));
      if (values.some(v => !v)) return NEED_NUMBERS;
      return values.every((v, i) => { const e = parseRational(expected[i])!; return v!.num * e.den === e.num * v!.den; }) ? ok(solution) : no(hint);
    } };
}
/** The first option is correct; each option carries its own feedback. */
export function choose(id: string, title: string, prompt: string, options: readonly [string, string, string][], kind: ExerciseKind = 'prediction'): Exercise {
  return { id, title, prompt, kind, choices: options.map(([cid, label]) => ({ id: cid, label })), solution: options[0]![2],
    grade: answer => pick(answer, options[0]![0], Object.fromEntries(options.map(([cid, , message]) => [cid, message]))) };
}

export const CALCULUS_EXERCISES: Record<string, readonly Exercise[]> = {
  limits: [
    calculate('iii1-hole', 'Cancel, then approach', 'Find the limit of (x² − 4)/(x − 2) as x → 2.', ['limit'], ['4'],
      'For x ≠ 2, (x² − 4)/(x − 2) = (x − 2)(x + 2)/(x − 2) = x + 2, which approaches 4. The expression itself is undefined at x = 2.', 'Factor the numerator and cancel x − 2, which is allowed only because x ≠ 2.'),
    calculate('iii1-sides', 'Read both sides', 'f(x) = −1 for x < 0 and f(x) = 2x + 1 for x ≥ 0. Give the left and right limits at 0.', ['left limit', 'right limit'], ['-1', '1'],
      'From the left f is constantly −1; from the right 2x + 1 → 1. The sides differ, so the two-sided limit does not exist.', 'Use only the piece that applies on each side.'),
    choose('iii1-value', 'Value versus limit', 'g(x) = x + 1 for x ≠ 1 and g(1) = 3. What is the limit as x → 1?', [
      ['two', '2: the limit ignores the value at 1.', 'A limit depends only on values NEAR 1. Nearby, g(x) = x + 1 → 2, even though g(1) = 3.'],
      ['three', '3, because g(1) = 3.', 'The value at the point is not used by the limit.'],
      ['none', 'It does not exist because the value is moved.', 'Moving one value does not change the approach of nearby values.']]),
    choose('iii1-infinite', 'An unbounded approach', 'What is the correct statement about 1/x² as x → 0?', [
      ['unbounded', 'It grows without bound; there is no finite limit.', 'Writing "= +∞" records the manner of failure; ∞ is not a real number the function approaches.'],
      ['zero', 'The limit is 0 because 1/x² is never negative.', 'The values get LARGER as x → 0.'],
      ['undefined-only', 'The limit equals f(0).', 'f(0) is undefined, and limits do not use the value at the point anyway.']]),
    choose('iii1-oscillate', 'Trust a table?', 'A table of sin(1/x) at x = 1/(kπ) shows only zeros. Does sin(1/x) → 0 as x → 0?', [
      ['no', 'No: other sequences give 1 or −1, so there is no limit.', 'At x = 2/((4k+1)π) the values are 1. A limit must work for every way of approaching.'],
      ['yes', 'Yes: the table converges to 0.', 'One special sequence is not every approach.'],
      ['one', 'Yes, to 1, its maximum.', 'Being bounded by 1 does not create a limit.']]),
  ],
  continuity: [
    calculate('iii2-join', 'Make the pieces meet', 'f(x) = x² + c for x < 1 and f(x) = 3x for x ≥ 1. Which c makes f continuous at 1?', ['c'], ['2'],
      'The right piece gives f(1) = 3 and right limit 3. The left limit is 1 + c. Continuity needs 1 + c = 3, so c = 2.', 'Equate the left limit 1 + c with the value f(1).', 'construction'),
    calculate('iii2-repair', 'Repair a removable discontinuity', 'h(x) = (x² − 9)/(x − 3) is undefined at 3. Which value h(3) makes h continuous there?', ['h(3)'], ['6'],
      'For x ≠ 3, h(x) = x + 3 → 6. Defining h(3) = 6 makes the value equal the limit.', 'Find the limit by cancelling x − 3; continuity needs the value to equal it.', 'construction'),
    choose('iii2-conditions', 'Which condition fails?', 'f(1) = 0, but both one-sided limits at 1 equal 2. Which continuity condition fails?', [
      ['iii', '(iii): the limit exists but differs from f(1).', 'f(1) exists and the limit exists; they are different numbers, so the discontinuity is removable.'],
      ['i', '(i): f(1) does not exist.', 'f(1) = 0 is defined, so (i) holds.'],
      ['ii', '(ii): the limit does not exist.', 'Both sides agree at 2, so the limit exists.']]),
    choose('iii2-endpoint', 'An endpoint', 'Is √x continuous at 0, the left end of its domain?', [
      ['right', 'Yes, from the right: that is the meaning at an endpoint.', 'Only x ≥ 0 is in the domain, and √x → 0 = √0 from the right.'],
      ['no', 'No: there is no left limit.', 'At an endpoint only the side inside the domain is required.'],
      ['undefined', 'The question has no answer because √x is not a polynomial.', 'Continuity is defined for any function on its domain.']]),
    choose('iii2-local', 'Local versus global', 'A function is continuous at x = −1 but jumps at x = 1. Is it "continuous"?', [
      ['local', 'It is continuous at −1, not on any interval containing 1.', 'Continuity is a property AT a point, extended to an interval only when it holds at every point.'],
      ['yes', 'Yes, because it is continuous at −1.', 'One continuous point does not make the whole function continuous.'],
      ['no', 'No, it is continuous nowhere.', 'The jump at 1 does not affect continuity at −1.']]),
  ],
  'linear-model': [
    calculate('iii4-model', 'Use the tangent line', 'f(x) = x², x₀ = 3, Δx = 0.1. Give the linear estimate f(3) + f′(3)Δx.', ['estimate'], ['9.6'],
      'f(3) = 9 and f′(3) = 6, so 9 + 6(0.1) = 9.6. The true value is 9.61.', 'f′(x) = 2x, evaluated at the expansion point x₀ = 3.'),
    calculate('iii4-error', 'Measure the error', 'For f(x) = x² at x₀ = 3, the model error is e(Δx) = f(3 + Δx) − 9 − 6Δx. Give e(0.1).', ['error'], ['0.01'],
      'f(3.1) = 9.61, the model gives 9.6, so e = 0.01 = (0.1)². For x² the error is exactly Δx².', 'Compute the true value 3.1² first, then subtract the estimate.'),
    calculate('iii4-rate', 'Average versus instantaneous', 'Position s(t) = t². Give the average velocity on [1, 3] and the instantaneous velocity at t = 1.', ['average', 'at t = 1'], ['4', '2'],
      'Average: (9 − 1)/(3 − 1) = 4. Instantaneous: s′(1) = 2. They differ because the velocity changes over the interval.', 'The average is a secant slope; the instantaneous rate is the derivative.'),
    choose('iii4-local', 'How far does it work?', 'Why does the tangent estimate of x³/6 − x at x₀ = 1 fail at Δx = 2.5?', [
      ['local', 'The error grows like (f″/2)Δx² and beyond; the model is local.', 'Near x₀ the error is second order. Far away nothing bounds it.'],
      ['wrong', 'The derivative was computed wrongly.', 'The derivative is exact; the model is only valid locally.'],
      ['rounding', 'Floating-point rounding.', 'The error is exact rational arithmetic here: 275/48.']]),
    choose('iii4-corner', 'A corner has no linear model', 'Why is there no tangent model of |x| at 0?', [
      ['corner', 'No single slope fits both sides: the derivative does not exist.', 'Any line through the origin misses one side by an error proportional to |Δx|, which is not smaller than Δx.'],
      ['zero', 'The model is y = 0 because |0| = 0.', 'y = 0 has error |Δx|, which does not shrink faster than Δx.'],
      ['one', 'The model is y = x.', 'It is accurate only for Δx > 0.']]),
  ],
  rules: [
    calculate('iii5-product', 'Apply the product rule', 'u = x + 1, v = x² + 1. Give (uv)′ at x = 1.', ["(uv)'(1)"], ['6'],
      "u′v + uv′ = 1·2 + 2·2 = 6. Expanding uv = x³ + x² + x + 1 gives 3x² + 2x + 1 = 6 as well.", 'Weight each rate by the OTHER factor, then add.'),
    calculate('iii5-quotient', 'Apply the quotient rule', 'u = x + 1, v = x² + 1. Give (u/v)′ at x = 1.', ["(u/v)'(1)"], ['-1/2'],
      '(u′v − uv′)/v² = (1·2 − 2·2)/4 = −2/4 = −1/2.', 'Keep the order u′v − uv′ in the numerator and square v.'),
    calculate('iii5-increment', 'Area increment', 'u = 2, v = 3 grow by Δu = 0.5, Δv = 0.25. Give vΔu, uΔv and ΔuΔv.', ['vΔu', 'uΔv', 'ΔuΔv'], ['1.5', '0.5', '0.125'],
      'vΔu = 3·0.5, uΔv = 2·0.25, ΔuΔv = 0.125. Their sum 2.125 equals 2.5·3.25 − 6.', 'Draw the rectangle: two strips and a small corner.'),
    choose('iii5-wrong', 'A tempting mistake', 'Is (uv)′ = u′v′?', [
      ['no', 'No: for u = v = x it gives 1 instead of 2x.', '(x·x)′ = 2x, but u′v′ = 1. The product rule u′v + uv′ = 2x is correct.'],
      ['yes', 'Yes, by analogy with the sum rule.', 'Linearity covers sums and constant multiples, not products.'],
      ['sometimes', 'Only for polynomials.', 'Counterexample: u = v = x is a polynomial.']]),
    choose('iii5-domain', 'Where the quotient rule applies', 'u = x + 1, v = x² − 1. Can you use the quotient rule at x = 1?', [
      ['no', 'No: v(1) = 0, so u/v is undefined there.', 'The rule needs v(x) ≠ 0. At x = 1 the formula would divide by zero.'],
      ['yes', 'Yes: the derivative formula always works.', 'A formula divided by v² is undefined where v = 0.'],
      ['cancel', 'Yes, after cancelling x + 1.', 'The cancellation removes x + 1, not the zero factor x − 1.']]),
  ],
  chain: [
    calculate('iii6-chain', 'Multiply local factors', 'g(x) = x² and f(u) = 3u + 1. Give (f∘g)′(2).', ["(f∘g)'(2)"], ['12'],
      "u = g(2) = 4, g′(2) = 4, f′(u) = 3. So (f∘g)′(2) = 3·4 = 12. Directly, f(g(x)) = 3x² + 1 has derivative 6x = 12.", "Multiply f′ at u = g(2) by g′(2)."),
    calculate('iii6-where', 'Evaluate at the right place', 'g(x) = x², f(u) = u³. Give f′(g(1)) and (f∘g)′(1).', ["f'(g(1))", "(f∘g)'(1)"], ['3', '6'],
      'g(1) = 1, f′(u) = 3u² → 3. g′(1) = 2, so the product is 6. Check: x⁶ has derivative 6x⁵ = 6.', 'f′ is evaluated at the INTERMEDIATE value u = g(1).'),
    calculate('iii6-change', 'Propagate a small change', 'At some x, g′(x) = 2 and f′(g(x)) = −3. Estimate Δy when Δx = 0.01.', ['Δy'], ['-0.06'],
      'Δu ≈ 2·0.01 = 0.02; Δy ≈ −3·0.02 = −0.06.', 'Pass the change through each stage, multiplying by its local factor.'),
    choose('iii6-order', 'A common error', 'For h(x) = sin(x²), which is correct?', [
      ['right', "h′(x) = cos(x²)·2x", 'The outer derivative cos is evaluated at the inner value x², then multiplied by (x²)′ = 2x.'],
      ['inner', 'h′(x) = cos(2x)', 'This evaluates the outer derivative at the inner DERIVATIVE.'],
      ['drop', 'h′(x) = cos(x²)', 'It forgets the inner factor 2x.']]),
    choose('iii6-graph', 'Toward computational graphs', 'In y = f(g(x)), why is it efficient to multiply from the output backward?', [
      ['backward', 'Each local factor is used once; the same idea scales to graphs with shared inputs.', 'Reverse accumulation starts with dy/dy = 1 and multiplies by each local derivative — the core of backpropagation (III.10).'],
      ['symbolic', 'Because it builds a symbolic formula for h first.', 'No formula is built; numerical local derivatives are multiplied.'],
      ['finite', 'Because it uses finite differences.', 'The chain rule multiplies exact local derivatives, not difference quotients.']]),
  ],
  secant: [
    calculate('iii3-secant', 'Compute a secant slope', 'For f(x) = x², find the secant slope between x = 1 and x = 1 + h with h = 0.5.', ['m(0.5)'], ['5/2'],
      'f(1.5) − f(1) = 2.25 − 1 = 1.25, and 1.25/0.5 = 2.5. Algebraically m(h) = 2 + h, so m(0.5) = 2.5.', 'Divide the CHANGE in f by the change in x; do not divide f(1.5) itself by h.'),
    calculate('iii3-limit', 'Let the step shrink', 'For f(x) = x², the secant slope at x = 1 is m(h) = 2 + h for h ≠ 0. What value do the slopes approach as h → 0?', ["f'(1)"], ['2'],
      'm(h) = 2 + h is valid for every nonzero h, and 2 + h → 2. The derivative is the limit, f′(1) = 2; we never evaluate the quotient at h = 0.', 'Use the simplified expression 2 + h, then let h approach 0.'),
    choose('iii3-zero', 'What happens at h = 0?', 'Why can you not simply put h = 0 into [f(x+h) − f(x)]/h?', [
      ['divide', 'It becomes 0/0: the secant needs two distinct points.', 'With h = 0 both points coincide; 0/0 has no value. The derivative is a limit of nonzero-h slopes.'],
      ['zero', 'It equals 0 because the numerator is 0.', 'The denominator is also 0; 0/0 is undefined, not 0.'],
      ['derivative', 'It equals the derivative automatically.', 'Substituting h = 0 divides by zero. The derivative is reached by a limit, not by substitution.']]),
    choose('iii3-corner', 'A corner', 'For f(x) = |x| at x = 0, the right secant slopes are 1 and the left ones are −1. What is f′(0)?', [
      ['none', 'It does not exist: the one-sided limits differ.', 'A derivative needs ONE limit from both sides. Here 1 ≠ −1, so |x| has no derivative at 0.'],
      ['zero', '0, the average of −1 and 1.', 'Averaging the sides is not a limit; the two-sided limit does not exist.'],
      ['one', '1, because h is usually positive.', 'h → 0 from both sides; ignoring negative h hides the corner.']]),
    choose('iii3-vertical', 'A vertical tangent', 'For f(x) = ∛x at 0, the secant slope is h^(−2/3). What does this say?', [
      ['vertical', 'The slopes grow without bound: no real derivative, a vertical tangent.', 'h^(−2/3) → +∞ from both sides. The graph has a vertical tangent and f′(0) is not a real number.'],
      ['zero', 'The derivative is 0 because f(0) = 0.', 'A zero value says nothing about the slope.'],
      ['one', 'The slopes approach 1.', 'h^(−2/3) increases as h shrinks; it does not settle at 1.']]),
  ],
};
