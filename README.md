# Interactive Books

An independently buildable collection of visual-first, interactive books for computer science, mathematics, and machine learning.

| Book | Status | Source |
| --- | --- | --- |
| **I — Interactive C++ Data Structures & Algorithms** | Completed and release-validated; installable PWA | [Book I](Interactive-C++-Data-Structures-&-Algorithms-Book/) |
| **II — Interactive Mathematical Foundations** | M0/M2 foundation complete; REF-1 Vectors awaits independent review | [Book II](Interactive-Mathematical-Foundations-Book/) |
| **III — Interactive Machine Learning** | M0/M1 + III-07 accepted; 1/41 chapters; Wave A next | [Book III](Interactive-Machine-Learning-Book/) |
| **IV — Neural Networks, Transformers & LLMs** | Planned | Pending |

## Book I

```sh
cd 'Interactive-C++-Data-Structures-&-Algorithms-Book'
npm ci
./open-book.sh
```

Book I includes 67 chapters, executable C++20 examples, deterministic interactive traces, visual regression tests, and base-path-aware PWA support. See the [Book I README](Interactive-C++-Data-Structures-&-Algorithms-Book/README.md) and [final release review](Interactive-C++-Data-Structures-&-Algorithms-Book/documentation/FINAL_EDITORIAL_PWA_RELEASE_REVIEW.md).

## Book II

```sh
cd 'Interactive-Mathematical-Foundations-Book'
npm ci
npm run oracle:setup
npm run validate
```

The M0/M2 foundation is complete but not yet independently accepted. Its first full chapter milestone is REF-1 Vectors. See the [implementation report](Interactive-Mathematical-Foundations-Book/documentation/M0_M2_IMPLEMENTATION_REPORT.md). The master plan is at `Interactive-Mathematical-Foundations-Book/documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md`.

## Repository policy

- Each book owns its dependencies, tests, release process, and canonical code.
- Shared infrastructure should be extracted **only after** multiple books demonstrate compatible requirements; avoid premature cross-book imports.
- Keep authored code, tests, visual baselines, and reproducible build/deployment configuration in Git.
- Exclude dependency folders, generated build output, bulky historical duplicate deliveries, and machine-local credentials.
- Book II is now canonical at `Interactive-Mathematical-Foundations-Book/` within this repository, imported with all three original commits in the merge ancestry. The former `/work/Interactive-Mathematical-Foundations-Book/` checkout is a temporary recovery copy; **do not develop in both locations**. Recreate `.venv/` after relocation (do not copy the original virtual environment).
- `/work/fluxgeo/` is unrelated and remains outside this repository.

## Publishing

The [GitHub setup helper](setup-learning-books-github.sh) publishes the already-prepared `main` and Book I feature branches to a **new private** repository and opens the pull request after `gh auth login`. It does not alter either book's source.
