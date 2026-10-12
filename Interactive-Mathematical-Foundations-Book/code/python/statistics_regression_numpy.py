"""Runnable regression reference, assumptions explicit."""
import numpy as np
x=np.array([-3,-1,0,1,3],dtype=float);y=np.array([-1,0,1,2,3],dtype=float)
design=np.column_stack([np.ones(len(x)),x])
coefficients,_,rank,_=np.linalg.lstsq(design,y,rcond=None)
residual=y-design@coefficients
assert rank==2 and np.allclose(coefficients,[1,.7])
assert np.allclose(design.T@residual,0) and np.isclose(residual@residual,.2)
print(coefficients, residual@residual, 'rank:',rank)
