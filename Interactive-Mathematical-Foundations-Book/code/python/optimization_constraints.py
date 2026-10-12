"""Bounded two-coordinate projection and L2 penalty, with 80-digit Decimal checks."""
from decimal import Decimal as D, localcontext


def project(point, constraint):
    x, y = point
    if constraint == "none":
        return point
    if constraint == "box":
        return (min(D(1), max(D(-1), x)), min(D(1), max(D(-1), y)))
    if constraint == "disk":
        divisor = max(D(1), (x*x+y*y).sqrt())
        return (x/divisor, y/divisor)
    raise ValueError("Constraint must be none, box, or disk")


def evaluate(point, a, c, lam):
    x, y = point
    loss = a*(x-c)*(x-c)/2+2*y*y
    gradient = (a*(x-c), 4*y)
    return {"loss": loss, "penalized_loss": loss+lam*(x*x+y*y),
            "gradient": gradient, "penalized_gradient": (gradient[0]+2*lam*x, gradient[1]+2*lam*y),
            "hessian": ((a, D(0)), (D(0), D(4))),
            "penalized_hessian": ((a+2*lam, D(0)), (D(0), 4+2*lam))}


def trajectory(start=(0, 1), eta="1", iterations=12, a="1", c="2", lam="0", constraint="box"):
    if len(start) != 2 or type(iterations) is not int or not 1 <= iterations <= 40:
        raise ValueError("Require two coordinates and an integer budget in [1,40]")
    with localcontext() as context:
        context.prec = 80
        requested = tuple(D(str(value)) for value in start)
        eta, a, c, lam = (D(str(value)) for value in (eta, a, c, lam))
        if not all(value.is_finite() for value in (*requested, eta, a, c, lam)):
            raise ValueError("Require finite inputs")
        if eta <= 0 or not D("0.25") <= a <= 4 or not -2 <= c <= 2 or not 0 <= lam <= 4:
            raise ValueError("Require eta>0, a in [0.25,4], c in [-2,2], and lambda in [0,4]")
        point = feasible_start = project(requested, constraint)
        frames = []
        for k in range(iterations):
            current = evaluate(point, a, c, lam)
            gx, gy = current["penalized_gradient"]
            proposed = (point[0]-eta*gx, point[1]-eta*gy)
            projected = project(proposed, constraint)
            correction = (projected[0]-proposed[0], projected[1]-proposed[1])
            displacement = (projected[0]-point[0], projected[1]-point[1])
            frames.append({"k": k, "point": point, "evaluation": current,
                           "proposed": proposed, "projected": projected, "correction": correction,
                           "displacement": displacement, "next_evaluation": evaluate(projected, a, c, lam)})
            point = projected
        return {"requested": requested, "start": feasible_start,
                "initial_correction": (feasible_start[0]-requested[0], feasible_start[1]-requested[1]),
                "frames": frames}


