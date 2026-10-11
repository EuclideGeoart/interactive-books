from fractions import Fraction as F


def solve2(a, rhs):
    determinant = a[0][0] * a[1][1] - a[0][1] * a[1][0]
    if determinant:
        return "unique", ((rhs[0] * a[1][1] - a[0][1] * rhs[1]) / determinant,
                          (a[0][0] * rhs[1] - rhs[0] * a[1][0]) / determinant)
    augmented_minors = (a[0][0] * rhs[1] - a[1][0] * rhs[0],
                        a[0][1] * rhs[1] - a[1][1] * rhs[0])
    return ("infinite", None) if augmented_minors == (0, 0) else ("none", None)


assert solve2(((F(1), F(1)), (F(1), F(-1))), (F(3), F(1))) == ("unique", (F(2), F(1)))
assert solve2(((F(1), F(1)), (F(2), F(2))), (F(1), F(3)))[0] == "none"
assert solve2(((F(1), F(1)), (F(2), F(2))), (F(1), F(2)))[0] == "infinite"
