from fractions import Fraction as F


def det2(a):
    return a[0][0] * a[1][1] - a[0][1] * a[1][0]


assert det2(((F(2), F(1)), (F(0), F(3)))) == 6
assert det2(((F(0), F(1)), (F(1), F(0)))) == -1
assert det2(((F(1), F(2)), (F(2), F(4)))) == 0
