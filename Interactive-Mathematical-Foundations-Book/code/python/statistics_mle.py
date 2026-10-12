"""Runnable mle reference with explicit boundary policy."""
from fractions import Fraction as F
def mle(data):
    if any(x not in [0,1] for x in data):raise ValueError('binary observations required')
    return F(sum(data),len(data)) if data else None
assert mle([1,0,1,1,0])==F(3,5)
assert mle([1,1,1])==1 and mle([0,0,0])==0
assert mle([]) is None  # Every theta maximizes the empty likelihood.
print(mle([1,0,1,1,0]))
