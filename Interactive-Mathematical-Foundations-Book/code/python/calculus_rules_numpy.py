"""Rules with numpy.polynomial: products differentiate like expansions; quotients are masked where v = 0 (III.5)."""
import numpy as np
from numpy.polynomial import Polynomial as P

u, v = P([1, 1]), P([1, 0, 1])
x = np.linspace(-2, 2, 9)
assert np.allclose((u * v).deriv()(x), u.deriv()(x) * v(x) + u(x) * v.deriv()(x))

w = P([-1, 0, 1])                                  # x**2 - 1: zero at +-1
valid = w(x) != 0
q_prime = (u.deriv()(x[valid]) * w(x[valid]) - u(x[valid]) * w.deriv()(x[valid])) / w(x[valid]) ** 2
assert valid.sum() == len(x) - 2 and np.all(np.isfinite(q_prime))
