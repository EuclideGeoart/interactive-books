"""Exact stationary-point calculations and counterexamples to local/global claims."""
from fractions import Fraction as F


def cubic(x, y):
    x, y = F(x), F(y)
    return x**3 - 3*x + y*y, (3*x*x - 3, 2*y), (6*x, F(2))


def double_well(x, y):
    x, y = F(x), F(y)
    return (x*x - 1)**2 + y*y, (4*x*(x*x - 1), 2*y), (12*x*x - 4, F(2))


def diagonal_test(diagonal):
    # A zero eigenvalue leaves this second-order test inconclusive.
    first, second = diagonal
    if first > 0 and second > 0:
        return "strict local minimum"
    if first < 0 and second < 0:
        return "strict local maximum"
    if first * second < 0:
        return "saddle"
    return "inconclusive"


def main():
    for x, expected in ((-1, "saddle"), (1, "strict local minimum")):
        loss, gradient, diagonal = cubic(x, 0)
        assert gradient == (0, 0)
        assert diagonal_test(diagonal) == expected
        assert loss == (2 if x == -1 else -2)
    assert cubic(-3, 0)[0] == -18 < cubic(1, 0)[0]
    # Along x=-n, y=0 the values -n^3+3n tend to minus infinity.
    assert [cubic(-n, 0)[0] for n in (2, 3, 4)] == [-2, -18, -52]
    for x, expected in ((-1, "strict local minimum"), (0, "saddle"), (1, "strict local minimum")):
        loss, gradient, diagonal = double_well(x, 0)
        assert gradient == (0, 0) and diagonal_test(diagonal) == expected
        assert loss == (1 if x == 0 else 0)
    assert diagonal_test((-2, -2)) == "strict local maximum"  # -x^2-y^2.
    assert diagonal_test((2, -2)) == "saddle"  # x^2-y^2.
    assert diagonal_test((0, 0)) == "inconclusive"  # x^4+y^4 has a minimum.
    assert diagonal_test((0, 2)) == "inconclusive"  # x^3+y^2 has a saddle.
    h = F(1, 10)
    assert h**4 + h**4 > 0
    assert (-h)**3 < 0 < h**3
    assert (abs(-h)/(-h), abs(h)/h) == (-1, 1)  # |x|+y^2: no gradient at x=0.
    print("Exact cubic stationary points: (-1,0) saddle; (1,0) local minimum")
    print("Exact lower witness (-3,0):", cubic(-3, 0)[0], "; no global minimum")
    print("Exact double-well minimizers: (-1,0), (1,0); loss 0")


if __name__ == "__main__":
    main()
