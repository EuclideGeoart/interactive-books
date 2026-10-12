"""Runnable regression reference, assumptions explicit."""
from fractions import Fraction as F
x=list(map(F,[-3,-1,0,1,3]));y=list(map(F,[-1,0,1,2,3]));n=len(x)
mx=sum(x)/n;my=sum(y)/n
xx=sum((a-mx)**2 for a in x);xy=sum((a-mx)*(b-my) for a,b in zip(x,y))
slope=xy/xx if xx else None
intercept=my-slope*mx if slope is not None else None
predicted=[intercept+slope*a for a in x] if slope is not None else [my]*n
residual=[b-p for b,p in zip(y,predicted)]
rss=sum(r*r for r in residual)
assert (slope,intercept,rss)==(F(7,10),F(1),F(1,5))
assert sum(residual)==0 and sum(a*r for a,r in zip(x,residual))==0
print(slope,intercept,rss)
