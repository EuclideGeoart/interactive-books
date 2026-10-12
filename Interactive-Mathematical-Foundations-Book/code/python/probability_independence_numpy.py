"""Numerical joint-product comparisons are cross-checks, not exact proofs.

The literal Fraction joint and product supply the mathematical classification.
Absolute error tolerance 1e-12, relative tolerance 0, checks these small arrays.
"""
from fractions import Fraction as F
import numpy as np

ATOL = 1e-12


def compare(weights, a, b):
    p = np.asarray(weights, dtype=float)
    a, b = np.asarray(a), np.asarray(b)
    if p.ndim != 1 or p.size == 0 or np.any(p < 0) or not np.all(np.isfinite(p)):
        raise ValueError("Use a nonempty finite nonnegative mass vector")
    if not np.isclose(p.sum(), 1.0, rtol=0, atol=ATOL):
        raise ValueError("Masses must sum to one within floating-point tolerance")
    if a.dtype != np.bool_ or b.dtype != np.bool_ or a.shape != p.shape or b.shape != p.shape:
        raise ValueError("Events need boolean masks matching the mass vector")
    pa, pb, joint = p[a].sum(), p[b].sum(), p[a & b].sum()
    return np.array([pa, pb, joint, pa * pb]), joint / pb if pb > 0 else None


def check_example(weights, a, b, exact, independent):
    masses, conditional = compare(weights, a, b)
    np.testing.assert_allclose(masses, [float(x) for x in exact], rtol=0, atol=ATOL)
    assert (exact[2] == exact[3]) == independent
    if independent:
        np.testing.assert_allclose(masses[2], masses[3], rtol=0, atol=ATOL)
    print("Marginals, joint, product ≈", masses, "; numerical gap ≈", masses[2] - masses[3])
    print("Exact joint/product:", exact[2], exact[3], "; independent:", independent)
    return conditional


def main():
    faces = np.arange(1, 7)
    p = np.full(6, 1 / 6)
    a, b = np.isin(faces, [2, 4, 6]), np.isin(faces, [4, 5, 6])
    die_conditional = check_example(p, a, b, [F(1, 2), F(1, 2), F(1, 3), F(1, 4)], False)
    np.testing.assert_allclose(die_conditional, float(F(2, 3)), rtol=0, atol=ATOL)
    coins = np.array(["HH", "HT", "TH", "TT"])
    first_h, second_h = np.isin(coins, ["HH", "HT"]), np.isin(coins, ["HH", "TH"])
    coin_conditional = check_example(np.full(4, 0.25), first_h, second_h,
                                     [F(1, 2), F(1, 2), F(1, 4), F(1, 4)], True)
    np.testing.assert_allclose(coin_conditional, float(F(1, 2)), rtol=0, atol=ATOL)
    check_example(p, a, ~a, [F(1, 2), F(1, 2), F(0), F(1, 4)], False)
    undefined = check_example(p, a, np.zeros(6, dtype=bool), [F(1, 2), F(0), F(0), F(0)], True)
    assert undefined is None
    for bad_p, bad_a, bad_b in (([-0.1, 1.1], [True, False], [False, True]),
                                 ([0.5, 0.4], [True, False], [False, True]),
                                 ([np.nan], [True], [True]),
                                 ([1.0], [1], [True]), ([1.0], [True], [True, False])):
        try:
            compare(bad_p, bad_a, bad_b)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid model or masks were accepted")
    print("The zero event is independent; conditioning on it is undefined")


if __name__ == "__main__":
    main()
