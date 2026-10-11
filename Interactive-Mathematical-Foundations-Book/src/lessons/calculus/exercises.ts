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
  riemann: [
    calculate('iii12-left', 'A left Riemann sum', 'f(x) = x² on [0, 2] with n = 2 panels. Give the left-endpoint sum.', ['L₂'], ['1'],
      'Δx = 1; left endpoints 0 and 1 give heights 0 and 1, so L₂ = (0 + 1)·1 = 1. The exact integral is 8/3.', 'Use the LEFT end of each panel and multiply by Δx.'),
    calculate('iii12-signed', 'Signed accumulation', 'Compute ∫ from −1 to 2 of x dx and the geometric area between y = x and the axis on [−1, 2].', ['integral', 'area'], ['3/2', '5/2'],
      'Signed: 2 − 1/2 = 3/2. Area: the triangle below has area 1/2 and the one above 2, so 5/2.', 'The part below the axis subtracts from the integral but adds to the area.'),
    calculate('iii12-reverse', 'Reverse the limits', '∫ from 0 to 3 of f dx = 5. What is ∫ from 3 to 0 of f dx?', ['value'], ['-5'],
      'Swapping the limits makes every Δx negative: ∫ from 3 to 0 = −5.', 'Orientation matters: ∫ₐᵇ = −∫ᵦᵃ.'),
    choose('iii12-zero', 'Zero integral, nonzero area', '∫ from 0 to 2π of sin x dx = 0. Does the graph enclose no area?', [
      ['area', 'No: it encloses area 4; the positive and negative halves cancel.', 'Each hump has area 2. The integral measures signed accumulation, not total area.'],
      ['none', 'Yes: zero integral means zero area.', 'Equal areas above and below cancel in the integral.'],
      ['error', 'The integral must be computed wrongly.', '−cos x from 0 to 2π is exactly 0.']]),
    choose('iii12-refine', 'More panels', 'For a continuous f on [a, b], what happens to Riemann sums as n → ∞?', [
      ['converge', 'They approach the integral, whichever sample point rule is used.', 'For continuous f, left, right, midpoint and trapezoid sums all converge to the same limit.'],
      ['exact', 'They become exactly equal to the integral for some finite n.', 'Usually only in the limit; exactness for finite n is special (e.g. midpoint on a linear f).'],
      ['diverge', 'They grow without bound because more panels add more area.', 'The panels also get narrower: each contribution shrinks with Δx.']]),
  ],
  accumulation: [
    calculate('iii13-value', 'Evaluate an accumulation function', 'F(x) = ∫ from 0 to x of (2t + 1) dt. Give F(2) and F′(2).', ['F(2)', "F'(2)"], ['6', '5'],
      'F(x) = x² + x, so F(2) = 6; F′(x) = 2x + 1 = f(x), so F′(2) = 5.', 'F′ is the integrand evaluated at the upper limit.'),
    calculate('iii13-strip', 'One thin strip', 'With f(x) = 3 near x, estimate F(x + 0.01) − F(x).', ['ΔF'], ['0.03'],
      'The strip has width 0.01 and height about f(x) = 3, so ΔF ≈ 0.03.', 'ΔF ≈ f(x)·Δx.'),
    calculate('iii13-lower', 'Change the lower limit', 'G(x) = ∫ from 1 to x of 2t dt. Give G(1), G(3) and G′(3).', ['G(1)', 'G(3)', "G'(3)"], ['0', '8', '6'],
      'G(x) = x² − 1: G(1) = 0, G(3) = 8, and G′(3) = 2·3 = 6. Moving the lower limit shifts G by a constant, not its slope.', 'An accumulation starts at 0 at its lower limit.'),
    choose('iii13-max', 'Where F peaks', 'f changes from positive to negative at x = 2. What does F(x) = ∫ₐˣ f do there?', [
      ['max', 'F has a local maximum: it stops increasing and starts decreasing.', 'F′ = f changes sign from + to − at 2, so F peaks there.'],
      ['zero', 'F equals 0 at x = 2.', 'F is the accumulated area up to 2, generally not 0.'],
      ['min', 'F has a minimum.', 'A minimum needs f to change from negative to positive.']]),
    choose('iii13-jump', 'A jump in f', 'f jumps from 1 to −1 at x = 1. Is F differentiable at 1?', [
      ['corner', 'No: F has a corner, with left slope 1 and right slope −1.', 'F′(x) = f(x) needs f to be continuous at x; F itself stays continuous.'],
      ['yes', 'Yes, F′(1) = f(1) = −1.', 'The left slope of F is 1, so the two-sided derivative does not exist.'],
      ['jump', 'F jumps too.', 'Integrating a bounded jump gives a continuous F with a corner, not a jump.']]),
  ],
  'finite-difference': [
    calculate('iii14-forward', 'A forward difference', 'f(x) = x², x = 1, h = 0.1. Compute (f(x+h) − f(x))/h.', ['D₊'], ['2.1'],
      '(1.21 − 1)/0.1 = 2.1. The truncation error 0.1 = h·f″/2 is exactly h for x².', 'Divide the change in f by h.'),
    calculate('iii14-centered', 'A centered difference', 'f(x) = x², x = 1, h = 0.1. Compute (f(x+h) − f(x−h))/(2h).', ['D₀'], ['2'],
      '(1.21 − 0.81)/0.2 = 2: exact, because the centered difference cancels the h-term (and x² has no cubic term).', 'Use both neighbours and divide by 2h.'),
    calculate('iii14-order', 'Error orders', 'Halving h divides the forward truncation error by about how much, and the centered one by about how much?', ['forward', 'centered'], ['2', '4'],
      'Forward truncation is O(h); centered is O(h²): factors 2 and 4.', 'Look at the leading power of h in each error term.'),
    choose('iii14-tiny', 'Is smaller h always better?', 'In binary64, why can h = 10⁻¹⁴ give a worse derivative than h = 10⁻⁸?', [
      ['rounding', 'f(x+h) − f(x) loses most digits to cancellation, and dividing by tiny h magnifies the rounding error.', 'Rounding error grows like ε|f|/h while truncation shrinks like h: their sum has a minimum.'],
      ['truncation', 'Truncation error grows as h shrinks.', 'Truncation shrinks with h; rounding is what grows.'],
      ['never', 'It cannot: smaller h is always more accurate.', 'That holds only in exact arithmetic, not in binary64.']]),
    choose('iii14-best', 'Choosing h', 'For the forward difference of a well-scaled f, where is the best h roughly?', [
      ['sqrt', 'Near √ε ≈ 10⁻⁸, where truncation and rounding balance.', 'Minimising h|f″|/2 + 2ε|f|/h gives h* = 2√(ε|f|/|f″|).'],
      ['eps', 'Near ε ≈ 10⁻¹⁶.', 'Then rounding error is of order 1.'],
      ['one', 'h = 1 is safest.', 'Truncation error would be of order |f″|/2.']]),
  ],
  quadrature: [
    calculate('iii15-trap', 'One trapezoid', 'Approximate ∫ from 0 to 1 of x² dx with one trapezoid. Give the value and the error.', ['T₁', 'error'], ['1/2', '1/6'],
      'T₁ = (0 + 1)/2 = 1/2; the exact value is 1/3, so the error is 1/6 (an overestimate: x² is convex).', 'Average the end heights and multiply by the width.'),
    calculate('iii15-mid', 'One midpoint panel', 'Approximate ∫ from 0 to 1 of x² dx with one midpoint panel. Give the value.', ['M₁'], ['1/4'],
      'The midpoint height is (1/2)² = 1/4, times width 1. Error −1/12: half the trapezoid error, opposite sign.', 'Evaluate at the centre of the panel.'),
    calculate('iii15-order', 'Read an observed order', 'The error drops from 0.04 to 0.01 when n doubles. What is the observed order p in error ∝ hᵖ?', ['p'], ['2'],
      '0.04/0.01 = 4 = 2², so p = 2, typical of the trapezoid and midpoint rules for smooth integrands.', 'p = log₂(E_old/E_new).'),
    choose('iii15-sqrt', 'A slower case', 'The trapezoid rule on ∫₀¹ √x dx converges with order about 1.5, not 2. Why?', [
      ['singular', '√x has an unbounded derivative at 0, so the h² error bound does not apply.', 'The bound needs a bounded f″ on the interval; near 0 √x violates it.'],
      ['bug', 'The implementation is wrong.', 'The observed order matches the theory for this integrand.'],
      ['rounding', 'Rounding error dominates.', 'The errors here are far above rounding level.']]),
    choose('iii15-universal', 'A universal guarantee?', 'Does doubling n always quarter the trapezoid error?', [
      ['no', 'No: the h² rate needs smoothness; kinks, singularities and oscillations change it.', 'Error estimates come with hypotheses. Check them, or test convergence numerically.'],
      ['yes', 'Yes, for every integrable function.', 'Counterexamples: √x, functions with corners at non-grid points, highly oscillatory integrands.'],
      ['exact', 'It makes the error exactly zero after enough doublings.', 'Usually the error only tends to zero.']]),
  ],
  partials: [
    calculate('iii7-partials', 'Two partial derivatives', 'f(x, y) = x²y + 3y. Give ∂f/∂x and ∂f/∂y at (1, 2).', ['∂f/∂x', '∂f/∂y'], ['4', '4'],
      '∂f/∂x = 2xy = 4 (y held at 2); ∂f/∂y = x² + 3 = 4 (x held at 1).', 'Treat the other variable as a constant while differentiating.'),
    calculate('iii7-slice', 'Write the slice', 'For f(x, y) = x² − y², write the slice f(x, 1) as a polynomial and give its slope at x = 2.', ['slope'], ['4'],
      'f(x, 1) = x² − 1, a parabola in x. Its derivative 2x equals 4 at x = 2, which is ∂f/∂x(2, 1).', 'Substitute y = 1 first, then differentiate in x.'),
    calculate('iii7-secant', 'A secant along one axis', 'f(x, y) = xy at (1, 2). Compute [f(1 + h, 2) − f(1, 2)]/h for h = 0.5.', ['quotient'], ['2'],
      'f(1.5, 2) = 3 and f(1, 2) = 2, so (3 − 2)/0.5 = 2. Because f is linear in x, every such secant equals ∂f/∂x = y = 2.', 'Only x moves; y stays 2.'),
    choose('iii7-hold', 'What does “partial” hold?', 'What does ∂f/∂x measure?', [
      ['fixed', 'The rate of change of f as x varies with y held fixed.', 'It is the derivative of the slice through the point parallel to the x-axis.'],
      ['both', 'The total change when x and y both move.', 'Moving both at once is a directional derivative (III.8).'],
      ['part', 'A part of f that contains only x.', 'Every term changes with x unless it is constant in x; ∂f/∂x is a rate, not a piece of f.']]),
    choose('iii7-zero', 'Two zero partials', 'At the origin, f = x² − y² has ∂f/∂x = ∂f/∂y = 0. Is the origin a minimum?', [
      ['no', 'No: f decreases along the y-axis, so it is a saddle.', 'Zero partials say both axis slices are flat at the point; the y-slice −y² has a maximum there.'],
      ['yes', 'Yes: zero partial derivatives mean a minimum.', 'Zero derivatives identify candidates, not minima.'],
      ['undefined', 'The partials are undefined at the origin.', 'Both partials exist and equal 0.']]),
  ],
  gradient: [
    calculate('iii8-gradient', 'Compute a gradient', 'f(x, y) = x²/2 + 2y². Give ∇f at (1, 0.5).', ['∂f/∂x', '∂f/∂y'], ['1', '2'],
      '∂f/∂x = x = 1, ∂f/∂y = 4y = 2. So ∇f = (1, 2).', 'Collect the two partial derivatives into a vector.'),
    calculate('iii8-directional', 'A directional derivative', 'With ∇f = (1, 2), find D_u f for u = (3/5, 4/5).', ['D_u f'], ['11/5'],
      '∇f · u = 3/5 + 8/5 = 11/5. The vector u already has length 1.', 'Dot the gradient with the UNIT direction.'),
    calculate('iii8-steepest', 'Steepest rate', 'With ∇f = (3, 4), what is the largest directional derivative?', ['max rate'], ['5'],
      'D_u f = |∇f| cos θ is largest when u points along ∇f, giving |∇f| = 5.', 'The maximum of |∇f| cos θ occurs at θ = 0.'),
    choose('iii8-perpendicular', 'Gradient and level curves', 'Why is ∇f perpendicular to the level curve through a regular point?', [
      ['level', 'Along the level curve f does not change, so ∇f · t = 0 for its tangent t.', 'The directional derivative along the curve is zero, which is exactly orthogonality.'],
      ['rule', 'By definition of the gradient.', 'The gradient is defined from partial derivatives; perpendicularity is a consequence.'],
      ['always', 'It points toward the origin.', 'It points toward increasing f, which need not be the origin.']]),
    choose('iii8-zero', 'Zero vectors', 'd = (0, 0). What is the directional derivative “in direction d”?', [
      ['undefined', 'Undefined: d has no direction and cannot be normalised.', 'u = d/‖d‖ divides by zero. Any nonzero d gives a direction.'],
      ['zero', '0, because d is zero.', '∇f · d = 0, but that is not a rate per unit distance in any direction.'],
      ['gradient', 'The gradient itself.', 'Without a direction there is nothing to project onto.']]),
  ],
  jacobian: [
    calculate('iii9-entries', 'Fill the Jacobian', 'F(x, y) = (x² − y², 2xy). Give the Jacobian at (1, 2) row by row.', ['∂F₁/∂x', '∂F₁/∂y', '∂F₂/∂x', '∂F₂/∂y'], ['2', '-4', '4', '2'],
      'Row 1 = ∇F₁ = (2x, −2y) = (2, −4); row 2 = ∇F₂ = (2y, 2x) = (4, 2).', 'Row i holds the partial derivatives of the i-th OUTPUT.'),
    calculate('iii9-predict', 'Predict with J', 'J = [[2, −4], [4, 2]] at p with F(p) = (−3, 4). Predict F(p + δ) for δ = (0.1, 0).', ['F₁', 'F₂'], ['-2.8', '4.4'],
      'Jδ = (0.2, 0.4), the first column times 0.1. F(p) + Jδ = (−2.8, 4.4).', 'Multiply J by δ; a step along x picks out the first column.'),
    calculate('iii9-shape', 'Count the shape', 'F: ℝ³ → ℝ² is differentiable. How many rows and columns does its Jacobian have?', ['rows', 'columns'], ['2', '3'],
      'One row per output (2) and one column per input (3): a 2 × 3 matrix that multiplies 3-vectors.', 'Rows = outputs, columns = inputs.'),
    choose('iii9-columns', 'Columns versus rows', 'What does the second column of J tell you?', [
      ['column', 'How every output responds to a small step in the second input.', 'J e₂ is the response to a unit step in y; a small step δ₂ produces approximately δ₂ J e₂.'],
      ['row', 'The gradient of the second output.', 'That is the second ROW, not the second column.'],
      ['det', 'The area scaling.', 'Area scaling is det J, which combines all four entries.']]),
    choose('iii9-singular', 'A zero determinant', 'det J = 0 at the origin for F = (x² − y², 2xy). What follows?', [
      ['flat', 'Near the origin, F squashes small areas to (nearly) zero; the linear map is not invertible.', 'Both columns of J vanish at the origin; small squares map to shapes far smaller than first order.'],
      ['nothing', 'F is undefined at the origin.', 'F is defined everywhere; only its local linear part degenerates.'],
      ['exact', 'The prediction F(p) + Jδ is exact.', 'With J = 0 the prediction is F(p), which misses the second-order change.']]),
  ],
  autodiff: [
    calculate('iii10-forward', 'Evaluate forward', 'z = (x + y)·x with u = x + y. For x = 2, y = 3 give u and z.', ['u', 'z'], ['5', '10'],
      'Topological order: u = 2 + 3 = 5, then z = u·x = 10.', 'Evaluate each node only after its arguments.'),
    calculate('iii10-reverse', 'Accumulate adjoints', 'Same graph at x = 2, y = 3. Give ∂z/∂x and ∂z/∂y.', ['∂z/∂x', '∂z/∂y'], ['7', '2'],
      'z̄ = 1. The edge u → z carries ∂z/∂u = x = 2, so ū = 2. The edge x → z carries ∂z/∂x = u = 5. Then x̄ = 5 (direct) + ū·1 = 7 = 2x + y, and ȳ = ū·1 = 2 = x.', 'x reaches z along TWO paths; add their contributions.'),
    calculate('iii10-square', 'One node, two edges', 'q = x·x at x = 3, computed as a multiplication node with the same input twice. Give each edge contribution and dq/dx.', ['edge 1', 'edge 2', 'dq/dx'], ['3', '3', '6'],
      'Each edge carries ∂q/∂(argument) = the OTHER argument = 3. Both contributions reach x, so dq/dx = 6 = 2x.', 'A repeated argument is two edges, each with its own local derivative.'),
    choose('iii10-cost', 'Which mode?', 'A loss depends on one million parameters. Why use reverse mode?', [
      ['reverse', 'One backward pass gives all one million partial derivatives of the scalar loss.', 'Reverse mode costs a small multiple of one evaluation per OUTPUT; forward mode needs one pass per INPUT.'],
      ['forward', 'Forward mode is always cheaper.', 'Forward mode would need a million passes here.'],
      ['symbolic', 'Because reverse mode builds a symbolic derivative formula.', 'It accumulates numerical derivatives through the executed operations, without building formulas.']]),
    choose('iii10-fd', 'What a finite difference is', 'How does automatic differentiation differ from a finite difference?', [
      ['exact', 'AD applies exact local derivatives along the executed operations; a finite difference approximates with a step h and has truncation and rounding error.', 'AD values are exact up to the arithmetic of each operation; finite differences are a numerical check whose error depends on h.'],
      ['same', 'They are the same up to notation.', 'A finite difference never uses the graph’s local derivatives.'],
      ['symbolic', 'AD is symbolic differentiation.', 'Symbolic differentiation manipulates expressions; AD propagates numbers through a graph.']]),
  ],
  hessian: [
    calculate('iii11-hessian', 'Compute a Hessian', 'f(x, y) = x³ − 3x + y². Give f_xx, f_xy and f_yy at (1, 0).', ['f_xx', 'f_xy', 'f_yy'], ['6', '0', '2'],
      'f_x = 3x² − 3, f_y = 2y. Then f_xx = 6x = 6, f_xy = 0, f_yy = 2.', 'Differentiate the first partials once more; the mixed partial differentiates in x then y.'),
    calculate('iii11-det', 'The determinant test', 'At the critical point (−1, 0) of x³ − 3x + y², give det H.', ['det H'], ['-12'],
      'f_xx = 6x = −6, f_yy = 2, f_xy = 0, so det H = (−6)(2) − 0 = −12 < 0: a saddle.', 'det H = f_xx f_yy − f_xy².'),
    calculate('iii11-curvature', 'Curvature in a direction', 'H = [[2, 0], [0, −2]]. Give uᵀHu for u = (1, 0) and for u = (0, 1).', ['along x', 'along y'], ['2', '-2'],
      'uᵀHu picks out f_xx = 2 along x and f_yy = −2 along y: curving up one way and down the other.', 'For a coordinate direction, uᵀHu is the corresponding diagonal entry.'),
    choose('iii11-inconclusive', 'det H = 0', 'At the origin, x⁴ + y⁴ and x² + y³ both have det H = 0. What can the second-derivative test conclude?', [
      ['nothing', 'Nothing: the first has a minimum, the second neither; higher-order terms decide.', 'Both have a singular Hessian at a critical point, yet different shapes. The test is inconclusive.'],
      ['minimum', 'Both have minima.', 'x² + y³ takes negative values along the negative y-axis.'],
      ['saddle', 'Both are saddles.', 'x⁴ + y⁴ ≥ 0 has a minimum.']]),
    choose('iii11-critical', 'Where the test applies', 'At a point with ∇f ≠ 0 and det H > 0, is it a local minimum?', [
      ['no', 'No: the point is not critical, so f changes to first order and the test does not apply.', 'With ∇f ≠ 0, moving against the gradient decreases f immediately.'],
      ['yes', 'Yes, because det H > 0.', 'The test needs ∇f = 0 first.'],
      ['maximum', 'It is a maximum.', 'A non-critical point is neither.']]),
  ],
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
