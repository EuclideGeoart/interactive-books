"""The steepest direction maximises grad . u over all unit vectors (III.8)."""
import numpy as np

g = np.array([1.0, 2.0])
theta = np.linspace(-np.pi, np.pi, 3601)
U = np.stack([np.cos(theta), np.sin(theta)], axis=1)
rates = U @ g
best = U[np.argmax(rates)]
assert abs(rates.max() - np.linalg.norm(g)) < 1e-6
assert np.allclose(best, g / np.linalg.norm(g), atol=1e-3)
assert abs(rates.min() + np.linalg.norm(g)) < 1e-6
