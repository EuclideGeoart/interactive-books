"""Linearize sin at x0 and watch e/dx**2 approach f''(x0)/2 = -sin(x0)/2 (III.4)."""
import numpy as np

x0 = 0.5
dx = 2.0 ** -np.arange(1, 12)
error = np.sin(x0 + dx) - (np.sin(x0) + np.cos(x0) * dx)
ratio = error / dx**2
assert abs(ratio[-1] + np.sin(x0) / 2) < 1e-3
# Far away the model is poor: at dx = 3 the error is larger than 1.
assert abs(np.sin(x0 + 3) - (np.sin(x0) + np.cos(x0) * 3)) > 1
