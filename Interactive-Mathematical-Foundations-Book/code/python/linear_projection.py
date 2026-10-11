from fractions import Fraction
from math import hypot


def project(v, u):
    if len(u) != 2 or len(v) != 2:
        raise ValueError('Expected two components per vector')
    u, v = (tuple(Fraction(str(x)) for x in w) for w in (u, v))
    denominator = sum(x*x for x in u)
    if denominator == 0:
        raise ValueError('Projection direction must be nonzero')
    product = sum(x*y for x, y in zip(v, u))
    factor = product / denominator
    projection = tuple(factor*x for x in u)
    residual = tuple(y-x for y, x in zip(v, projection))
    assert sum(x*y for x, y in zip(residual, u)) == 0
    return projection, residual, hypot(*residual)


if __name__ == '__main__':
    p, r, distance = project((1, 3), (2, 1))
    assert p == (2, 1) and r == (-1, 2)
    assert distance == hypot(-1, 2)
