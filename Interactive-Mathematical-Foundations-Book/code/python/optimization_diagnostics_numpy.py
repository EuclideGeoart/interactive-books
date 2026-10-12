"""Actual NumPy plain descent and ordered stops, cross-checked with 80-digit scalar arithmetic."""
from decimal import Decimal as D, localcontext
from fractions import Fraction as F
import numpy as np


def evaluate(point, objective, a, c):
    x, y = point
    if objective == "quadratic":
        loss, gradient = a*(x-c)*(x-c)/2+2*y*y, np.array([a*(x-c), 4*y])
    elif objective == "flat":
        loss, gradient = np.sum(point*point*point*point), 4*point*point*point
    elif objective == "saddle":
        loss, gradient = x*x-y*y, np.array([2*x, -2*y])
    else:
        raise ValueError("Objective must be quadratic, flat, or saddle")
    return (float(loss), gradient) if np.all(np.isfinite([loss, *gradient])) else None


def run(start=(2, 1), eta=0.25, iterations=12, a=1.0, c=0.0, objective="quadratic",
        gradient_tol=0.1, loss_tol=0.0, clip=0.0, norm_bound=1e6):
    requested = point = np.asarray(start, dtype=np.float64).copy()
    if point.shape != (2,) or not np.all(np.isfinite(point)):
        raise ValueError("Require a finite two-coordinate start")
    if type(iterations) is not int or not 1 <= iterations <= 40:
        raise ValueError("Require an integer budget in [1,40]")
    eta, a, c, gradient_tol, loss_tol, clip, norm_bound = map(
        float, (eta, a, c, gradient_tol, loss_tol, clip, norm_bound))
    if not np.all(np.isfinite([eta, a, c, gradient_tol, loss_tol, clip, norm_bound])):
        raise ValueError("Require finite parameters")
    if eta <= 0 or not 0.25 <= a <= 4 or not -2 <= c <= 2 or min(gradient_tol, loss_tol, clip) < 0 or norm_bound <= 0:
        raise ValueError("Require eta,bound>0, a in [0.25,4], c in [-2,2], and nonnegative thresholds")
    if objective not in ("quadratic", "flat", "saddle"):
        raise ValueError("Objective must be quadratic, flat, or saddle")
    frames, reason = [], "iteration budget"
    with np.errstate(over="ignore", invalid="ignore"):
        for k in range(iterations):
            current = evaluate(point, objective, a, c)
            if current is None:
                reason = "non-finite current evaluation"
                break
            loss, raw = current
            norm = float(np.hypot(*raw))
            if not np.isfinite(norm):
                reason = "non-finite current evaluation"
                break
            if gradient_tol > 0 and norm <= gradient_tol:
                reason = "gradient tolerance"
                break
            if norm == 0:
                reason = "zero gradient"
                break
            scale = min(1.0, clip/norm) if clip > 0 else 1.0
            applied = scale*raw
            raw_update = -eta*raw
            raw_proposal = point+raw_update
            update = -eta*applied
            next_point = point+update
            frame = {"k": k, "point": point, "loss": loss, "raw_gradient": raw,
                     "gradient_norm": norm, "scale": scale, "applied_gradient": applied,
                     "raw_update": raw_update, "raw_proposal": raw_proposal, "applied_update": update,
                     "next": next_point, "next_loss": None, "next_gradient": None}
            frames.append(frame)
            if not np.all(np.isfinite([scale, *applied, *update, *next_point])):
                reason = "non-finite transition"
                break
            next_evaluation = evaluate(next_point, objective, a, c)
            if next_evaluation is None:
                reason = "non-finite next evaluation"
                break
            next_loss, next_gradient = next_evaluation
            frame["next_loss"], frame["next_gradient"] = next_loss, next_gradient
            point = next_point
            if np.hypot(*point) > norm_bound:
                reason = "divergence bound"
                break
            if loss_tol > 0 and abs(next_loss-loss) <= loss_tol:
                reason = "loss change tolerance"
                break
        final = evaluate(point, objective, a, c)
    return {"start": requested, "point": point, "frames": frames, "reason": reason, "final_evaluation": final}


