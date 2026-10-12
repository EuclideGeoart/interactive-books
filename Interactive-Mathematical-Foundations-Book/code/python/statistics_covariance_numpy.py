"""Runnable covariance reference, assumptions explicit."""
import numpy as np
x=np.array([[-3,-1],[-1,0],[0,1],[1,2],[3,3]],dtype=float)
centered=x-x.mean(axis=0)
cov=centered.T@centered/len(x)
eigenvalues,eigenvectors=np.linalg.eigh(cov)
assert np.allclose(cov,[[4,2.8],[2.8,2]]) and np.all(eigenvalues>=0)
print(cov,eigenvalues,eigenvectors)
