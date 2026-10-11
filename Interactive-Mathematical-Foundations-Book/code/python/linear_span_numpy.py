import numpy as np

u = np.array([2.0, 1.0])
v = np.array([1.0, 2.0])
a, b = 1.0, -0.5
w = a * u + b * v
assert np.array_equal(w, [1.5, 0])
# Sample the bounded coefficient square, not the entire mathematical span.
coefficients = np.array([[a, b] for a in [-2, 0, 2] for b in [-2, 0, 2]])
columns = np.column_stack((u, v))
reachable_samples = coefficients @ columns.T
assert reachable_samples.shape == (9, 2)
