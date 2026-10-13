"""Independent exact arithmetic: expand the loss using data moments, without NumPy."""
from fractions import Fraction as F


def rational_state(state):
    return {
        "samples": [dict(id=sample["id"], x=F(str(sample["x"])), y=F(str(sample["y"])))
                    for sample in state["samples"]],
        **{key: F(str(state[key])) for key in ("weight", "bias", "learningRate")},
    }


def derive(state):
    state = rational_state(state)
    samples = state["samples"]
    w, b, rate = (state[key] for key in ("weight", "bias", "learningRate"))
    n = len(samples)
    sx = sum(sample["x"] for sample in samples)
    sy = sum(sample["y"] for sample in samples)
    sxx = sum(sample["x"] ** 2 for sample in samples)
    sxy = sum(sample["x"] * sample["y"] for sample in samples)
    syy = sum(sample["y"] ** 2 for sample in samples)
    loss = (w * w * sxx + 2 * w * b * sx + n * b * b - 2 * w * sxy - 2 * b * sy + syy) / n
    dw = 2 * (w * sxx + b * sx - sxy) / n
    db = 2 * (w * sx + n * b - sy) / n
    rows = []
    for sample in samples:
        prediction = w * sample["x"] + b
        residual = prediction - sample["y"]
        rows.append(dict(**sample, prediction=prediction, residual=residual, squaredError=residual ** 2))
    return {
        "rows": rows, "mse": loss, "gradients": {"weight": dw, "bias": db},
        "next": {"weight": w - rate * dw, "bias": b - rate * db},
        "shapes": {"X": [n, 1], "weights": [1, 1], "targets": [n, 1]},
    }


def step(state):
    return {**rational_state(state), **derive(state)["next"]}


def trace(state, steps):
    state = rational_state(state)
    frames = [{"index": 0, "state": state}]
    for index in range(1, steps + 1):
        state = step(state)
        frames.append({"index": index, "state": state})
    return frames


def numbers(value):
    if isinstance(value, F):
        return float(value)
    if isinstance(value, dict):
        return {key: numbers(item) for key, item in value.items()}
    if isinstance(value, list):
        return [numbers(item) for item in value]
    return value


def literal_self_tests():
    state = dict(samples=[dict(id=f"s{i}", x=x, y=y) for i, (x, y) in enumerate(
        [(-2, -3), (-1, -1), (0, 1), (1, 3), (2, 4)], 1)],
        weight=F(1, 2), bias=0, learningRate=F(1, 10))
    before = derive(state)
    assert [row["prediction"] for row in before["rows"]] == [-1, F(-1, 2), 0, F(1, 2), 1]
    assert [row["residual"] for row in before["rows"]] == [2, F(1, 2), -1, F(-5, 2), -3]
    assert [row["squaredError"] for row in before["rows"]] == [4, F(1, 4), 1, F(25, 4), 9]
    assert before["mse"] == F(41, 10)
    assert before["gradients"] == {"weight": F(-26, 5), "bias": F(-8, 5)}
    assert before["next"] == {"weight": F(51, 50), "bias": F(4, 25)}
    after = derive(step(state))
    assert [row["squaredError"] for row in after["rows"]] == [F(784, 625), F(49, 2500), F(441, 625), F(8281, 2500), F(81, 25)]
    assert after["mse"] == F(2133, 1250)
    assert after["gradients"] == {"weight": F(-78, 25), "bias": F(-32, 25)}


if __name__ == "__main__":
    literal_self_tests()
    print("III-07 independent rational literals: passed")
