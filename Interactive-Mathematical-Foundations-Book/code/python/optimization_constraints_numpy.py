"""Actual two-coordinate NumPy recurrence, checked against independent 80-digit scalars."""
from decimal import Decimal as D, localcontext
import numpy as np


def project(point, constraint):
    if constraint == "none":
        return point.copy()
    if constraint == "box":
        return np.clip(point, -1.0, 1.0)
    if constraint == "disk":
        return point/max(1.0, float(np.hypot(point[0], point[1])))
    raise ValueError("Constraint must be none, box, or disk")


def evaluate(point, a, c, lam):
    x, y = point
    loss = a*(x-c)*(x-c)/2+2*y*y
    gradient = np.array([a*(x-c), 4*y])
    penalized_loss = loss+lam*np.dot(point, point)
    penalized_gradient = gradient+2*lam*point
    if not np.all(np.isfinite([loss, penalized_loss, *gradient, *penalized_gradient])):
        raise OverflowError("Non-finite binary64 objective or gradient")
    return {"loss": float(loss), "penalized_loss": float(penalized_loss), "gradient": gradient,
            "penalized_gradient": penalized_gradient, "hessian": np.diag([a, 4.0]),
            "penalized_hessian": np.diag([a+2*lam, 4+2*lam])}


def trajectory(start=(0, 1), eta=1.0, iterations=12, a=1.0, c=2.0, lam=0.0, constraint="box"):
    requested = np.asarray(start, dtype=np.float64).copy()
    if requested.shape != (2,) or not np.all(np.isfinite(requested)):
        raise ValueError("Require a finite two-coordinate start")
    if type(iterations) is not int or not 1 <= iterations <= 40:
        raise ValueError("Require an integer budget in [1,40]")
    if not np.all(np.isfinite([eta, a, c, lam])) or eta <= 0 or not 0.25 <= a <= 4 or not -2 <= c <= 2 or not 0 <= lam <= 4:
        raise ValueError("Require finite parameters, eta>0, a in [0.25,4], c in [-2,2], lambda in [0,4]")
    point = feasible_start = project(requested, constraint)
    frames = []
    with np.errstate(over="ignore", invalid="ignore"):
        for k in range(iterations):
            current = evaluate(point, a, c, lam)
            proposed = point-eta*current["penalized_gradient"]
            if not np.all(np.isfinite(proposed)):
                raise OverflowError("Non-finite binary64 proposal")
            projected = project(proposed, constraint)
            frames.append({"k": k, "point": point, "evaluation": current, "proposed": proposed,
                           "projected": projected, "correction": projected-proposed,
                           "displacement": projected-point, "next_evaluation": evaluate(projected, a, c, lam)})
            point = projected
    return {"requested": requested, "start": feasible_start,
            "initial_correction": feasible_start-requested, "frames": frames}


