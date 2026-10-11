import numpy as np

A = np.array([[1.0, 1.0], [0.0, 1.0]])
x = np.array([2.0, 1.0])
b = np.array([2.0, -1.0])

np.testing.assert_allclose(A @ x, [3.0, 1.0])
np.testing.assert_allclose(A @ np.zeros(2), np.zeros(2))
np.testing.assert_allclose(A @ np.zeros(2) + b, b)
