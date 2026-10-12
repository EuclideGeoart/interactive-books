"""Runnable intervals reference, assumptions explicit."""
import numpy as np
from statistics import NormalDist
sample=np.array([1.,2.,3.,1.,2.,3.,1.,3.]); mu=2.;sigma=1.5
z=NormalDist().inv_cdf(.975)
interval=sample.mean()+np.array([-1.,1.])*z*sigma/np.sqrt(sample.size)
assert sample.mean()==2 and interval[0]<mu<interval[1]
print(interval, 'sigma known; exact normal model, not an estimated-sigma interval')
