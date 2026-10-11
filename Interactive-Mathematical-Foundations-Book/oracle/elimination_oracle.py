"""Independent Fraction Gauss–Jordan oracle, with structural rank checked by minors."""
from fractions import Fraction as F
from itertools import combinations, permutations
from pathlib import Path
import json
import random
import sys

FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/elimination.fixtures.json'

def determinant(a):
    n = len(a)
    return sum(((-1) ** sum(p[i] > p[j] for i in range(n) for j in range(i + 1, n))) *
               product(a[i][p[i]] for i in range(n)) for p in permutations(range(n)))

def product(xs):
    value = F(1)
    for x in xs:
        value *= x
    return value

def structural_rank(a):
    for k in range(min(len(a), len(a[0])), 0, -1):
        if any(determinant([[a[i][j] for j in cols] for i in rows]) != 0
               for rows in combinations(range(len(a)), k) for cols in combinations(range(len(a[0])), k)):
            return k
    return 0

def solve(a, b):
    a = [[F(str(x)) for x in row] for row in a]
    b = list(map(lambda x: F(str(x)), b))
    m, n = len(a), len(a[0])
    aug = [row + [rhs] for row, rhs in zip(a, b)]
    pivots = []
    for j in range(n + 1):
        candidates = [i for i in range(len(pivots), m) if aug[i][j]]
        if not candidates:
            continue
        r = len(pivots)
        # Oracle uses the largest absolute pivot and eliminates above AND below immediately.
        i = max(candidates, key=lambda k: abs(aug[k][j]))
        aug[r], aug[i] = aug[i], aug[r]
        pivot = aug[r][j]
        aug[r] = [x / pivot for x in aug[r]]
        for i in range(m):
            if i != r:
                factor = aug[i][j]
                aug[i] = [x - factor*y for x, y in zip(aug[i], aug[r])]
        pivots.append(j)
    pivots = [j for j in pivots if j < n]
    rank = structural_rank(a)
    assert rank == len(pivots)
    free = [j for j in range(n) if j not in pivots]
    basis = []
    for j in free:
        x = [F(0)] * n
        x[j] = F(1)
        for i, p in enumerate(pivots):
            x[p] = -aug[i][j]
        assert all(sum(c*y for c, y in zip(row, x)) == 0 for row in a)
        basis.append(x)
    none = any(not any(row[:n]) and row[n] for row in aug)
    x = None if none else [F(0)]*n
    if x is not None:
        for i, p in enumerate(pivots):
            x[p] = aug[i][n]
        assert [sum(c*y for c, y in zip(row, x)) for row in a] == b
    inv = None
    if m == n and rank == n and n <= 3:
        # Cofactors/adjugate are independent of the browser's [A | I] derivation.
        det = determinant(a)
        inv = [[((-1)**(i+j))*determinant([[a[r][c] for c in range(n) if c != i] for r in range(n) if r != j])/det
                if n > 1 else F(1)/a[0][0] for j in range(n)] for i in range(n)]
    strings = lambda rows: [[str(x) for x in row] for row in rows]
    return dict(rank=rank, nullity=n-rank, pivots=pivots, rref=strings(aug), nullspace=strings(basis),
                kind='none' if none else 'infinite' if rank < n else 'unique',
                particular=None if x is None else list(map(str, x)), inverse=None if inv is None else strings(inv))

def cases():
    inputs = [([[1, 1], [1, -1]], [3, 1]), ([[0, 1], [2, 1]], [1, 3]),
              ([[0.5, 1], [1, -0.5]], [1, 0]), ([[0, 1, 2], [0, 2, 4]], [1, 2]),
              ([[1, 1], [2, 2]], [1, 3]), ([[0, 0], [0, 0]], [0, 0]),
              ([[0, 0], [0, 0]], [0, 1]), ([[4, 3.99], [3.99, 3.98]], [1, 2]),
              ([[1, 1, 0], [0, 1, 1], [1, 0, 1]], [3, 3, 2]),
              ([[1, 0], [0, 1], [1, 1]], [1, 2, 4]), ([[0]], [0]), ([[2]], [3])]
    rng = random.Random(61416)
    for _ in range(48):
        m, n = rng.randint(1, 4), rng.randint(1, 4)
        inputs.append(([[rng.randint(-8, 8)/4 for _ in range(n)] for _ in range(m)], [rng.randint(-4, 4) for _ in range(m)]))
    return [dict(a=a, b=b, expected=solve(a, b)) for a, b in inputs]

def main():
    data = json.dumps(dict(method='Fraction Gauss–Jordan + minors/adjugate; all rationals exact', seed=61416, cases=cases()), indent=2) + '\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text() != data:
            raise SystemExit('elimination fixture stale; regenerate deliberately')
        print('elimination: 60 exact cases fresh')
    else:
        FIXTURE.write_text(data)

if __name__ == '__main__':
    main()
