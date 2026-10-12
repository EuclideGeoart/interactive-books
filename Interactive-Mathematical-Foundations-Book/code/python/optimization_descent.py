"""Exact quadratic descent frames, independently checked against a closed form."""
from fractions import Fraction as F


def loss(theta, a=1, c=0):
    x, y = theta
    return F(a)*(x-F(c))**2/2 + 2*y*y


def step(theta, eta, a=1, c=0):
    x, y = map(F, theta)
    eta, a, c = F(eta), F(a), F(c)
    if eta <= 0:
        raise ValueError("The descent learning rate must be positive")
    gradient = (a*(x-c), 4*y)
    update = tuple(-eta*g for g in gradient)
    next_theta = (x+update[0], y+update[1])
    return {
        "theta": (x, y), "loss": loss((x, y), a, c),
        "gradient": gradient, "eta": eta, "update": update,
        "next_theta": next_theta, "next_loss": loss(next_theta, a, c),
    }


def trajectory(theta, eta, iterations, a=1, c=0):
    if type(iterations) is not int or not 0 <= iterations <= 1000:
        raise ValueError("Require an integer iteration count in [0,1000]")
    theta, eta = tuple(map(F, theta)), F(eta)
    if eta <= 0:
        raise ValueError("The descent learning rate must be positive")
    frames = []
    for _ in range(iterations):
        frame = step(theta, eta, a, c)
        frames.append(frame)
        theta = frame["next_theta"]
    return frames


def main():
    frame = step((2, 1), F(1, 4))
    assert frame["loss"] == 4 and frame["gradient"] == (2, 4)
    assert frame["update"] == (F(-1, 2), -1)
    assert frame["next_theta"] == (F(3, 2), 0) and frame["next_loss"] == F(9, 8)
    frames = trajectory((2, 1), F(1, 4), 8)
    for k, item in enumerate(frames):
        assert item["theta"][0] == 2*F(3, 4)**k
        assert item["theta"][1] == (1 if k == 0 else 0)
        assert item["next_loss"] < item["loss"]
    assert frames[1]["next_theta"] == (F(9, 8), 0)
    assert frames[1]["next_loss"] == F(81, 128)
    assert step((0, 0), F(1, 4))["update"] == (0, 0)
    assert step((2, 1), F(3, 4))["next_loss"] == F(65, 8) > 4
    assert trajectory((2, 1), F(1, 4), 0) == []
    for eta in (0, -1):
        try:
            step((2, 1), eta)
        except ValueError:
            pass
        else:
            raise AssertionError("Nonpositive learning rate accepted")
    print("Exact first frame:", frame)
    print("Exact second next theta/loss:", frames[1]["next_theta"], frames[1]["next_loss"])
    print("A negative-gradient direction alone does not guarantee a finite-step decrease.")


if __name__ == "__main__":
    main()
