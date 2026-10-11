import numpy as np

A = np.array([[1.0, 1.0], [0.0, 1.0]])
B = np.array([[1.0, 0.0], [1.0, 1.0]])
x = np.array([2.0, 1.0])
b, c = np.array([1.0, -1.0]), np.array([0.0, 2.0])

np.testing.assert_allclose(B @ (A @ x), (B @ A) @ x)
assert not np.array_equal(B @ A, A @ B)
np.testing.assert_allclose(B @ (A @ x + b) + c, (B @ A) @ x + (B @ b + c))
