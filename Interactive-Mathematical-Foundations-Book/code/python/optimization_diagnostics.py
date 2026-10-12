"""Plain binary64 descent with ordered stops; independent Fraction and Decimal checks."""
from decimal import Decimal as D, localcontext
from fractions import Fraction as F
from math import hypot, isfinite


def evaluate(point, objective, a, c):
    x, y = point
    if objective == "quadratic":
        loss, gradient = a*(x-c)*(x-c)/2+2*y*y, (a*(x-c), 4*y)
    elif objective == "flat":
        loss, gradient = x*x*x*x+y*y*y*y, (4*x*x*x, 4*y*y*y)
    elif objective == "saddle":
        loss, gradient = x*x-y*y, (2*x, -2*y)
    else:
        raise ValueError("Objective must be quadratic, flat, or saddle")
    return (loss, gradient) if all(isfinite(value) for value in (loss, *gradient)) else None


def run(start=(2, 1), eta=0.25, iterations=12, a=1.0, c=0.0, objective="quadratic",
        gradient_tol=0.1, loss_tol=0.0, clip=0.0, norm_bound=1e6):
    if len(start) != 2 or type(iterations) is not int or not 1 <= iterations <= 40:
        raise ValueError("Require two coordinates and an integer budget in [1,40]")
    requested = point = tuple(map(float, start))
    eta, a, c, gradient_tol, loss_tol, clip, norm_bound = map(
        float, (eta, a, c, gradient_tol, loss_tol, clip, norm_bound))
    if not all(isfinite(value) for value in (*point, eta, a, c, gradient_tol, loss_tol, clip, norm_bound)):
        raise ValueError("Require finite inputs")
    if eta <= 0 or not 0.25 <= a <= 4 or not -2 <= c <= 2 or min(gradient_tol, loss_tol, clip) < 0 or norm_bound <= 0:
        raise ValueError("Require eta,bound>0, a in [0.25,4], c in [-2,2], and nonnegative thresholds")
    if objective not in ("quadratic", "flat", "saddle"):
        raise ValueError("Objective must be quadratic, flat, or saddle")
    frames, reason = [], "iteration budget"
    for k in range(iterations):
        current = evaluate(point, objective, a, c)
        if current is None:
            reason = "non-finite current evaluation"
            break
        loss, raw = current
        norm = hypot(*raw)
        if not isfinite(norm):
            reason = "non-finite current evaluation"
            break
        if gradient_tol > 0 and norm <= gradient_tol:
            reason = "gradient tolerance"
            break
        if norm == 0:
            reason = "zero gradient"
            break
        scale = min(1.0, clip/norm) if clip > 0 else 1.0
        applied = (scale*raw[0], scale*raw[1])
        raw_update = (-eta*raw[0], -eta*raw[1])
        raw_proposal = (point[0]+raw_update[0], point[1]+raw_update[1])
        update = (-eta*applied[0], -eta*applied[1])
        next_point = (point[0]+update[0], point[1]+update[1])
        frame = {"k": k, "point": point, "loss": loss, "raw_gradient": raw, "gradient_norm": norm,
                 "scale": scale, "applied_gradient": applied, "raw_update": raw_update,
                 "raw_proposal": raw_proposal, "applied_update": update, "next": next_point,
                 "next_loss": None, "next_gradient": None}
        frames.append(frame)
        if not all(isfinite(value) for value in (scale, *applied, *update, *next_point)):
            reason = "non-finite transition"
            break
        next_evaluation = evaluate(next_point, objective, a, c)
        if next_evaluation is None:
            reason = "non-finite next evaluation"
            break
        next_loss, next_gradient = next_evaluation
        frame["next_loss"], frame["next_gradient"] = next_loss, next_gradient
        point = next_point
        if hypot(*point) > norm_bound:
            reason = "divergence bound"
            break
        if loss_tol > 0 and abs(next_loss-loss) <= loss_tol:
            reason = "loss change tolerance"
            break
    return {"start": requested, "point": point, "frames": frames, "reason": reason,
            "final_evaluation": evaluate(point, objective, a, c)}


