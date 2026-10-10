# Interactive Books

An independently buildable collection of visual-first, interactive books for computer science, mathematics, and machine learning.

| Book | Status | Source |
| --- | --- | --- |
| **I — Interactive C++ Data Structures & Algorithms** | Completed and release-validated; installable PWA | [Book I](Interactive-C++-Data-Structures-&-Algorithms-Book/) |
| **II — Interactive Mathematical Foundations** | In active development in its original worktree; will be imported here later with its Git history preserved | Pending |
| **III — Machine Learning** | Planned | Pending |
| **IV — Neural Networks, Transformers & LLMs** | Planned | Pending |

## Book I

```sh
cd 'Interactive-C++-Data-Structures-&-Algorithms-Book'
npm ci
./open-book.sh
```

Book I includes 67 chapters, executable C++20 examples, deterministic interactive traces, visual regression tests, and base-path-aware PWA support. See the [Book I README](Interactive-C++-Data-Structures-&-Algorithms-Book/README.md) and [final release review](Interactive-C++-Data-Structures-&-Algorithms-Book/documentation/FINAL_EDITORIAL_PWA_RELEASE_REVIEW.md).

## Repository policy

- Each book owns its dependencies, tests, release process, and canonical code.
- Shared infrastructure should be extracted **only after** multiple books demonstrate compatible requirements; avoid premature cross-book imports.
- Keep authored code, tests, visual baselines, and reproducible build/deployment configuration in Git.
- Exclude dependency folders, generated build output, bulky historical duplicate deliveries, and machine-local credentials.
- Book II stays at `/work/Interactive-Mathematical-Foundations-Book/` until its current agent finishes. **Do not move, reset, or replace its existing Git history or uncommitted files.** Its import will be a separately reviewed Git operation.
- `/work/fluxgeo/` is unrelated and remains outside this repository.

## Publishing

The [GitHub setup helper](setup-learning-books-github.sh) publishes the already-prepared `main` and Book I feature branches to a **new private** repository and opens the pull request after `gh auth login`. It does not alter either book's source.
