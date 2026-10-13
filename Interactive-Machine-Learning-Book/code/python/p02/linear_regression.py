"""III-07: affine predictions, MSE and analytical gradient descent using NumPy."""
from copy import deepcopy
import json
import math

import numpy as np


CANONICAL_REGRESSION = {
    "samples": [
        {"id": "s1", "x": -2, "y": -3},
        {"id": "s2", "x": -1, "y": -1},
        {"id": "s3", "x": 0, "y": 1},
        {"id": "s4", "x": 1, "y": 3},
        {"id": "s5", "x": 2, "y": 4},
    ],
    "weight": 0.5,
    "bias": 0,
    "learningRate": 0.1,
}


def _finite(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be a finite number")
    try:
        valid = math.isfinite(value)
    except OverflowError:
        valid = False
    if not valid:
        raise ValueError(f"{label} must be finite; input or arithmetic overflow is invalid")
    return value


def derive_regression(state):
    samples = state.get("samples") if isinstance(state, dict) else None
    if not isinstance(samples, (list, tuple)) or not 1 <= len(samples) <= 64:
        raise ValueError("Regression requires 1 to 64 samples")
    weight = _finite(state.get("weight"), "Weight")
    bias = _finite(state.get("bias"), "Bias")
    rate = _finite(state.get("learningRate"), "Learning rate")
    if not 0 < rate <= 1:
        raise ValueError("Learning rate must be greater than 0 and at most 1")
    ids = set()
    for sample in samples:
        identifier = sample.get("id") if isinstance(sample, dict) else None
        if not isinstance(identifier, str) or not identifier.strip() or identifier in ids:
            raise ValueError("Sample IDs must be nonempty strings and unique")
        ids.add(identifier)
        for key in ("x", "y"):
            _finite(sample.get(key), f"Sample {identifier} {key}")

    # Mathematical vectors are columns; each row of X is one scalar-feature sample.
    X = np.array([[sample["x"]] for sample in samples], dtype=np.float64)
    weights = np.array([[weight]], dtype=np.float64)
    targets = np.array([[sample["y"]] for sample in samples], dtype=np.float64)
    n = len(samples)
    try:
        with np.errstate(over="raise", invalid="raise", divide="raise", under="ignore"):
            products = X @ weights
            predictions = products + bias
            residuals = predictions - targets
            squared = residuals * residuals
            squared_sum = np.sum(squared)
            residual_sum = np.sum(residuals)
            weighted_sum = (X.T @ residuals)[0, 0]
            mse = float(squared_sum / n)
            dw = float((2 / n) * weighted_sum)
            db = float((2 / n) * residual_sum)
            next_weight = weight - rate * dw
            next_bias = bias - rate * db
    except FloatingPointError as error:
        raise ValueError(f"Regression arithmetic overflowed or produced a non-finite value: {error}") from error
    for values, label in ((products, "Weight × x"), (predictions, "Predictions"),
                          (residuals, "Residuals"), (squared, "Squared errors")):
        if not np.isfinite(values).all():
            raise ValueError(f"{label} overflowed or produced a non-finite value")
    for value, label in ((squared_sum, "Squared-error sum"), (residual_sum, "Residual sum"),
                         (weighted_sum, "Weighted-residual sum"), (mse, "MSE"),
                         (dw, "Weight gradient"), (db, "Bias gradient"),
                         (next_weight, "Updated weight"), (next_bias, "Updated bias")):
        _finite(float(value), label)
    return {
        "rows": [dict(id=sample["id"], x=sample["x"], y=sample["y"],
                      prediction=float(predictions[i, 0]), residual=float(residuals[i, 0]),
                      squaredError=float(squared[i, 0])) for i, sample in enumerate(samples)],
        "mse": mse,
        "gradients": {"weight": dw, "bias": db},
        "next": {"weight": next_weight, "bias": next_bias},
        "shapes": {"X": list(X.shape), "weights": list(weights.shape), "targets": list(targets.shape)},
    }


def regression_step(state):
    next_state = {**deepcopy(state), **derive_regression(state)["next"]}
    derive_regression(next_state)
    return next_state


def regression_trace(state, steps):
    if type(steps) is not int or not 0 <= steps <= 20:
        raise ValueError("Trace steps must be an integer from 0 to 20")
    derive_regression(state)
    state = deepcopy(state)
    frames = [{"index": 0, "state": state}]
    for index in range(1, steps + 1):
        state = regression_step(state)
        frames.append({"index": index, "state": state})
    return frames


if __name__ == "__main__":
    print(json.dumps({
        "before": derive_regression(CANONICAL_REGRESSION),
        "after": derive_regression(regression_step(CANONICAL_REGRESSION)),
        "trace": regression_trace(CANONICAL_REGRESSION, 3),
    }, indent=2, allow_nan=False))
