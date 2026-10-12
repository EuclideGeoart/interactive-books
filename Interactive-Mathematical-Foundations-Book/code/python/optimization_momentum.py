"""Exact unnormalized momentum: v_next=beta*v+g, theta_next=theta-eta*v_next."""
from fractions import Fraction as F


def step(theta, velocity=(0, 0), eta=F(1, 4), beta=F(4, 5), a=1, c=0):
    x, y = map(F, theta)
    vx, vy = map(F, velocity)
    eta, beta, a, c = map(F, (eta, beta, a, c))
    if eta <= 0 or a <= 0 or not 0 <= beta < 1:
        raise ValueError("Require eta>0, a>0, and 0<=beta<1")
    gradient = (a*(x-c), 4*y)
    next_velocity = (beta*vx+gradient[0], beta*vy+gradient[1])
    update = tuple(-eta*v for v in next_velocity)
    next_theta = (x+update[0], y+update[1])
    return {
        "theta": (x, y), "loss": a*(x-c)**2/2+2*y*y,
        "velocity": (vx, vy), "gradient": gradient, "next_velocity": next_velocity,
        "update": update, "next_theta": next_theta,
        "next_loss": a*(next_theta[0]-c)**2/2+2*next_theta[1]**2,
    }


def trajectory(start=(2, 1), iterations=8, eta=F(1, 4), beta=F(4, 5), a=1, c=0):
    if type(iterations) is not int or not 0 <= iterations <= 1000:
        raise ValueError("Require an integer iteration count in [0,1000]")
    eta, beta, a, c = map(F, (eta, beta, a, c))
    if eta <= 0 or a <= 0 or not 0 <= beta < 1:
        raise ValueError("Require eta>0, a>0, and 0<=beta<1")
    theta, velocity, frames = tuple(map(F, start)), (F(0), F(0)), []
    for _ in range(iterations):
        item = step(theta, velocity, eta, beta, a, c)
        frames.append(item)
        theta, velocity = item["next_theta"], item["next_velocity"]
    return frames


def main():
    frames = trajectory()
    first, second = frames[:2]
    assert first["next_velocity"] == (2, 4)
    assert first["next_theta"] == (F(3, 2), 0) and first["next_loss"] == F(9, 8)
    assert second["gradient"] == (F(3, 2), 0)
    assert second["next_velocity"] == (F(31, 10), F(16, 5))
    assert second["update"] == (F(-31, 40), F(-4, 5))
    assert second["next_theta"] == (F(29, 40), F(-4, 5))
    assert second["next_loss"] == F(4937, 3200) > second["loss"]
    # Eliminate velocity to check a different, second-order parameter recurrence.
    for k in range(1, len(frames)):
        previous, current = frames[k-1]["theta"], frames[k]["theta"]
        expected = tuple((1+F(4, 5)-F(1, 4)*lam)*now-F(4, 5)*old
                         for now, old, lam in zip(current, previous, (1, 4)))
        assert frames[k]["next_theta"] == expected
    residual = step((0, 0), (1, -2))
    assert residual["gradient"] == (0, 0)
    assert residual["next_velocity"] == (F(4, 5), F(-8, 5))
    assert residual["next_theta"] == (F(-1, 5), F(2, 5))
    no_memory = step((2, 1), (99, -99), beta=0)
    assert no_memory["next_velocity"] == (2, 4) and no_memory["next_theta"] == first["next_theta"]
    constant_velocity = F(0)
    for n in range(1, 5):
        constant_velocity = F(4, 5)*constant_velocity+1
        assert constant_velocity == (1-F(4, 5)**n)/(1-F(4, 5))
    for invalid in (-1, 1):
        try:
            step((2, 1), beta=invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid momentum coefficient accepted")
    print("Exact first frame:", first)
    print("Exact second frame:", second)
    print("Momentum can keep moving at zero current gradient and can increase loss on a step.")


if __name__ == "__main__":
    main()
