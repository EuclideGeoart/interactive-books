"""Runnable spread reference; exact mechanics / NumPy companion."""
from fractions import Fraction as F
from statistics import median
x=list(map(F,[1,2,3]))
mean=sum(x)/len(x)
squared_sum=sum((v-mean)**2 for v in x)
variance=squared_sum/len(x)
sample=squared_sum/(len(x)-1) if len(x)>1 else None
mad=median([abs(v-median(x)) for v in x])
assert (variance,sample,mad)==(F(2,3),F(1),F(1))
print(variance,sample,mad)
