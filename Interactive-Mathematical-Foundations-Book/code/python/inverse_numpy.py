import numpy as np
A = np.array([[2., 1.], [1., 1.]])
x = np.array([2., 1.])
y = A @ x
B = np.linalg.inv(A)  # Display an undoing map when it is actually needed.
assert np.allclose(B @ y, x)
assert np.allclose(B @ A, np.eye(2)) and np.allclose(A @ B, np.eye(2))
assert np.allclose(np.linalg.solve(A, y), x)  # Preferred for solving one system.
