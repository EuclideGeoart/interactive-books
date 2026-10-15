"""Independent owner-only oracle: Fraction statistics, augmented least squares,
closed-form integer LCG states and explicit binary64 rounding. Not a browser port.
"""
from fractions import Fraction as F
import importlib.util
import math
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("p08_canonical", ROOT / "code/python/p08/evaluation.py")
canonical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(canonical)


def near(actual, expected, atol=2e-12, rtol=2e-12):
    # Bounded lab comparisons; both tolerances fixed, not adjusted per failing case.
    assert math.isfinite(float(actual)) and math.isfinite(float(expected))
    assert abs(actual-expected) <= atol + rtol*abs(expected), (actual, expected)


def rational(v):
    return F(str(float(v)))


def exact_metrics(rows, threshold):
    cutoff = rational(threshold)
    tp = sum(r["y"] == 1 and rational(r["p"]) >= cutoff for r in rows)
    fp = sum(r["y"] == 0 and rational(r["p"]) >= cutoff for r in rows)
    positives = sum(r["y"] for r in rows)
    fn, tn = positives-tp, len(rows)-positives-fp
    ratio = lambda a, b: F(a, b) if b else None
    recall, specificity = ratio(tp, tp+fn), ratio(tn, tn+fp)
    out = dict(tp=tp, fp=fp, tn=tn, fn=fn, accuracy=F(tp+tn, len(rows)),
               precision=ratio(tp, tp+fp), recall=recall, f1=ratio(2*tp, 2*tp+fp+fn),
               balancedAccuracy=(recall+specificity)/2 if recall is not None and specificity is not None else None,
               brier=sum((rational(r["p"])-r["y"])**2 for r in rows)/len(rows))
    bins = []
    for i in range(5):
        members = [r for r in rows if F(i, 5) <= rational(r["p"]) and (rational(r["p"]) < F(i+1, 5) or i == 4)]
        bins.append(dict(ids=[r["id"] for r in members], count=len(members),
                         meanProbability=sum(rational(r["p"]) for r in members)/len(members) if members else None,
                         frequency=F(sum(r["y"] for r in members), len(members)) if members else None))
    out["bins"] = bins
    return out


def verify_metrics(rows, threshold):
    actual, exact = canonical.metrics(rows, threshold), exact_metrics(rows, threshold)
    for key, value in exact.items():
        if key == "bins":
            for a, e in zip(actual[key], value):
                assert a["ids"] == e["ids"] and a["count"] == e["count"]
                for k in ("meanProbability", "frequency"):
                    if e[k] is None:
                        assert a[k] is None
                    else:
                        near(a[k], float(e[k]))
        elif value is None:
            assert actual[key] is None
        else:
            near(actual[key], float(value))
    # Independently sum true-class natural-log scores; no clipping.
    true_probabilities = [r["p"] if r["y"] else 1-r["p"] for r in rows]
    if 0 in true_probabilities:
        assert actual["logLoss"] is None and "Unbounded" in actual["logReason"]
    else:
        near(actual["logLoss"], math.fsum(-math.log(q) for q in true_probabilities)/len(rows))
    return actual


def exact_transform(rows, ids):
    selected = [r for id_ in ids for r in rows if r["id"] == id_]
    observed = [rational(r["x"][0]) for r in selected if r["x"][0] is not None]
    impute = sum(observed)/len(observed)
    filled = [impute if r["x"][0] is None else rational(r["x"][0]) for r in selected]
    center = sum(filled)/len(filled)
    variance = sum((v-center)**2 for v in filled)/len(filled)
    return impute, center, variance


