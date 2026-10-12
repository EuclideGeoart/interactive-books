"""Runnable spread reference; exact mechanics / NumPy companion."""
import numpy as np
x=np.array([1.,2.,3.])
variance=x.var(ddof=0)
sample=x.var(ddof=1) if len(x)>1 else None
mad=np.median(np.abs(x-np.median(x)))
assert np.isclose(variance,2/3) and sample==1 and mad==1
print(variance,sample,mad)
