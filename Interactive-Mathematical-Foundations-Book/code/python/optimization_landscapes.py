"""Exact polynomial landscapes; logarithmic values use binary64 separately."""
from fractions import Fraction as F
from math import isfinite, log


def quadratic(x, y, a=1, c=0):
    x, y, a, c = map(F, (x, y, a, c))
    loss = a * (x - c)**2 / 2 + 2 * y**2
    gradient = (a * (x - c), 4 * y)
    hessian = ((a, F(0)), (F(0), F(4)))
    return loss, gradient, hessian


def polynomial_losses(x, y):
    x, y = F(x), F(y)
    return {
        "double well": (x*x - 1)**2 + y*y,
        "cubic": x**3 - 3*x + y*y,
        "ridge": -x*x - y*y,
        "saddle": x*x - y*y,
        "flat": x**4 + y**4,
        "degenerate": x**3 + y*y,
        "nonsmooth": abs(x) + y*y,
    }


def barrier(x, y):
    x, y = float(x), float(y)
    if not isfinite(x) or not isfinite(y) or x <= 0:
        raise ValueError("The log objective requires finite x > 0 and finite y")
    loss, gradient = -log(x) + y*y, (-1/x, 2*y)
    if not all(isfinite(v) for v in (loss, *gradient)):
        raise OverflowError("The binary64 result is non-finite")
    return loss, gradient


def main():
    loss, gradient, hessian = quadratic(2, 1)
    assert loss == 4 and gradient == (2, 4)
    assert hessian == ((1, 0), (0, 4))
    assert quadratic(2, 1, a=2, c=1)[:2] == (3, (2, 4))
    assert quadratic(0, 1)[0] == 2 and quadratic(2, 0)[0] == 2
    assert polynomial_losses(-1, 0)["double well"] == 0
    assert polynomial_losses(1, 0)["double well"] == 0
    assert polynomial_losses(0, 0)["double well"] == 1
    assert polynomial_losses(1, 0)["cubic"] == -2
    assert polynomial_losses(-3, 0)["cubic"] == -18
    assert polynomial_losses(1, 0)["ridge"] == -1
    assert polynomial_losses(1, 0)["saddle"] == 1
    assert polynomial_losses(0, 1)["saddle"] == -1
    assert polynomial_losses(0, 0)["flat"] == 0
    assert polynomial_losses(-1, 0)["degenerate"] == -1
    h = F(1, 100)
    right = polynomial_losses(h, 0)["nonsmooth"] / h
    left = polynomial_losses(-h, 0)["nonsmooth"] / -h
    assert (left, right) == (-1, 1)  # No classical x derivative at zero.
    assert barrier(1, 0) == (0.0, (-1.0, 0.0))
    for x in (0, -1, float("nan"), float("inf")):
        try:
            barrier(x, 0)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid logarithmic domain accepted")
    print("Exact canonical loss, gradient, Hessian:", loss, gradient, hessian)
    print("Exact alternative losses at (1,0):", polynomial_losses(1, 0))
    print("Log objective at (2,1), binary64 approximation:", barrier(2, 1))


if __name__ == "__main__":
    main()
