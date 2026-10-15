"""Canonical bounded evaluation lab. X: n×1 rows; y: n×1; one slope + intercept.

Hand data, LCG-seeded group allocation. No claim of stratification. Owner runs tests.
"""
import json
import math
import numbers
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
DATA = json.loads((ROOT / "data/p08/experiments.json").read_text())
DEFAULT = dict(rows=DATA["rows"], probabilities=DATA["probabilities"], seed=7,
               threshold=.5, folds=3, phase=0, t=1e8, delta=1e-8)
GRID = [(power, penalty) for power in (1, 2) for penalty in (0, 1, 4)]


def number(v, name="number"):
    if isinstance(v, (bool, np.bool_)) or not isinstance(v, numbers.Real):
        raise ValueError(name + " must be a real number, not Boolean")
    try:
        v = float(v)
    except (OverflowError, ValueError):
        raise ValueError(name + " is not binary64 representable") from None
    if not math.isfinite(v):
        raise ValueError(name + " must be finite")
    return v


def finite(v):
    if not math.isfinite(v):
        raise ValueError("Numerical result unavailable: binary64 overflow")
    return v


def mul(a, b):
    v = finite(a * b)
    if a != 0 and b != 0 and v == 0:
        raise ValueError("Numerical result unavailable: product underflow")
    return v


def div(a, b):
    if b == 0:
        raise ValueError("Numerical result unavailable: zero divisor")
    v = finite(a / b)
    if a != 0 and v == 0:
        raise ValueError("Numerical result unavailable: quotient underflow")
    return v


def mean(values):
    if not values:
        raise ValueError("Mean needs observations")
    if all(v == values[0] for v in values):
        return values[0]
    total = 0.
    for v in values:
        total = finite(total + div(v, len(values)))
    return total


def integer(v, low, high, name):
    v = number(v, name)
    if not v.is_integer() or not low <= v <= high:
        raise ValueError(name + " must be an integer in bounds")
    return int(v)


def identifiers(rows):
    ids = set()
    for r in rows:
        if not isinstance(r, dict) or not isinstance(r.get("id"), str) or not r["id"] or r["id"] in ids:
            raise ValueError("Unique nonempty row IDs required")
        ids.add(r["id"])


def validate(s):
    if not isinstance(s, dict):
        raise ValueError("Experiment must be an object")
    rows, probs = s.get("rows"), s.get("probabilities")
    if not isinstance(rows, list) or not 8 <= len(rows) <= 64:
        raise ValueError("8–64 dense regression rows required")
    if not isinstance(probs, list) or not 1 <= len(probs) <= 64:
        raise ValueError("1–64 dense probability rows required")
    identifiers(rows)
    identifiers(probs)
    for r in rows:
        if not isinstance(r.get("group"), str) or not r["group"]:
            raise ValueError("Nonempty group required")
        if not isinstance(r.get("x"), list) or len(r["x"]) != 1:
            raise ValueError("X must contain dense one-feature rows")
        if r["x"][0] is not None:
            number(r["x"][0], "feature")
        number(r.get("y"), "target")
    for r in probs:
        if number(r.get("y"), "binary label") not in (0, 1) or not 0 <= number(r.get("p"), "probability") <= 1:
            raise ValueError("Binary label and probability in [0,1] required")
    integer(s.get("seed"), 0, 2**32-1, "seed")
    integer(s.get("folds"), 2, 4, "folds")
    integer(s.get("phase"), 0, 4, "phase")
    if not 0 <= number(s.get("threshold"), "threshold") <= 1:
        raise ValueError("Threshold in [0,1] required")
    if not 1 <= number(s.get("t"), "t") <= 1e12 or not 1e-12 <= number(s.get("delta"), "delta") <= .1:
        raise ValueError("Numerical counterexample parameters out of bounds")


def split(rows, seed, folds):
    if not isinstance(rows, list) or not rows:
        raise ValueError("Dense regression rows required")
    identifiers(rows)
    seed = integer(seed, 0, 2**32-1, "seed")
    folds = integer(folds, 2, 4, "folds")
    for r in rows:
        if not isinstance(r.get("group"), str) or not r["group"]:
            raise ValueError("Nonempty group required")
    groups = sorted(set(r["group"] for r in rows), key=lambda g: g.encode("utf-16-be", "surrogatepass"))
    if len(groups) < folds + 2:
        raise ValueError("Need at least folds+2 groups")
    state = int(seed)
    draws = []
    for i in range(len(groups)-1, 0, -1):
        state = (1664525 * state + 1013904223) % 2**32
        draws.append(state)
        j = state * (i+1) // 2**32
        groups[i], groups[j] = groups[j], groups[i]
    test_group, dev_groups = groups[0], groups[1:]
    test = [r["id"] for r in rows if r["group"] == test_group]
    dev = [r["id"] for r in rows if r["group"] != test_group]
    boards = []
    for k in range(folds):
        held = dev_groups[k::folds]
        boards.append(dict(train=[r["id"] for r in rows if r["group"] in dev_groups and r["group"] not in held],
                           validation=[r["id"] for r in rows if r["group"] in held]))
    return dict(groups=groups, draws=draws, development=dev, test=test, folds=boards)


