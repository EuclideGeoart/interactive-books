"""Runnable intervals reference, assumptions explicit."""
from statistics import NormalDist
from math import sqrt
mu, sigma, n, confidence = 2., 1.5, 8, .95
# A hand-observed sample; the parameter is fixed, the sample mean is computed.
sample = [1.,2.,3.,1.,2.,3.,1.,3.]
mean = sum(sample)/len(sample)
z = NormalDist().inv_cdf((1+confidence)/2)
lo, hi = mean-z*sigma/sqrt(n), mean+z*sigma/sqrt(n)
assert mean==2 and lo<mu<hi
assert abs((2*NormalDist().cdf(z)-1)-confidence)<1e-14
print((lo,hi), 'contains fixed mu:', lo<=mu<=hi)