def main():
    def check(actual, expected):
        np.testing.assert_allclose(actual, np.asarray(expected, dtype=np.float64), rtol=0, atol=1e-12)

    first = trajectory()["frames"][0]
    np.testing.assert_array_equal(first["evaluation"]["gradient"], [-2, 4])
    for key, literal in (("proposed", [2, -3]), ("projected", [1, -1]),
                         ("correction", [-1, 2]), ("displacement", [1, -2])):
        np.testing.assert_array_equal(first[key], literal)
    assert first["evaluation"]["loss"] == 4 and first["next_evaluation"]["loss"] == 2.5
    initialized = trajectory((2, -3), iterations=1)
    np.testing.assert_array_equal(initialized["start"], [1, -1])
    np.testing.assert_array_equal(initialized["initial_correction"], [-1, 2])
    disk = trajectory(constraint="disk")["frames"][0]
    root = np.sqrt(13.0)
    check(disk["projected"], np.array([2, -3])/root)
    assert abs(np.dot(disk["projected"], disk["projected"])-1) < 1e-14
    check(disk["projected"]-disk["proposed"]+(root-1)*disk["projected"], [0, 0])
    check(np.dot(disk["correction"], disk["correction"]), (root-1)**2)
    check(project(np.array([0.0, 0.0]), "disk"), [0, 0])

    cases = [
        {"constraint": "box"}, {"constraint": "disk"}, {"constraint": "none", "eta": 0.1},
        {"constraint": "none", "lam": 1, "eta": 0.1},
        {"constraint": "none", "lam": 3, "eta": 0.1},
        {"constraint": "disk", "start": (2, -3)},
        {"constraint": "box", "a": 0.25, "c": -2, "lam": 4, "eta": 0.05},
        {"constraint": "none", "a": 4, "c": 2, "lam": 1, "eta": 0.1},
    ]
    with localcontext() as context:
        context.prec = 80
        for settings in cases:
            result = trajectory(**settings)
            a, c, lam, eta = (D(str(settings.get(key, default))) for key, default in
                              (("a", 1), ("c", 2), ("lam", 0), ("eta", 1)))
            constraint = settings["constraint"]
            requested = tuple(D(str(value)) for value in settings.get("start", (0, 1)))

            def scalar_project(x, y):
                if constraint == "box":
                    return min(D(1), max(D(-1), x)), min(D(1), max(D(-1), y))
                if constraint == "disk" and x*x+y*y > 1:
                    radius = (x*x+y*y).sqrt()
                    return x/radius, y/radius
                return x, y

            x, y = scalar_project(*requested)
            check(result["requested"], requested)
            check(result["start"], (x, y))
            check(result["initial_correction"], (x-requested[0], y-requested[1]))
            for frame in result["frames"]:
                check(frame["point"], (x, y))
                gx, gy = (a+2*lam)*x-a*c, (4+2*lam)*y
                zx, zy = x-eta*gx, y-eta*gy
                nx, ny = scalar_project(zx, zy)
                check(frame["proposed"], (zx, zy))
                check(frame["projected"], (nx, ny))
                check(frame["correction"], (nx-zx, ny-zy))
                check(frame["displacement"], (nx-x, ny-y))
                for evaluation, px, py in ((frame["evaluation"], x, y), (frame["next_evaluation"], nx, ny)):
                    expanded_loss = a*px*px/2-a*c*px+a*c*c/2+2*py*py
                    check(evaluation["loss"], expanded_loss)
                    check(evaluation["penalized_loss"], expanded_loss+lam*(px*px+py*py))
                    check(evaluation["gradient"], (a*px-a*c, 4*py))
                    check(evaluation["penalized_gradient"], ((a+2*lam)*px-a*c, (4+2*lam)*py))
                    check(evaluation["hessian"], [[a, 0], [0, 4]])
                    check(evaluation["penalized_hessian"], [[a+2*lam, 0], [0, 4+2*lam]])
                if constraint == "box":
                    assert np.all(np.abs(frame["projected"]) <= 1)
                if constraint == "disk":
                    assert np.hypot(*frame["projected"]) <= 1+1e-14
                x, y = nx, ny

    penalty = trajectory(eta=0.1, lam=1, constraint="none")["frames"][0]
    check(penalty["projected"], [0.2, 0.4])
    check(penalty["next_evaluation"]["penalized_loss"], 2.14)
    optimum = evaluate(np.array([2/3, 0.0]), 1, 2, 1)
    check(optimum["penalized_gradient"], [0, 0])
    check(optimum["penalized_loss"], 4/3)
    check(optimum["penalized_hessian"], [[3, 0], [0, 6]])
    outside = np.array([4/3, 0.0])
    check(evaluate(outside, 4, 2, 1)["penalized_gradient"], [0, 0])
    assert np.hypot(*outside) > 1 and outside[0] > 1
    for settings in ({"start": [0, np.inf]}, {"a": 0}, {"lam": -1}, {"constraint": "triangle"},
                     {"iterations": 41}, {"eta": 0}, {"c": 3}):
        try:
            trajectory(**settings)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid bounded input accepted")
    print("NumPy box, disk, unconstrained, and penalty recurrences passed all recorded-value checks.")
    print("Independent 80-digit scalar reference: absolute tolerance 1e-12 on eight bounded runs.")
    print("Requested starts, nearest-point/KKT residuals, and the finite-penalty counterexample checked.")


if __name__ == "__main__":
    main()
