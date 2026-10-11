"""Exact errors of four quadrature rules for x**2 on [0, 1]; observed orders 1 and 2 (III.15)."""
from fractions import Fraction as F
import math


def rule(name, f, a, b, n):
    h = (b - a) / n
    x = [a + i * h for i in range(n + 1)]
    if name == "left":
        return h * sum(f(t) for t in x[:-1])
    if name == "right":
        return h * sum(f(t) for t in x[1:])
    if name == "midpoint":
        return h * sum(f((s + t) / 2) for s, t in zip(x, x[1:]))
    return h * (f(x[0]) / 2 + sum(f(t) for t in x[1:-1]) + f(x[-1]) / 2)


f = lambda t: t * t
exact = F(1, 3)
for n in (1, 2, 4, 8, 16):
    assert rule("trapezoid", f, F(0), F(1), n) - exact == F(1, 6 * n * n)
    assert rule("midpoint", f, F(0), F(1), n) - exact == F(-1, 12 * n * n)
    assert rule("left", f, F(0), F(1), n) - exact == F(-1, 2 * n) + F(1, 6 * n * n)

order = lambda e1, e2: math.log2(abs(e1) / abs(e2))
e = [rule("left", f, F(0), F(1), 2**k) - exact for k in range(8, 10)]
assert abs(order(*e) - 1) < 0.01
