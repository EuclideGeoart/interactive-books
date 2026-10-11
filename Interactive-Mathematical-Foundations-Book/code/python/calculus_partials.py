"""Partial derivatives as derivatives of slices, with exact Fractions (III.7)."""
from fractions import Fraction as F

# f(x, y) = sum c * x**i * y**j, stored as {(i, j): c}
f = {(2, 0): F(1), (0, 2): F(-1)}            # x**2 - y**2


def value(p, x, y):
    return sum(c * x**i * y**j for (i, j), c in p.items())


def d_dx(p):
    return {(i - 1, j): c * i for (i, j), c in p.items() if i > 0}


def d_dy(p):
    return {(i, j - 1): c * j for (i, j), c in p.items() if j > 0}


x, y = F(1), F(1, 2)
assert (value(d_dx(f), x, y), value(d_dy(f), x, y)) == (2, -1)

# The same numbers as limits of exact secants along each axis: m(h) is a polynomial in h, so 2 nonzero steps fix it.
def axis_slope(axis, h):
    step = (h, 0) if axis == 'x' else (0, h)
    return (value(f, x + step[0], y + step[1]) - value(f, x, y)) / h


for axis, expected in (('x', 2), ('y', -1)):
    m1, m2 = axis_slope(axis, F(1, 4)), axis_slope(axis, F(1, 2))
    # linear in h: extrapolate to h = 0
    assert m1 - (m2 - m1) == expected
