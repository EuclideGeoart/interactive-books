import numpy as np
A=np.array([[1.,-1.],[1.,0.],[1.,1.]])
b=np.array([0.,2.,2.])
x, reported_residuals, rank, singular_values=np.linalg.lstsq(A,b,rcond=None)
r=b-A@x
assert np.allclose(x,[4/3,1]) and np.allclose(A.T@r,0)
assert np.isclose(r@r,2/3)
# Compute the residual directly: reported_residuals can be empty for deficient systems.
Q,R=np.linalg.qr(A,mode='reduced')
assert np.allclose(Q@(Q.T@b),A@x)
# QR/SVD avoid forming A.T@A, which squares the 2-norm condition number.
