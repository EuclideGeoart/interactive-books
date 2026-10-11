"""Vectorize binomial products without adding SciPy; comb stays exact."""
from fractions import Fraction as F
from math import comb
import numpy as np


def distribution(n, p):
    if type(n) is not int or not 0 <= n <= 30 or not np.isfinite(p) or not 0 <= p <= 1:
        raise ValueError("Require integer n in 0..30 and finite p in [0, 1]")
    k = np.arange(n + 1)
    coefficients = np.array([comb(n, int(j)) for j in k], dtype=float)
    # NumPy's exponent-zero result is 1, implementing the empty product.
    return coefficients * np.power(p, k) * np.power(1 - p, n - k)


def selected_mass(n, p, k):
    masses = distribution(n, p)
    if type(k) is not int or not -1 <= k <= 31:
        raise ValueError("Require integer k in -1..31")
    return 0.0 if k < 0 or k > n else float(masses[k])


def main():
    np.testing.assert_array_equal(distribution(2, 0.5), [0.25, 0.5, 0.25])
    assert selected_mass(3, 0.25, 1) == 27/64
    assert selected_mass(0, 0.4, 0) == 1
    assert selected_mass(0, 0.4, 1) == 0
    assert selected_mass(3, 0, 0) == selected_mass(3, 1, 3) == 1
    assert selected_mass(2, 0.5, -1) == selected_mass(2, 0.5, 3) == 0
    for n in range(31):
        for p_exact in (F(0), F(1, 10000), F(617, 5000), F(1, 2), F(9999, 10000), F(1)):
            masses = distribution(n, float(p_exact))
            exact = [comb(n, k) * p_exact**k * (1 - p_exact)**(n - k) for k in range(n + 1)]
            np.testing.assert_allclose(masses, [float(x) for x in exact], rtol=0, atol=1e-12)
            np.testing.assert_allclose(masses.sum(), 1, rtol=0, atol=1e-12)
            np.testing.assert_allclose(np.dot(np.arange(n + 1), masses), float(n * p_exact), rtol=0, atol=1e-12)
    for n, p, k in ((-1, .5, 0), (31, .5, 0), (2, np.nan, 0), (2, np.inf, 0), (2, 1.1, 0), (2, .5, 1.5)):
        try:
            selected_mass(n, p, k)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid binomial parameters accepted")
    print("Binomial(2, 1/2) ≈", distribution(2, .5))
    print("n = 30, p = 12.34%, k = 4 ≈", selected_mass(30, .1234, 4))


if __name__ == "__main__":
    main()
