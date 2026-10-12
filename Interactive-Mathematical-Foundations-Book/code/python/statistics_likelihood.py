"""Runnable likelihood reference with explicit boundary policy."""
from fractions import Fraction as F
from math import log, log1p, inf
data=[1,0,1,1,0];theta=F(3,5)
likelihood=F(1)
for x in data:likelihood*=theta if x else 1-theta
k=sum(data);failures=len(data)-k
log_likelihood=(k*log(float(theta)) if k else 0)+(failures*log1p(-float(theta)) if failures else 0)
assert likelihood==F(108,3125)
assert abs(log_likelihood-log(float(likelihood)))<1e-14
# A success is impossible at theta=0: L=0 and the extended log is -infinity.
assert (F(0) if data[0] else F(1))==0
print(likelihood,log_likelihood)
