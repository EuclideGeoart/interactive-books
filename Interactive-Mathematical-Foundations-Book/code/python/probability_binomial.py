"""Exact binomial masses; no factorial at an impossible count.

The stage accepts n in 0..30, selected k in -1..31, and p-percent to two
decimal places. Fraction('12.34') / 100 represents 12.34% exactly.
"""
from fractions import Fraction as F
from math import comb


def pmf(n, p, k):
    if type(n) is not int or not 0 <= n <= 30 or type(k) is not int or not -1 <= k <= 31:
        raise ValueError("Require integer n in 0..30 and integer k in -1..31")
    if not isinstance(p, F) or not 0 <= p <= 1:
        raise ValueError("Success probability must be a Fraction in [0, 1]")
    if k < 0 or k > n:
        return F(0)
    # An exponent of zero denotes the empty product, including at p = 0 or 1.
    return comb(n, k) * p**k * (1 - p)**(n - k)


def main():
    assert [pmf(2, F(1, 2), k) for k in range(3)] == [F(1, 4), F(1, 2), F(1, 4)]
    assert pmf(3, F(1, 4), 1) == F(27, 64)
    assert pmf(0, F(2, 5), 0) == 1
    assert pmf(0, F(2, 5), 1) == 0
    assert pmf(3, F(0), 0) == pmf(3, F(1), 3) == 1
    assert pmf(2, F(1, 2), -1) == pmf(2, F(1, 2), 3) == 0
    percentage = F('12.34') / 100
    assert percentage == F(617, 5000)
    for n in range(31):
        for p in (F(0), F(1, 10000), percentage, F(1, 2), F(9999, 10000), F(1)):
            distribution = [pmf(n, p, k) for k in range(n + 1)]
            assert sum(distribution, F(0)) == 1
            assert sum((k * mass for k, mass in enumerate(distribution)), F(0)) == n * p
    for args in ((-1, F(1, 2), 0), (31, F(1, 2), 0), (2, F(-1), 0), (2, F(2), 0), (2, 0.5, 1), (2, F(1, 2), 1.5)):
        try:
            pmf(*args)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid binomial parameters accepted")
    print("Binomial(2, 1/2) exact:", [pmf(2, F(1, 2), k) for k in range(3)])
    print("Binomial(3, 1/4), k = 1:", pmf(3, F(1, 4), 1))
    print("Zero trials:", pmf(0, percentage, 0), "; impossible k:", pmf(2, percentage, 3))


if __name__ == "__main__":
    main()
