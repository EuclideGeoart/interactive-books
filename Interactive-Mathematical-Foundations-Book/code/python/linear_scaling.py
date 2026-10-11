from fractions import Fraction
from math import hypot, isclose


def scale(k, v):
    if len(v) != 2:
        raise ValueError('Expected two components')
    k = Fraction(str(k))
    return tuple(k * Fraction(str(x)) for x in v)


if __name__ == '__main__':
    result = scale('-1.5', (3, 2))
    assert result == (Fraction('-4.5'), -3)
    assert isclose(hypot(*result), 1.5 * hypot(3, 2), rel_tol=2e-15)
    assert scale(0, (3, 2)) == (0, 0)  # no direction at zero
