"""Runnable mle reference with explicit boundary policy."""
import numpy as np
def mle(data):
    x=np.asarray(data)
    if np.any((x!=0)&(x!=1)):raise ValueError('binary observations required')
    return x.mean() if x.size else None
assert mle([1,0,1,1,0])==.6
assert mle([1,1,1])==1 and mle([0,0,0])==0 and mle([]) is None
print(mle([1,0,1,1,0]))
