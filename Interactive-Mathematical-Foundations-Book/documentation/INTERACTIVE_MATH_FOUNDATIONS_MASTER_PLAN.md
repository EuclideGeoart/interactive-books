# INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md

**Project:** Book II — Interactive Mathematical Foundations for Computing & Machine Learning  
**Document status:** Curriculum amendment v1.1 — 97 chapters across eight Parts; REF-1 remains I.3

**Authority:** Curriculum, interaction architecture, mathematical conventions, validation policy, and implementation sequencing  
**Implementation status:** M0/M2 platform implemented; WIN-0 Windows portability delivered; REF-1 awaits the final regression-floor review; mass chapter production remains out of scope

**Long-term path:** Mathematical Foundations → Machine Learning → Neural Networks → Transformers → LLMs

---

## 0. Executive Decision

Book II will be a **visual-first, manipulation-driven, mathematically rigorous learning application**, not a conventional online textbook with occasional animations.

The governing learning sequence is:

> **See it → manipulate it → understand the mechanism → derive the mathematics → implement/use it.**

Every important interactive must expose the **actual mathematical state** being taught. A vector arrow, derivative secant, matrix-transformed grid, probability update, or gradient step must be generated from the same quantities shown in the formula/inspector rather than being a decorative approximation.

The project will reuse the proven generic learning-platform concepts from Book I wherever they are genuinely generic, while keeping mathematical semantics owned by each mathematical domain or chapter family. We will **not** begin by building a universal mathematics engine.

The first implementation milestone is one exceptional reference chapter:

> **Part I, Chapter 3 — Vectors: components, magnitude, and direction**

That chapter must prove the mathematics-learning architecture before broad chapter production begins.

---

# 1. Product Mission

The book exists to make the mathematics required for:

- engineering;
- scientific computing;
- machine learning;
- neural networks;
- transformers;
- large language models;

feel **mechanical and inspectable rather than mystical**.

The book must teach enough mathematics that a later learner can encounter equations such as

\[
\mathbf{y}=A\mathbf{x}+\mathbf{b},
\]

\[
\nabla_\theta L(\theta),
\]

\[
p(y\mid x),
\]

\[
-\sum_i y_i\log p_i,
\]

or

\[
\mathrm{softmax}(\mathbf{z})
\]

and understand both the symbols and the mechanism they describe.

This is an engineering-oriented mathematics foundation. It is neither:

1. a pure-mathematics survey;
2. a formula memorization course;
3. a collection of disconnected visual demos;
4. an ML course that skips the underlying mathematics.

---

# 2. Non-Negotiable Design Principles

## 2.1 Visual intuition before abstraction

Whenever a concept has a useful geometric, mechanical, graphical, or empirical interpretation, the learner encounters that interpretation before the most abstract definition.

Formalism still appears, but only after the learner has a mental object to attach it to.

## 2.2 Interactions reveal mechanisms

An interaction is educational only when the learner can answer:

> **What mathematical quantity changed, and what consequence followed from that change?**

Dragging, clicking, animating, or sampling without exposing the corresponding quantities is insufficient.

## 2.3 Formula ↔ visualization identity

The visual state and the displayed mathematics must be two views of the **same model state**.

Examples:

- if the displayed formula says \(\mathbf{v}=(3,2)\), the arrow endpoint must be at \((3,2)\);
- if \(A\mathbf{v}\) is shown numerically, the transformed vector must use those same computed values;
- if gradient descent displays
  \[
  x_{k+1}=x_k-\eta\nabla f(x_k),
  \]
  the on-screen update arrow must equal \(-\eta\nabla f(x_k)\);
- if Bayes' rule displays a posterior, the plotted posterior mass must normalize to the same value.

Decorative geometry that merely “looks about right” is a correctness defect.

## 2.4 Deterministic semantic traces

Step-based lessons use semantic immutable states or events.

Typical traces include:

- vector addition;
- matrix composition;
- Gaussian elimination;
- secant-to-tangent progression;
- Bayes updates;
- gradient-descent iterations;
- SVD reconstruction;
- numerical-error demonstrations.

The trace player must support:

- reset;
- previous;
- next;
- play;
- pause;
- speed;
- direct selection of a prior immutable state.

Reverse navigation should select an earlier canonical state, not attempt to numerically “undo” a forward mutation.

## 2.5 Small shared platform, domain-owned mathematics

Shared infrastructure may own:

- book/chapter shell;
- navigation;
- search/progress;
- trace playback;
- inspector layout;
- formula rendering shell;
- generic parameter controls;
- generic SVG/plot primitives;
- accessibility infrastructure;
- responsive layout;
- Fit / Actual Size;
- screenshot/test harness integration.

Shared infrastructure must **not** become the authority for all mathematical semantics.

Examples of domain-owned semantics:

- vector normalization;
- matrix transformations;
- Gaussian elimination;
- derivative estimators;
- Bayes updates;
- distribution calculations;
- gradient optimizers;
- entropy/KL calculations;
- floating-point demonstrations.

Abstraction is earned by repeated use across real chapters.

## 2.6 Correctness before chapter count

A chapter count is not a milestone.

A chapter is acceptable only when:

- its mathematics is correct;
- its visualization agrees with the mathematics;
- its code agrees with both;
- its edge cases are handled or explicitly scoped;
- its tests use an independent oracle where feasible;
- it remains usable on supported screen sizes and input methods.

---

# 3. Frozen Mathematical Conventions

These conventions apply across Book II unless a chapter explicitly teaches an alternative convention.

## 3.1 Coordinate systems

For 2D Cartesian diagrams:

- \(+x\) points right;
- \(+y\) points up in mathematical coordinates;
- mathematical coordinates are not silently replaced by SVG screen coordinates;
- rendering adapters are responsible for converting mathematical \(y\)-up space to screen \(y\)-down space.

For 3D when introduced:

- use a right-handed coordinate system;
- every 3D visualization must visibly state camera/projection conventions when they affect interpretation.

## 3.2 Vectors

Mathematical vectors are **column vectors by default**:

\[
\mathbf{v}=
\begin{bmatrix}
v_1\\
v_2
\end{bmatrix}.
\]

Inline tuples such as \((3,2)\) are permitted as a compact component notation, but matrix operations use the column-vector convention.

## 3.3 Matrix action and composition

Matrices act on column vectors from the left:

\[
\mathbf{v}'=A\mathbf{v}.
\]

If transformation \(A\) happens first and transformation \(B\) happens second, the composition is:

\[
B(A\mathbf{v})=(BA)\mathbf{v}.
\]

This order must remain consistent in all matrix, transformation, neural-network, and Jacobian material.

## 3.4 Angles

- canonical computational unit: **radians**;
- degree display may be offered as a learner-facing secondary representation;
- trigonometric formulas use radians unless explicitly teaching conversion.

## 3.5 Logarithms

Unless a topic explicitly specifies another base:

- \(\log\) means the natural logarithm;
- information measured in bits uses \(\log_2\) explicitly;
- information measured in nats uses natural logarithms.
- introduce exponentials and logarithms concretely in I.6; VII.1 applies them to tiny probabilities, log-likelihoods and stable computation.

## 3.6 Probability

Probabilities must satisfy the relevant normalization constraints.

For finite discrete distributions:

\[
p_i\ge 0,
\qquad
\sum_i p_i=1.
\]

Interactive controls must not silently create invalid distributions. If logits are edited, normalization occurs through the taught transformation, e.g. softmax, rather than by hidden arbitrary repair.

## 3.7 Indexing

Mathematical exposition generally uses conventional mathematical indexing:

\[
i=1,\ldots,n.
\]

Executable TypeScript/Python examples may use language-native zero-based indexing. Whenever indexing is pedagogically relevant, the difference must be stated rather than hidden.

## 3.8 Exact and approximate values

The UI distinguishes exact mathematical form from numerical approximation where an exact representation is meaningful.

Example:

```text
exact        √13
approx       3.605551275...
```

or

```text
exact        1/3
approx       0.333333333...
```

A rounded display is not presented as an exact equality.

## 3.9 Equality symbols

