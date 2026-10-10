/**
 * The curriculum as DATA (master plan §4). This module is the single source for Part/chapter structure,
 * numbering and titles; navigation, the book map, the landing page and the part emblems all read it.
 *
 * Titles, purposes and exit conditions are transcribed from the master plan and are verified against it by
 * `tests/unit/curriculum.test.ts` (a drift test that re-parses the plan), so editing one without the other
 * fails the build. Taglines are Book II copy and are not part of the plan.
 *
 * To publish a chapter: add its MDX under `src/content/chapters/`, then replace `planned(...)` by
 * `available(..., slug)`. Nothing else needs to change.
 */

export type ChapterStatus = 'planned' | 'available';
export type ChapterRole = 'reference' | 'flagship';

export interface ChapterEntry {
  /** Chapter number within its Part (1-based, as in the plan: "I.3" is n = 3 of Part I). */
  readonly n: number;
  readonly title: string;
  readonly role?: ChapterRole;
  readonly status: ChapterStatus;
  /** URL slug under /chapters/. Required if and only if status is "available". */
  readonly slug?: string;
}

export interface Part {
  /** 1-based position. */
  readonly index: number;
  /** Roman numeral as printed in the book: "I" … "VIII". */
  readonly numeral: string;
  readonly slug: string;
  readonly title: string;
  readonly tagline: string;
  /** Verbatim from the plan: "**Purpose:**". */
  readonly purpose: string;
  /** Verbatim from the plan: "**Part X exit condition:**". */
  readonly exitCondition: string;
  readonly chapters: readonly ChapterEntry[];
}

const planned = (n: number, title: string, role?: ChapterRole): ChapterEntry => ({ n, title, role, status: 'planned' });

