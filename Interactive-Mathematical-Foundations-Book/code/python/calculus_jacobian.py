"""Exact Jacobian of F(x, y) = (x**2 - y**2, 2xy), shape checks and the second-order error (III.9)."""
from fractions import Fraction as F

F_map = lambda x, y: (x * x - y * y, 2 * x * y)
J = lambda x, y: ((2 * x, -2 * y), (2 * y, 2 * x))


def mat_vec(A, v):
    if any(len(row) != len(v) for row in A):
        raise ValueError(f"shape mismatch: {len(A)}x{len(A[0])} times a {len(v)}-vector")
    return tuple(sum(a * b for a, b in zip(row, v)) for row in A)


p, d = (F(1), F(1, 2)), (F(1, 4), F(1, 4))
pred = tuple(a + b for a, b in zip(F_map(*p), mat_vec(J(*p), d)))
actual = F_map(p[0] + d[0], p[1] + d[1])
assert pred == (1, F(7, 4)) and actual == (1, F(15, 8))

# Halving the displacement quarters the error (it is second order).
def err(scale):
    dd = (d[0] * scale, d[1] * scale)
    a = F_map(p[0] + dd[0], p[1] + dd[1]); q = tuple(x + y for x, y in zip(F_map(*p), mat_vec(J(*p), dd)))
    return sum((x - y) ** 2 for x, y in zip(a, q))


assert err(F(1, 2)) == err(F(1)) / 16                  # squared error scales by (1/2)**4
try:
    mat_vec(J(*p), (F(1), F(0), F(0)))
except ValueError:
    pass
else:
    raise AssertionError("a 2x2 Jacobian must reject a 3-vector")
