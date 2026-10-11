"""Secant slopes as exact difference quotients (III.3). h must be nonzero; the derivative is a limit, never m(0)."""
from fractions import Fraction as F


def poly_value(coefficients, x):
    """coefficients[k] multiplies x**k (constant term first)."""
    return sum(c * x**k for k, c in enumerate(coefficients))


def secant_slope(f, x, h):
    if h == 0:
        raise ZeroDivisionError("h = 0: two equal points determine no secant")
    return (f(x + h) - f(x)) / h


cubic = [F(0), F(-1), F(0), F(1, 6)]           # x**3/6 - x
f = lambda x: poly_value(cubic, x)

# Exact slopes for h = 1, 1/2, 1/4, ...: they approach f'(1) = 1/2 - 1 = -1/2.
slopes = [secant_slope(f, F(1), F(1, 2**k)) for k in range(6)]
assert slopes[:3] == [F(1, 6), F(-5, 24), F(-35, 96)]
assert all(abs(b + F(1, 2)) < abs(a + F(1, 2)) for a, b in zip(slopes, slopes[1:]))

# |x| at 0: the one-sided slopes are exactly -1 and 1, so no derivative exists.
absolute = lambda x: abs(x)
right = {secant_slope(absolute, F(0), F(1, 2**k)) for k in range(8)}
left = {secant_slope(absolute, F(0), -F(1, 2**k)) for k in range(8)}
assert right == {1} and left == {-1}

try:
    secant_slope(f, F(1), F(0))
except ZeroDivisionError:
    pass
else:
    raise AssertionError("h = 0 must not produce a slope")
