import numpy as np
A = np.array([[2.,0.],[0.,-1.]])
values, vectors = np.linalg.eig(A)  # Eigenvectors are columns; they must be nonzero.
for value, vector in zip(values, vectors.T):
    assert np.linalg.norm(A @ vector-value*vector) < 1e-12
rotation = np.array([[0.,-1.],[1.,0.]])
assert np.all(np.abs(np.linalg.eigvals(rotation).imag) > 0)
# A defective matrix has one independent eigen-direction, despite two repeated roots.
