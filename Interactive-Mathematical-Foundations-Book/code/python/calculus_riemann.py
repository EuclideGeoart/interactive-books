"""Exact Riemann and trapezoid sums with Fractions; signed integral versus geometric area (III.12)."""
from fractions import Fraction as F

f = lambda x: x**3 / 4 - x
antiderivative = lambda x: x**4 / 16 - x**2 / 2


def riemann(f, a, b, n, rule):
    dx = (b - a) / n
    xs = [a + i * dx for i in range(n + 1)]
    if rule == "left":
        return sum(f(x) for x in xs[:-1]) * dx
    if rule == "right":
        return sum(f(x) for x in xs[1:]) * dx
    if rule == "midpoint":
        return sum(f((x0 + x1) / 2) for x0, x1 in zip(xs, xs[1:])) * dx
    return sum((f(x0) + f(x1)) / 2 for x0, x1 in zip(xs, xs[1:])) * dx      # trapezoid


a, b = F(-2), F(3)
exact = antiderivative(b) - antiderivative(a)
assert exact == F(25, 16)
assert [riemann(f, a, b, 10, r) for r in ("left", "right", "midpoint", "trapezoid")] == [F(45, 64), F(165, 64), F(195, 128), F(105, 64)]

# Geometric area: split at the roots -2, 0, 2 and add absolute values.
pieces = [(F(-2), F(0)), (F(0), F(2)), (F(2), F(3))]
area = sum(abs(antiderivative(q) - antiderivative(p)) for p, q in pieces)
assert area == F(57, 16) and area != exact

# Reversing the limits reverses the sign (negative dx).
assert riemann(f, b, a, 10, "left") == -riemann(f, a, b, 10, "right")
