"""Exact PMF and right-continuous CDF of Binomial(2, 1/2)."""
from fractions import Fraction as F

PMF = {0: F(1, 4), 1: F(1, 2), 2: F(1, 4)}


def cdf(x, left=False):
    if not isinstance(x, (int, F)) or isinstance(x, bool) or type(left) is not bool:
        raise ValueError("Use an exact threshold and a boolean left-limit selector")
    return sum((p for k, p in PMF.items() if (k < x if left else k <= x)), F(0))


def interval_probability(lower, upper):
    # Validate both endpoints even if their ordering is invalid.
    low_left, high = cdf(lower, left=True), cdf(upper)
    if lower > upper:
        raise ValueError("Interval endpoints must be ordered")
    return high - low_left


def main():
    assert sum(PMF.values(), F(0)) == 1
    assert [cdf(k) for k in (0, 1, 2)] == [F(1, 4), F(3, 4), F(1)]
    assert cdf(0, left=True) == 0
    assert cdf(1, left=True) == F(1, 4)
    assert cdf(F(1001, 1000)) == cdf(1) == F(3, 4)
    assert interval_probability(0, 1) == F(3, 4)
    assert cdf(1) - cdf(0) == F(1, 2)  # This is P(0 < X <= 1).
    for lower in range(-1, 4):
        for upper in range(lower, 4):
            assert interval_probability(lower, upper) == sum((p for k, p in PMF.items() if lower <= k <= upper), F(0))
    assert interval_probability(1, 1) == F(1, 2)
    assert interval_probability(-10, 10) == 1
    for lower, upper in ((2, 1), (float('nan'), 1), (0, 1.0)):
        try:
            interval_probability(lower, upper)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid exact interval accepted")
    print("PMF:", PMF, "CDF at support:", [cdf(k) for k in PMF])
    print("P(0 <= X <= 1) = F(1) - F(0-) =", interval_probability(0, 1))
    print("Uniform[0, 1/2]: density = 2; area on [0, 1/4] =", F(2) * F(1, 4))


if __name__ == "__main__":
    main()
