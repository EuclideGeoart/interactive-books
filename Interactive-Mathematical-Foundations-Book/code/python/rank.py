"""Pivot rank and nullity, using exact row reduction."""
from pathlib import Path
import runpy
elimination = runpy.run_path(str(Path(__file__).with_name('elimination.py')))['elimination']
A = [[0, 1, 2], [0, 2, 4]]
R, _ = elimination(A, [0, 0])
rank = sum(any(row[:-1]) for row in R)
nullity = len(A[0]) - rank
null_vectors = [[1, 0, 0], [0, -2, 1]]
assert (rank, nullity) == (1, 2)
assert all(sum(a*x for a, x in zip(row, v)) == 0 for row in A for v in null_vectors)