export const parts: readonly Part[] = [
  {
    index: 1,
    numeral: "I",
    slug: "mathematical-language",
    title: "Mathematical Language",
    tagline: "The notation and mental objects everything else uses.",
    purpose: "establish the notation and mental objects used by all later Parts without turning the opening of the book into a formal mathematics survey.",
    exitCondition: "a learner can read the symbols used in the rest of Book II without needing an ML background.",
    chapters: [
      planned(1, "Scalars, quantities, and units"),
      planned(2, "Coordinates and points"),
      planned(3, "Vectors: components, magnitude, and direction", "reference"),
      planned(4, "Functions as input → transformation → output"),
      planned(5, "Sets, intervals, and relations"),
      planned(6, "Indexed quantities and summation"),
      planned(7, "The notation map for ML"),
    ],
  },
  {
    index: 2,
    numeral: "II",
    slug: "linear-algebra",
    title: "Linear Algebra",
    tagline: "Matrices as transformations: the strongest foundation in the book.",
    purpose: "build the strongest mathematical foundation in the book. Matrices are experienced primarily as transformations and systems, not as rectangular storage containers.",
    exitCondition: "the learner can reason about vector spaces, transformations, systems, projections, eigen-directions, and SVD well enough to understand the linear layers of later ML models.",
    chapters: [
      planned(1, "Vector addition and subtraction"),
      planned(2, "Scalar multiplication and vector scaling"),
      planned(3, "Norms, magnitude, and normalization"),
      planned(4, "Dot product, angle, and orthogonality"),
      planned(5, "Projection and distance to a direction"),
      planned(6, "Linear combinations and span"),
      planned(7, "Linear independence, basis, and coordinates"),
      planned(8, "Matrices as linear transformations"),
      planned(9, "Matrix × vector"),
      planned(10, "Matrix × matrix as composition"),
      planned(11, "Transpose and orthogonality"),
      planned(12, "Determinant: orientation and area/volume scaling"),
      planned(13, "Linear systems as intersecting constraints"),
      planned(14, "Gaussian elimination and row operations"),
      planned(15, "Rank and invertibility"),
      planned(16, "Inverse matrices"),
      planned(17, "Eigenvalues and eigenvectors"),
      planned(18, "Orthogonal bases and least-squares geometry"),
      planned(19, "Singular Value Decomposition"),
    ],
  },
  {
    index: 3,
    numeral: "III",
    slug: "calculus",
    title: "Calculus",
    tagline: "Change, local approximation, and sensitivity made visible.",
    purpose: "make change, local approximation, and multivariable sensitivity visible before presenting optimization.",
    exitCondition: "the learner understands local sensitivity, gradients/Jacobians/Hessians, and numerical approximations well enough for optimization and backpropagation later.",
    chapters: [
      planned(1, "Limits through approach"),
      planned(2, "Continuity and local behavior"),
      planned(3, "Derivative as secant → tangent"),
      planned(4, "Derivative as rate of change and local linear model"),
      planned(5, "Derivative rules"),
      planned(6, "Chain rule"),
      planned(7, "Multivariable functions and partial derivatives"),
      planned(8, "Gradient and directional derivatives"),
      planned(9, "Jacobian"),
      planned(10, "Hessian and curvature"),
      planned(11, "Integrals as accumulation"),
      planned(12, "Fundamental derivative/integral connection"),
      planned(13, "Numerical differentiation"),
      planned(14, "Numerical integration"),
    ],
  },
  {
    index: 4,
    numeral: "IV",
    slug: "probability",
    title: "Probability",
    tagline: "Uncertainty through sample spaces, evidence, and repetition.",
    purpose: "teach uncertainty through sample spaces, changing information, distributions, and repeated experiments.",
    exitCondition: "the learner can interpret distributions, conditioning, Bayes updates, expectation/variance, joint behavior, and sampling limits.",
    chapters: [
      planned(1, "Random experiments, outcomes, and sample spaces"),
      planned(2, "Events and probability mass"),
      planned(3, "Counting and finite probability where needed"),
      planned(4, "Conditional probability as restricted sample space"),
      planned(5, "Independence"),
      planned(6, "Bayes' theorem as probability-mass update"),
      planned(7, "Random variables"),
      planned(8, "PMF, PDF, and CDF"),
      planned(9, "Bernoulli and Binomial distributions"),
      planned(10, "Uniform and Gaussian distributions"),
      planned(11, "Expectation"),
      planned(12, "Variance and standard deviation"),
      planned(13, "Joint, marginal, and conditional distributions"),
      planned(14, "Covariance and correlation"),
      planned(15, "Law of Large Numbers"),
      planned(16, "Central Limit Theorem"),
    ],
  },
  {
    index: 5,
    numeral: "V",
    slug: "statistics",
    title: "Statistics",
    tagline: "From observed data to estimates, intervals, and likelihood.",
    purpose: "convert probability into reasoning from observed data and provide the statistical bridge to ML.",
    exitCondition: "the learner understands estimation, uncertainty, regression, likelihood, MLE, MAP, and multivariate variability.",
    chapters: [
      planned(1, "Data summaries: mean, median, mode"),
      planned(2, "Spread: variance, standard deviation, robust interpretation"),
      planned(3, "Population, sample, and sampling variability"),
      planned(4, "Estimators and estimation"),
      planned(5, "Confidence intervals through repeated sampling"),
      planned(6, "Covariance matrices and multivariate spread"),
      planned(7, "Regression fundamentals"),
      planned(8, "Likelihood"),
      planned(9, "Maximum Likelihood Estimation"),
      planned(10, "Maximum A Posteriori estimation"),
    ],
  },
  {
    index: 6,
    numeral: "VI",
    slug: "optimization",
    title: "Optimization",
    tagline: "Learning as repeated parameter updates governed by an objective.",
    purpose: "make learning algorithms mechanically understandable as repeated parameter updates governed by an objective.",
    exitCondition: "the learner can inspect an optimizer step and explain exactly why the parameters moved.",
    chapters: [
      planned(1, "Objective functions and optimization landscapes"),
      planned(2, "Local vs global optima and stationary points"),
      planned(3, "Convexity"),
      planned(4, "Gradient descent", "flagship"),
      planned(5, "Learning rate and convergence behavior"),
      planned(6, "Momentum"),
      planned(7, "Stochastic and mini-batch gradient descent"),
      planned(8, "Adam intuition"),
      planned(9, "Constraints and projected/penalized intuition"),
      planned(10, "Numerical stopping and optimization diagnostics"),
    ],
  },
  {
    index: 7,
    numeral: "VII",
    slug: "information-theory",
    title: "Information Theory",
    tagline: "Logarithms, entropy, and the loss behind token prediction.",
    purpose: "prepare the learner for classification loss, probabilistic models, and language-model training.",
    exitCondition: "cross entropy and token prediction loss are no longer mysterious formulas.",
    chapters: [
      planned(1, "Logarithms and log probabilities in computation"),
      planned(2, "Self-information"),
      planned(3, "Entropy"),
      planned(4, "Cross entropy and negative log-likelihood"),
      planned(5, "KL divergence"),
      planned(6, "Logits and softmax"),
      planned(7, "Numerical stability: log-sum-exp and stable softmax"),
      planned(8, "From token logits to language-model loss"),
    ],
  },
  {
    index: 8,
    numeral: "VIII",
    slug: "numerical-computing",
    title: "Numerical Computing",
    tagline: "Why equivalent expressions behave differently on real machines.",
    purpose: "teach why mathematically equivalent expressions can behave differently on real computers.",
    exitCondition: "the learner can distinguish mathematical correctness from numerical reliability.",
    chapters: [
      planned(1, "Floating-point representation"),
      planned(2, "Rounding and representation error"),
      planned(3, "Error propagation and conditioning"),
      planned(4, "Catastrophic cancellation"),
      planned(5, "Overflow and underflow"),
      planned(6, "Stable algorithms"),
      planned(7, "Numerical linear algebra realities"),
      planned(8, "Sparse matrices and sparse structure"),
      planned(9, "Vectorized computation"),
      planned(10, "Reproducibility, random seeds, and nondeterminism"),
    ],
  },
];
