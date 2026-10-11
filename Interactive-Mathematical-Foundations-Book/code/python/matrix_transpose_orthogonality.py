from fractions import Fraction as F


def transpose(a):
    return tuple(zip(*a))


def matmul(left, right):
    return tuple(tuple(sum((x * y for x, y in zip(row, column)), F(0)) for column in zip(*right)) for row in left)


Q = ((F(0), F(-1)), (F(1), F(0)))
I = ((F(1), F(0)), (F(0), F(1)))
assert matmul(transpose(Q), Q) == I
assert transpose(Q) == ((F(0), F(1)), (F(-1), F(0)))
