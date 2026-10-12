"""Runnable map reference with explicit boundary policy."""
import numpy as np
from math import lgamma
data=np.array([1,0,1,1,0]);alpha,beta=2.,2.
a=alpha+data.sum();b=beta+data.size-data.sum()
# This formula is used only after checking a>1 and b>1.
assert a>1 and b>1
mode=(a-1)/(a+b-2)
x=np.array([.25,.5,.75])
log_beta=lgamma(a)+lgamma(b)-lgamma(a+b)
posterior=np.exp((a-1)*np.log(x)+(b-1)*np.log1p(-x)-log_beta)
assert np.isclose(mode,4/7) and np.isclose(posterior[1],35/16)
print('MAP:',mode,'posterior densities:',posterior)
