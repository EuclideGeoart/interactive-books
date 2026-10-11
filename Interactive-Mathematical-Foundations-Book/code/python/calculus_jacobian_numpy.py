"""Linearisation error ratio ||F(p+d) - F(p) - J d|| / ||d|| shrinks with d (III.9)."""
import numpy as np

def F(v):
    x, y = v
    return np.array([x * x - y * y, 2 * x * y])

def J(v):
    x, y = v
    return np.array([[2 * x, -2 * y], [2 * y, 2 * x]])

p = np.array([1.0, 0.5])
direction = np.array([1.0, 1.0]) / np.sqrt(2)
ratios = []
for s in 2.0 ** -np.arange(1, 12):
    d = s * direction
    ratios.append(np.linalg.norm(F(p + d) - F(p) - J(p) @ d) / np.linalg.norm(d))
assert np.all(np.diff(ratios) < 0) and ratios[-1] < 1e-3
assert J(p).shape == (2, 2) and np.isclose(np.linalg.det(J(p)), 5.0)