Use deliberately:

- \(=\) for exact equality;
- \(\approx\) for approximation;
- chapter-specific tolerance language for numerical comparisons.

Do not use ordinary equality merely because two floating-point numbers display the same rounded text.

---

# 4. Authoritative Curriculum

**Curriculum v1.1 — 97 chapters in eight Parts.** This deliberate amendment adds **I.4 Algebraic expressions, equations and inequalities**, **I.6 Essential function families**, and **III.10 Computational graphs and automatic differentiation**. Remaining chapter numbers in Parts I and III shift accordingly; Parts II and IV–VIII keep their chapter counts, with targeted topic clarifications. The eight-Part progression is unchanged.

| Part | Chapters | Range |
| --- | ---: | --- |
| I · Mathematical Language | 9 | I.1–I.9 |
| II · Linear Algebra | 19 | II.1–II.19 |
| III · Calculus | 15 | III.1–III.15 |
| IV · Probability | 16 | IV.1–IV.16 |
| V · Statistics | 10 | V.1–V.10 |
| VI · Optimization | 10 | VI.1–VI.10 |
| VII · Information Theory | 8 | VII.1–VII.8 |
| VIII · Numerical Computing | 10 | VIII.1–VIII.10 |
| **Total** | **97** | |

**Why the additions belong here:** introductory algebra and elementary exponential/logarithmic/trigonometric functions are prerequisites for later calculus, probability, likelihood and softmax; automatic differentiation connects the chain rule and Jacobians to the parameter updates in later neural networks. These are prerequisites, not an excuse to expand Book II into an encyclopedic pure-mathematics textbook.

**Implementation order is not reading order.** REF-1 / M3 still implements **I.3 Vectors** first to prove the interaction architecture. The learner's eventual sequence is I.1 → I.2 → I.3 → … → I.9. Chapter I.3 must explain its basic squares, roots, right-triangle geometry and angular vocabulary locally, without assuming the later I.4/I.6 lessons have already been read.

Other deliberate prerequisites and boundaries:

- I.6 introduces logarithms and trigonometric functions; VII.1 deepens them for log probabilities rather than introducing logarithms for the first time.
- II.8–II.10 distinguish linear maps from affine maps and make shapes/composition order explicit.
- III.10 teaches computational graphs and forward/reverse-mode differentiation, **not** a neural-network training implementation.
- Numerical reliability is discussed where it first matters; VIII then provides the consolidated treatment.
- Do not renumber I.3 or VI.4, change frozen mathematical conventions, or start Part-wide production before REF-1 acceptance.

Chapter boundaries are authoritative and may change only through an explicit reviewed curriculum amendment. Keep this plan, the curriculum data, test expectations, and visual baselines synchronized.

---

## Part I — Mathematical Language

**Purpose:** establish the notation and mental objects used by all later Parts without turning the opening of the book into a formal mathematics survey.

### I.1 Scalars, quantities, units, powers and roots

Core ideas:

- scalar values, signs, magnitude in context and units;
- dimensionless quantities and basic arithmetic expressions;
- exponents, squares, square roots and the inverse relationship between squaring and rooting;
- exact vs approximate numbers, including simple radicals;
- interpreting a square as an area and a square root as a length.

Flagship interaction:

- change a quantity and visualize its square and square root with matching geometric and numeric readouts;
- keep the mechanism elementary enough to support the Pythagorean magnitude in I.3.

### I.2 Coordinates and points

Core ideas:

- number line;
- Cartesian plane;
- point coordinates;
- displacement between points;
- axes and quadrants;
- coordinate conventions.

Flagship interaction:

- drag a point and watch \((x,y)\), displacement, and distance update.

### I.3 Vectors: components, magnitude, and direction — **REFERENCE CHAPTER**

Core ideas:

- vector as directed displacement;
- components;
- endpoint representation;
- magnitude;
- direction and angle measured from the positive x-axis;
- zero vector;
- exact vs approximate magnitude;
- short, self-contained right-triangle and angular intuition; later I.6 generalizes trigonometric functions.

Flagship interaction:

- drag the endpoint of \(\mathbf v=(x,y)\);
- live update components, \(\|\mathbf v\|\), direction, and exact/approx forms;
- interpret length by squares and roots from I.1 and position from I.2, without requiring later algebra or trigonometry chapters.

This chapter proves the Book II interaction architecture. **Its reference milestone and I.3 identifier do not change in v1.1.**

### I.4 Algebraic expressions, equations and inequalities

Core ideas:

- expressions vs equations vs inequalities, variables, parameters and unknowns;
- evaluating and simplifying expressions, substitutions and distributivity;
- balancing operations on both sides of an equality;
- solving elementary linear equations and interpreting a solution set;
- inequalities and reversal of the sign when multiplying/dividing by a negative value;
- domain restrictions and invalid manipulations, e.g. division by zero or squaring without checking extraneous roots.

Flagship interaction:

- manipulate a balanced equality and see the same operation applied to both sides, with every algebraic transition recorded;
- change an inequality multiplier's sign to reveal the reversal rule and a counterexample.

This is a practical algebraic bridge into functions and calculus, not a complete abstract-algebra course.

### I.5 Functions as input → transformation → output

Core ideas:

- input/output and function notation;
- domain, codomain and actual image/range at an introductory engineering level;
- graph as a representation of the same input-to-output rule;
- parameters, graphical shifts and stretches;
- composition and inverse-function preview.

Flagship interaction:

- modify \(x\) and a parameter \(a\) in \(f(x;a)\); keep input, transformation, output and graph synchronized;
- distinguish changing the input from changing the function's parameter.

### I.6 Essential function families

Core ideas:

- linear and affine, quadratic and other power functions;
- exponentials and logarithms as inverses; domains, monotonicity and bases;
- natural logarithms \(\ln x=\log x\) (Book II convention), with the identities that later probability and information-theory lessons need;
- basic sine and cosine as circular motion and component ratios, with radians as canonical;
- graph shapes, zero crossings, growth/decay and simple inverse or periodic behaviors;
- composition, transformations and domain restrictions without overwhelming catalogues.

Flagship interaction:

- change parameters and compare the graphs of \(x\), \(x^2\), \(e^x\), \(\log x\), \(\sin x\) and \(\cos x\);
- feed a value through \(e^x\) then \(\log\) to see how one undoes the other on its domain;
- connect a rotating unit vector to sine/cosine components, building on the visual angles introduced in I.3.

Do not re-teach an entire calculus or information theory chapter here.

### I.7 Sets, intervals, and relations

Core ideas:

- membership;
- subsets;
- unions/intersections;
- open/closed intervals;
- Cartesian products;
- relation intuition.

Flagship interaction:

- manipulate regions/items and observe set operations.

### I.8 Indexed quantities and summation

Core ideas:

- sequences;
- indices;
- \(\sum\);
- accumulator interpretation;
- nested sums;
- relation to loops.

Flagship interaction:

- step through a sum term-by-term while the accumulator and highlighted term stay synchronized.

### I.9 The notation map for ML

Core ideas:

- vectors/matrices/tensors as shapes;
- norms;
- transpose;
- expectation notation;
- gradients;
- \(\arg\min\);
- probability notation;
- parameter notation;
- batch/example/feature indices.

This chapter is primarily a bridge and reference map rather than a giant interactive.

**Part I exit condition:** a learner can read and manipulate elementary expressions, equations and core functions, and interpret the symbols used in the rest of Book II without needing an ML background.

---

## Part II — Linear Algebra

**Purpose:** build the strongest mathematical foundation in the book. Matrices are experienced primarily as transformations and systems, not as rectangular storage containers.

### II.1 Vector addition and subtraction

- head-to-tail geometry;
- component-wise arithmetic;
- displacement interpretation.

### II.2 Scalar multiplication and vector scaling

- sign;
- magnitude scaling;
- direction reversal.

### II.3 Norms, magnitude, and normalization

- Euclidean norm first;
- unit vectors;
- zero-vector exception;
- preview of other norms where useful.

### II.4 Dot product, angle, and orthogonality

