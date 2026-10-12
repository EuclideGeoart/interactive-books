"""Exact quadratic error factors and rate-dependent trajectories; no third-party imports."""
from fractions import Fraction as F


def factors(eta, a=1):
    eta, a = F(eta), F(a)
    if eta <= 0 or a <= 0:
        raise ValueError("Require positive curvature a and learning rate eta")
    return (1-eta*a, 1-4*eta)


def trajectory(start=(2, 1), eta=F(1, 4), iterations=8, a=1, c=0):
    if type(iterations) is not int or not 0 <= iterations <= 1000:
        raise ValueError("Require an integer iteration count in [0,1000]")
    x, y = map(F, start)
    eta, a, c = F(eta), F(a), F(c)
    fx, fy = factors(eta, a)
    path = [(x, y)]
    for _ in range(iterations):
        gradient = (a*(x-c), 4*y)
        x, y = x-eta*gradient[0], y-eta*gradient[1]
        path.append((x, y))
    for k, point in enumerate(path):
        assert point == (c+(F(start[0])-c)*fx**k, F(start[1])*fy**k)
    losses = [a*(x-c)**2/2+2*y*y for x, y in path]
    return path, losses


def main():
    assert factors(F(1, 10)) == (F(9, 10), F(3, 5))
    path, losses = trajectory(eta=F(1, 10), iterations=1)
    assert path[1] == (F(9, 5), F(3, 5)) and losses[1] == F(117, 50)
    assert trajectory(eta=F(1, 4), iterations=1)[1] == [4, F(9, 8)]
    boundary, boundary_losses = trajectory(eta=F(1, 2))
    assert boundary[1:3] == [(F(1), F(-1)), (F(1, 2), F(1))]
    assert boundary_losses[:3] == [4, F(5, 2), F(17, 8)]
    assert all(loss > 2 for loss in boundary_losses)
    zero_mode, zero_mode_losses = trajectory((2, 0), F(3, 4))
    assert zero_mode[1] == (F(1, 2), F(0))
    assert all(b < a for a, b in zip(zero_mode_losses, zero_mode_losses[1:]))
    divergent, _ = trajectory((2, 1), F(3, 4), 4)
    assert divergent[-1][1] == 16
    alternating, alternating_losses = trajectory(eta=F(3, 8))
    assert alternating[1] == (F(5, 4), F(-1, 2))
    assert all(b < a for a, b in zip(alternating_losses, alternating_losses[1:]))
    balanced, balanced_losses = trajectory(eta=F(2, 5), iterations=2)
    assert balanced[1] == (F(6, 5), F(-3, 5))
    assert balanced_losses == [4, F(36, 25), F(324, 625)]
    assert factors(F(1, 8), a=8) == (0, F(1, 2))
    assert trajectory((2, 1), F(1, 8), 1, a=8, c=1)[0][1] == (1, F(1, 2))
    assert F(2, max(8, 4)) == F(1, 4)
    for invalid in (0, -1):
        try:
            factors(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("Nonpositive learning rate accepted")
    print("Exact default factors at eta=1/4:", factors(F(1, 4)))
    print("Exact eta=1/2 boundary path:", boundary[:4], "; y does not decay")
    print("All-start stability: 0 < eta < 2/max(a,4), for a>0.")
    print("A zero starting component can hide an unstable mode; finite runs are not proofs.")


if __name__ == "__main__":
    main()
