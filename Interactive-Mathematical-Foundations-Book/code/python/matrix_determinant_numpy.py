import numpy as np

A = np.array([[2.0, 1.0], [0.0, 3.0]])
reflection = np.array([[0.0, 1.0], [1.0, 0.0]])
singular = np.array([[1.0, 2.0], [2.0, 4.0]])

assert np.isclose(np.linalg.det(A), 6.0)
assert np.isclose(np.linalg.det(reflection), -1.0)
assert np.isclose(np.linalg.det(singular), 0.0)
