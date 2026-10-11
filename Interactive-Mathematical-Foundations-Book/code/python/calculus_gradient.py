"""Gradient and directional derivatives, exact; the limit definition agrees with grad . u (III.8)."""
from fractions import Fraction as F

f = lambda x, y: x * x / 2 + 2 * y * y
grad = lambda x, y: (x, 4 * y)

p = (F(1), F(1, 2))
g = grad(*p)
assert g == (1, 2)


def directional(d):
    if d == (0, 0):
        raise ValueError("the zero vector has no direction")
    n2 = d[0] ** 2 + d[1] ** 2
    return (g[0] * d[0] + g[1] * d[1]), n2           # rate = numerator / sqrt(n2)


num, n2 = directional((F(3), F(4)))
assert (num, n2) == (11, 25)                          # rate 11/5

# Limit definition along the unit direction u = (3/5, 4/5): m(h) is a polynomial of degree 1 in h.
u = (F(3, 5), F(4, 5))
m = lambda h: (f(p[0] + h * u[0], p[1] + h * u[1]) - f(*p)) / h
assert 2 * m(F(1, 4)) - m(F(1, 2)) == F(11, 5)

# The gradient is perpendicular to the level-curve tangent t = (-g_y, g_x).
t = (-g[1], g[0])
assert g[0] * t[0] + g[1] * t[1] == 0
