"""Runnable summaries reference; exact mechanics / NumPy companion."""
import numpy as np
x=np.array([1,2,2,3,7],dtype=float)
values, counts=np.unique(x,return_counts=True)
modes=values[counts==counts.max()]
assert x.mean()==3 and np.median(x)==2 and modes.tolist()==[2]
print(x.mean(),np.median(x),modes)
