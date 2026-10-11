"""Directional curvature u^T H u lies between the eigenvalues of a symmetric Hessian (III.11)."""
import numpy as np

H = np.array([[6.0, 1.5], [1.5, 2.0]])
lam, V = np.linalg.eigh(H)
theta = np.linspace(0, np.pi, 721)
U = np.stack([np.cos(theta), np.sin(theta)], axis=1)
curv = np.einsum("ni,ij,nj->n", U, H, U)
assert lam[0] - 1e-12 <= curv.min() and curv.max() <= lam[1] + 1e-12
assert np.isclose(curv.max(), lam[1], atol=1e-4) and np.isclose(np.prod(lam), np.linalg.det(H))