def take(rows, ids):
    if not isinstance(rows, list) or not 1 <= len(rows) <= 64 or not isinstance(ids, list):
        raise ValueError("Dense rows and membership arrays required")
    identifiers(rows)
    lookup = {r["id"]: r for r in rows}
    if not ids or len(set(ids)) != len(ids) or any(i not in lookup for i in ids):
        raise ValueError("Membership requires unique known IDs")
    return [lookup[i] for i in ids]


def transform_fit(rows, ids):
    selected = take(rows, ids)
    for r in selected:
        if not isinstance(r.get("x"), list) or len(r["x"]) != 1:
            raise ValueError("Dense one-feature row required")
    observed = [number(r["x"][0]) for r in selected if r["x"][0] is not None]
    impute = mean(observed)
    filled = [impute if r["x"][0] is None else number(r["x"][0]) for r in selected]
    center = mean(filled)
    variance = mean([mul(finite(v-center), finite(v-center)) for v in filled])
    scale = math.sqrt(variance) if variance > 0 else 1.
    return dict(fitIds=list(ids), impute=impute, center=center, scale=scale, constant=variance == 0)


def transform(row, state, power):
    if not isinstance(row, dict) or not isinstance(row.get("x"), list) or len(row["x"]) != 1:
        raise ValueError("Dense one-feature row required")
    integer(power, 1, 2, "power")
    number(state["impute"]); number(state["center"])
    if number(state["scale"]) <= 0:
        raise ValueError("Positive fitted scale required")
    filled = state["impute"] if row["x"][0] is None else number(row["x"][0])
    z = div(finite(filled-state["center"]), state["scale"])
    feature = z if power == 1 else mul(z, z)
    return dict(id=row["id"], filled=filled, z=z, feature=feature)


def fit(rows, train_ids, power, penalty, fit_ids=None):
    power = integer(power, 1, 2, "power")
    penalty = number(penalty, "penalty")
    if penalty < 0:
        raise ValueError("Nonnegative ridge penalty required")
    pre = transform_fit(rows, train_ids if fit_ids is None else fit_ids)
    selected = take(rows, train_ids)
    features = [transform(r, pre, power)["feature"] for r in selected]
    targets = [number(r["y"]) for r in selected]
    # NumPy holds the declared row batches; arithmetic order matches the browser contract.
    X, y = np.asarray(features, dtype=np.float64).reshape(-1, 1), np.asarray(targets, dtype=np.float64).reshape(-1, 1)
    fm, ym = mean(X[:, 0].tolist()), mean(y[:, 0].tolist())
    dx, dy = [finite(v-fm) for v in features], [finite(v-ym) for v in targets]
    variance = mean([mul(v, v) for v in dx])
    covariance = mean([mul(a, b) for a, b in zip(dx, dy)])
    denominator = finite(variance + penalty)
    slope = div(covariance, denominator) if denominator else 0.
    intercept = finite(ym - mul(slope, fm))
    model = dict(trainIds=list(train_ids), preprocessing=pre, power=power, penalty=penalty,
                 featureMean=fm, targetMean=ym, slope=slope, intercept=intercept,
                 convention="unpenalized intercept; mean squared error + lambda*slope^2; zero slope if unidentifiable")
    training = evaluate(rows, train_ids, model)
    model.update(trainingMse=training["mse"], objective=finite(training["mse"] + mul(penalty, mul(slope, slope))))
    return model


def evaluate(rows, ids, model):
    evaluated = []
    for r in take(rows, ids):
        transformed = transform(r, model["preprocessing"], model["power"])
        prediction = finite(model["intercept"] + mul(model["slope"], transformed["feature"]))
        residual = finite(prediction-number(r["y"]))
        evaluated.append(dict(transformed, target=number(r["y"]), prediction=prediction,
                              residual=residual, squaredError=mul(residual, residual)))
    return dict(ids=list(ids), rows=evaluated, mse=mean([r["squaredError"] for r in evaluated]))


