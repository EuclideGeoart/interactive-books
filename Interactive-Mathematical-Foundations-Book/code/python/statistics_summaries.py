"""Runnable summaries reference; exact mechanics / NumPy companion."""
from fractions import Fraction as F
from collections import Counter
x = [F(v) for v in [1,2,2,3,7]]
a = sorted(x)
mean = sum(x)/len(x)
median = a[len(a)//2]
counts = Counter(x)
modes = [v for v,c in counts.items() if c == max(counts.values())]
assert (mean,median,modes)==(F(3),F(2),[F(2)])
print(mean, median, modes)
