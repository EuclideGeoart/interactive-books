"""Chain rule on exact polynomials: f'(g(x)) * g'(x) equals the derivative of the composition (III.6)."""
from fractions import Fraction as F


def ev(c, x):
    return sum(ck * x**k for k, ck in enumerate(c))


def der(c):
    return [k * ck for k, ck in enumerate(c)][1:]


def compose(f, g):
    out = [F(0)]
    for ck in reversed(f):                  # Horner: out = out * g + ck
        prod = [F(0)] * (len(out) + len(g) - 1)
        for i, a in enumerate(out):
            for j, b in enumerate(g):
                prod[i + j] += a * b
        prod[0] += ck
        out = prod
    return out


g = [F(-1), F(0), F(1, 2)]        # x**2/2 - 1
f = [F(0), F(0), F(0), F(1, 4)]   # u**3/4
x = F(2)
u = ev(g, x)
chain = ev(der(f), u) * ev(der(g), x)
assert (u, ev(der(g), x), ev(der(f), u), chain) == (1, 2, F(3, 4), F(3, 2))
assert ev(der(compose(f, g)), x) == chain
