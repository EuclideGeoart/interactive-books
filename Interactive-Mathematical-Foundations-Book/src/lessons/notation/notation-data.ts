/**
 * The notation table of I.9: one typed data module, rendered at build time (the table island renders on the server) and filtered in the
 * browser. Every entry names where the symbol is developed LATER in the book by text; no entry links to a chapter that is not published.
 *
 * Conventions that every row follows (master plan 3): vectors are columns; a data matrix has n examples as rows and d features as columns;
 * mathematical indices start at 1 and NumPy indices at 0; `log` is the natural logarithm.
 *
 * `python` is the NumPy / Python equivalent when there is one. When `runs` is true the snippet appears verbatim in a file under
 * `code/python/notation_*.py`, which the oracle test executes; the unit test checks that the text is really there.
 */
export type CategoryId = 'objects' | 'indexing' | 'products' | 'sums' | 'optimisation' | 'probability' | 'calculus' | 'conventions';

export interface Category {
  readonly id: CategoryId;
  readonly title: string;
}

export const CATEGORIES: readonly Category[] = Object.freeze([
  { id: 'objects', title: 'Objects and shapes' },
  { id: 'indexing', title: 'Indices and slices' },
  { id: 'products', title: 'Products, transpose and norms' },
  { id: 'sums', title: 'Sums and averages' },
  { id: 'optimisation', title: 'Parameters and optimisation' },
  { id: 'probability', title: 'Probability' },
  { id: 'calculus', title: 'Functions and gradients' },
  { id: 'conventions', title: 'Conventions and signs' },
]);

export interface NotationEntry {
  readonly id: string;
  readonly category: CategoryId;
  /** The symbol as TeX (rendered by KaTeX, never shown as source). */
  readonly tex: string;
  /** How to say it aloud. */
  readonly reads: string;
  readonly meaning: string;
  /** The shape or type of the thing the symbol names. */
  readonly shape: string;
  /** Where the idea is developed, as text: part and chapter title. */
  readonly where: string;
  readonly python: string | null;
  /** True when `python` is executed by a file under `code/python/notation_*.py`. */
  readonly runs: boolean;
}

const e = (
  id: string, category: CategoryId, tex: string, reads: string, meaning: string, shape: string, where: string, python: string | null = null, runs = python !== null,
): NotationEntry => Object.freeze({ id, category, tex, reads, meaning, shape, where, python, runs });

