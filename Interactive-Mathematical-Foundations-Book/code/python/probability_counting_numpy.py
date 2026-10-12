"""Group bounded ordered selections with NumPy, keeping multiplicities visible.

Counts in this n = 2..8, k = 0..4 explorer fit fixed-width integers. Derived
floating-point probabilities use absolute tolerance 1e-12, relative tolerance 0.
"""
from fractions import Fraction as F
from itertools import permutations, product
from math import comb, perm
import numpy as np

ATOL = 1e-12


def grouped_selections(n, k, replacement):
    if type(n) is not int or type(k) is not int or not 2 <= n <= 8 or not 0 <= k <= 4:
        raise ValueError("Use integer n = 2..8 and k = 0..4")
    labels = range(1, n + 1)
    sequences = tuple(product(labels, repeat=k) if replacement else permutations(labels, k))
    rows = np.asarray(sequences, dtype=np.int64).reshape(len(sequences), k)
    if len(rows) == 0:
        return rows, np.empty((0, k), dtype=np.int64), np.empty(0, dtype=np.int64), None
    # Sorting removes order; counts retain how many ordered rows each result had.
    unordered, multiplicities = np.unique(np.sort(rows, axis=1), axis=0, return_counts=True)
    masses = multiplicities / len(rows)
    return rows, unordered, multiplicities, masses


def main():
    for n in range(2, 9):
        for k in range(5):
            for replacement in (False, True):
                rows, unordered, counts, masses = grouped_selections(n, k, replacement)
                ordered_count = n ** k if replacement else (perm(n, k) if k <= n else 0)
                unordered_count = comb(n + k - 1, k) if replacement else (comb(n, k) if k <= n else 0)
                assert len(rows) == ordered_count and len(unordered) == unordered_count
                if masses is not None:
                    assert counts.sum() == ordered_count
                    np.testing.assert_allclose(masses.sum(), 1.0, rtol=0, atol=ATOL)
                if k == 0:
                    assert rows.shape == unordered.shape == (1, 0) and counts.tolist() == [1]
    rows, pairs, counts, masses = grouped_selections(4, 2, False)
    assert len(rows) == 12 and len(pairs) == 6 and np.all(counts == 2)
    np.testing.assert_allclose(masses, float(F(1, 6)), rtol=0, atol=ATOL)
    rows_r, multisets, counts_r, masses_r = grouped_selections(4, 2, True)
    assert len(rows_r) == 16 and len(multisets) == 10
    repeated = np.all(multisets == [1, 1], axis=1)
    distinct = np.all(multisets == [1, 2], axis=1)
    np.testing.assert_allclose(masses_r[repeated], float(F(1, 16)), rtol=0, atol=ATOL)
    np.testing.assert_allclose(masses_r[distinct], float(F(1, 8)), rtol=0, atol=ATOL)
    assert grouped_selections(2, 3, False)[3] is None
    for n, k in ((1, 2), (9, 2), (4, -1), (4, 5), (4.0, 2)):
        try:
            grouped_selections(n, k, False)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid explorer inputs were accepted")
    print("Without replacement: 12 sequences, 6 pairs; probabilities ≈", masses)
    print("With replacement: 16 sequences, 10 multisets")
    for row, count, mass in zip(multisets, counts_r, masses_r):
        print(tuple(row), ": ordered preimages", count, "; probability ≈", mass)
    print("Impossible without-replacement selection: no normalized masses (None)")


if __name__ == "__main__":
    main()
