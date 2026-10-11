"""Construct [A | I] -> [I | inverse] through exact row operations."""
from fractions import Fraction as F

def inverse(a):
    n = len(a)
    rows = [[F(x) for x in row] + [F(i == j) for j in range(n)] for i, row in enumerate(a)]
    for j in range(n):
        pivot = next((i for i in range(j, n) if rows[i][j]), None)
        if pivot is None:
            return None
        rows[j], rows[pivot] = rows[pivot], rows[j]
        factor = rows[j][j]
        rows[j] = [x/factor for x in rows[j]]
        for i in range(n):
            if i != j:
                factor = rows[i][j]
                rows[i] = [x-factor*y for x, y in zip(rows[i], rows[j])]
    return [row[n:] for row in rows]

A = [[2, 1], [1, 1]]
B = inverse(A)
assert B == [[1, -1], [-1, 2]]
assert inverse([[1, 2], [2, 4]]) is None
for left, right in ((A, B), (B, A)):
    assert [[sum(left[i][k]*right[k][j] for k in range(2)) for j in range(2)] for i in range(2)] == [[1, 0], [0, 1]]