- geometric and component views;
- cosine connection;
- perpendicularity;
- numerical clipping policy near \(\pm1\) for inverse cosine.

### II.5 Projection and distance to a direction

- projection vector;
- scalar component;
- residual;
- orthogonal decomposition.

### II.6 Linear combinations and span

- weighted combinations;
- reachable region;
- 1D/2D span intuition.

### II.7 Linear independence, basis, and coordinates

- redundant directions;
- basis coordinates;
- basis change intuition.

### II.8 Matrices as linear transformations

- matrix rows/columns and dimension \(m\times n\) as input/output shapes;
- matrix addition and scalar multiplication as operations on compatible shapes;
- transformed grid, transformed basis vectors and transformed arbitrary vectors;
- matrix columns as images of basis directions;
- distinguish a true linear transformation \(x\mapsto Ax\) (origin stays fixed) from an affine map \(x\mapsto Ax+b\) (may include translation).

### II.9 Matrix × vector

- transformation view;
- row × column mechanics;
- shape checking for \(A\in\mathbb R^{m\times n}\), \(x\in\mathbb R^n\), \(Ax\in\mathbb R^m\);
- explicitly connect outputs to rows and basis images to columns;
- no black-box multiplication.

### II.10 Matrix × matrix as composition

- apply first transform;
- apply second transform;
- derive composition;
- expose order \(BA\) when \(A\) acts first, then \(B\);
- explain shape compatibility and why order matters;
- show affine composition \((B(Ax+b)+c)=(BA)x+(Bb+c)\) as a bridge to \(Ax+b\) in later ML, keeping matrix multiplication and translation conceptually distinct.

### II.11 Transpose and orthogonality

- transpose mechanics;
- dot-product relation;
- orthogonal matrices;
- inverse-by-transpose special case.

### II.12 Determinant: orientation and area/volume scaling

- signed area in 2D;
- singular collapse;
- orientation;
- determinant is not introduced as a memorized formula only.

### II.13 Linear systems as intersecting constraints

- lines/planes;
- unique/no/infinite solutions;
- matrix representation.

### II.14 Gaussian elimination and row operations

- semantic row-operation trace;
- pivots;
- echelon form;
- back substitution;
- exact arithmetic examples where useful.

### II.15 Rank and invertibility

- independent information;
- pivot count;
- null directions;
- invertibility conditions.

### II.16 Inverse matrices

- inverse as undoing a transformation;
- existence conditions;
- solve-via-inverse caveat;
- numerical note: do not encourage explicit inverse when solve is preferable.

### II.17 Eigenvalues and eigenvectors

- directions preserved by a transformation when real eigenvectors exist;
- stretching/sign reversal;
- repeated application/dynamical intuition;
- explicit counterexample: a real 2D rotation can have no real eigenvector; its eigenvalues may be complex (explain the boundary without a complex-analysis detour).

### II.18 Orthogonal bases and least-squares geometry

- orthogonal decomposition;
- projection onto a subspace;
- least-squares geometric meaning.

### II.19 Singular Value Decomposition

- rotate/reflect → scale → rotate/reflect;
- singular values;
- rank;
- reconstruction;
- low-rank approximation;
- pseudoinverse and least-squares intuition, with numerical caveats rather than a fragile explicit-inverse recipe;
- bridge to PCA/embeddings later.

**Part II exit condition:** the learner can reason about vector spaces, transformations, systems, projections, eigen-directions, and SVD well enough to understand the linear layers of later ML models.

---

## Part III — Calculus

**Purpose:** make change, local approximation, and multivariable sensitivity visible before presenting optimization.

### III.1 Limits through approach

- approaching values;
- one-sided intuition;
- finite limit;
- failure cases.

### III.2 Continuity and local behavior

- continuity as “no break” with precise conditions added after intuition;
- local vs global behavior.

### III.3 Derivative as secant → tangent

- draggable \(x\);
- adjustable \(h\);
- secant slope;
- \(h\to0\);
- tangent slope.

### III.4 Derivative as rate of change and local linear model