def main():
    with localcontext() as context:
        context.prec = 80
        tolerance = D("1e-70")
        box = trajectory()
        first = box["frames"][0]
        assert first["evaluation"]["loss"] == 4
        assert first["evaluation"]["gradient"] == (-2, 4)
        assert first["proposed"] == (2, -3) and first["projected"] == (1, -1)
        assert first["correction"] == (-1, 2) and first["displacement"] == (1, -2)
        assert first["next_evaluation"]["loss"] == D("2.5")
        assert box["frames"][1]["proposed"] == (2, 3)
        for k, frame in enumerate(box["frames"]):
            assert frame["projected"] == (1, D(-1)**(k+1))
            assert frame["next_evaluation"]["loss"] == D("2.5")
            assert all(-1 <= value <= 1 for value in frame["projected"])
        initialized = trajectory((2, -3), iterations=1)
        assert initialized["requested"] == (2, -3)
        assert initialized["start"] == (1, -1) and initialized["initial_correction"] == (-1, 2)
        assert trajectory((2, -3), iterations=1, constraint="none")["start"] == (2, -3)
        boundary = trajectory((1, 0), iterations=1)["frames"][0]
        assert boundary["evaluation"]["gradient"] == (-1, 0)
        assert boundary["displacement"] == (0, 0) and boundary["evaluation"]["loss"] == D("0.5")

        disk = trajectory(constraint="disk")
        radial = disk["frames"][0]
        root = D(13).sqrt()
        projected = radial["projected"]
        assert projected == (2/root, -3/root)
        assert radial["correction"] == (2/root-2, -3/root+3)
        assert radial["displacement"] == (2/root, -3/root-1)
        squared_norm = projected[0]**2+projected[1]**2
        multiplier = root-1
        assert multiplier > 0 and abs(squared_norm-1) < tolerance
        assert all(abs(p-z+multiplier*p) < tolerance for p, z in zip(projected, (2, -3)))
        assert abs(multiplier*(squared_norm-1)) < tolerance
        distance = (projected[0]-2)**2+(projected[1]+3)**2
        assert abs(distance-(root-1)**2) < tolerance
        assert abs(radial["next_evaluation"]["loss"]-(D(46)/13-4/root)) < tolerance
        for frame in disk["frames"]:
            x, y = frame["projected"]
            assert x*x+y*y <= 1+tolerance
        assert project((D(0), D(0)), "disk") == (0, 0)
        assert project((D("0.2"), D("0.4")), "disk") == (D("0.2"), D("0.4"))
        disk_start = trajectory((2, -3), iterations=1, constraint="disk")
        assert disk_start["start"] == projected
        assert disk_start["initial_correction"] == radial["correction"]

        for lam in (0, 1, 3):
            run = trajectory(eta="0.1", lam=lam, constraint="none")
            target = D(2)/(1+2*lam)
            rx, ry = 1-D("0.1")*(1+2*lam), 1-D("0.1")*(4+2*lam)
            for k, frame in enumerate(run["frames"], 1):
                expected = (target-target*rx**k, ry**k)
                assert all(abs(actual-value) < tolerance for actual, value in zip(frame["projected"], expected))
        plain = trajectory(eta="0.1", constraint="none")["frames"][0]
        assert plain["projected"] == (D("0.2"), D("0.6"))
        assert plain["next_evaluation"]["loss"] == D("2.34")
        penalty = trajectory(eta="0.1", lam=1, constraint="none")["frames"][0]
        assert penalty["evaluation"]["penalized_loss"] == 5
        assert penalty["evaluation"]["penalized_gradient"] == (-2, 6)
        assert penalty["evaluation"]["penalized_hessian"] == ((3, 0), (0, 6))
        assert penalty["projected"] == (D("0.2"), D("0.4"))
        assert penalty["next_evaluation"]["loss"] == D("1.94")
        assert penalty["next_evaluation"]["penalized_loss"] == D("2.14")
        minimum = evaluate((D(2)/3, D(0)), D(1), D(2), D(1))
        assert abs(minimum["penalized_loss"]-D(4)/3) < tolerance
        assert all(abs(value) < tolerance for value in minimum["penalized_gradient"])
        strong = trajectory(eta="0.1", lam=3, constraint="none")["frames"][0]
        assert strong["evaluation"]["penalized_loss"] == 7
        assert strong["evaluation"]["penalized_gradient"] == (-2, 10)
        assert strong["projected"] == (D("0.2"), 0)
        assert strong["next_evaluation"]["penalized_loss"] == D("1.74")
        assert D(4)*2/(4+2*1) > 1  # Finite lambda=1 need not enforce either hard region.

        for kwargs in ({"a": 0}, {"c": 3}, {"lam": -1}, {"eta": 0},
                       {"iterations": 41}, {"start": ("NaN", 1)}, {"constraint": "triangle"}):
            try:
                trajectory(**kwargs)
            except ValueError:
                pass
            else:
                raise AssertionError("Invalid bounded input accepted")
        print("Decimal box: proposal (2,-3), projection (1,-1), correction (-1,2), displacement (1,-2), L=2.5.")
        print("Decimal disk: (2,-3)/sqrt(13); feasibility, nearest-point distance, and KKT residuals checked.")
        print("Penalty: first J=2.14; minimum at (2/3,0), J=4/3; closed-form paths checked.")
        print("Feasibility does not imply convergence; finite L2 penalty does not enforce a hard region.")


if __name__ == "__main__":
    main()
