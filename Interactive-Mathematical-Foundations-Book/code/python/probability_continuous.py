"""Exact uniform areas and Gaussian erfc cross-checks of Simpson integration.

The Gaussian drawing stops at +/-4 sigma. Integration uses the positive tail
to 8 sigma and 2048 Simpson subdivisions. Omitted one-sided mass is <6.4e-16.
CDF absolute-error budget: 1e-9; two-CDF interval budget: 2e-9.
"""
from fractions import Fraction as F
from math import erfc, exp, fsum, isfinite, pi, sqrt


def uniform_interval(a, b, lower, upper):
    if any(not isinstance(x, (int, F)) or isinstance(x, bool) for x in (a, b, lower, upper)):
        raise ValueError("Use integer or Fraction endpoints")
    if a >= b or lower > upper:
        raise ValueError("Require a < b and lower <= upper")
    overlap = max(F(0), min(F(b), F(upper)) - max(F(a), F(lower)))
    return overlap / (F(b) - F(a))


def standardize(x, mu=0, sigma=1):
    if not all(isfinite(v) for v in (x, mu, sigma)) or sigma <= 0:
        raise ValueError("Use finite x, mu and positive finite sigma")
    return (x - mu) / sigma


def normal_cdf(x, mu=0, sigma=1):
    return 0.5 * erfc(-standardize(x, mu, sigma) / sqrt(2))


def simpson_cdf(x, mu=0, sigma=1):
    z = standardize(x, mu, sigma)
    start = abs(z)
    if start >= 8:
        return 1.0 if z > 0 else 0.0
    n = 2048
    h = (8 - start) / n
    def density(t):
        return exp(-t*t/2) / sqrt(2*pi)
    odd = fsum(density(start + j*h) for j in range(1, n, 2))
    even = fsum(density(start + j*h) for j in range(2, n, 2))
    tail = h/3 * (density(start) + density(8) + 4*odd + 2*even)
    return 1 - tail if z >= 0 else tail


def normal_interval(lower, upper, mu=0, sigma=1):
    low, high = normal_cdf(lower, mu, sigma), normal_cdf(upper, mu, sigma)
    if lower > upper:
        raise ValueError("Interval endpoints must be ordered")
    return high - low


def main():
    assert uniform_interval(-2, 2, -1, 1) == F(1, 2)
    assert uniform_interval(-2, 2, -3, 3) == 1
    assert uniform_interval(-2, 2, 2, 3) == 0
    assert uniform_interval(-2, 2, 0, 0) == 0
    assert standardize(-1, 2, 3) == -1 and standardize(5, 2, 3) == 1
    assert abs(normal_interval(-1, 1) - 0.682689492137) < 1e-12
    assert normal_cdf(0) == 0.5
    assert 0.5 * erfc(8 / sqrt(2)) < 6.4e-16
    points = [j/8 for j in range(-80, 81)]
    errors = [abs(simpson_cdf(z) - normal_cdf(z)) for z in points]
    assert max(errors) <= 1e-9
    for lower, upper in ((-1, 1), (-4, 4), (-8, -7), (7, 8), (-2.3, 0.7), (0, 0)):
        estimate = simpson_cdf(upper) - simpson_cdf(lower)
        assert abs(estimate - normal_interval(lower, upper)) <= 2e-9
    assert abs(normal_interval(-1, 5, 2, 3) - 0.682689492137) < 1e-12
    for args in ((0, 0, 0), (0, 0, -1), (float('nan'), 0, 1), (0, float('inf'), 1)):
        try:
            normal_cdf(*args)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid Gaussian parameters accepted")
    for args in ((2, 2, 0, 1), (-2, 2, 1, -1)):
        try:
            uniform_interval(*args)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid uniform parameters accepted")
    try:
        normal_interval(1, -1)
    except ValueError:
        pass
    else:
        raise AssertionError("Reversed Gaussian interval accepted")
    print("Uniform[-2,2] density = 1/4, P([-1,1]) =", uniform_interval(-2, 2, -1, 1))
    print("Standard normal P([-1,1]) ≈", normal_interval(-1, 1))
    print("Largest sampled Simpson CDF error against erfc:", max(errors))
    print("Omitted drawn +/-4 sigma tail mass ≈", erfc(4 / sqrt(2)))


if __name__ == "__main__":
    main()
