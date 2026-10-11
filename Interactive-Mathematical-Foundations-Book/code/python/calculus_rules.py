"""Product and quotient rules checked against expansion, with exact Fractions (III.5)."""
from fractions import Fraction as F


def poly_eval(c, x):
    return sum(ck * x**k for k, ck in enumerate(c))


def poly_mul(a, b):
    out = [F(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def poly_der(c):
    return [k * ck for k, ck in enumerate(c)][1:]


u, v = [F(1), F(1)], [F(1), F(0), F(1)]          # u = x + 1, v = x**2 + 1
x = F(1)
product_rule = poly_eval(poly_der(u), x) * poly_eval(v, x) + poly_eval(u, x) * poly_eval(poly_der(v), x)
assert product_rule == poly_eval(poly_der(poly_mul(u, v)), x) == 6


def quotient_rule(u, v, x):
    vx = poly_eval(v, x)
    if vx == 0:
        raise ZeroDivisionError("v(x) = 0: u/v and its derivative are undefined")
    return (poly_eval(poly_der(u), x) * vx - poly_eval(u, x) * poly_eval(poly_der(v), x)) / vx**2


assert quotient_rule(u, v, x) == F(-1, 2)
try:
    quotient_rule(u, [F(-1), F(0), F(1)], F(1))     # v = x**2 - 1 vanishes at 1
except ZeroDivisionError:
    pass
else:
    raise AssertionError("the quotient rule must not apply where v = 0")
