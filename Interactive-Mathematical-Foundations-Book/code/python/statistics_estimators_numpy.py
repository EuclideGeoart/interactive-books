"""Runnable estimators reference; exact mechanics / NumPy companion."""
import numpy as np
estimates=np.array([0.,2.]); target=1.
bias=estimates.mean()-target
variance=estimates.var(ddof=0)
mse=np.mean((estimates-target)**2)
assert bias==0 and variance==1 and mse==1
assert np.isclose(mse,variance+bias**2)
print(bias,variance,mse)
