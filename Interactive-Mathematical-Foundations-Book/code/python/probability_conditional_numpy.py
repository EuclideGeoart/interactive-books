"""Mask and normalize; zero represented evidence returns None before division.

The exact Fraction reference determines mathematical impossibility. These small
examples use moderate representable weights; underflow in other inputs needs
scaling or exact arithmetic, not an arbitrary denominator epsilon.
"""
from fractions import Fraction as F
import numpy as np

ATOL = 1e-12


def condition(weights, evidence):
    p = np.asarray(weights, dtype=float)
    b = np.asarray(evidence)
    if p.ndim != 1 or p.size == 0 or np.any(p < 0) or not np.all(np.isfinite(p)):
        raise ValueError("Use a nonempty finite nonnegative mass vector")
    if not np.isclose(p.sum(), 1.0, rtol=0, atol=ATOL):
        raise ValueError("Masses must sum to one within floating-point tolerance")
    if b.dtype != np.bool_ or b.shape != p.shape:
        raise ValueError("Evidence needs a boolean mask with one entry per outcome")
    retained = np.where(b, p, 0.0)
    total = retained.sum()
    if total == 0.0:
        return None
    return retained / total


def main():
    faces = np.arange(1, 7)
    p = np.full(6, 1 / 6)
    original = p.copy()
    a, b = np.isin(faces, [2, 4, 6]), np.isin(faces, [4, 5, 6])
    posterior = condition(p, b)
    exact = [F(0), F(0), F(0), F(1, 3), F(1, 3), F(1, 3)]
    np.testing.assert_allclose(posterior, [float(x) for x in exact], rtol=0, atol=ATOL)
    np.testing.assert_allclose(posterior.sum(), 1.0, rtol=0, atol=ATOL)
    np.testing.assert_allclose(posterior[a].sum(), float(F(2, 3)), rtol=0, atol=ATOL)
    np.testing.assert_array_equal(p, original)
    weighted = condition([0.5, 1 / 3, 1 / 6], [False, True, True])
    np.testing.assert_allclose(weighted, [0.0, float(F(2, 3)), float(F(1, 3))], rtol=0, atol=ATOL)
    np.testing.assert_allclose(condition(p, a)[faces == 2].sum(), float(F(1, 3)), rtol=0, atol=ATOL)
    np.testing.assert_allclose(condition(p, faces == 2)[a].sum(), 1.0, rtol=0, atol=ATOL)
    assert condition(p, np.zeros(6, dtype=bool)) is None
    assert condition([1.0, 0.0], [False, True]) is None
    # Do not use ATOL to classify small positive evidence as impossible.
    np.testing.assert_allclose(condition([1e-100, 1.0], [True, False]), [1.0, 0.0], rtol=0, atol=ATOL)
    for bad_p, mask in (([], []), ([0.5, 0.4], [True, False]),
                        ([-0.1, 1.1], [True, False]), ([np.nan], [True]),
                        ([1.0], [1]), ([1.0], [True, False])):
        try:
            condition(bad_p, mask)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid masses or evidence mask were accepted")
    print("Die conditional masses ≈", posterior, "; exact reference", exact)
    print("P(A | B) ≈", posterior[a].sum(), "(exact 2/3)")
    print("Weighted conditional masses ≈", weighted, "(exact 0, 2/3, 1/3)")
    print("Zero-mass evidence: undefined (None); original weights remain unchanged")


if __name__ == "__main__":
    main()
