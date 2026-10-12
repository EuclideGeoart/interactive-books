"""NumPy dense cross-check of small COO/CSR; no SciPy backend or speed claim."""
import numpy as np
from sparse_matrices import sparse
if __name__=='__main__':
    entries=[(0,0,2),(0,0,-2),(1,2,3),(2,2,0)]
    a=np.zeros((3,3),dtype=np.float64)
    for row,col,value in entries:a[row,col]+=value
    x=np.array([1.,2.,3.]);answer=a@x
    exact=sparse(3,3,entries,[1,2,3])[-1]
    np.testing.assert_array_equal(answer,np.array(list(map(float,exact))))
    assert np.count_nonzero(a)==1 and np.all(a[0]==0) and np.all(a[2]==0)
    print('dense',a,'matvec',answer,'packed dense bytes',a.nbytes)
    # Exact-reference BigInt/Fraction objects and Python containers have separate memory costs.
