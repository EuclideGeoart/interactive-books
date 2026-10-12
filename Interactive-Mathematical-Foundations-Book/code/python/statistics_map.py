"""Runnable map reference with explicit boundary policy."""
from fractions import Fraction as F
from math import exp,lgamma,log,log1p
def modes(a,b):
    a,b=F(a),F(b)
    if a>1 and b>1:return [(a-1)/(a+b-2)]
    if a==b==1:return 'all parameters'
    if a<1 and b<1:return 'both divergent endpoint limits'
    return [F(0) if a<=1 and b>=1 else F(1)]
data=[1,0,1,1,0];alpha,beta=2,2;a=alpha+sum(data);b=beta+len(data)-sum(data)
x=.5;log_beta=lgamma(a)+lgamma(b)-lgamma(a+b)
posterior=exp((a-1)*log(x)+(b-1)*log1p(-x)-log_beta)
assert (a,b)==(5,4) and modes(a,b)==[F(4,7)]
assert abs(posterior-35/16)<1e-12
assert modes(1,1)=='all parameters' and modes(.5,.5)=='both divergent endpoint limits'
assert modes(1,4)==[0] and modes(4,1)==[1]
print('Posterior Beta',a,b,'MAP:',modes(a,b),'density:',posterior)
