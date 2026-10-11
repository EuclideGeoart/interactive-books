from fractions import Fraction
from math import acos, hypot, isfinite, ulp


def dot(u, v):
    if len(u) != 2 or len(v) != 2:
        raise ValueError('Expected two components per vector')
    return sum(Fraction(str(x)) * Fraction(str(y)) for x, y in zip(u, v))


def angle(u, v):
    directions = []
    for w in (u, v):
        if len(w) != 2 or not all(isfinite(x) for x in w):
            raise ValueError('Expected finite two-component vectors')
        m = max(map(abs, w))
        if m == 0:
            raise ValueError('An angle requires two nonzero vectors')
        w = tuple(x / m for x in w)
        h = hypot(*w)
        directions.append(tuple(x / h for x in w))
    cosine = sum(x*y for x, y in zip(*directions))
    if not isfinite(cosine) or abs(cosine) > 1 + 8 * ulp(1.0):
        raise ArithmeticError('Invalid cosine; clipping would hide an error')
    return acos(max(-1.0, min(1.0, cosine)))


if __name__ == '__main__':
    assert dot((2, 1), (-1, 2)) == 0
    assert dot((2, -1), (3, 4)) == 2
