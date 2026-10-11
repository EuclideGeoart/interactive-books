"""One-sided approach tables with exact Fractions (III.1). We evaluate only at x != a; f(a) is a separate question."""
from fractions import Fraction as F


def hole(x):
    if x == 1:
        raise ZeroDivisionError("(x**2 - 1)/(x - 1) is 0/0 at x = 1: undefined")
    return (x * x - 1) / (x - 1)


def approach(f, a, steps=8):
    rows = []
    for k in range(steps):
        d = F(1, 2**k)
        rows.append((d, f(a - d), f(a + d)))
    return rows


rows = approach(hole, F(1))
# f(x) - 2 = x - 1 exactly, so each sample sits exactly delta away from 2.
assert all(left == 2 - d and right == 2 + d for d, left, right in rows)

# The value at the point is not the limit: it does not even exist.
try:
    hole(F(1))
except ZeroDivisionError:
    pass
else:
    raise AssertionError("f(1) must be undefined")

# A jump: the two one-sided tables settle on different numbers.
step = lambda x: F(-1) if x < 0 else F(1)
jump = approach(step, F(0))
assert {left for _, left, _ in jump} == {-1} and {right for _, _, right in jump} == {1}
