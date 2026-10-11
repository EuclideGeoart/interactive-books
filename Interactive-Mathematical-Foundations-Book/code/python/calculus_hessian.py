"""Exact Hessians, symmetric mixed partials and the second-derivative test (III.11)."""
from fractions import Fraction as F


def d(p, var):
    k = 0 if var == "x" else 1
    out = {}
    for (i, j), c in p.items():
        e = (i, j)[k]
        if e:
            key = (i - 1, j) if k == 0 else (i, j - 1)
            out[key] = out.get(key, 0) + c * e
    return out


def ev(p, x, y):
    return sum(c * x**i * y**j for (i, j), c in p.items())


def classify(p, x, y):
    if ev(d(p, "x"), x, y) != 0 or ev(d(p, "y"), x, y) != 0:
        return "not critical"
    fxx, fyy = ev(d(d(p, "x"), "x"), x, y), ev(d(d(p, "y"), "y"), x, y)
    fxy, fyx = ev(d(d(p, "x"), "y"), x, y), ev(d(d(p, "y"), "x"), x, y)
    assert fxy == fyx
    det = fxx * fyy - fxy * fxy
    if det < 0:
        return "saddle"
    if det == 0:
        return "inconclusive"
    return "minimum" if fxx > 0 else "maximum"


well = {(3, 0): F(1), (1, 0): F(-3), (0, 2): F(1)}           # x**3 - 3x + y**2
assert classify(well, F(1), F(0)) == "minimum"
assert classify(well, F(-1), F(0)) == "saddle"
assert classify(well, F(0), F(1, 2)) == "not critical"
for degenerate in ({(4, 0): F(1), (0, 4): F(1)}, {(2, 0): F(1), (0, 3): F(1)}, {(3, 0): F(1), (1, 2): F(-3)}):
    assert classify(degenerate, F(0), F(0)) == "inconclusive"
