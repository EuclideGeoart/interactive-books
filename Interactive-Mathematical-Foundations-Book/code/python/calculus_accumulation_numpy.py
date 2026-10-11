"""Cumulative trapezoid accumulation of a sampled f, then numerical differentiation recovers f (III.13)."""
import numpy as np

t = np.linspace(-2, 3, 2001)
f = t**3 / 4 - t
F = np.concatenate([[0.0], np.cumsum((f[1:] + f[:-1]) / 2 * np.diff(t))])   # F(-2) = 0
exact = t**4 / 16 - t**2 / 2 + 1
assert np.max(np.abs(F - exact)) < 1e-5
recovered = np.gradient(F, t)
assert np.max(np.abs(recovered[1:-1] - f[1:-1])) < 1e-4
