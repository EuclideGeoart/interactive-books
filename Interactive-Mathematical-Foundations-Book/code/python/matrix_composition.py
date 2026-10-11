from fractions import Fraction as F


def matvec(a, x):
    return tuple(sum((entry * value for entry, value in zip(row, x)), F(0)) for row in a)


def matmul(left, right):
    if len(left[0]) != len(right):
        raise ValueError("inner dimensions must match")
    columns = tuple(zip(*right))
    return tuple(tuple(sum((x * y for x, y in zip(row, column)), F(0)) for column in columns) for row in left)


A = ((F(1), F(1)), (F(0), F(1)))
B = ((F(1), F(0)), (F(1), F(1)))
x = (F(2), F(1))
BA = matmul(B, A)
assert matvec(B, matvec(A, x)) == matvec(BA, x) == (3, 4)
assert BA != matmul(A, B)

b, c = (F(1), F(-1)), (F(0), F(2))
combined_translation = tuple(u + v for u, v in zip(matvec(B, b), c))
assert combined_translation == (1, 2)