def main():
    canonical = run()
    assert canonical["reason"] == "gradient tolerance" and len(canonical["frames"]) == 11
    assert canonical["point"] == (float(F(177147, 2097152)), 0)
    assert 2*F(3, 4)**10 > F(1, 10) and 2*F(3, 4)**11 < F(1, 10)
    for k, frame in enumerate(canonical["frames"]):
        current = (F(2), F(1)) if k == 0 else (2*F(3, 4)**k, F(0))
        next_point = (2*F(3, 4)**(k+1), F(0))
        assert frame["point"] == tuple(map(float, current))
        assert frame["next"] == tuple(map(float, next_point))
        assert frame["loss"] == float(current[0]**2/2+2*current[1]**2)
        assert frame["next_loss"] == float(next_point[0]**2/2)
        assert frame["raw_update"] == frame["applied_update"]
        assert frame["raw_proposal"] == frame["next"]
    early = run(start=(0.05, 0))
    assert early["reason"] == "gradient tolerance" and not early["frames"]
    assert early["point"] == (0.05, 0)
    inclusive = run(start=(1.5, 0), gradient_tol=1.5)
    assert inclusive["reason"] == "gradient tolerance" and not inclusive["frames"]
    small_loss = run(gradient_tol=0, loss_tol=0.5)
    assert small_loss["reason"] == "loss change tolerance" and len(small_loss["frames"]) == 2
    assert small_loss["point"] == (1.125, 0)
    assert small_loss["frames"][1]["next_loss"] == float(F(81, 128))
    assert abs(small_loss["frames"][1]["next_loss"]-small_loss["frames"][1]["loss"]) == float(F(63, 128))
    budget = run(iterations=2, gradient_tol=0)
    assert budget["reason"] == "iteration budget" and budget["point"] == (1.125, 0)
    assert len(budget["frames"]) == 2
    assert run(iterations=2, gradient_tol=0, loss_tol=0.5)["reason"] == "loss change tolerance"

    clipped = run(gradient_tol=0, clip=1)
    assert clipped["reason"] == "iteration budget" and len(clipped["frames"]) == 12
    first = clipped["frames"][0]
    assert first["raw_gradient"] == (2, 4) and first["gradient_norm"] == hypot(2, 4)
    assert first["raw_update"] == (-0.5, -1) and first["raw_proposal"] == (1.5, 0)
    with localcontext() as context:
        context.prec = 80
        scale = 1/D(20).sqrt()
        for actual, expected in zip(first["applied_gradient"], (2*scale, 4*scale)):
            assert abs(actual-float(expected)) < 1e-15
        for actual, expected in zip(first["next"], (2-D("0.5")*scale, 1-scale)):
            assert abs(actual-float(expected)) < 1e-15
    assert abs(hypot(*first["applied_update"])-0.25) < 1e-15
    assert all(frame["gradient_norm"] > 0 and hypot(*frame["applied_gradient"]) <= 1+1e-15 for frame in clipped["frames"])
    assert run(gradient_tol=1.1, clip=1)["frames"]  # The capped norm must not trigger a raw-gradient stop.
    hand = run(start=(3, 1), gradient_tol=0, clip=2, iterations=1)["frames"][0]
    assert hand["gradient_norm"] == 5 and hand["scale"] == 0.4
    assert abs(hand["next"][0]-2.7) < 1e-15 and abs(hand["next"][1]-0.6) < 1e-15

    divergent = run(eta=2, gradient_tol=0)
    assert divergent["reason"] == "divergence bound" and len(divergent["frames"]) == 8
    assert divergent["point"] == (2, 5764801)
    precedence = run(eta=2, gradient_tol=0, loss_tol=1e100, norm_bound=1)
    assert precedence["reason"] == "divergence bound" and len(precedence["frames"]) == 1
    saddle = run(start=(0, 0), objective="saddle", gradient_tol=0)
    assert saddle["reason"] == "zero gradient" and not saddle["frames"]
    assert evaluate((0, 1), "saddle", 1, 0)[0] == -1
    assert run(start=(0, 0))["reason"] == "gradient tolerance"
    nonfinite = run(start=(3, 1), objective="flat", eta=2, gradient_tol=0, norm_bound=1e300)
    assert nonfinite["reason"] == "non-finite next evaluation" and len(nonfinite["frames"]) == 5
    assert nonfinite["frames"][0]["next"] == (-213, -7)
    assert nonfinite["frames"][1]["next"] == (77308563, 2737)
    failed = nonfinite["frames"][-1]
    assert all(isfinite(value) for value in failed["next"])
    assert hypot(*failed["next"]) < 1e300 and failed["next_loss"] is None
    assert nonfinite["point"] == failed["point"]  # Preserve the last valid point, alongside the failed candidate.
    assert run(eta=1e308, gradient_tol=0)["reason"] == "non-finite transition"
    invalid_current = run(start=(1e100, 0), objective="flat", gradient_tol=1e308)
    assert invalid_current["reason"] == "non-finite current evaluation" and not invalid_current["frames"]

    for settings in ({"gradient_tol": -1}, {"clip": -1}, {"loss_tol": -1}, {"norm_bound": 0},
                     {"iterations": 41}, {"eta": 0}, {"start": (float("nan"), 0)}, {"objective": "unknown"}):
        try:
            run(**settings)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid input accepted")
    print("Canonical gradient stop: 11 updates; small-loss stop: 2; budget stop: 2.")
    print("Clipping: raw norm sqrt(20), scale 1/sqrt(20), applied displacement norm 1/4.")
    print("Divergence: 8 finite updates; quartic: 5 attempts, last finite candidate has non-finite next evaluation.")
    print("Saddle: explicit zero-gradient stop after 0 updates; no optimum claim. Ordered precedence checks passed.")


if __name__ == "__main__":
    main()
