import numpy as np

A = np.array([[1.0, 1.0], [1.0, -1.0]])
b = np.array([3.0, 1.0])
np.testing.assert_allclose(np.linalg.solve(A, b), [2.0, 1.0])

parallel = np.array([[1.0, 1.0], [2.0, 2.0]])
assert np.linalg.matrix_rank(parallel) == 1
assert np.linalg.matrix_rank(np.column_stack((parallel, [1.0, 3.0]))) == 2
assert np.linalg.matrix_rank(np.column_stack((parallel, [1.0, 2.0]))) == 1
