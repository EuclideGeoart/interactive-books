"""Generate small deterministic independent p02 expectations; --check never writes."""
import argparse
import json
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "code/python/p02"))
import fit_reference as fit
import classification_reference as classification
from remainder_math import centered_fit, decimal_binary, decimal_multi, literal_counts, robust_fit, ranking_auc

FIXTURE = ROOT / "fixtures/p02/remainder.fixtures.json"


def close(actual, expected, tolerance=2e-9):
    if isinstance(expected, dict):
        for key, value in expected.items():
            close(actual[key], value, tolerance)
    elif isinstance(expected, list):
        assert len(actual) == len(expected)
        for a, b in zip(actual, expected):
            close(a, b, tolerance)
    elif expected is None or isinstance(expected, (str, bool)):
        assert actual == expected, (actual, expected)
    else:
        assert np.isclose(actual, expected, atol=tolerance, rtol=tolerance), (actual, expected)


def build():
    scalar = []
    for name, samples in [
        ("canonical", fit.CANONICAL_REGRESSION["samples"]),
        ("constant", [dict(id="a", x=2, y=1), dict(id="b", x=2, y=3)]),
        ("single", [dict(id="a", x=-1, y=4)]),
        ("asymmetric", [dict(id="a", x=-2, y=0), dict(id="b", x=1, y=2), dict(id="c", x=3, y=7)]),
    ]:
        expected = centered_fit(samples)
        close(fit.closed_form(samples), expected, 1e-12)
        scalar.append(dict(name=name, samples=samples, expected=expected))
    solves = []
    for name, X, y in [
        ("full", [[1, -1, 0], [1, 0, 1], [1, 1, 0], [1, 2, 1]], [-1, 0, 3, 4]),
        ("duplicate", [[1, 1], [2, 2]], [2, 4]),
        ("wide", [[1, 1, 1]], [3]),
        ("zero", [[0, 0]], [3]),
        ("near-dependent", [[1, 1], [1, 1 + 1e-12], [1, 1 - 1e-12]], [2, 2, 2]),
        ("scaled-small", [[1e-80, 0], [0, 2e-80]], [1e-80, 4e-80]),
        ("scaled-large", [[1e80, 0], [0, 2e80]], [1e80, 4e80]),
    ]:
        expected = robust_fit(X, y)
        actual = fit.least_norm(X, y)
        close(actual, {k: expected[k] for k in ("weights", "rank", "singularValues")})
        close(fit.linear(X, y, actual["weights"]), {k: expected[k] for k in ("predictions", "mse")}, 1e-8 if "large" in name else 2e-9)
        solves.append(dict(name=name, X=X, y=y, expected=expected))
    poly = []
    data = fit.POLYNOMIAL_DATA
    samples = [dict(id=f"s{i+1}", x=x, y=data["trainY"][i]) for i, x in enumerate(data["trainX"])]
    for degree in (1, 2, 5):
        A = np.vander(data["trainX"], degree + 1, increasing=True)
        expected = robust_fit(A.tolist(), data["trainY"])
        H = np.vander(data["heldX"], degree + 1, increasing=True)
        hp = H @ np.array(expected["weights"])
        expected.update(heldPredictions=hp.tolist(), heldMse=float(np.mean((hp - data["heldY"]) ** 2)))
        result = fit.polynomial_fit(samples, degree)
        close(result, {k: expected[k] for k in ("weights", "rank")})
        close(result["held"], {"predictions": expected["heldPredictions"], "mse": expected["heldMse"]})
        poly.append(dict(degree=degree, samples=samples, expected=expected))
    penalties = []
    for kind, lam, intercept in [("l2", 2, False), ("l2", 2, True), ("l1", 2, False), ("l1", 2, True), ("l1", 4, False), ("l1", 0, False)]:
        X, y = [[1, -1], [1, 1]], [3, 7]
        # Orthogonal columns each have mean square 1: scalar shrinkage is exact here.
        expected_weights = [(5 / (1 + lam) if kind == "l2" else max(0, 5 - lam / 2)) if intercept else 5,
                            2 / (1 + lam) if kind == "l2" else max(0, 2 - lam / 2)]
        prediction = np.array(X) @ expected_weights
        mse = float(np.mean((prediction - y) ** 2))
        penalty = lam * sum((w * w if kind == "l2" else abs(w)) for i, w in enumerate(expected_weights) if i or intercept)
        expected = dict(weights=expected_weights, mse=mse, penalty=penalty, objective=mse + penalty)
        close(fit.regularized(X, y, lam, kind, intercept), expected)
        penalties.append(dict(X=X, y=y, kind=kind, lam=lam, penalizeIntercept=intercept, expected=expected))
    binary = []
    for name, X, y, weights in [("canonical", [[1, -2], [1, -1], [1, 0], [1, 1], [1, 2]], [0, 0, 1, 0, 1], [0, 1]),
                               ("asymmetric", [[1, -.7], [1, 1.2]], [1, 0], [.3, -.4]),
                               ("extreme", [[1, -1], [1, 1]], [1, 0], [0, 1000])]:
        expected = decimal_binary(X, y, weights, .2)
        close(classification.logistic(X, y, weights, .2), expected, 1e-12)
        trace = []
        w = weights
        for index in range(4):
            derived = decimal_binary(X, y, w, .2)
            close(classification.logistic(X, y, w, .2), derived, 1e-12)
            trace.append(dict(index=index, weights=w, expected=derived)); w = derived["next"]
        binary.append(dict(name=name, X=X, y=y, weights=weights, rate=.2, expected=expected, trace=trace))
    counts = []
    for name, scores, y, threshold in [
        ("ties-default", [.9, .8, .8, .4, .1], [1, 0, 1, 0, 1], .5),
        ("tie-equality", [.9, .8, .8, .4, .1], [1, 0, 1, 0, 1], .8),
        ("above-all", [1, 0], [1, 0], None),
        ("no-positive", [.2, .7], [0, 0], .5),
        ("no-positive-and-no-predicted", [.2, .7], [0, 0], None),
        ("no-negative", [.2, .7], [1, 1], .5),
        ("all-tied", [.5, .5], [0, 1], .5),
    ]:
        expected = literal_counts(scores, y, threshold)
        c = classification.confusion(scores, y, threshold)
        close(c, {k: expected[k] for k in ("tp", "fp", "tn", "fn")}, 0)
        for k in ("precision", "recall", "f1"): close(c[k]["value"], expected[k], 1e-12)
        auc = ranking_auc(scores, y)
        close(classification.roc(scores, y)["auc"]["value"], auc, 1e-12)
        thresholds = [None] + sorted(set(scores), reverse=True)
        sweep = [dict(threshold=t, **literal_counts(scores, y, t)) for t in thresholds]
        counts.append(dict(name=name, scores=scores, y=y, threshold=threshold, expected=expected, auc=auc, sweep=sweep))
    multi = []
    for name, X, y, W, shift in [("canonical", [[1, -1], [1, 0], [1, 1]], [2, 1, 0], [[0, 0, 0], [1, 0, -1]], 0),
                                ("zero", [[1, 2]], [1], [[0, 0, 0], [0, 0, 0]], 0),
                                ("shifted", [[1, -1], [1, 0], [1, 1]], [2, 1, 0], [[0, 0, 0], [1, 0, -1]], 1000),
                                ("extreme", [[1]], [2], [[1000, 0, -1000]], 0)]:
        expected = decimal_multi(X, y, W, .2, shift)
        close(classification.multiclass(X, y, W, .2, shift), expected, 1e-12)
        trace = []; weights = W
        for index in range(4):
            result = decimal_multi(X, y, weights, .2, shift)
            close(classification.multiclass(X, y, weights, .2, shift), result, 1e-12)
            trace.append(dict(index=index, W=weights, expected=result)); weights = result["next"]
        multi.append(dict(name=name, X=X, y=y, W=W, rate=.2, shift=shift, expected=expected, trace=trace))
    return {"policy": {"provenance": "Hand-authored deterministic fixtures; no seed", "svdRcond": 1e-10,
                       "parityAbsolute": 2e-9, "parityRelative": 2e-9, "finiteDifferenceStep": 1e-5, "finiteDifferenceTolerance": 2e-7,
                       "oracle": "Fraction pair differences; NumPy LAPACK lstsq; 80-digit Decimal likelihoods; literal set counts; pairwise tie-aware AUC"},
            "closed": scalar, "solves": solves, "polynomial": poly, "penalties": penalties, "binary": binary, "counts": counts, "multi": multi}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true"); mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = json.dumps(build(), indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    if args.check:
        if not FIXTURE.exists() or FIXTURE.read_text() != content:
            print(f"Missing or stale fixture: {FIXTURE}", file=sys.stderr); return 1
        print("Fresh independent p02 remainder fixtures (34 cases).")
    elif args.write:
        FIXTURE.write_text(content); print("Wrote independent p02 remainder fixtures (34 cases).")
    else:
        sys.stdout.write(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
