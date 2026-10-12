"""Array mechanics for densities and positive-tail Simpson, without SciPy."""
from math import erfc, sqrt
import numpy as np


def normal_pdf(x, mu=0, sigma=1):
    x = np.asarray(x, dtype=float)
    if not np.all(np.isfinite(x)) or not np.isfinite(mu) or not np.isfinite(sigma) or sigma <= 0:
        raise ValueError("Use finite points, finite mu and positive finite sigma")
    z = (x - mu) / sigma
    return np.exp(-z*z/2) / (sigma * np.sqrt(2*np.pi))


def simpson_cdf(x, mu=0, sigma=1):
    if not all(np.isfinite(v) for v in (x, mu, sigma)) or sigma <= 0:
        raise ValueError("Use finite x, mu and positive finite sigma")
    z = (x - mu) / sigma
    start = abs(z)
    if start >= 8:
        return 1.0 if z > 0 else 0.0
    grid = np.linspace(start, 8, 2049)
    weights = np.ones(2049)
    weights[1:-1:2] = 4
    weights[2:-1:2] = 2
    tail = ((8 - start) / 2048) / 3 * np.dot(weights, normal_pdf(grid))
    return 1 - tail if z >= 0 else tail


def uniform_interval(a, b, lower, upper):
    if not all(np.isfinite(v) for v in (a, b, lower, upper)) or a >= b or lower > upper:
        raise ValueError("Require finite ordered endpoints and a < b")
    return max(0, min(b, upper) - max(a, lower)) / (b - a)


def main():
    assert uniform_interval(-2, 2, -1, 1) == 0.5
    assert uniform_interval(-2, 2, -3, 3) == 1
    assert uniform_interval(-2, 2, 2, 3) == 0
    np.testing.assert_allclose(normal_pdf([0, 1, -1]), [0.3989422804014327, 0.24197072451914337, 0.24197072451914337], rtol=0, atol=1e-12)
    points = np.linspace(-10, 10, 161)
    estimates = np.array([simpson_cdf(float(z)) for z in points])
    independent = np.array([0.5 * erfc(-float(z) / sqrt(2)) for z in points])
    np.testing.assert_allclose(estimates, independent, rtol=0, atol=1e-9)
    assert np.all(np.diff(estimates) >= 0)
    for lower, upper in ((-1, 1), (-4, 4), (-8, -7), (7, 8), (-2.3, .7), (0, 0)):
        area = simpson_cdf(upper) - simpson_cdf(lower)
        oracle = 0.5 * (erfc(-upper/sqrt(2)) - erfc(-lower/sqrt(2)))
        np.testing.assert_allclose(area, oracle, rtol=0, atol=2e-9)
    np.testing.assert_allclose(simpson_cdf(1) - simpson_cdf(-1), 0.682689492137, rtol=0, atol=2e-9)
    np.testing.assert_allclose(simpson_cdf(5, 2, 3) - simpson_cdf(-1, 2, 3), 0.682689492137, rtol=0, atol=2e-9)
    for args in ((0, 0, 0), (0, 0, -1), (np.nan, 0, 1), (0, np.inf, 1)):
        for function in (normal_pdf, simpson_cdf):
            try:
                function(*args)
            except ValueError:
                pass
            else:
                raise AssertionError("Invalid Gaussian parameters accepted")
    for args in ((2, 2, 0, 1), (-2, 2, 1, -1), (-2, 2, np.nan, 1)):
        try:
            uniform_interval(*args)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid uniform parameters accepted")
    print("Gaussian interval [-1,1] ≈", simpson_cdf(1) - simpson_cdf(-1))
    print("Largest sampled CDF error:", np.max(np.abs(estimates - independent)))
    print("CDF budget 1e-9; two-CDF interval budget 2e-9; plotted +/-4σ omits tails")


if __name__ == "__main__":
    main()
