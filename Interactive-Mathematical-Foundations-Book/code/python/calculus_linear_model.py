"""The tangent-line model and its exact error (III.4)."""
from fractions import Fraction as F


def linear_model(f, fprime, x0, dx):
    return f(x0) + fprime(x0) * dx


f = lambda x: x * x
fprime = lambda x: 2 * x

x0 = F(3)
for dx in [F(1), F(1, 10), F(-1, 100)]:
    error = f(x0 + dx) - linear_model(f, fprime, x0, dx)
    assert error == dx * dx            # for x**2 the error is exactly dx**2

assert linear_model(f, fprime, x0, F(1, 10)) == F(96, 10)

# error/dx -> 0: the model is accurate to first order.
ratios = [(f(x0 + d) - linear_model(f, fprime, x0, d)) / d for d in (F(1, 2**k) for k in range(10))]
assert ratios == [F(1, 2**k) for k in range(10)]
