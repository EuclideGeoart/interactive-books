"""Decimal inputs are interpreted exactly; a vector has exactly two components."""
from fractions import Fraction


def vector(values):
    if len(values) != 2:
        raise ValueError('Expected two components')
    return tuple(Fraction(str(x)) for x in values)


def add(u, v):
    u, v = vector(u), vector(v)
    return (u[0] + v[0], u[1] + v[1])


def subtract(v, u):
    v, u = vector(v), vector(u)
    return (v[0] - u[0], v[1] - u[1])


if __name__ == '__main__':
    assert add((2, 1), (1, 2)) == (3, 3)
    assert subtract((1, 2), (2, 1)) == (-1, 1)
