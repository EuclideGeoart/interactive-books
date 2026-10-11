import numpy as np
A = np.array([[0., 1., 2.], [0., 2., 4.]])
U, s, Vt = np.linalg.svd(A, full_matrices=True)
# NumPy rank is a numerical decision with a scale-sensitive tolerance.
tolerance = s.max() * max(A.shape) * np.finfo(float).eps
rank = np.count_nonzero(s > tolerance)
null_basis = Vt[rank:].T
assert rank == 1 and null_basis.shape == (3, 2)
assert np.allclose(A @ null_basis, 0)
# This tolerance models finite precision; it does not redefine exact rank.
