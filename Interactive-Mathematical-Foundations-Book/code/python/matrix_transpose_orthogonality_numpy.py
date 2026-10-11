import numpy as np

Q = np.array([[0.0, -1.0], [1.0, 0.0]])
x, y = np.array([2.0, 1.0]), np.array([-1.0, 2.0])

np.testing.assert_allclose(Q.T @ Q, np.eye(2))
np.testing.assert_allclose(np.linalg.inv(Q), Q.T)
np.testing.assert_allclose(np.linalg.norm(Q @ x), np.linalg.norm(x))
np.testing.assert_allclose((Q @ x) @ (Q @ y), x @ y)
