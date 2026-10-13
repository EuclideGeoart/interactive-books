"""Independent Part II mathematics: rational moments, LAPACK lstsq, Decimal probabilities,
finite differences and pairwise-ranking AUC. No browser code is imported here.
"""
from decimal import Decimal, localcontext
from fractions import Fraction
import numpy as np

RCOND = 1e-10


def centered_fit(samples):
    n = len(samples)
    x = [Fraction(str(r["x"])) for r in samples]
    y = [Fraction(str(r["y"])) for r in samples]
    # Pair differences eliminate the intercept without translating the centered browser sums.
    xx = sum((x[i] - x[j]) ** 2 for i in range(n) for j in range(i))
    xy = sum((x[i] - x[j]) * (y[i] - y[j]) for i in range(n) for j in range(i))
    w = xy / xx if xx else Fraction(0)
    b = (sum(y) - w * sum(x)) / n
    mse = sum((w * a + b - t) ** 2 for a, t in zip(x, y)) / n
    return dict(weight=float(w), bias=float(b), mse=float(mse), unique=bool(xx))


def robust_fit(X, y):
    A, target = np.array(X, dtype=float), np.array(y, dtype=float)
    w, _, rank, s = np.linalg.lstsq(A, target, rcond=RCOND)
    return dict(weights=w.tolist(), rank=int(rank), predictions=(A @ w).tolist(), mse=float(np.mean((A @ w - target) ** 2)),
                singularValues=s.tolist() + [0.] * (A.shape[1] - len(s)))


def difference(function, parameters, step=1e-5):
    values = np.array(parameters, dtype=float)
    gradient = np.zeros_like(values)
    for index in np.ndindex(values.shape):
        high, low = values.copy(), values.copy()
        high[index] += step
        low[index] -= step
        gradient[index] = (function(high) - function(low)) / (2 * step)
    return gradient


def decimal_binary(X, y, weights, rate):
    with localcontext() as ctx:
        ctx.prec = 80
        D = lambda v: Decimal(str(v))
        logits = [sum(D(a) * D(b) for a, b in zip(row, weights)) for row in X]
        scores = [1 / (1 + (-z).exp()) for z in logits]
        # Likelihood definition in high precision; this is independent of max/log1p implementation.
        losses = [(1 + z.exp()).ln() - z * D(label) for z, label in zip(logits, y)]
        gradient = [sum(D(row[j]) * (p - D(label)) for row, p, label in zip(X, scores, y)) / len(X) for j in range(len(weights))]
        return {"logits": list(map(float, logits)), "scores": list(map(float, scores)), "losses": list(map(float, losses)),
                "loss": float(sum(losses) / len(X)), "gradient": list(map(float, gradient)),
                "next": [float(D(w) - D(rate) * g) for w, g in zip(weights, gradient)]}


def decimal_multi(X, y, W, rate, shift=0):
    with localcontext() as ctx:
        ctx.prec = 80
        D = lambda v: Decimal(str(v))
        n, d, k = len(X), len(W), len(W[0])
        logits = [[sum(D(row[j]) * D(W[j][c]) for j in range(d)) + D(shift) for c in range(k)] for row in X]
        # Decimal has enough exponent range to normalize the unshifted exponentials, even at ±1000.
        probabilities = [[z.exp() / sum(v.exp() for v in row) for z in row] for row in logits]
        losses = [-row[label].ln() for row, label in zip(probabilities, y)]
        gradient = [[sum(D(X[i][j]) * (probabilities[i][c] - D(int(y[i] == c))) for i in range(n)) / n for c in range(k)] for j in range(d)]
        return {"logits": [[float(z) for z in row] for row in logits], "probabilities": [[float(p) for p in row] for row in probabilities],
                "losses": list(map(float, losses)), "loss": float(sum(losses) / n), "gradient": [[float(g) for g in row] for row in gradient],
                "next": [[float(D(w) - D(rate) * g) for w, g in zip(row, gradient[j])] for j, row in enumerate(W)]}


def literal_counts(scores, y, threshold):
    # Sets of IDs establish every cell independently of the production row-classification loop.
    actual = {i for i, label in enumerate(y) if label == 1}
    predicted = {i for i, p in enumerate(scores) if threshold is not None and p >= threshold}
    universe = set(range(len(y)))
    tp, fp, tn, fn = len(actual & predicted), len(predicted - actual), len(universe - actual - predicted), len(actual - predicted)
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn,
            "precision": tp / (tp + fp) if tp + fp else None, "recall": tp / (tp + fn) if tp + fn else None,
            "f1": 2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else None}


def ranking_auc(scores, y):
    positive = [p for p, label in zip(scores, y) if label == 1]
    negative = [p for p, label in zip(scores, y) if label == 0]
    if not positive or not negative:
        return None
    return float(sum(Fraction(1) if p > q else Fraction(1, 2) if p == q else Fraction(0) for p in positive for q in negative) / (len(positive) * len(negative)))
