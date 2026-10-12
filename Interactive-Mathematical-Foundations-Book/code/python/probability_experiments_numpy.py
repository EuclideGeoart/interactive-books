"""Finite experiment masses as arrays; NumPy decimals approximate exact fractions.

Small-array comparisons use absolute tolerance 1e-12 and zero relative tolerance.
The tolerance checks arithmetic, not whether a physical experiment is fair.
"""
from fractions import Fraction as F
import numpy as np

ATOL = 1e-12


def validate_weights(weights):
    p = np.asarray(weights, dtype=float)
    if p.ndim != 1 or p.size == 0 or not np.all(np.isfinite(p)) or np.any(p < 0):
        raise ValueError("Use a nonempty finite nonnegative mass vector")
    if not np.isclose(p.sum(), 1.0, rtol=0, atol=ATOL):
        raise ValueError("Mass vector must sum to one within floating-point tolerance")
    return p  # No clipping or silent normalization.


def main():
    faces = np.arange(1, 7)
    p = validate_weights(np.full(6, 1 / 6))
    even = faces % 2 == 0
    even_mass = p[even].sum()
    np.testing.assert_allclose(even_mass, float(F(1, 2)), rtol=0, atol=ATOL)
    np.testing.assert_allclose(p[faces == 6].sum(), float(F(1, 6)), rtol=0, atol=ATOL)
    assert p[np.zeros(6, dtype=bool)].sum() == 0
    coins = np.array(["HH", "HT", "TH", "TT"])
    coin_mass = validate_weights(np.full(4, 1 / 4))
    one_head = np.isin(coins, ["HT", "TH"])
    np.testing.assert_allclose(coin_mass[one_head].sum(), float(F(1, 2)), rtol=0, atol=ATOL)
    # Counting heads merges HT and TH into a group with twice the other masses.
    head_counts = np.array([2, 1, 1, 0])
    grouped = np.bincount(head_counts, weights=coin_mass, minlength=3)
    np.testing.assert_allclose(grouped, [float(F(1, 4)), float(F(1, 2)), float(F(1, 4))], rtol=0, atol=ATOL)
    weighted = validate_weights([float(F(1, 2)), float(F(1, 3)), float(F(1, 6))])
    np.testing.assert_allclose(weighted[[1, 2]].sum(), float(F(1, 2)), rtol=0, atol=ATOL)
    for bad in ([], [0.5, 0.4], [-0.25, 1.25], [np.nan, 1.0], [np.inf], [[1.0]]):
        try:
            validate_weights(bad)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid mass vector was accepted")
    print("Die event mask:", even, "; P(even) ≈", even_mass, "(exact 1/2)")
    print("Two-coin head-count masses ≈", grouped, "(exact 1/4, 1/2, 1/4)")
    print("Weighted green-or-blue mass ≈", weighted[[1, 2]].sum(), "(exact 1/2)")


if __name__ == "__main__":
    main()
