"""Runnable sampling reference; exact mechanics / NumPy companion."""
import numpy as np
state=42
population=np.array([0,1,2,3,6,7,8,9])
indices=[]
for _ in range(4):
    state=(1664525*state+1013904223)%2**32
    indices.append(state*len(population)//2**32)
sample=population[indices]
assert sample.tolist()==[2,0,6,1] and sample.mean()==2.25
print(sample,sample.mean())
