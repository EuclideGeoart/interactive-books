"""III-08–12: centered fits, frozen regression updates, small SVD and explicit penalties.

Run from the book root: .venv/bin/python -B code/python/p02/fit_reference.py
Rows are samples; W and y are columns. Intercept is first in augmented X/W.
"""
import json
import math
import numpy as np
from linear_regression import CANONICAL_REGRESSION, derive_regression, regression_trace

RCOND = 1e-10
POLYNOMIAL_DATA = {
    "trainX": [-1, -.6, -.2, .2, .6, 1], "trainY": [1.1, .46, 0, .16, .26, 1.2],
    "heldX": [-.8, -.4, 0, .4, .8], "heldY": [.64, .16, 0, .16, .64],
}


def finite(values, name):
    if not np.isfinite(values).all():
        raise ValueError(f"{name} must remain finite")
    return values


def design(X, y):
    # Validate before coercion: booleans, strings and ragged rows are not numeric data.
    if not isinstance(X, (list, tuple)) or not 1 <= len(X) <= 64:
        raise ValueError("X requires 1–64 rows")
    if not isinstance(X[0], (list, tuple)) or not 1 <= len(X[0]) <= 7:
        raise ValueError("X requires 1–7 columns")
    d = len(X[0])
    for row in X:
        if not isinstance(row, (list, tuple)) or len(row) != d:
            raise ValueError("X must be rectangular")
        for v in row:
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
                raise ValueError("X must contain finite numbers")
    column(y, len(X), "Targets")
    return finite(np.array(X, dtype=float), "X"), np.array(y, dtype=float).reshape(-1, 1)


def column(values, size, name):
    if not isinstance(values, (list, tuple)) or len(values) != size:
        raise ValueError(f"{name} requires {size} entries (a column)")
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        raise ValueError(f"{name} must contain finite numbers")
    return np.array(values, dtype=float).reshape(-1, 1)


def linear(X, y, weights):
    A, target = design(X, y)
    W = column(weights, A.shape[1], "Weights")
    with np.errstate(over="ignore", invalid="ignore", under="ignore"):
        prediction = finite(A @ W, "Predictions")
        residual = finite(prediction - target, "Residuals")
        mse = float(finite(np.sum(residual * residual) / len(A), "MSE"))
        gradient = finite(2 / len(A) * A.T @ residual, "Gradient")
    n, d = A.shape
    return {"predictions": prediction[:, 0].tolist(), "residuals": residual[:, 0].tolist(),
            "mse": mse, "gradient": gradient[:, 0].tolist(),
            "shapes": {"X": [n, d], "W": [d, 1], "y": [n, 1], "prediction": [n, 1], "gradient": [d, 1]}}


def _least_norm_validated(A, target):
    # Trusted Ridge augmentation may add ≤7 rows beyond the 64 public observation rows.
    d = A.shape[1]
    scale = float(np.max(np.abs(A)))
    if scale == 0:
        return {"weights": [0.] * d, "rank": 0, "singularValues": [0.] * d, "cutoff": 0., "condition": None}
    B = A / scale
    V = np.eye(d)
    for sweep in range(100):
        rotated = False
        for p in range(d):
            for q in range(p + 1, d):
                a, b, c = float(B[:, p] @ B[:, p]), float(B[:, q] @ B[:, q]), float(B[:, p] @ B[:, q])
                if a == 0 or b == 0 or abs(c) <= 1e-14 * math.sqrt(a) * math.sqrt(b):
                    continue
                tau = (b - a) / (2 * c)
                t = 1. if tau == 0 else math.copysign(1., tau) / (abs(tau) + math.hypot(1., tau))
                cs, sn = 1 / math.hypot(1., t), t / math.hypot(1., t)
                for matrix in (B, V):
                    left, right = matrix[:, p].copy(), matrix[:, q].copy()
                    matrix[:, p], matrix[:, q] = cs * left - sn * right, sn * left + cs * right
                rotated = True
        if not rotated:
            break
    else:
        raise ValueError("SVD did not converge in 100 sweeps; no fit returned")
    norms = np.array([math.hypot(*B[:, j]) for j in range(d)])
    cutoff = RCOND * float(np.max(norms))
    weights = np.zeros(d)
    for j in range(d):
        if norms[j] > cutoff:
            coefficient = float((B[:, j] / norms[j]) @ target[:, 0]) / norms[j] / scale
            weights += V[:, j] * coefficient
    finite(weights, "Fitted weights")
    residual = finite(A @ weights.reshape(-1, 1) - target, "Fitted residuals")
    finite(np.sum(residual * residual) / len(A), "Fitted MSE")
    values = sorted(finite(norms * scale, "Singular values").tolist(), reverse=True)
    rank = int(np.sum(norms > cutoff))
    condition = values[0] / values[-1] if rank == d else None
    return {"weights": weights.tolist(), "rank": rank, "singularValues": values,
            "cutoff": cutoff * scale, "condition": condition}


def least_norm(X, y):
    A, target = design(X, y)
    return _least_norm_validated(A, target)


