# Book III — Interactive Machine Learning

Nine Parts · 41 chapters. The supplied Part assignments in `documentation/authority/` govern all chapter mechanisms, independent oracles, boundaries and exits. This index is transcribed from them; it adds only the required III-07 foundation reference.

## Foundation and release gates

M0: freeze this curriculum, protected releases, prerequisite IDs and ownership. M1: establish independent Book III platform, numerical state/immutable traces, Part-local discovery, deterministic datasets/oracles, accessible Part-first shell, root/subpath production and serialized validation. III-07 supplies the complete regression reference. Independently accept and freeze all three before Part implementation. Wave A P01/P02; B P03/P04; C P05/P06; D P07/P08; E P09. Each wave freezes before the next.

## Curriculum

### Part I — ML Foundations

| ID | Chapter |
| --- | --- |
| III-01 | What Machine Learning Actually Learns |
| III-02 | Samples, Features, Labels and Targets |
| III-03 | Learning Problems |
| III-04 | Training, Validation, Testing and Generalization |
| III-05 | Parameters, Hyperparameters, Loss and Optimization |
| III-06 | Underfitting, Overfitting, Bias, Variance and Baselines |

### Part II — Regression and Classification

| ID | Chapter |
| --- | --- |
| III-07 | Linear Regression |
| III-08 | Least Squares and the Closed-Form Best Fit |
| III-09 | Gradient Descent for Linear Regression |
| III-10 | Multiple Linear Regression |
| III-11 | Polynomial Features |
| III-12 | Regularization |
| III-13 | Logistic Regression |
| III-14 | Decision Thresholds and Confusion Matrix |
| III-15 | Precision, Recall, F1 and ROC |
| III-16 | Multiclass Classification and Softmax Regression |

### Part III — Instance and Probabilistic Methods

| ID | Chapter |
| --- | --- |
| III-17 | k-Nearest Neighbors |
| III-18 | Distance Metrics and Curse of Dimensionality |
| III-19 | Naive Bayes |

### Part IV — Trees and Ensemble Learning

| ID | Chapter |
| --- | --- |
| III-20 | Decision Trees and Candidate Splits |
| III-21 | Entropy, Gini Impurity and Information Gain |
| III-22 | Regression Trees, Tree Depth and Pruning |
| III-23 | Bagging and Bootstrap Sampling |
| III-24 | Random Forests |
| III-25 | Boosting and Gradient Boosting |

### Part V — Clustering

| ID | Chapter |
| --- | --- |
| III-26 | k-Means |
| III-27 | Initialization, Convergence, Scaling and Failure Cases |
| III-28 | Hierarchical and Density-Based Clustering |

### Part VI — Dimensionality Reduction

| ID | Chapter |
| --- | --- |
| III-29 | High-Dimensional Data and Covariance |
| III-30 | PCA: Eigenvectors and Explained Variance |
| III-31 | PCA Projection and Reconstruction |

### Part VII — Support Vector Machines

| ID | Chapter |
| --- | --- |
| III-32 | Maximum-Margin Classification |
| III-33 | Soft Margins and Regularization Tradeoff |
| III-34 | Kernel Methods |

### Part VIII — Evaluation and Practical ML

| ID | Chapter |
| --- | --- |
| III-35 | Cross-Validation and Hyperparameter Tuning |
| III-36 | Learning Curves and Model Selection |
| III-37 | Class Imbalance, Calibration and Metric Choice |
| III-38 | Preprocessing, Feature Engineering and Pipelines |
| III-39 | Reproducibility and Numerical Reliability |

### Part IX — Bridge to Neural Networks

| ID | Chapter |
| --- | --- |
| III-40 | From Linear Model to Artificial Neuron |
| III-41 | Composition and Learned Representations |

## Foundation reference contract

III-07 uses the scalar affine predictor, n-by-1 sample/target columns, an explicit scalar bias, residual prediction minus target, mean squared error (1/n), its analytical parameter gradients and bounded inspectable updates. All prose, canonical Python+NumPy, oracle fixtures, TypeScript, geometry, equations, inspector and replay share these semantics. The reference does not implement the later Part II solvers/classifiers.

Acceptance has mathematical, source/shape/parity, interactive-state, responsive/accessibility, production/offline and protected-release evidence. An author report alone is insufficient. Only the integrator merges/freezes; no push/deploy is authorized.