def verify_fit(rows, ids, power, penalty, fit_ids=None):
    fit_ids = ids if fit_ids is None else fit_ids
    actual = canonical.fit(rows, ids, power, penalty, fit_ids)
    impute, center, variance = exact_transform(rows, fit_ids)
    assert actual["preprocessing"]["fitIds"] == fit_ids and actual["trainIds"] == ids
    near(actual["preprocessing"]["impute"], float(impute)); near(actual["preprocessing"]["center"], float(center))
    scale = math.sqrt(float(variance)) if variance else 1.
    near(actual["preprocessing"]["scale"], scale)
    lookup = {r["id"]: r for r in rows}
    def feature(r):
        filled = impute if r["x"][0] is None else rational(r["x"][0])
        return ((float(filled-center))/scale)**power
    features = np.array([feature(lookup[id_]) for id_ in ids])
    y = np.array([lookup[id_]["y"] for id_ in ids], dtype=float)
    A = np.column_stack((np.ones(len(ids)), features))
    # SSE + nλw² matches canonical MSE + λw². Intercept row remains unpenalized.
    augmented = np.vstack((A, [0., math.sqrt(len(ids)*penalty)]))
    targets = np.append(y, 0.)
    if np.ptp(features) == 0 and penalty == 0:
        coefficients = np.array([np.mean(y), 0.])  # explicit canonical identification convention
    else:
        coefficients = np.linalg.lstsq(augmented, targets, rcond=None)[0]
    near(actual["intercept"], coefficients[0]); near(actual["slope"], coefficients[1])
    train_mse = float(np.mean((A@coefficients-y)**2))
    near(actual["trainingMse"], train_mse); near(actual["objective"], train_mse+penalty*coefficients[1]**2)
    # Check every row prediction independently with exact preprocessing and independent solver coefficients.
    evaluated = canonical.evaluate(rows, [r["id"] for r in rows], actual)
    for r, output in zip(rows, evaluated["rows"]):
        near(output["prediction"], coefficients[0]+coefficients[1]*feature(r))
    return actual


def closed_states(seed, count):
    a, c, modulus = 1664525, 1013904223, 2**32
    return [(pow(a, k)*seed + c*sum(pow(a, j) for j in range(k))) % modulus for k in range(1, count+1)]


def verify_split(rows, seed, folds):
    board = canonical.split(rows, seed, folds)
    original = sorted(set(r["group"] for r in rows), key=lambda g: g.encode("utf-16-be", "surrogatepass"))
    states = closed_states(seed, len(original)-1)
    assert board["draws"] == states
    # Reconstruct the permutation from closed-form draws, not a stateful RNG port.
    permutation = list(original)
    for i, state in zip(range(len(original)-1, 0, -1), states):
        j = (state*(i+1)) // 2**32
        permutation[i], permutation[j] = permutation[j], permutation[i]
    assert board["groups"] == permutation
    all_ids = {r["id"] for r in rows}
    assert set(board["test"]).isdisjoint(board["development"])
    assert set(board["test"]) | set(board["development"]) == all_ids
    validation_ids = []
    lookup = {r["id"]: r for r in rows}
    for fold in board["folds"]:
        T, V = set(fold["train"]), set(fold["validation"])
        assert T.isdisjoint(V) and T|V == set(board["development"])
        assert {lookup[i]["group"] for i in T}.isdisjoint({lookup[i]["group"] for i in V})
        assert {lookup[i]["group"] for i in T|V}.isdisjoint({lookup[i]["group"] for i in board["test"]})
        validation_ids += fold["validation"]
    assert len(validation_ids) == len(set(validation_ids)) and set(validation_ids) == set(board["development"])
    return board


def verify_experiment(request):
    result = canonical.experiment(request)
    board = verify_split(request["rows"], request["seed"], request["folds"])
    for c in result["candidates"]:
        for fold, output in zip(board["folds"], c["folds"]):
            verify_fit(request["rows"], fold["train"], c["power"], c["penalty"])
            assert output["validation"]["ids"] == fold["validation"]
            near(output["validation"]["mse"], math.fsum(r["squaredError"] for r in output["validation"]["rows"])/len(fold["validation"]))
        near(c["meanValidation"], math.fsum(f["validation"]["mse"] for f in c["folds"])/request["folds"])
    best = min(enumerate(result["candidates"]), key=lambda item: (item[1]["meanValidation"], item[0]))[1]
    assert result["selected"] == {k: best[k] for k in ("power", "penalty")}
    verify_fit(request["rows"], board["development"], best["power"], best["penalty"])
    previous = set()
    for c in result["curves"]:
        ids = set(c["ids"])
        assert previous < ids and ids <= set(board["folds"][0]["train"]) and c["n"] == len(ids)
        assert c["validation"]["ids"] == board["folds"][0]["validation"]
        verify_fit(request["rows"], c["ids"], best["power"], best["penalty"])
        selected_groups = {r["group"] for r in request["rows"] if r["id"] in ids}
        assert ids == {r["id"] for r in request["rows"] if r["group"] in selected_groups}
        near(c["validation"]["mse"], math.fsum(r["squaredError"] for r in c["validation"]["rows"])/len(c["validation"]["ids"]))
        previous = ids
    assert previous == set(board["folds"][0]["train"])
    verify_metrics(request["probabilities"], request["threshold"])
    return result