export const NOTATION: readonly NotationEntry[] = Object.freeze([
  // ------------------------------------------------------------------ objects and shapes
  e('scalar', 'objects', 'x\\in\\mathbb{R}', 'x in R', 'A single real number, written in italics.', 'a number: () in NumPy', 'Part I · Scalars, quantities, units, powers and roots'),
  e('vector', 'objects', '\\mathbf{x}\\in\\mathbb{R}^{d}', 'bold x in R to the d', 'A column of d real numbers (d components). In this book a vector is always a column.', 'd × 1; (d,) in NumPy', 'Part II · Linear Algebra', 'x = np.array([2.0, -1.0, 0.5])'),
  e('matrix', 'objects', 'X\\in\\mathbb{R}^{n\\times d}', 'capital X in R n by d', 'A data matrix: n examples as rows, d features as columns.', 'n × d; (n, d) in NumPy', 'Part II · Linear Algebra', 'X = np.arange(12).reshape(4, 3)'),
  e('tensor', 'objects', '\\mathcal{X}\\in\\mathbb{R}^{B\\times T\\times d}', 'calligraphic X in R B by T by d', 'A batch of B sequences, each with T positions and d features per position.', 'B × T × d; (B, T, d)', 'Part VIII · Vectorized computation', 'X3 = np.arange(24).reshape(2, 3, 4)'),
  e('n-examples', 'objects', 'n', 'n', 'The number of examples: the number of rows of X.', 'a whole number', 'Part V · Data summaries: mean, median, mode', 'n = X.shape[0]'),
  e('d-features', 'objects', 'd', 'd', 'The number of features: the number of columns of X, or the length of a feature vector.', 'a whole number', 'Part II · Linear Algebra', 'd = X.shape[1]'),
  e('batch-sequence', 'objects', 'B,\\;T', 'B and T', 'The batch size and the sequence length of a tensor.', 'two whole numbers', 'Part VII · From token logits to language-model loss', 'B, T, d3 = X3.shape'),
  e('example', 'objects', '\\mathbf{x}^{(i)}', 'x, example i', 'The i-th example, a row of X written as a column vector. The index is a superscript in parentheses, so it cannot be mistaken for a power.', 'd × 1', 'Part V · Data summaries: mean, median, mode', 'row = X[i - 1, :]'),

  // ------------------------------------------------------------------ indices and slices
  e('entry', 'indexing', 'X_{ij}', 'X sub i j', 'The entry in row i and column j. The mathematical indices start at 1.', 'a number', 'Part II · Matrices as linear transformations', 'X[i - 1, j - 1]'),
  e('feature', 'indexing', 'x^{(i)}_{j}', 'x, example i, feature j', 'Feature j of example i: the same number as X_{ij}.', 'a number', 'Part V · Regression fundamentals', 'x_i[j - 1]', false),
  e('row-slice', 'indexing', 'X_{i,:}', 'X sub i, colon', 'The whole row i: example i with all its d features.', 'd entries; (d,)', 'Part II · Matrix × vector', 'X[i - 1, :]'),
  e('column-slice', 'indexing', 'X_{:,j}', 'X sub colon, j', 'The whole column j: feature j across all n examples.', 'n entries; (n,)', 'Part II · Matrix × vector', 'X[:, j - 1]'),
  e('index-range', 'indexing', 'i=1,\\dots,n', 'i from 1 to n', 'The index takes the values 1, 2, …, n, both ends included. In Python the same loop is range(1, n + 1).', 'a list of n values', 'Part I · Indexed quantities and summation', 'for i in range(1, n + 1):'),

  // ------------------------------------------------------------------ products, transpose and norms
  e('transpose', 'products', 'X^{\\top}', 'X transpose', 'Swaps rows and columns: an n × d matrix becomes d × n.', 'd × n', 'Part II · Transpose and orthogonality', 'X.T'),
  e('matvec', 'products', 'X\\mathbf{w}', 'X times w', 'Matrix times vector: one number per example. The inner dimensions must agree (d columns, d entries).', 'n entries; (n,)', 'Part II · Matrix × vector', 'X @ w'),
  e('matmul', 'products', 'XW', 'X times W', 'Matrix times matrix: (n × d)(d × k) gives n × k.', 'n × k', 'Part II · Matrix × matrix as composition', 'X @ W'),
  e('gram', 'products', 'X^{\\top}X', 'X transpose X', 'The d × d matrix of feature-by-feature inner products: (d × n)(n × d) gives d × d.', 'd × d', 'Part V · Covariance matrices and multivariate spread', 'X.T @ X'),
  e('dot', 'products', '\\mathbf{a}^{\\top}\\mathbf{b}', 'a transpose b', 'The dot product: the sum of a_i b_i, one number.', 'a number', 'Part II · Dot product, angle, and orthogonality', 'a @ b'),
  e('hadamard', 'products', '\\mathbf{a}\\odot\\mathbf{b}', 'a circle-dot b', 'The elementwise product: multiply entry by entry. The result has the shape of a and b.', 'same as a and b', 'Part VIII · Vectorized computation', 'a * b'),
  e('l2', 'products', '\\lVert\\mathbf{x}\\rVert_2', 'the two-norm of x', 'The Euclidean length: the square root of the sum of the squares of the entries.', 'a number ≥ 0', 'Part II · Norms, magnitude, and normalization', 'np.linalg.norm(x)'),
  e('l1', 'products', '\\lVert\\mathbf{x}\\rVert_1', 'the one-norm of x', 'The sum of the absolute values of the entries.', 'a number ≥ 0', 'Part II · Norms, magnitude, and normalization', 'np.linalg.norm(x, ord=1)'),
  e('linf', 'products', '\\lVert\\mathbf{x}\\rVert_\\infty', 'the infinity-norm of x', 'The largest absolute value among the entries.', 'a number ≥ 0', 'Part II · Norms, magnitude, and normalization', 'np.linalg.norm(x, ord=np.inf)'),
  e('indicator', 'products', '\\mathbb{1}[x_j>0]', 'indicator that x j is positive', 'The indicator: 1 when the statement in brackets is true, 0 when it is false.', '0 or 1', 'Part IV · Events and probability mass', '(x > 0).astype(int)'),

  // ------------------------------------------------------------------ sums and averages
  e('sum', 'sums', '\\sum_{i=1}^{n}a_i', 'the sum of a i for i from 1 to n', 'The accumulator of a loop: add the terms one by one. Both bounds are included.', 'a number', 'Part I · Indexed quantities and summation', 'np.sum(a)'),
  e('sum-axis', 'sums', '\\sum_{i=1}^{n}X_{ij}', 'the sum of X i j over i', 'The sum down column j: one number per feature. In NumPy this is a sum over axis 0, the row axis.', 'd entries', 'Part VIII · Vectorized computation', 'a.sum(axis=0)'),
  e('product', 'sums', '\\prod_{i=1}^{n}a_i', 'the product of a i for i from 1 to n', 'Multiply the factors one by one. An empty product is 1.', 'a number', 'Part VII · Logarithms and log probabilities in computation', 'np.prod(a)'),
  e('mean', 'sums', '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i', 'x bar equals one over n times the sum', 'The mean: the sum divided by the number of terms, n, which is the last index only when the indices start at 1.', 'a number', 'Part V · Data summaries: mean, median, mode', 'np.mean(a)'),

  // ------------------------------------------------------------------ parameters and optimisation
  e('theta', 'optimisation', '\\theta', 'theta', 'The parameters of a model, collected in one vector.', 'p × 1; (p,)', 'Part VI · Objective functions and optimization landscapes'),
  e('loss', 'optimisation', 'L(\\theta)', 'L of theta', 'The loss: one number that says how badly the parameters θ fit the data.', 'a number', 'Part VI · Objective functions and optimization landscapes'),
  e('argmin', 'optimisation', '\\argmin_{\\theta}L(\\theta)', 'arg min over theta of L of theta', 'The parameter value (a point, or a set of points when there is a tie) at which the loss is smallest. It is a location, not a loss value.', 'same as θ', 'Part VI · Local vs global optima and stationary points', 'thetas[np.argmin(L)]'),
  e('min', 'optimisation', '\\min_{\\theta}L(\\theta)', 'min over theta of L of theta', 'The smallest value the loss takes. It is a loss value, not a location.', 'a number', 'Part VI · Local vs global optima and stationary points', 'np.min(L)'),
  e('argmax', 'optimisation', '\\argmax_{k}p_k', 'arg max over k of p k', 'The position (class, outcome) with the largest entry, as a 0-based position in NumPy.', 'a whole number', 'Part VII · Logits and softmax', 'np.argmax(p)'),
  e('hat', 'optimisation', '\\hat{\\theta}', 'theta hat', 'An estimate of θ computed from the data. A hat marks an estimate; it is not the true value.', 'same as θ', 'Part V · Estimators and estimation'),
  e('star', 'optimisation', '\\theta^{*}', 'theta star', 'The optimal parameter: a minimiser of the loss. A star marks an optimum.', 'same as θ', 'Part VI · Objective functions and optimization landscapes'),

  // ------------------------------------------------------------------ probability
  e('probability', 'probability', 'P(A)', 'P of A', 'The probability of the event A: a number from 0 to 1.', 'a number in [0, 1]', 'Part IV · Events and probability mass', 'p_A = np.sum(p[mask])'),
  e('conditional', 'probability', 'P(A\\mid B)', 'P of A given B', 'The probability of A when B is known to have happened: P(A and B) divided by P(B), defined only when P(B) > 0.', 'a number in [0, 1]', 'Part IV · Conditional probability as restricted sample space', 'p_AB / p_B'),
  e('expectation', 'probability', '\\mathbb{E}[X]=\\sum_{i}p_i x_i', 'the expectation of X', 'The probability-weighted average of the values. It need not be a value that X can take.', 'a number', 'Part IV · Expectation', 'np.average(values, weights=p)'),
  e('distributed', 'probability', 'X\\sim p', 'X is distributed as p', 'The random variable X follows the distribution p.', 'a distribution', 'Part IV · Random variables'),

  // ------------------------------------------------------------------ functions and gradients
  e('function', 'calculus', 'f:\\mathbb{R}^{d}\\to\\mathbb{R}', 'f from R d to R', 'A function that takes d numbers and returns one number: a loss is such a function of the parameters.', 'in: d entries, out: a number', 'Part I · Functions as input → transformation → output', 'def f(theta):'),
  e('partial', 'calculus', '\\frac{\\partial f}{\\partial\\theta_j}', 'the partial derivative of f with respect to theta j', 'How fast f changes when only θ_j changes. A finite difference approximates it; it is not equal to it.', 'a number', 'Part III · Multivariable functions and partial derivatives', '(f(theta + h * e_j) - f(theta)) / h'),
  e('gradient', 'calculus', '\\nabla_{\\theta}L', 'the gradient of L with respect to theta', 'The vector of all the partial derivatives of L. It has the same shape as θ: one entry per parameter.', 'same as θ', 'Part III · Gradient and directional derivatives', 'grad = np.array([2 * t1, 6 * t2])'),

  // ------------------------------------------------------------------ conventions and signs
  e('log', 'conventions', '\\log x', 'log of x', 'The natural logarithm, also written ln. Bits need log₂, always written with the base.', 'a number', 'Part VII · Logarithms and log probabilities in computation', 'np.log(math.e)'),
  e('log2', 'conventions', '\\log_2 x', 'log base two of x', 'The logarithm in bits.', 'a number', 'Part VII · Self-information', 'np.log2(8.0)'),
  e('abs', 'conventions', '\\lvert x\\rvert', 'absolute value of x', 'The distance of the number x from 0.', 'a number ≥ 0', 'Part I · Scalars, quantities, units, powers and roots', 'abs(-2.5)'),
  e('member', 'conventions', 'x\\in A', 'x is in A', 'x is an element of the set A.', 'true or false', 'Part I · Sets, intervals, and relations', '2 in A'),
  e('approx', 'conventions', '\\approx', 'approximately equal', 'A rounded or computed value, such as a floating-point result. An equals sign promises an exact value.', 'a statement', 'Part VIII · Floating-point representation'),
  e('defined', 'conventions', 'a:=b', 'a is defined to be b', 'A definition, not a claim to be checked.', 'a definition', 'Part I · Algebraic expressions, equations and inequalities'),
]);

export const entriesOf = (category: CategoryId): readonly NotationEntry[] => NOTATION.filter(n => n.category === category);
