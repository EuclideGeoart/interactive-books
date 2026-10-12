"""Runnable sampling reference; exact mechanics / NumPy companion."""
from fractions import Fraction as F
state=42
population=[0,1,2,3,6,7,8,9]
sample=[]
for _ in range(4):
    state=(1664525*state+1013904223)%2**32
    sample.append(population[state*len(population)//2**32])
assert sample==[2,0,6,1]
assert F(sum(sample),len(sample))==F(9,4)
print(sample,F(sum(sample),len(sample)))
