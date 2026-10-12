"""Sort-free canonical support: cumsum and searchsorted implement CDF sides."""
import numpy as np

SUPPORT = np.array([0., 1., 2.])
PMF = np.array([0.25, 0.5, 0.25])
CUMULATIVE = np.concatenate(([0.], np.cumsum(PMF)))


def cdf(x, left=False):
    if not np.isfinite(x) or type(left) is not bool:
        raise ValueError("Use a finite threshold and boolean side selector")
    return CUMULATIVE[np.searchsorted(SUPPORT, x, side="left" if left else "right")]


def interval_probability(lower, upper):
    low_left, high = cdf(lower, left=True), cdf(upper)
    if lower > upper:
        raise ValueError("Interval endpoints must be ordered")
    return high - low_left


def main():
    np.testing.assert_array_equal([cdf(k) for k in SUPPORT], [0.25, 0.75, 1])
    assert cdf(1, left=True) == 0.25
    assert cdf(1.001) == cdf(1) == 0.75
    assert interval_probability(0, 1) == 0.75
    assert interval_probability(1, 1) == 0.5
    for lower in range(-1, 4):
        for upper in range(lower, 4):
            assert interval_probability(lower, upper) == PMF[(SUPPORT >= lower) & (SUPPORT <= upper)].sum()
    for lower, upper in ((2, 1), (np.nan, 1), (0, np.inf)):
        try:
            interval_probability(lower, upper)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid interval accepted")
    print("PMF:", PMF, "CDF:", CUMULATIVE[1:])
    print("Closed interval [0, 1]:", interval_probability(0, 1))
    print("Jump at 1:", cdf(1) - cdf(1, left=True))


if __name__ == "__main__":
    main()
