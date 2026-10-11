"""Vectorised Riemann sums: left/right errors shrink like 1/n, midpoint/trapezoid like 1/n**2 (III.12)."""
import numpy as np

f = lambda x: x**3 / 4 - x
a, b, exact = -2.0, 3.0, 25 / 16
errors = {}
for n in (16, 32, 64, 128):
    x = np.linspace(a, b, n + 1)
    dx = (b - a) / n
    errors[n] = {
        "left": abs(np.sum(f(x[:-1])) * dx - exact),
        "midpoint": abs(np.sum(f((x[:-1] + x[1:]) / 2)) * dx - exact),
        "trapezoid": abs(np.trapezoid(f(x), x) - exact),
    }
assert 1.8 < errors[64]["left"] / errors[128]["left"] < 2.2
assert 3.8 < errors[64]["trapezoid"] / errors[128]["trapezoid"] < 4.2
assert 3.8 < errors[64]["midpoint"] / errors[128]["midpoint"] < 4.2