- slope;
- velocity/rate interpretation;
- \(f(x+\Delta x)\approx f(x)+f'(x)\Delta x\).

### III.5 Derivative rules

- linearity;
- product rule;
- quotient rule where needed;
- derivations tied to concrete examples.

### III.6 Chain rule

- nested functions;
- local sensitivity multiplication;
- direct bridge toward computational graphs/backpropagation.

### III.7 Multivariable functions and partial derivatives

- surface/contour;
- hold other variables fixed;
- partial derivative directions.

### III.8 Gradient and directional derivatives

- gradient vector;
- steepest increase;
- directional derivative;
- contour normal relationship.

### III.9 Jacobian

- vector-valued functions;
- local linear transformation;
- shape semantics.

### III.10 Computational graphs and automatic differentiation

Core ideas:

- a mathematical expression represented as an acyclic graph of elementary operations;
- forward evaluation from inputs to intermediate values and outputs;
- chain rule through graph edges, including shared/reused inputs;
- forward-mode derivatives and reverse-mode derivatives, with clear input/output shape and computational-cost intuition;
- accumulation of contributions when multiple paths lead to the same parameter;
- distinguishing automatic differentiation (derivatives of executed operations) from symbolic rearrangement and finite differences;
- explaining why reverse mode is useful for scalar losses with many parameters, without prematurely teaching a whole neural network.

Flagship interaction:

- let the learner edit \(x,y\) in \(z=(x+y)x\); reveal \(u=x+y\), \(z=ux\), their local derivatives, and the backward accumulation:
  \(\partial z/\partial x=2x+y\), \(\partial z/\partial y=x\);
- single-step a trace of forward values and reverse adjoints with arrows matching the exact numerical contributions;
- validate analytic derivatives against an independent finite-difference oracle at well-conditioned points while explaining its limitations near nonsmooth or numerically delicate states.

This is the mathematical bridge to backpropagation in Book IV, not an ML training implementation.

### III.11 Hessian and curvature

- second derivatives;
- local curvature;
- saddle/min/max intuition;
- connection to optimization.

### III.12 Integrals as accumulation

- area/accumulation;
- signed area;
- partition sums.

### III.13 Fundamental derivative/integral connection

- accumulation function;
- local change of accumulated quantity;
- conceptual Fundamental Theorem bridge.

### III.14 Numerical differentiation

- finite differences;
- step-size tradeoff;
- truncation vs floating-point error.

### III.15 Numerical integration

- rectangle/trapezoid methods;
- convergence with partition refinement;
- error intuition.

**Part III exit condition:** the learner understands local sensitivity, gradients/Jacobians/Hessians, computational graphs, automatic differentiation and numerical approximations well enough for optimization and later backpropagation.

---

## Part IV — Probability

**Purpose:** teach uncertainty through sample spaces, changing information, distributions, and repeated experiments.

### IV.1 Random experiments, outcomes, and sample spaces

### IV.2 Events and probability mass

### IV.3 Counting and finite probability where needed

Only the combinatorial tools required by the examples; no detached combinatorics survey.

### IV.4 Conditional probability as restricted sample space

### IV.5 Independence

### IV.6 Bayes' theorem as probability-mass update

- prior and base rates;
- likelihood and diagnostic evidence;
- normalizing evidence;
- posterior;
- normalized update and visual probability-mass conservation;
- counterexample to confusing (P(Amid B)) with (P(Bmid A)).

### IV.7 Random variables

- mapping outcomes to numbers;
- discrete/continuous distinction.

### IV.8 PMF, PDF, and CDF

- what each representation means;
- discrete probability masses vs continuous probability densities;
- why PDF height is not the probability of an exact value and why interval probability is area under a PDF;
- CDF as accumulated probability and a link to integration;
- keep continuous normalization visible and correct.

### IV.9 Bernoulli and Binomial distributions

### IV.10 Uniform and Gaussian distributions

### IV.11 Expectation

- long-run average and weighted sum/integral;
- linearity.

### IV.12 Variance and standard deviation

### IV.13 Joint, marginal, and conditional distributions

### IV.14 Covariance and correlation

- sign/direction;
- scale dependence vs standardized relation;
- correlation is not causation.

### IV.15 Law of Large Numbers

- repeated sampling;
- empirical frequency/mean convergence.

### IV.16 Central Limit Theorem

- repeated sampling of sums/means;
- standardized distributions;
- finite-sample caveats.

**Part IV exit condition:** the learner can interpret distributions, conditioning, Bayes updates, expectation/variance, joint behavior, and sampling limits.

---

## Part V — Statistics

**Purpose:** convert probability into reasoning from observed data and provide the statistical bridge to ML.

### V.1 Data summaries: mean, median, mode

### V.2 Spread: variance, standard deviation, robust interpretation

### V.3 Population, sample, and sampling variability

- sample selection and representativeness;
- sampling bias vs random sampling variation;
- repeated samples from the same population and the distribution of a statistic.

### V.4 Estimators and estimation

- estimator vs estimate;
- bias/variance intuition at a foundational level;
- show estimator variability across samples rather than treating a single sample estimate as a fixed truth.

### V.5 Confidence intervals through repeated sampling

- interval-generating procedure;
- coverage;
- explicit correction of the common “probability the fixed parameter lies in this computed interval” misconception in the frequentist setting.

### V.6 Covariance matrices and multivariate spread

- covariance ellipse;
- principal directions preview.

### V.7 Regression fundamentals

- residuals;
- least squares;
- fit vs noise;
- bridge back to projection.

### V.8 Likelihood

- probability model viewed as a function of candidate parameters after data are fixed.

### V.9 Maximum Likelihood Estimation

- move candidate parameter;
- recompute likelihood/log-likelihood;
- identify optimum.

### V.10 Maximum A Posteriori estimation

- prior × likelihood → posterior;
- MAP as posterior mode;
- distinguish MAP from MLE.

**Part V exit condition:** the learner understands estimation, uncertainty, regression, likelihood, MLE, MAP, and multivariate variability.

---

## Part VI — Optimization

**Purpose:** make learning algorithms mechanically understandable as repeated parameter updates governed by an objective.

### VI.1 Objective functions and optimization landscapes

### VI.2 Local vs global optima and stationary points

### VI.3 Convexity

- lines/chords;
- why convexity changes optimization guarantees;
- no implication that all ML losses are convex.

### VI.4 Gradient descent — **FLAGSHIP CHAPTER**

Expose each iteration:

\[
\theta_{k+1}
=
\theta_k-\eta\nabla L(\theta_k).
\]

Inspector:

- current \(\theta_k\);
- loss;
- gradient;
- learning rate;
- update vector;
- next \(\theta\).

### VI.5 Learning rate and convergence behavior

Show:

- slow convergence;
- effective convergence;
- oscillation;
- overshoot;
- divergence.

### VI.6 Momentum

- velocity state;
- accumulated direction;
- damping intuition.

### VI.7 Stochastic and mini-batch gradient descent

- noisy gradient estimates;
- batch size;
- trajectory variability.

### VI.8 Adam intuition

- first moment;
- second moment;
- bias correction at an appropriate depth;
- adaptive per-parameter update.

### VI.9 Constraints and projected/penalized intuition

- constrained feasible regions and projection of an update back into the allowed region;
- regularization penalties (e.g. (L+lambda|w|_2^2)) as an explicit change to the optimization objective;
- distinguish model regularization from optimizer stability fixes.

Foundational only; do not become a full operations-research text.

### VI.10 Numerical stopping and optimization diagnostics

- tolerance;
- gradient norm;
- loss change;
- iteration limits;
- divergence/non-finite detection;
- gradient clipping as a protective numerical intervention, with its effect on the update shown explicitly;
- clarify that clipping or a tiny gradient does not by itself prove convergence to the global optimum.

**Part VI exit condition:** the learner can inspect an optimizer step and explain exactly why the parameters moved.

---

## Part VII — Information Theory

**Purpose:** prepare the learner for classification loss, probabilistic models, and language-model training.

### VII.1 Logarithms and log probabilities in computation

- build on logarithms first introduced as a function family in I.6;
- products become sums;
- tiny probabilities, (log 0), and explicit domain restrictions;
- log-likelihood.

### VII.2 Self-information

\[
I(x)=-\log p(x).
\]

### VII.3 Entropy

- expected information/surprise;
- distribution shape and uncertainty.

### VII.4 Cross entropy and negative log-likelihood

- target distribution vs predicted distribution;
- one-hot classification case;
- language-model loss bridge.

### VII.5 KL divergence

- directional comparison;
- non-negativity;
- not a metric.

### VII.6 Logits and softmax

Expose:

- input logits;
- shifted logits if stabilization is enabled;
- exponentials;
- normalization denominator;
- probabilities.

### VII.7 Numerical stability: log-sum-exp and stable softmax

- overflow and underflow examples;
- max-shift derivation;
- stable softmax and log-softmax from logits;
- stable log-sum-exp without materializing enormous exponentials;
- connect the formulas and values to identical probability-model state.

### VII.8 From token logits to language-model loss

A bridge chapter, not yet a transformer implementation:

- one position;
- vocabulary logits;
- softmax and stable log-softmax;
- target token and negative log-likelihood calculated directly from logits;
- average loss over positions, with ignored/masked positions handled explicitly when included;
- connect this scalar loss to the gradient-based update without implementing a transformer.

**Part VII exit condition:** cross entropy and token prediction loss are no longer mysterious formulas.

---

## Part VIII — Numerical Computing

**Purpose:** teach why mathematically equivalent expressions can behave differently on real computers.

### VIII.1 Floating-point representation

- sign/exponent/significand intuition;
- finite representable set;
- spacing/ULP intuition;
- compare binary64, binary32, FP16 and bfloat16 (BF16) in precision and exponent range without pretending they are interchangeable;
- emphasize that actual hardware/runtime support is platform-dependent.

### VIII.2 Rounding and representation error

- decimal values not exactly representable in binary;
- display vs stored value.

### VIII.3 Error propagation and conditioning

- input perturbation;
- output sensitivity;
- distinguish problem conditioning from algorithm stability.

### VIII.4 Catastrophic cancellation

- subtract nearly equal large values;
- loss of significant digits;
- algebraically equivalent stable alternatives.

### VIII.5 Overflow and underflow

- exponent range;
- saturating to infinity/zero/subnormal behavior where relevant.

### VIII.6 Stable algorithms

- rescaling;
- normalization;
- compensated or rearranged calculations in selected examples;
- connect to stable softmax/log-sum-exp;
- introduce mixed-precision computation and loss-scaling intuition as examples of numerical trade-offs, not universally safe recipes.

### VIII.7 Numerical linear algebra realities

- solve vs explicit inverse;
- conditioning;
- residual vs forward error;
- tolerance awareness.

### VIII.8 Sparse matrices and sparse structure

- storage;
- zero structure;
- computation savings;
- ML/scientific examples.

### VIII.9 Vectorized computation

- tensor dimensions, axes and shape compatibility, from scalar to vector to matrix to batched arrays;
- elementwise operations, broadcasting and axis-reduction behavior;
- why vectorization matters;
- explicit errors and counterexamples for incompatible shapes;
- do not confuse vectorization with the mathematical vector concept or infer automatic performance gains for every workload.

### VIII.10 Reproducibility, random seeds, and nondeterminism

- pseudo-random seeds;
- deterministic fixtures;
- sources of numerical/platform differences;
- tolerance-aware testing.

**Part VIII exit condition:** the learner can distinguish mathematical correctness from numerical reliability.

---

# 5. Chapter Design Contract

Unless a topic genuinely requires a different structure, every chapter should contain the following conceptual layers.

## 5.1 Hero question

A concrete question that gives the chapter a reason to exist.

Examples:

- “What does a vector actually store?”
- “Why can two matrix multiplications in the opposite order produce a different result?”
- “How does a secant line become a derivative?”
- “How does new evidence change a probability?”
- “Why can a learning rate make gradient descent explode?”

## 5.2 Interactive mental model

The first substantial interaction.

It must work before the learner reads a long derivation.

## 5.3 Intuition

A concise explanation of the visible mechanism.

## 5.4 Mathematical definition

Precise notation and domain conditions.

## 5.5 Interactive mechanics

Expose the relevant state variables and derived quantities.

## 5.6 Derivation

Show how the formula follows from the mechanism.

## 5.7 Worked example

A deterministic example with inspectable intermediate steps.

## 5.8 Executable reference code

Prefer Python for canonical ML-facing examples.

## 5.9 Parameter explorer

Let the learner probe cases, including meaningful failures or edge cases.

## 5.10 Common mistakes and counterexamples

Examples should include plausible misconceptions.

## 5.11 Numerical considerations

Required whenever finite precision changes implementation behavior.

## 5.12 Engineering / ML connection

Explain where the concept reappears in practical computing or later books.

## 5.13 Exercises

Use a mixture of:

- predict-before-run;
- manipulate-and-explain;
- small hand calculations;
- code exercises;
- conceptual counterexamples.

## 5.14 Summary

Compactly restate the mechanism, formal relation, and later relevance.

---

# 6. Interaction Architecture

## 6.1 Layering

Book II should use four conceptual layers.

### Layer A — Learning shell

Generic product infrastructure:

- `LearningBookLayout`
- `LearningChapter`
- navigation;
- search;
- progress;
- responsive layout;
- accessibility shell.

### Layer B — Generic interactive infrastructure

Reusable behavior with no domain authority:

- `TracePlayer`
- `ParameterControl`
- `ConceptInspector`
- `FormulaPanel`
- viewport / Fit / Actual Size;
- generic coordinate-plane renderer;
- reusable axes/grid primitives;
- plot canvas;
- focus/keyboard/pointer helpers.

### Layer C — Domain lesson models

Pure or near-pure mathematical models:

- vector model;
- matrix model;
- calculus model;
- probability model;
- optimizer model;
- etc.

These models own the semantics.

### Layer D — Chapter composition

MDX/chapter components connect prose, model state, formulas, visual views, code, and exercises.

## 6.2 Model-state rule

Interactive visual state should be derived from one canonical lesson model.

Avoid independent mutable copies such as:

```text
formulaState
svgState
inspectorState
codeState
```

that can drift apart.

Prefer:

```text
LessonModelState
    ↓
derived quantities
    ├── visualization
    ├── formula panel
    ├── inspector
    └── trace snapshot
```

## 6.3 Pure mathematics core

Where feasible, chapter-family mathematics should be expressed as pure functions:

```ts
type Vec2 = Readonly<{ x: number; y: number }>;

function magnitude(v: Vec2): number;
function dot(a: Vec2, b: Vec2): number;
function project(a: Vec2, onto: Vec2): Vec2 | UndefinedProjection;
```

Rendering and DOM code must not become the hidden location of mathematical truth.

## 6.4 Immutable trace states

A trace frame should contain semantically meaningful values, not only drawing instructions.

Conceptually:

```ts
interface TraceFrame<TState, TEvent> {
  readonly index: number;
  readonly state: TState;
  readonly event?: TEvent;
  readonly explanation?: string;
}
```

The exact interface may evolve after repository inspection, but the semantic contract is frozen:

> Trace history represents mathematical states/events, not screenshots or imperative animation commands.

## 6.5 Parameter controls

A parameter declaration should state:

- name;
- mathematical symbol;
- unit if relevant;
- domain;
- default;
- step/continuous policy;
- formatting;
- invalid/degenerate handling.

Controls should not permit mathematically meaningless states unless the chapter is intentionally demonstrating them.

## 6.6 Inspectors

The inspector is a first-class learning surface.

An inspector row may show:

- symbol;
- semantic name;
- exact value;
- approximate value;
- unit;
- state/validity note.

Important derived quantities must remain inspectable while interacting.

## 6.7 Coordinate transforms

Mathematical coordinate transforms must be centralized enough to avoid repeated sign mistakes.

A 2D visual should clearly separate:

1. mathematical/world coordinates;
2. viewport coordinates;
3. screen/SVG coordinates.

SVG's downward-positive screen \(y\) must never leak into mathematical formulas.

---

# 7. Visualization Policy

## 7.1 SVG first for 2D explanatory geometry

Prefer SVG for:

- vectors;
- coordinate axes;
- points;
- transformed grids of modest density;
- secants/tangents;
- projection diagrams;
- finite probability diagrams;
- distributions of modest complexity.

Benefits:

- crisp scaling;
- inspectable geometry;
- accessibility hooks;
- deterministic screenshots;
- easier direct mapping from math state to rendered elements.

## 7.2 Canvas/WebGL only when it earns its complexity

Use Canvas/WebGL for:

- dense plots;
- very large point clouds;
- 3D surfaces;
- performance-sensitive animations not suitable for SVG.

Do not choose Canvas merely because it feels “more advanced.”

## 7.3 Visual truthfulness

Axes, scales, and aspect ratios must not imply false relationships.

Examples:

- do not visually present perpendicular vectors as non-perpendicular due to unequal axis scaling;
- do not visually suggest equal probabilities using unequal area encodings;
- do not hide a transformed-grid orientation flip when determinant is negative.

## 7.4 Animation policy

Animation should clarify transitions, but the canonical state exists independently of animation.

Tests should be able to inspect the start/end mathematical states without depending on animation timing.

---

# 8. Mathematical Rendering

## 8.1 KaTeX or equivalent

Use a fast static-rendering mathematics system such as KaTeX for equations and inline notation.

Requirements:

- SSR/static-friendly where possible;
- no dependency on client hydration for basic equation readability;
- accessible fallback/semantic text;
- consistent macros across the book.

## 8.2 Formula bindings

Dynamic formulas should be rendered from the same model quantities used by the visualization.

Example concept:

```ts
const model = vectorLesson(state);

formula = {
  components: model.vector,
  magnitudeExact: model.magnitudeExact,
  magnitudeApprox: model.magnitudeApprox,
};
```

Do not recalculate a “formula version” independently in a UI component if the lesson model already owns the quantity.

## 8.3 Formula precision

Dynamic numeric display must use chapter-defined formatting.

Never allow default JavaScript string conversion to become the pedagogical precision policy.

A chapter should decide:

- decimal digits/significant figures;
- scientific notation threshold;
- exact/approx pairing;
- tolerance annotations.

## 8.4 Long equations on small screens

Requirements:

- no page-breaking overflow;
- horizontally scrollable formula region where necessary;
- semantic reading order;
- no microscopic automatic shrink-to-fit that makes equations unreadable.

---

# 9. Canonical Code Strategy

## 9.1 Two roles for code

Book II distinguishes:

### Pedagogical implementation

Shows the mechanics explicitly.

Example matrix multiplication should expose loops or row × column accumulation before a library shortcut.

### Practical implementation

Shows how the same operation is normally written with NumPy or another standard library after the mechanism is understood.

Both may appear in one chapter.

## 9.2 Python + NumPy as the canonical ML-facing reference

For concepts that naturally map to ML/scientific computing, canonical executable examples should prefer:

- Python;
- NumPy;
- standard library modules where sufficient.

SciPy may be used only where it genuinely supplies an independent reference or a later advanced operation.

## 9.3 TypeScript remains the browser interaction implementation

The web application will normally compute interaction state in TypeScript.

Python and TypeScript are therefore intentionally separate implementations.

That separation is acceptable only because parity is validated.

## 9.4 Parity fixtures

Each chapter family with duplicated computation should maintain deterministic fixtures.

Example JSON concept:

```json
{
  "case": "vector_3_2",
  "input": { "x": 3, "y": 2 },
  "expected": {
    "magnitude": 3.605551275463989,
    "angleRadians": 0.5880026035475675
  }
}
```

The same fixture should be consumable by:

- TypeScript tests;
- Python reference/oracle tests;
- browser interaction tests where useful.

For exact values, the fixture may also carry a semantic exact representation such as `sqrt(13)` rather than pretending the floating-point number is exact.

## 9.5 Do not hide taught mathematics behind library calls

If the chapter teaches matrix multiplication, Gaussian elimination, finite differences, softmax stabilization, or gradient descent, the pedagogical code must expose the operation.

Afterward, the practical version may show:

```python
C = A @ B
```

or another idiomatic call.

---

# 10. Exact, Symbolic, and Numerical Policy

## 10.1 No universal CAS requirement

Book II does not need a full browser computer-algebra system as a prerequisite.

Exactness should be supported only where it materially improves the lesson.

## 10.2 Three value classes

The book conceptually distinguishes:

### Exact semantic values

Examples:

- integers;
- rational values;
- explicit radicals such as \(\sqrt{13}\);
- known constants such as \(\pi\);
- chapter-owned symbolic expressions.

### Numerical values

Usually IEEE-754 binary64 in TypeScript/Python.

### Stochastic results

Generated samples or Monte Carlo quantities, always with a controlled seed for deterministic test cases.

## 10.3 Chapter-owned symbolic representation

For early chapters, exact forms may be represented using small domain-specific structures.

Example:

```ts
type ExactMagnitude =
  | { kind: "integer"; value: bigint }
  | { kind: "sqrtInteger"; radicand: bigint }
  | { kind: "numericOnly" };
```

This is preferable to prematurely inventing a general symbolic algebra engine.

## 10.4 Numerical tolerances

Tolerances are test/algorithm concepts, not mathematical equalities.

Every tolerance-sensitive chapter must document:

- why tolerance is needed;
- absolute vs relative tolerance;
- scale assumptions;
- edge cases.

No global magic epsilon should silently define mathematical truth across the book.

---

# 11. Accessibility Standard

Accessibility is part of chapter correctness.

## 11.1 Keyboard equivalence

A learner must not be required to drag with a mouse to access the core lesson.

For draggable geometry, support:

- focusable handles;
- arrow-key movement;
- coarse/fine step modifier where useful;
- numeric inputs as an alternate path.

## 11.2 Screen-reader semantics

Every interactive must expose:

- control label;
- current value;
- relevant unit;
- state/constraint;
- concise description of the mathematical consequence where appropriate.

A vector endpoint might expose:

```text
Vector endpoint. x = 3, y = 2.
Magnitude approximately 3.606.
Angle approximately 0.588 radians.
```

## 11.3 Do not encode meaning by color alone

Selection, sign, categories, probability groups, and transformation states require secondary cues such as:

- shape;
- labels;
- line style;
- icons;
- text.

## 11.4 Motion

Honor reduced-motion preferences.

The learner must remain able to step through semantic states even when animated transitions are reduced or disabled.

## 11.5 Touch targets and mobile layout

Interactive handles and controls must remain usable on mobile without requiring precision mouse behavior.

## 11.6 Formula accessibility

Rendered equations require useful semantic text/MathML support from the chosen renderer and appropriate surrounding prose.

---

# 12. Validation Architecture

A green local unit-test suite is necessary but not sufficient.

Every accepted chapter should pass the applicable layers below.

## 12.1 Layer 1 — Content/schema validation

Check:

- required chapter sections;
- metadata;
- internal links;
- formula parse/render;
- referenced fixtures;
- code sample existence.

## 12.2 Layer 2 — Domain model unit tests

Test the mathematical functions directly.

Examples:

- vector norm;
- projection;
- determinant;
- Gaussian row operations;
- derivative estimate;
- Bayes normalization;
- gradient update;
- entropy;
- stable softmax.

## 12.3 Layer 3 — Independent oracle tests

The oracle must not merely duplicate the implementation under test.

Examples:

- NumPy linear algebra;
- SciPy where appropriate;
- SymPy for selected symbolic identities if adopted for test tooling;
- analytical closed forms;
- finite-difference comparisons;
- exhaustive bounded enumeration;
- Monte Carlo sanity checks;
- reconstruction/invariant checks.

The production browser code must not be accepted by comparing it only with a transliteration of itself.

## 12.4 Layer 4 — Invariant/property tests

Examples:

Vectors:

\[
\|\mathbf v\|\ge0,
\qquad
\|\alpha\mathbf v\|=|\alpha|\|\mathbf v\|.
\]

Orthogonal projection residual:

\[
(\mathbf a-\operatorname{proj}_{\mathbf b}\mathbf a)\cdot\mathbf b\approx0.
\]

Probability:

\[
\sum_i p_i\approx1.
\]

SVD:

\[
A\approx U\Sigma V^\top.
\]

Softmax:

- each probability \(>0\) for finite logits;
- sum approximately \(1\);
- additive logit shift invariance.

## 12.5 Layer 5 — Formula/visual synchronization tests

Where feasible, programmatically verify rendered geometry against model values.

Examples:

- vector endpoint maps to the model vector;
- transformed basis matches matrix columns;
- gradient arrow equals the reported update;
- probability bars correspond to actual probabilities.

## 12.6 Layer 6 — Browser interaction tests

Playwright should verify:

- drag;
- keyboard manipulation;
- numeric input;
- reset;
- trace playback;
- previous/next;
- invalid/degenerate states;
- code/formula/inspector update.

## 12.7 Layer 7 — Responsive tests

At minimum, representative:

- desktop;
- tablet;
- narrow mobile.

Core interaction must remain usable, not merely visible.

## 12.8 Layer 8 — Accessibility checks

Include:

- automated accessibility scan;
- keyboard navigation;
- focus visibility;
- accessible control naming;
- reduced motion;
- non-color-only semantics.

## 12.9 Layer 9 — Screenshot regression

Use stable deterministic states.

Screenshot testing catches:

- clipping;
- axis inversion;
- label collision regressions;
- responsive breakage;
- formula overflow;
- unwanted visual drift.

It does **not** replace mathematical tests.

## 12.10 Layer 10 — Deployment tests

Validate:

- site root deployment;
- subdirectory/base-path deployment;
- direct chapter navigation;
- static assets;
- code fixtures;
- math fonts/assets;
- client hydration only where required.

---

# 13. Chapter Acceptance Criteria

A chapter is accepted only when all applicable items are satisfied.

## A. Mathematical correctness

- definitions correct;
- preconditions stated;
- formulas correct;
- sign/order conventions consistent;
- degenerate cases handled or explicitly excluded;
- exact/approx semantics honest.

## B. Interaction correctness

- visible geometry derives from model state;
- inspector derives from model state;
- dynamic formula derives from model state;
- reset restores the canonical initial state;
- trace navigation is deterministic.

## C. Pedagogical correctness

- intuition precedes unnecessary abstraction;
- interaction teaches the mechanism;
- common misconception is addressed;
- no false simplification is introduced for convenience.

## D. Code correctness

- reference code executes;
- pedagogical implementation exposes the taught operation;
- practical NumPy version appears only after mechanism is established where appropriate;
- browser/reference parity fixtures pass.

## E. Independent validation

- at least one independent oracle/invariant strategy exists for nontrivial mathematics;
- tests do not merely compare an algorithm against a copied version of itself.

## F. Product quality

- keyboard usable;
- mobile usable;
- accessible labeling present;
- formulas readable;
- deterministic screenshots stable;
- root and subdirectory builds work.

A chapter with a beautiful visual but weak mathematical evidence is **not accepted**.

---

# 14. Part Acceptance Criteria

A Part is frozen only when:

1. every chapter meets chapter acceptance criteria;
2. cross-chapter notation is consistent;
3. shared primitives introduced by the Part are reviewed for genuine reuse;
4. no chapter has created a competing convention;
5. Part-level regression tests pass;
6. an independent audit samples formulas and interactions across the Part;
7. root/subdirectory deployment remains green;
8. baseline screenshots and deterministic fixtures are frozen.

Part acceptance should produce a short freeze report containing:

- accepted commit/HEAD;
- chapter list;
- test summary;
- oracle summary;
- known nonblocking limitations;
- frozen regression floor.

---

# 15. Reference Chapter Milestone — REF-1

## 15.1 Chapter identity

**Part I, Chapter 3 — Vectors: components, magnitude, and direction**

This is the architecture-proving chapter.

No large-scale Part implementation should begin until REF-1 is accepted.

## 15.2 Learning objectives

After the chapter, the learner should be able to explain:

1. a 2D vector as directed displacement;
2. why \((x,y)\) gives horizontal/vertical components;
3. why
   \[
   \|\mathbf v\|=\sqrt{x^2+y^2};
   \]
4. how direction is obtained with a quadrant-aware angle calculation;
5. why the zero vector has magnitude zero but no unique direction;
6. the difference between an exact magnitude such as \(\sqrt{13}\) and its decimal approximation;
7. the minimal right-triangle and angle reasoning needed for this chapter, without assuming later algebra (I.4) or trigonometric functions (I.6).

## 15.3 Required hero interaction

Initial state:

\[
\mathbf v=(3,2).
\]

The learner sees:

- origin;
- axes/grid;
- arrow from origin to endpoint;
- draggable endpoint;
- x/y component guides;
- live inspector.

Required live values:

```text
vector       (3, 2)
x            3
y            2
magnitude    √13
approx       3.605551...
angle        atan2(2, 3) ≈ 0.588003 rad
degrees      ≈ 33.690°   (secondary display)
```

Dragging the endpoint must update every dependent view from one canonical model state.

## 15.4 Required edge cases

At least:

- \((0,0)\): magnitude 0; direction shown as undefined, not arbitrarily 0;
- axis-aligned positive/negative vectors;
- all four quadrants;
- negative zero normalization in display;
- very small nonzero values;
- large but reasonable values within interaction bounds.

## 15.5 Exactness policy for REF-1

The chapter should support useful exact magnitude display when the squared magnitude is a simple integer.

Examples:

- \((3,4)\rightarrow5\);
- \((3,2)\rightarrow\sqrt{13}\);
- \((1,1)\rightarrow\sqrt2\).

It does not need a general symbolic algebra system.

Angle is normally numerical; special-angle symbolic recognition is optional and not required for acceptance.

## 15.6 Required mathematical implementation

Browser lesson model should expose conceptually:

```ts
interface Vector2State {
  readonly x: number;
  readonly y: number;
}

interface Vector2Derived {
  readonly magnitudeSquared: number;
  readonly magnitude: number;
  readonly directionRadians: number | null;
}
```

The production design may differ after repository inspection, but:

- `atan2(y, x)` or mathematically equivalent quadrant-aware logic is mandatory;
- zero-vector direction must not be fabricated;
- SVG coordinate conversion must be isolated from vector mathematics.

## 15.7 Required reference code

Python example 1 — mechanics:

```python
import math

x = 3.0
y = 2.0

magnitude = math.sqrt(x*x + y*y)
angle = math.atan2(y, x)
```

Python example 2 — NumPy practical form may follow:

```python
import numpy as np

v = np.array([3.0, 2.0])
magnitude = np.linalg.norm(v)
```

The chapter should explain why the first version is shown before the library shortcut.

## 15.8 Required oracle tests

Independent checks should include Python/NumPy fixtures for:

- components;
- Euclidean norm;
- angle using independent Python calculation;
- zero-vector direction policy.

Property tests should include sampled vectors verifying:

\[
\|\mathbf v\|^2\approx x^2+y^2,
\]

and, for \(\alpha\),

\[
\|\alpha\mathbf v\|\approx|\alpha|\|\mathbf v\|.
\]

## 15.9 Required interaction tests

Playwright should cover at minimum:

1. initial canonical state;
2. pointer drag to a new coordinate;
3. keyboard movement of focused endpoint;
4. direct numeric x/y entry if provided;
5. reset;
6. zero-vector case;
7. quadrant crossing;
8. responsive mobile interaction.

## 15.10 Required synchronization checks

For selected deterministic states, verify:

- endpoint pixel/world mapping corresponds to \((x,y)\);
- component guide labels match the state;
- magnitude inspector matches the lesson model;
- formula panel matches the same derived values;
- Python fixture expected values agree.

## 15.11 Required accessibility checks

- endpoint is keyboard focusable;
- endpoint has an accessible name;
- current x/y are exposed;
- numeric input alternative exists;
- touch target is adequate;
- meaning does not rely only on color;
- reduced-motion mode remains fully functional.

## 15.12 REF-1 acceptance gate

REF-1 is accepted only when all of the following are true:

- interaction architecture is clean enough to reuse;
- vector mathematics passes independent validation;
- exact/approx policy works;
- formula/visual/inspector synchronization is proven;
- keyboard/mobile interaction works;
- math rendering is stable;
- code parity workflow is proven;
- responsive screenshots are acceptable;
- no giant generic math-engine abstraction was introduced prematurely.

Once accepted, reusable primitives extracted from REF-1 become the **Book II regression floor**.

---

# 16. What REF-1 Is Allowed to Generalize

After REF-1, the following shared primitives may be frozen if they are genuinely generic:

- mathematical coordinate plane;
- draggable mathematical point/handle;
- world ↔ viewport transform;
- inspector row/value formatting;
- exact/approx paired display;
- parameter control;
- formula panel;
- chapter interaction panel layout;
- deterministic fixture loading;
- accessibility helper for draggable numeric points.

Do **not** generalize yet:

- arbitrary vector algebra engine;
- arbitrary matrix engine;
- symbolic CAS;
- graphing language;
- universal theorem system;
- universal optimizer engine;
- arbitrary n-dimensional visualization framework.

Those abstractions require evidence from later chapters.

---

# 17. Implementation Phases

## Phase M0 — Repository reconnaissance

Before edits:

- inspect Book I architecture;
- identify genuinely reusable platform modules;
- identify DSA-specific names/assumptions;
- inspect build/deployment/test setup;
- determine what can be reused without coupling Book II to DSA semantics.

Deliverable:

`BOOK_II_REUSE_AUDIT.md`

No broad refactor merely for naming aesthetics.

## Phase M1 — Master-plan freeze

Deliverable:

`INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md`

Freeze:

- curriculum;
- conventions;
- interaction architecture;
- code policy;
- validation policy;
- REF-1 definition.

**Current status:** M0/M2 have been implemented, WIN-0 Windows portability has been delivered and validated on Windows, and this v1.1 amendment remains a curriculum freeze candidate until the synchronized app data/tests and the outstanding Linux regression pass have been reviewed. M3 / REF-1 remains the next educational milestone.

## Phase M2 — Minimal mathematics-platform adaptation

Implement only what REF-1 proves necessary.

Likely work:

- math chapter shell;
- formula rendering;
- math coordinate plane;
- inspector/value formatting;
- reusable parameter/input primitives;
- fixture/oracle harness;
- accessibility hooks.

Avoid speculative platform expansion.

## Phase M3 — REF-1 Vectors reference chapter

Implement the complete reference chapter and all acceptance evidence.

## Phase M4 — Independent REF-1 review and platform freeze

Architect/reviewer must independently inspect:

- source architecture;
- math logic;
- tests;
- oracle independence;
- screenshots;
- accessibility;
- deployment behavior.

Possible decisions:

- **accept/freeze**;
- **correct then re-review**;
- **refactor a shared primitive**;
- **reject architecture and revise before scale-up**.

No mass implementation before M4 acceptance.

## Phase M5 — Complete Part I

Use REF-1 architecture to complete the remaining Mathematical Language chapters.

Then freeze Part I.

## Phase M6 — Part II Linear Algebra

Linear Algebra is large enough to receive its own implementation wave and review.

Recommended internal checkpoints:

- vector geometry block;
- matrix/transformation block;
- systems/elimination block;
- eigen/SVD block.

Freeze Part II before relying on it as a stable foundation.

## Phase M7 — Part III Calculus

Build and freeze calculus.

Chain rule, computational graphs, automatic differentiation, gradient, Jacobian, and Hessian become later ML prerequisites.

## Phase M8 — Part IV Probability

Build and freeze probability.

## Phase M9 — Parts V and VI

By default, implement sequentially.

If the shared platform has proven stable and separate agents can avoid shared-root conflicts, **Statistics and Optimization may proceed concurrently**, because their primary mathematical prerequisites are already frozen.

Never exceed two concurrently active Parts.

## Phase M10 — Parts VII and VIII

Information Theory and Numerical Computing may proceed concurrently only if:

- prior regression floor is stable;
- shared-root edit ownership is explicit;
- each Part has separate domain modules.

## Phase M11 — Whole-book integration audit

Audit:

- notation consistency;
- cross-links;
- prerequisites;
- code style;
- exact/approx presentation;
- accessibility;
- deployment;
- search/progress;
- performance;
- screenshots.

## Phase M12 — Book II freeze

Produce final:

- acceptance report;
- regression baseline;
- published static build;
- handoff map for the next book: Machine Learning.

---

# 18. Agent Workflow and Concurrency Rules

## 18.1 Astra Ultra

Astra Ultra is the primary implementation architect/orchestrator for substantial milestones.

It may use at most **two concurrent High-reasoning subagents**.

## 18.2 Shared-root discipline

Before modifying shared files, an implementation agent must inspect their current state.

Rules:

- preserve concurrent edits;
- prefer additive changes;
- do not restore stale versions;
- do not mass-format unrelated files;
- keep domain code local where feasible.

## 18.3 Concurrency

Default: one Part at a time.

Maximum: two Parts concurrently.

Concurrency is permitted only when:

- their domain work is separable;
- shared-root ownership is defined;
- the previous regression floor is green.

## 18.4 Reports are evidence, not acceptance

An agent report may summarize:

- files changed;
- tests;
- screenshots;
- architecture decisions;
- known issues.

The reviewer must independently verify important claims before freeze.

---

# 19. Review Severity Model

## Blocking

Examples:

- wrong mathematical result;
- visual/formula mismatch;
- broken matrix order;
- invalid probability normalization;
- false derivative definition;
- zero-vector direction fabricated;
- no independent oracle for nontrivial new math;
- inaccessible core interaction;
- architecture that forces duplication/drift across views.

Blocking findings prevent milestone acceptance.

## High severity

Examples:

- major numerical instability;
- missing important edge case;
- interaction teaches a misleading mental model;
- platform abstraction is already causing coupling;
- code example contradicts visual model.

Normally correct before freeze.

## Medium / nonblocking

Examples:

- secondary explanation could be clearer;
- optional keyboard shortcut;
- minor responsive polish;
- nonessential animation refinement.

May be deferred if documented.

## Accepted

No unresolved blocking/high-severity issues within the milestone scope.

---

# 20. Performance Policy

This is an educational static web application, not a benchmark project, but interaction latency still matters.

Targets:

- direct manipulations should feel immediate;
- pointer-driven 2D lessons should normally update within one animation frame on typical hardware;
- expensive stochastic simulations may use batching/workers if needed;
- no chapter should trigger large recomputation because generic architecture is overbuilt.

Correctness takes precedence over micro-optimization, but preventable jank is a product defect.

---

# 21. Content Authoring Policy

## 21.1 MDX owns narrative structure

Use MDX or equivalent for:

- prose;
- formulas;
- chapter section composition;
- embeds of interactive components;
- exercises;
- code explanations.

## 21.2 Computation does not live in prose

Do not bury important calculations in ad hoc MDX expressions.

Domain mathematics belongs in testable model modules.

## 21.3 Deterministic examples

Every chapter should have canonical examples that remain stable across runs and are suitable for:

- tests;
- screenshots;
- explanation;
- oracle comparison.

Random chapters must provide seeded deterministic modes.

---

# 22. Cross-Book Bridge Requirements

Book II should deliberately prepare the next books.

## To Machine Learning

The learner should leave Book II understanding:

- features/targets as vectors and matrices;
- linear and affine transformations;
- elementary equations, exponentials and logarithms;
- losses;
- gradients;
- optimization;
- probability models;
- likelihood;
- cross entropy;
- numerical stability.

## To Neural Networks

Book II supplies:

- matrix composition;
- chain rule and computational graphs / automatic differentiation;
- Jacobians/gradients;
- optimization;
- activation-independent mathematical language;
- probability/loss foundations.

## To Transformers

Later material will rely heavily on:

- vector spaces;
- dot products;
- matrix products;
- projections;
- normalization;
- tensor shapes and broadcasting;
- softmax;
- log probabilities;
- stable computation.

## To LLMs

Token prediction must ultimately be understandable as:

```text
hidden representation
      ↓
linear projection to vocabulary logits
      ↓
softmax / log-softmax
      ↓
target-token negative log likelihood
      ↓
gradient-based parameter update
```

Book II must make every mathematical arrow in that chain familiar before the learner reaches it.

---

# 23. Explicit Non-Goals for the Initial Book II Platform

Do not add merely because they might someday be useful:

- full symbolic CAS;
- theorem prover;
- general-purpose geometry engine;
- general arbitrary-dimensional scene graph;
- visual programming language;
- notebook kernel;
- server backend;
- user accounts;
- cloud persistence;
- giant plugin system.

The product remains a static learning application unless a later proven requirement changes that decision.

---

# 24. Curriculum v1.1 Decision and Freeze Boundary

The user approved the targeted prerequisite amendment on 2026-10-10:

- **I.4** elementary algebra and **I.6** essential function families;
- **III.10** computational graphs and automatic differentiation;
- topic-level coverage improvements in Linear Algebra, Probability, Statistics, Optimization, Information Theory and Numerical Computing;
- **97 chapters total**, without changing the order of Parts or **I.3 REF-1** / **VI.4 flagship** identities.

This amends the **curriculum**, not the accepted design identity or mathematical conventions. The historical M0/M2 and WIN-0 implementation reports remain historical evidence and must not be retroactively rewritten as though their 94-chapter tests covered v1.1.

Before accepting the amendment as the active regression floor:

1. synchronize the data model, chapter IDs, Part exit conditions, navigation and unit/browser test expectations with this master plan;
2. validate the true reading order (I.1–I.9, III.1–III.15) and the fixed markers I.3 / VI.4;
3. independently review affected navigation/landing/screenshot changes, preserving distinct Linux and Windows visual baselines;
4. rerun the independent validation pipeline on the available host(s), and run Linux validation after WIN-0 changes before declaring a two-platform freeze;
5. record the acceptance commit and outstanding limitations.

**No Part-wide mass chapter production is authorized before REF-1 acceptance.**

---

# 25. Next Educational Milestone — M3 / REF-1

**The reference chapter remains I.3 — Vectors: components, magnitude, and direction.** It is deliberately implemented before I.1/I.2 because it exercises the platform more comprehensively; the published learning order remains I.1, I.2, I.3 and so on.

Once the revised curriculum and the M2/WIN-0 regression floor are accepted, authorize M3:

- use the established draggable-geometry and one-model/many-views foundation;
- produce the complete 14-layer chapter, including intuition, derivation, worked examples, code, counterexamples, numerical notes, ML connections and exercises;
- exercise real available/current navigation states for the first time;
- maintain the separate formula, model, oracle and browser validation contracts;
- validate mobile, keyboard, accessibility and representative drag latency;
- stop for independent REF-1 review/freeze before implementing other chapters.

Later development completes Part I in **reading order** (I.1, I.2, I.4–I.9) and then proceeds through Parts II–VIII under the two-concurrent-Part maximum.

---

# 26. Definition of Success

Book II succeeds when a learner can look at a later ML equation and mentally connect symbols to mechanisms.

For example, when seeing

\[
\theta_{k+1}
=
\theta_k-\eta\nabla_\theta L(\theta_k),
\]

the learner should already understand:

- \(\theta\) as a vector of parameters;
- \(L\) as a function;
- \(\nabla L\) as a direction of local increase;
- \(-\nabla L\) as a descent direction;
- \(\eta\) as a scalar controlling update magnitude;
- why finite precision and learning rate affect actual computation.

When seeing

\[
p_i = \frac{e^{z_i}}{\sum_j e^{z_j}},
\]

the learner should understand:

- logits as unconstrained scores;
- exponentiation;
- normalization;
- probability constraints;
- numerical overflow risk;
- stable max-shift computation;
- the connection to cross entropy and token prediction.

That is the standard for the entire project:

> **The mathematics must become inspectable, manipulable, and mechanically understandable before it becomes a building block inside ML.**