def main():
    def check(actual, expected):
        np.testing.assert_allclose(actual, np.asarray(expected, dtype=np.float64), rtol=1e-12, atol=1e-12)

    cases = [
        ({}, "gradient tolerance", 11),
        ({"gradient_tol": 0, "loss_tol": 0.5}, "loss change tolerance", 2),
        ({"gradient_tol": 0, "iterations": 2}, "iteration budget", 2),
        ({"gradient_tol": 0, "clip": 1}, "iteration budget", 12),
        ({"gradient_tol": 0, "eta": 2}, "divergence bound", 8),
        ({"start": (3, 1), "objective": "flat", "eta": 2, "gradient_tol": 0, "norm_bound": 1e300},
         "non-finite next evaluation", 5),
        ({"start": (0, 0), "objective": "saddle", "gradient_tol": 0}, "zero gradient", 0),
        ({"a": 0.25, "c": -2, "eta": 0.1, "gradient_tol": 0}, "iteration budget", 12),
    ]
    with localcontext() as context:
        context.prec = 80
        for settings, reason, count in cases:
            result = run(**settings)
            assert result["reason"] == reason and len(result["frames"]) == count
            x, y = (D(str(value)) for value in settings.get("start", (2, 1)))
            a, c, eta, clip = (D(str(settings.get(key, default))) for key, default in
                               (("a", 1), ("c", 0), ("eta", 0.25), ("clip", 0)))
            objective = settings.get("objective", "quadratic")

            def scalar_evaluate(px, py):
                if objective == "flat":
                    return px**4+py**4, (4*px**3, 4*py**3)
                if objective == "saddle":
                    return px**2-py**2, (2*px, -2*py)
                return a*px*px/2-a*c*px+a*c*c/2+2*py*py, (a*px-a*c, 4*py)

            for frame in result["frames"]:
                loss, (gx, gy) = scalar_evaluate(x, y)
                norm = (gx*gx+gy*gy).sqrt()
                scale = min(D(1), clip/norm) if clip > 0 else D(1)
                ux, uy = -eta*scale*gx, -eta*scale*gy
                nx, ny = x+ux, y+uy
                check(frame["point"], (x, y))
                check(frame["loss"], loss)
                check(frame["raw_gradient"], (gx, gy))
                check(frame["gradient_norm"], norm)
                check(frame["scale"], scale)
                check(frame["applied_gradient"], (scale*gx, scale*gy))
                check(frame["raw_update"], (-eta*gx, -eta*gy))
                check(frame["raw_proposal"], (x-eta*gx, y-eta*gy))
                check(frame["applied_update"], (ux, uy))
                check(frame["next"], (nx, ny))
                next_loss, next_gradient = scalar_evaluate(nx, ny)
                if frame["next_loss"] is not None:
                    check(frame["next_loss"], next_loss)
                    check(frame["next_gradient"], next_gradient)
                else:
                    assert not np.isfinite(float(next_loss))
                x, y = nx, ny

    canonical = run()
    np.testing.assert_array_equal(canonical["point"], [float(F(177147, 2097152)), 0])
    for k, frame in enumerate(canonical["frames"], 1):
        np.testing.assert_array_equal(frame["next"], [float(2*F(3, 4)**k), 0])
    loss_stop = run(gradient_tol=0, loss_tol=0.5)
    assert loss_stop["frames"][1]["next_loss"] == float(F(81, 128))
    assert abs(loss_stop["frames"][1]["loss"]-loss_stop["frames"][1]["next_loss"]) == float(F(63, 128))
    assert run(gradient_tol=0, loss_tol=0.5, iterations=2)["reason"] == "loss change tolerance"
    assert run(gradient_tol=0, eta=2, loss_tol=1e100, norm_bound=1)["reason"] == "divergence bound"
    first = run(gradient_tol=0, clip=1)["frames"][0]
    np.testing.assert_array_equal(first["raw_gradient"], [2, 4])
    np.testing.assert_array_equal(first["raw_update"], [-0.5, -1])
    np.testing.assert_array_equal(first["raw_proposal"], [1.5, 0])
    check(first["scale"], 1/np.sqrt(20.0))
    check(np.hypot(*first["applied_update"]), 0.25)
    assert run(gradient_tol=1.1, clip=1)["frames"]
    hand = run(start=(3, 1), clip=2, gradient_tol=0, iterations=1)["frames"][0]
    assert hand["gradient_norm"] == 5 and hand["scale"] == 0.4
    check(hand["applied_gradient"], [1.2, 1.6])
    check(hand["next"], [2.7, 0.6])
    assert not run(start=(0.05, 0))["frames"]
    assert not run(start=(1.5, 0), gradient_tol=1.5)["frames"]
    assert run(start=(0, 0))["reason"] == "gradient tolerance"
    assert run(eta=1e308, gradient_tol=0)["reason"] == "non-finite transition"
    assert run(start=(1e100, 0), objective="flat", gradient_tol=1e308)["reason"] == "non-finite current evaluation"
    failure = run(start=(3, 1), objective="flat", eta=2, gradient_tol=0, norm_bound=1e300)
    np.testing.assert_array_equal(failure["frames"][0]["next"], [-213, -7])
    np.testing.assert_array_equal(failure["frames"][1]["next"], [77308563, 2737])
    last = failure["frames"][-1]
    assert np.all(np.isfinite(last["next"])) and last["next_loss"] is None
    assert np.hypot(*last["next"]) < 1e300
    np.testing.assert_array_equal(failure["point"], last["point"])
    for settings in ({"clip": -1}, {"gradient_tol": -1}, {"loss_tol": -1}, {"norm_bound": 0},
                     {"iterations": 41}, {"eta": 0}, {"start": (np.nan, 0)}, {"objective": "unknown"}):
        try:
            run(**settings)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid input accepted")
    print("NumPy stop counts: gradient 11, loss 2, budget 2, clipped budget 12, divergence 8, non-finite 5, saddle 0.")
    print("All valid recorded vectors, objective values, norms, and clipping scales match independent 80-digit scalars.")
    print("Relative/absolute tolerance 1e-12; ordered reasons and counts checked exactly.")


if __name__ == "__main__":
    main()
