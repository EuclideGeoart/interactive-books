"""III-13–16: stable logit losses, exact thresholds/ROC and softmax gradients.

Run: .venv/bin/python -B code/python/p02/classification_reference.py
Samples occupy rows; binary W is d×1, multiclass W is d×k.
"""
import json
import math
import numpy as np
from fit_reference import column, design, finite

SCORE_FIXTURE = {"scores": [.9, .8, .8, .4, .1], "labels": [1, 0, 1, 0, 1]}


def class_labels(y, n, k=2):
    column(y, n, "Labels")
    if any(int(v) != v or not 0 <= v < k for v in y):
        raise ValueError(f"Labels must be class indices 0–{k-1}")


def sigmoid(z):
    if isinstance(z, bool) or not isinstance(z, (int, float)) or not math.isfinite(z):
        raise ValueError("Logit must be finite")
    return 1 / (1 + math.exp(-z)) if z >= 0 else math.exp(z) / (1 + math.exp(z))


def bce(z, y):
    sigmoid(z)
    if isinstance(y, bool) or y not in (0, 1):
        raise ValueError("Binary label must be 0 or 1")
    return float(finite(max(z, 0) - z * y + math.log1p(math.exp(-abs(z))), "BCE"))


def learning_rate(rate):
    if isinstance(rate, bool) or not isinstance(rate, (int, float)) or not math.isfinite(rate) or not 0 < rate <= 1:
        raise ValueError("Learning rate must be in (0,1]")


def logistic(X, y, weights, rate):
    A, _ = design(X, y)
    W = column(weights, A.shape[1], "Weights")
    class_labels(y, len(A))
    learning_rate(rate)
    logits = finite(A @ W, "Logits")[:, 0].tolist()
    scores = [sigmoid(z) for z in logits]
    losses = [bce(z, label) for z, label in zip(logits, y)]
    loss = float(finite(sum(losses) / len(A), "Mean BCE"))
    gradient = finite(A.T @ (np.array(scores) - np.array(y)).reshape(-1, 1) / len(A), "Gradient")
    next_weights = finite(W - rate * gradient, "Updated weights")
    n, d = A.shape
    return {"logits": logits, "scores": scores, "losses": losses, "loss": loss,
            "gradient": gradient[:, 0].tolist(), "next": next_weights[:, 0].tolist(),
            "shapes": {"X": [n, d], "W": [d, 1], "y": [n, 1], "gradient": [d, 1]}}


def ratio(top, bottom, reason):
    return {"value": top / bottom, "reason": None} if bottom else {"value": None, "reason": reason}


def confusion(scores, y, threshold):
    column(scores, len(scores), "Scores")
    if not 1 <= len(scores) <= 64 or any(not 0 <= p <= 1 for p in scores):
        raise ValueError("Scores require 1–64 probabilities in [0,1]")
    class_labels(y, len(scores))
    if threshold is not None and (isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not 0 <= threshold <= 1):
        raise ValueError("Threshold must be in [0,1] or the explicit above-all None sentinel")
    rows = []
    cells = dict(TP=0, FP=0, TN=0, FN=0)
    for p, label in zip(scores, y):
        prediction = int(threshold is not None and p >= threshold)
        cell = ("TP" if label else "FP") if prediction else ("FN" if label else "TN")
        cells[cell] += 1
        rows.append(dict(score=p, label=label, prediction=prediction, cell=cell))
    tp, fp, tn, fn = (cells[k] for k in ("TP", "FP", "TN", "FN"))
    return {"rows": rows, "tp": tp, "fp": fp, "tn": tn, "fn": fn,
            "precision": ratio(tp, tp + fp, "No predicted positives (TP+FP=0)."),
            "recall": ratio(tp, tp + fn, "No actual positives (TP+FN=0)."),
            "f1": ratio(2 * tp, 2 * tp + fp + fn, "No actual or predicted positives (2TP+FP+FN=0)."),
            "accuracy": (tp + tn) / len(scores)}


