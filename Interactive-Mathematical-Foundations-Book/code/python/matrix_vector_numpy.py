import numpy as np

A = np.array([[1.0, 2.0, 3.0], [0.0, -1.0, 2.0]])
x = np.array([2.0, 1.0, -1.0])
assert A.shape == (2, 3) and x.shape == (3,)
np.testing.assert_allclose(A @ x, [1.0, -3.0])

try:
    A @ np.array([2.0, 1.0])
except ValueError:
    pass
else:
    raise AssertionError("incompatible dimensions must fail")
