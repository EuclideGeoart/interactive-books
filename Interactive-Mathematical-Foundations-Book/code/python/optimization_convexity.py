"""Exact chord gaps and first-order support gaps for the quadratic family."""
from fractions import Fraction as F


def quadratic(point, a=1, c=0):
    x, y = map(F, point)
    a, c = F(a), F(c)
    return a*(x-c)**2/2 + 2*y*y


def chord_gap(p, q, t, a=1, c=0):
    p, q = tuple(map(F, p)), tuple(map(F, q))
    t, a, c = F(t), F(a), F(c)
    if not 0 <= t <= 1:
        raise ValueError("A chord parameter must lie in [0,1]")
    z = tuple((1-t)*u + t*v for u, v in zip(p, q))
    gap = (1-t)*quadratic(p, a, c) + t*quadratic(q, a, c) - quadratic(z, a, c)
    formula = t*(1-t)*(a*(q[0]-p[0])**2/2 + 2*(q[1]-p[1])**2)
    assert gap == formula
    return z, gap


def support_gap(p, q, a=1, c=0):
    x, y = map(F, p)
    u, v = map(F, q)
    a, c = F(a), F(c)
    linear_change = a*(x-c)*(u-x) + 4*y*(v-y)
    return quadratic((u, v), a, c) - quadratic((x, y), a, c) - linear_change


def main():
    assert chord_gap((-2, 0), (2, 0), F(1, 2)) == ((F(0), F(0)), F(2))
    assert chord_gap((0, 0), (2, 0), F(1, 2)) == ((F(1), F(0)), F(1, 2))
    assert chord_gap((0, 0), (2, 0), F(1, 2), a=-1)[1] == F(-1, 2)
    assert chord_gap((0, 0), (2, 0), F(1, 2), a=0)[1] == 0
    for t in (F(0), F(1, 4), F(1, 2), F(1)):
        assert chord_gap((-1, 2), (3, -1), t, a=2, c=7)[1] >= 0
    assert support_gap((2, 1), (F(3, 2), 0)) == F(17, 8)
    assert support_gap((0, 0), (2, 1)) == 4
    # The double well violates the midpoint inequality between its two minima.
    endpoint_average, midpoint_loss = F(0), F(1)
    assert midpoint_loss > endpoint_average
    assert abs(F(0)) <= (abs(F(-1)) + abs(F(1))) / 2  # Convex need not be smooth.
    try:
        chord_gap((0, 0), (2, 0), F(3, 2))
    except ValueError:
        pass
    else:
        raise AssertionError("An extrapolation was accepted as a chord")
    print("Exact canonical midpoint gap:", chord_gap((0, 0), (2, 0), F(1, 2))[1])
    print("For a>=0 every quadratic chord gap is nonnegative by its formula.")
    print("a=0 is convex but not strictly convex; a<0 violates an x chord.")


if __name__ == "__main__":
    main()
