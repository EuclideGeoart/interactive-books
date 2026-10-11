from fractions import Fraction as F


def transform(a, x):
    if not a or len(a[0]) != len(x):
        raise ValueError("matrix columns must match the input length")
    return tuple(sum((entry * value for entry, value in zip(row, x)), F(0)) for row in a)


def affine(a, x, translation):
    linear = transform(a, x)
    if len(linear) != len(translation):
        raise ValueError("translation must match the output length")
    return tuple(value + shift for value, shift in zip(linear, translation))


A = ((F(1), F(1)), (F(0), F(1)))
assert transform(A, (F(0), F(0))) == (0, 0)
assert transform(A, (F(2), F(1))) == (3, 1)
assert affine(A, (F(0), F(0)), (F(2), F(-1))) == (2, -1)
