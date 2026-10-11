import numpy as np
# Rectangular thin SVD: (3×2) = (3×2)(2×2)(2×2).
A=np.array([[1.,0.],[0.,1.],[1.,1.]])
U,s,Vt=np.linalg.svd(A,full_matrices=False)
assert U.shape==(3,2) and s.shape==(2,) and Vt.shape==(2,2)
assert np.allclose(U@np.diag(s)@Vt,A)
A1=s[0]*np.outer(U[:,0],Vt[0])
assert np.isclose(np.linalg.norm(A-A1,'fro'),s[1])
b=np.array([1.,2.,4.])
x=np.linalg.pinv(A,rcond=1e-12)@b  # Explicit numerical cutoff, not an exact-rank claim.
assert np.allclose(A.T@(A@x-b),0)
# For singular A, pinv gives the minimum-norm least-squares solution.
# PCA centers data first; right singular vectors identify feature directions.
