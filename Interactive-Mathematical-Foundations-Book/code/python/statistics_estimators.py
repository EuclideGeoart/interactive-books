"""Runnable estimators reference; exact mechanics / NumPy companion."""
from fractions import Fraction as F
estimates=list(map(F,[0,2]))
target=F(1)
mean=sum(estimates)/len(estimates)
bias=mean-target
variance=sum((x-mean)**2 for x in estimates)/len(estimates)
mse=sum((x-target)**2 for x in estimates)/len(estimates)
assert (bias,variance,mse)==(F(0),F(1),F(1))
assert mse==variance+bias*bias
print(bias,variance,mse)
