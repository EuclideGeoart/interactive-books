"""OR, AND, and NOT implement set membership; weights supply event mass.

Membership is boolean and exact. Floating-point sums are compared to literal
Fraction references at absolute tolerance 1e-12, with zero relative tolerance.
"""
from fractions import Fraction as F
import numpy as np

ATOL = 1e-12


def event_summary(weights, a, b):
    p = np.asarray(weights, dtype=float)
    a, b = np.asarray(a), np.asarray(b)
    if p.ndim != 1 or p.size == 0 or np.any(p < 0) or not np.all(np.isfinite(p)):
        raise ValueError("Use a nonempty finite nonnegative mass vector")
    if not np.isclose(p.sum(), 1.0, rtol=0, atol=ATOL):
        raise ValueError("Masses must sum to one within floating-point tolerance")
    if a.dtype != np.bool_ or b.dtype != np.bool_ or a.shape != p.shape or b.shape != p.shape:
        raise ValueError("Use boolean event masks with one entry per outcome")
    pa, pb = p[a].sum(), p[b].sum()
    joint, union, complement = p[a & b].sum(), p[a | b].sum(), p[~a].sum()
    np.testing.assert_allclose(union, pa + pb - joint, rtol=0, atol=ATOL)
    np.testing.assert_allclose(complement, 1 - pa, rtol=0, atol=ATOL)
    return np.array([pa, pb, joint, union, complement]), not np.any(a & b)


def main():
    faces = np.arange(1, 7)
    p = np.full(6, 1 / 6)
    a, b = np.isin(faces, [2, 4, 6]), np.isin(faces, [4, 5, 6])
    masses, disjoint = event_summary(p, a, b)
    expected = [F(1, 2), F(1, 2), F(1, 3), F(2, 3), F(1, 2)]
    np.testing.assert_allclose(masses, [float(x) for x in expected], rtol=0, atol=ATOL)
    assert not disjoint
    assert event_summary(p, a, ~a)[1]
    np.testing.assert_allclose(event_summary(p, a, a)[0][3], float(F(1, 2)), rtol=0, atol=ATOL)
    weighted, _ = event_summary([0.5, 1 / 3, 1 / 6], [True, True, False], [False, True, True])
    np.testing.assert_allclose(weighted, [float(x) for x in (F(5, 6), F(1, 2), F(1, 3), F(1), F(1, 6))], rtol=0, atol=ATOL)
    zero_overlap, zero_disjoint = event_summary([1.0, 0.0], [False, True], [False, True])
    assert zero_overlap[2] == 0 and not zero_disjoint
    for bad_p, bad_a, bad_b in (([-0.5, 1.5], [True, False], [False, True]),
                                 ([0.5, 0.4], [True, False], [False, True]),
                                 ([np.nan], [True], [True]),
                                 ([1.0], [1], [True]), ([1.0], [True, False], [True])):
        try:
            event_summary(bad_p, bad_a, bad_b)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid masses or masks were accepted")
    print("Die masses ≈", masses, "in order A, B, intersection, union, complement")
    print("Exact references:", expected)
    print("Weighted example masses ≈", weighted)
    print("Zero overlap mass does not guarantee disjoint sets")


if __name__ == "__main__":
    main()
