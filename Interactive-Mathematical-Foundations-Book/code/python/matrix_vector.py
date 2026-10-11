from fractions import Fraction as F


def matvec(a, x):
    if not a or len(a[0]) != len(x) or any(len(row) != len(x) for row in a):
        raise ValueError("an m×n matrix needs an input with n entries")
    return tuple(sum((entry * value for entry, value in zip(row, x)), F(0)) for row in a)


A = ((F(2), F(-1)), (F(1), F(3)))
x = (F(4), F(2))
assert matvec(A, x) == (6, 10)
assert matvec(((F(1), F(2), F(3)), (F(0), F(-1), F(2))), (F(2), F(1), F(-1))) == (1, -3)
