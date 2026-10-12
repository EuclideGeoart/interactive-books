"""Runnable likelihood reference with explicit boundary policy."""
import numpy as np
data=np.array([1,0,1,1,0]);theta=.6
factors=np.where(data==1,theta,1-theta)
likelihood=np.prod(factors)
log_likelihood=np.sum(np.log(factors))
assert np.isclose(likelihood,108/3125) and np.isclose(np.exp(log_likelihood),likelihood)
# Empty products equal 1 and empty sums equal 0.
assert np.prod(np.array([]))==1 and np.sum(np.array([]))==0
print(likelihood,log_likelihood)
