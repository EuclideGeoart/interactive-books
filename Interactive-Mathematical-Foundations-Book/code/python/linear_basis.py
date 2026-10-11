from fractions import Fraction


def coordinates(u, v, p):
    if any(len(w) != 2 for w in (u, v, p)):
        raise ValueError('Expected two components per vector')
    u, v, p = (tuple(Fraction(str(x)) for x in w) for w in (u, v, p))
    determinant = u[0]*v[1] - u[1]*v[0]
    if determinant == 0:
        raise ValueError('Singular directions: unique coordinates do not exist')
    a = (p[0]*v[1] - p[1]*v[0]) / determinant
    b = (u[0]*p[1] - u[1]*p[0]) / determinant
    assert tuple(a*x + b*y for x, y in zip(u, v)) == p
    return a, b


if __name__ == '__main__':
    assert coordinates((2, 1), (1, 2), (3, 0)) == (2, -1)