def roc(scores, y):
    confusion(scores, y, .5)
    positives, negatives = y.count(1), y.count(0)
    points = []
    for threshold in [None] + sorted(set(scores), reverse=True):
        c = confusion(scores, y, threshold)
        points.append({"threshold": threshold, **{k: c[k] for k in ("tp", "fp", "tn", "fn")},
                       "tpr": ratio(c["tp"], positives, "ROC TPR needs at least one positive."),
                       "fpr": ratio(c["fp"], negatives, "ROC FPR needs at least one negative.")})
    reason = None if positives and negatives else "ROC/AUC requires both actual classes."
    area = None if reason else sum((b["fpr"]["value"] - a["fpr"]["value"]) * (a["tpr"]["value"] + b["tpr"]["value"]) / 2 for a, b in zip(points, points[1:]))
    return {"points": points, "auc": {"value": area, "reason": reason}, "positives": positives, "negatives": negatives}


def softmax(logits):
    if not isinstance(logits, (list, tuple)) or not 2 <= len(logits) <= 6:
        raise ValueError("Softmax requires 2–6 logits")
    column(logits, len(logits), "Logits")
    maximum = max(logits)
    shifted = finite(np.array(logits) - maximum, "Shifted logits")
    exp = np.exp(shifted)
    total = float(np.sum(exp))
    return {"maximum": maximum, "shifted": shifted.tolist(), "probabilities": (exp / total).tolist(), "logSumExpShifted": math.log(total)}


def multiclass(X, y, W, rate, shift=0):
    A, _ = design(X, y)
    weights, _ = design(W, [0.] * len(W))
    n, d = A.shape
    k = weights.shape[1]
    if weights.shape[0] != d or not 2 <= k <= 6:
        raise ValueError("W must be d×k with 2–6 classes")
    class_labels(y, n, k)
    learning_rate(rate)
    if isinstance(shift, bool) or not isinstance(shift, (int, float)) or not math.isfinite(shift):
        raise ValueError("Common shift must be finite")
    logits = finite(A @ weights + shift, "Logits")
    normalized = [softmax(row) for row in logits.tolist()]
    P = np.array([r["probabilities"] for r in normalized])
    Y = np.eye(k)[np.array(y, dtype=int)]
    losses = [r["logSumExpShifted"] - r["shifted"][int(y[i])] for i, r in enumerate(normalized)]
    loss = float(finite(sum(losses) / n, "Mean cross entropy"))
    gradient = finite(A.T @ (P - Y) / n, "Gradient")
    next_weights = finite(weights - rate * gradient, "Updated weights")
    return {"logits": logits.tolist(), "normalized": normalized, "probabilities": P.tolist(), "losses": losses, "loss": loss,
            "gradient": gradient.tolist(), "next": next_weights.tolist(), "predicted": np.argmax(P, axis=1).tolist(), "oneHot": Y.tolist(),
            "shapes": {"X": [n, d], "W": [d, k], "logits": [n, k], "Y": [n, k], "gradient": [d, k], "labels": [n, 1]}}


def demonstration():
    X, y, w = [[1, -2], [1, -1], [1, 0], [1, 1], [1, 2]], [0, 0, 1, 0, 1], [0, 1]
    trace = []
    for i in range(4):
        result = logistic(X, y, w, .2)
        trace.append({"index": i, "weights": w, "derived": result})
        w = result["next"]
    return {"logisticTrace": trace, "threshold": confusion(SCORE_FIXTURE["scores"], SCORE_FIXTURE["labels"], .5),
            "roc": roc(SCORE_FIXTURE["scores"], SCORE_FIXTURE["labels"]),
            "softmax": multiclass([[1, -1], [1, 0], [1, 1]], [2, 1, 0], [[0, 0, 0], [1, 0, -1]], .2),
            "extremeBCE": [[z, label, bce(z, label)] for z in (-1000, 1000) for label in (0, 1)]}


if __name__ == "__main__":
    print(json.dumps(demonstration(), indent=2, allow_nan=False))
