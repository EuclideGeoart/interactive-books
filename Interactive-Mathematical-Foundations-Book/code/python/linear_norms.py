from math import hypot, isfinite


def norms(v):
    if len(v) != 2 or not all(isfinite(x) for x in v):
        raise ValueError('Expected two finite components')
    x, y = v
    return hypot(x, y), abs(x) + abs(y), max(abs(x), abs(y))


def normalize(v):
    _, _, m = norms(v)
    if m == 0:
        raise ValueError('Zero has no unit direction')
    x, y = v[0] / m, v[1] / m
    h = hypot(x, y)
    return x / h, y / h


if __name__ == '__main__':
    assert norms((-3, 4)) == (5, 7, 4)
    assert normalize((3, 4)) == (0.6, 0.8)
    assert hypot(*normalize((1.7e308, 1.7e308))) > 0.999999999999999
