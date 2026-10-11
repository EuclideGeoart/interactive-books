import numpy as np
A = np.array([[0., 1.], [2., 1.]])
b = np.array([1., 3.])
x = np.linalg.solve(A, b)  # Solve directly; no explicit inverse.
assert np.allclose(x, [1., 1.])
assert np.allclose(A @ x, b)
# Rectangular/inconsistent systems need least squares, introduced in II.18.