def metrics(rows, threshold):
    if not isinstance(rows, list) or not 1 <= len(rows) <= 64:
        raise ValueError("1–64 dense probability rows required")
    identifiers(rows)
    threshold = number(threshold)
    if not rows or not 0 <= threshold <= 1:
        raise ValueError("Nonempty probability rows and threshold in [0,1] required")
    tp = fp = tn = fn = 0
    errors, logs = [], []
    decisions = []
    bins = [dict(low=i/5, high=(i+1)/5, ids=[], count=0, meanProbability=None, frequency=None) for i in range(5)]
    for r in rows:
        y, p = number(r.get("y")), number(r.get("p"))
        if y not in (0, 1) or not 0 <= p <= 1:
            raise ValueError("Binary label and probability required")
        positive = p >= threshold
        tp += int(positive and y == 1); fp += int(positive and y == 0)
        tn += int(not positive and y == 0); fn += int(not positive and y == 1)
        errors.append(mul(p-y, p-y))
        decisions.append(dict(id=r["id"], y=y, p=p, positive=positive, squaredError=errors[-1]))
        q = p if y else 1-p
        if q == 0:
            logs.append(None)
        else:
            logs.append(finite(-math.log(q)))
        b = next(b for b in bins if p >= b["low"] and (p < b["high"] or b["high"] == 1))
        b["ids"].append(r["id"])
    for b in bins:
        selected = [r for r in rows if r["id"] in b["ids"]]
        b["count"] = len(selected)
        if selected:
            b["meanProbability"] = mean([number(r["p"]) for r in selected])
            b["frequency"] = mean([number(r["y"]) for r in selected])
    ratio = lambda a, b: a/b if b else None
    recall, specificity = ratio(tp, tp+fn), ratio(tn, tn+fp)
    return dict(rows=decisions, tp=tp, fp=fp, tn=tn, fn=fn, accuracy=(tp+tn)/len(rows),
                balancedAccuracy=(recall+specificity)/2 if recall is not None and specificity is not None else None,
                precision=ratio(tp, tp+fp), recall=recall, f1=ratio(2*tp, 2*tp+fp+fn),
                brier=mean(errors), logLoss=mean(logs) if None not in logs else None,
                logReason="Unbounded log loss: a true class has probability zero" if None in logs else None, bins=bins)


def numerics(t, delta):
    t, delta = number(t), number(delta)
    if not 1 <= t <= 1e12 or not 1e-12 <= delta <= .1:
        raise ValueError("Counterexample parameters out of bounds")
    root = math.sqrt(finite(mul(t, t)+1))
    rounded = finite(1 + delta)
    return dict(left=(1e16 + -1e16) + 1, right=1e16 + (-1e16 + 1),
                fragile=finite(root-t), stable=div(1, finite(root+t)),
                difference=finite(rounded-1), reciprocal=div(1, finite(rounded-1)),
                nominalReciprocal=div(1, delta), condition=div(abs(rounded)+1, abs(rounded-1)))


def experiment(s):
    validate(s)
    rows = s["rows"]
    board = split(rows, s["seed"], s["folds"])
    candidates = []
    for power, penalty in GRID:
        scores = []
        for fold in board["folds"]:
            model = fit(rows, fold["train"], power, penalty)
            validation = evaluate(rows, fold["validation"], model)
            scores.append(dict(model=model, validation=validation))
        candidates.append(dict(power=power, penalty=penalty, folds=scores,
                               meanValidation=mean([f["validation"]["mse"] for f in scores])))
    # Strict less-than: an exact tie retains the first (power ascending, penalty ascending).
    chosen = candidates[0]
    for c in candidates[1:]:
        if c["meanValidation"] < chosen["meanValidation"]:
            chosen = c
    final = fit(rows, board["development"], chosen["power"], chosen["penalty"])
    test = evaluate(rows, board["test"], final)
    fold = board["folds"][0]
    train_groups = [g for g in board["groups"][1:] if any(r["group"] == g and r["id"] in fold["train"] for r in rows)]
    curves = []
    for k in range(1, len(train_groups)+1):
        ids = [r["id"] for r in rows if r["group"] in train_groups[:k]]
        model = fit(rows, ids, chosen["power"], chosen["penalty"])
        curves.append(dict(n=len(ids), ids=ids, model=model, validation=evaluate(rows, fold["validation"], model)))
    proper = fit(rows, fold["train"], 1, 1)
    leaked = fit(rows, fold["train"], 1, 1, fold["train"]+fold["validation"])
    proper_score, leaked_score = evaluate(rows, fold["validation"], proper), evaluate(rows, fold["validation"], leaked)
    m = metrics(s["probabilities"], s["threshold"])
    tradeoff = [dict(threshold=t, **{k: v for k, v in metrics(s["probabilities"], t).items() if k in ("precision", "recall", "tp", "fp", "tn", "fn")})
                for t in sorted(set([0., 1.] + [number(r["p"]) for r in s["probabilities"]]))]
    return dict(board=board, candidates=candidates, selected=dict(power=chosen["power"], penalty=chosen["penalty"]),
                final=final, test=test, curves=curves, leakage=dict(proper=proper, leaked=leaked,
                properScore=proper_score, leakedScore=leaked_score, difference=finite(leaked_score["mse"]-proper_score["mse"])),
                metrics=m, tradeoff=tradeoff, numerics=numerics(s["t"], s["delta"]),
                provenance=dict(dataVersion=DATA["version"], data=DATA["provenance"], seed=s["seed"], folds=s["folds"],
                threshold=s["threshold"], model="scalar engineered-feature ridge with intercept", grid=[list(g) for g in GRID],
                split="UTF-16 sorted groups; Fisher–Yates descending; u32 LCG; first group test; remaining round-robin CV",
                selection="equal-weight mean fold MSE; first grid candidate on exact ties", arithmetic="constant-preserving binary64 sequential mean of divided terms"))


if __name__ == "__main__":
    try:
        request = json.load(sys.stdin) if not sys.stdin.isatty() else DEFAULT
        print(json.dumps(experiment(request), allow_nan=False))
    except (ValueError, TypeError, KeyError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
