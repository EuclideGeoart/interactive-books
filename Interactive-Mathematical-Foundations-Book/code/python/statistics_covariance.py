"""Runnable covariance reference, assumptions explicit."""
from fractions import Fraction as F
x=list(map(F,[-3,-1,0,1,3])); y=list(map(F,[-1,0,1,2,3]));weights=[1]*5
total=sum(weights);mx=sum(a*w for a,w in zip(x,weights))/total;my=sum(a*w for a,w in zip(y,weights))/total
vx=sum(w*(a-mx)**2 for a,w in zip(x,weights))/total
vy=sum(w*(b-my)**2 for b,w in zip(y,weights))/total
cov=sum(w*(a-mx)*(b-my) for a,b,w in zip(x,y,weights))/total
det=vx*vy-cov*cov
assert (vx,vy,cov,det)==(F(4),F(2),F(14,5),F(4,25))
assert det>=0
print([[vx,cov],[cov,vy]])