def closed_form(samples):
    derive_regression({"samples": samples, "weight": 0., "bias": 0., "learningRate": .1})
    x = np.array([r["x"] for r in samples], dtype=float)
    y = np.array([r["y"] for r in samples], dtype=float)
    with np.errstate(over="ignore", invalid="ignore", under="ignore"):
        mean_x, mean_y = float(finite(np.mean(x), "Mean x")), float(finite(np.mean(y), "Mean y"))
        dx, dy = finite(x - mean_x, "Centered x"), finite(y - mean_y, "Centered y")
        sxx, sxy = float(finite(dx @ dx, "Sxx")), float(finite(dx @ dy, "Sxy"))
    if sxx == 0 and any(v != x[0] for v in x):
        raise ValueError("Input variance underflowed; slope is numerically unresolved")
    weight = 0. if sxx == 0 else sxy / sxx
    bias = mean_y - weight * mean_x
    mse = derive_regression({"samples": samples, "weight": weight, "bias": bias, "learningRate": .1})["mse"]
    return {"weight": weight, "bias": bias, "meanX": mean_x, "meanY": mean_y, "sxx": sxx, "sxy": sxy, "mse": mse, "unique": sxx != 0}


def descent(state):
    result = derive_regression(state)  # Frozen III-07 is the predictor, gradient and update authority.
    x = np.array([r["x"] for r in state["samples"]])
    a, b, c = 2 * float(np.mean(x * x)), 2 * float(np.mean(x)), 2.
    maximum = (a + c + math.hypot(a - c, 2 * b)) / 2
    factor = 1 - state["learningRate"] * maximum
    behavior = ("undamped oscillation" if factor == -1 else "divergence") if factor <= -1 else ("convergent oscillation" if factor < 0 else "convergence without fast-mode sign flips")
    return {**result, "lambdaMax": maximum, "criticalRate": 2 / maximum, "factor": factor, "behavior": behavior}


def polynomial_design(x, degree):
    if type(degree) is not int or not 1 <= degree <= 5:
        raise ValueError("Degree must be an integer from 1 to 5")
    column(x, len(x), "Polynomial input")
    return finite(np.array([[v ** j for j in range(degree + 1)] for v in x]), "Polynomial features").tolist()


def polynomial_fit(samples, degree):
    closed_form(samples)
    X, y = polynomial_design([r["x"] for r in samples], degree), [r["y"] for r in samples]
    solve = least_norm(X, y)
    return {**solve, "train": linear(X, y, solve["weights"]), "held": linear(polynomial_design(POLYNOMIAL_DATA["heldX"], degree), POLYNOMIAL_DATA["heldY"], solve["weights"]), "X": X}


def regularized(X, y, lam, kind, penalize_intercept):
    A, target = design(X, y)
    if isinstance(lam, bool) or not isinstance(lam, (int, float)) or not math.isfinite(lam) or not 0 <= lam <= 10 or kind not in ("l1", "l2") or type(penalize_intercept) is not bool:
        raise ValueError("Penalty requires L1/L2, lambda in [0,10] and an explicit intercept policy")
    if not np.all(A[:, 0] == 1):
        raise ValueError("First design column must be the intercept ones")
    n, d = A.shape
    mask = np.array([j != 0 or penalize_intercept for j in range(d)])
    iterations = 0
    if kind == "l2" or lam == 0:
        extra = np.diag(np.full(d, math.sqrt(n * lam)))[mask] if lam > 0 else np.empty((0, d))
        solve = _least_norm_validated(np.vstack([A, extra]), np.vstack([target, np.zeros((len(extra), 1))]))
        weights = np.array(solve["weights"])
    else:
        weights = np.zeros(d)
        for iterations in range(1, 3001):
            old = weights.copy()
            for j in range(d):
                partial = target[:, 0] - A @ weights + A[:, j] * weights[j]
                rho, curvature = float(A[:, j] @ partial / n), float(A[:, j] @ A[:, j] / n)
                threshold = lam / 2 if mask[j] else 0
                weights[j] = 0 if curvature == 0 else math.copysign(max(0, abs(rho) - threshold), rho) / curvature
            finite(weights, "L1 weights")
            if np.max(np.abs(weights - old)) < 1e-12:
                break
    result = linear(X, y, weights.tolist())
    penalty = float(finite(lam * np.sum((weights ** 2 if kind == "l2" else np.abs(weights))[mask]), "Penalty"))
    gradient = np.array(result["gradient"])
    kkt = []
    for j, w in enumerate(weights):
        g = gradient[j]
        kkt.append(abs(g) if not mask[j] else abs(g + 2 * lam * w) if kind == "l2" else max(0, abs(g) - lam) if w == 0 else abs(g + lam * np.sign(w)))
    residual = float(max(kkt))
    return {**result, "weights": weights.tolist(), "penalty": penalty, "objective": float(finite(result["mse"] + penalty, "Objective")), "kkt": residual, "iterations": iterations, "converged": residual <= 1e-8}


def demonstration():
    samples = CANONICAL_REGRESSION["samples"]
    poly = [dict(id=f"s{i+1}", x=x, y=POLYNOMIAL_DATA["trainY"][i]) for i, x in enumerate(POLYNOMIAL_DATA["trainX"])]
    return {"closedForm": closed_form(samples), "descent": descent(CANONICAL_REGRESSION),
            "descentTrace": regression_trace(CANONICAL_REGRESSION, 4),
            "multiple": least_norm([[1, -1, 0], [1, 0, 1], [1, 1, 0], [1, 2, 1]], [-1, 0, 3, 4]),
            "polynomial": {str(d): polynomial_fit(poly, d) for d in (1, 2, 5)},
            "regularization": {kind: regularized([[1, r["x"]] for r in samples], [r["y"] for r in samples], .5, kind, False) for kind in ("l1", "l2")}}


if __name__ == "__main__":
    print(json.dumps(demonstration(), indent=2, allow_nan=False))
