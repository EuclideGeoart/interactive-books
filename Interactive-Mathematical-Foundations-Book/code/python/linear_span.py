from fractions import Fraction


def combine(a, u, b, v):
    if len(u) != 2 or len(v) != 2:
        raise ValueError('Expected two components per vector')
    a, b = Fraction(str(a)), Fraction(str(b))
    return tuple(a*Fraction(str(x)) + b*Fraction(str(y)) for x, y in zip(u, v))


def span_dimension(u, v):
    if len(u) != 2 or len(v) != 2:
        raise ValueError('Expected two components per vector')
    u, v = (tuple(Fraction(str(x)) for x in w) for w in (u, v))
    cross = u[0]*v[1] - u[1]*v[0]
    return 2 if cross else 1 if any(u) or any(v) else 0


if __name__ == '__main__':
    assert combine(1, (2, 1), '-0.5', (1, 2)) == (Fraction('1.5'), 0)
    assert span_dimension((1, 1), (2, 2)) == 1
    assert span_dimension((0, 0), (0, 0)) == 0
