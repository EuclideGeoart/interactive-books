"""Inspectable two-feature PCA. X stores observations in rows; directions are columns.

No scaling or whitening. Sample normalization divides by n-1; population by n.
One sample has undefined sample covariance. Zero spread has undefined variance ratios.
"""
import json
import math
import sys
import numpy as np

CLOUD = [{"id": i, "x": x} for i, x in zip("abcd", [[-2, -1], [-1, -2], [1, 2], [2, 1]])]
DEFAULT = dict(points=CLOUD, normalization="sample", k=1)


def finite(value, label):
    if isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, float, np.integer, np.floating)):
        raise ValueError(f"{label} must be a finite real number.")
    try:
        number = float(value)
    except (OverflowError, ValueError) as error:
        raise ValueError(f"{label} must be finite; binary64 conversion overflow is rejected.") from error
    if not math.isfinite(number):
        raise ValueError(f"{label} must be finite; arithmetic overflow is rejected.")
    return number + 0.0


def energy(values):
    total = 0.0
    for value in values:
        square = finite(float(value) * float(value), "Squared component")
        if value != 0 and square == 0:
            raise ValueError("Squared component underflow: rescale the observations.")
        total = finite(total + square, "Sum of squares")
    return total


def normalized_energy(values, divisor):
    total = energy(values)
    value = finite(total / divisor, "Normalized energy")
    if total > 0 and value == 0:
        raise ValueError("Variance underflow: rescale the observations.")
    return value


def pca(request):
    if not isinstance(request, dict):
        raise ValueError("PCA request must be an object.")
    normalization, k, points = request.get("normalization"), request.get("k"), request.get("points")
    if normalization not in ("sample", "population"):
        raise ValueError("Normalization must be sample or population.")
    k = finite(k, "Component count")
    if not k.is_integer() or not 0 <= k <= 2:
        raise ValueError("Component count must be an integer from 0 to 2.")
    k = int(k)
    if not isinstance(points, list) or not 1 <= len(points) <= 128:
        raise ValueError("Use 1 to 128 dense two-feature observations.")
    ids, coordinates = [], []
    for point in points:
        if not isinstance(point, dict) or not isinstance(point.get("id"), str) or not point["id"].strip() or point["id"] in ids:
            raise ValueError("Point IDs must be nonempty unique strings.")
        x = point.get("x")
        if not isinstance(x, list) or len(x) != 2:
            raise ValueError("Each observation must have exactly two dense components.")
        ids.append(point["id"])
        coordinates.append([finite(value, "Observation component") for value in x])
    X = np.asarray(coordinates, dtype=np.float64)  # n×2; boundary checked before degenerate returns
    n = len(points)
    mean = []
    for j in range(2):
        first = float(X[0, j])
        if all(float(x) == first for x in X[:, j]):
            mean.append(first)
        else:
            delta = 0.0
            for x in X[:, j]:
                delta = finite(delta + finite(float(x) - first, "Mean difference") / n, "Mean accumulation")
            mean.append(finite(first + delta, "Mean"))
    centered = np.asarray([[finite(float(x[j]) - mean[j], "Centering") for j in range(2)] for x in X])
    divisor = n - 1 if normalization == "sample" else n
    products = [[finite(float(x[0]) * float(x[0]), "Squared x"), finite(float(x[0]) * float(x[1]), "Cross product"), finite(float(x[1]) * float(x[1]), "Squared y")] for x in centered]
    basic = dict(n=n, divisor=divisor, mean=mean, centered=centered.tolist(), products=products)
    if divisor == 0:
        return dict(basic, status="undefined", reason="Sample covariance needs n ≥ 2; n−1 is zero.")
    a, c = (normalized_energy(centered[:, j], divisor) for j in range(2))
    b = 0.0
    for x in centered:
        b = finite(b + finite(float(x[0]) * float(x[1]), "Cross product"), "Covariance sum")
    b = finite(b / divisor, "Covariance")
    repeated, scale = a == c and b == 0, max(a, c, abs(b))
    v1, large = [1.0, 0.0], 0.0
    if scale > 0:
        A, B, C = a / scale, b / scale, c / scale
        L = (A + C) / 2 + math.hypot((A - C) / 2, B)
        large = finite(scale * L, "Largest eigenvalue")
        if b == 0:
            v1 = [1.0, 0.0] if a >= c else [0.0, 1.0]
        else:
            raw = [L - C, B] if A >= C else [B, L - A]
            norm = math.hypot(*raw)
            if norm == 0:
                raise ValueError("Eigenvector scaling underflow: direction is unresolved in binary64.")
            sign = -1 if raw[0] < 0 or (raw[0] == 0 and raw[1] < 0) else 1
            v1 = [sign * x / norm for x in raw]
    v2 = [-v1[1], v1[0]]
    axes = [v1, v2]  # serialized list of 2×1 columns, not a row-batch basis matrix
    def dot(x, v):
        return finite(finite(float(x[0]) * v[0], "Dot product") + finite(float(x[1]) * v[1], "Dot product"), "Dot product")
    scores = [[dot(x, v) for v in axes] for x in centered]
    small = normalized_energy([z[1] for z in scores], divisor)
    if small > large:  # last-bit ordering in a nearly repeated spectrum
        large, small = small, large
        axes = [v2, v1]
        scores = [[z[1], z[0]] for z in scores]
        v1 = axes[0]
    eigenvalues = [large, small]
    total = finite(large + small, "Total variance")
    ratios = None if total == 0 else [v / total for v in eigenvalues]
    rows = []
    for i, x in enumerate(X):
        z = scores[i]
        # Full-space identity is applied directly, avoiding needless rotate/unrotate roundoff.
        reconstructed = x.tolist() if k == 2 else [finite(mean[j] + (finite(z[0] * v1[j], "Reconstruction product") if k else 0), "Reconstruction") for j in range(2)]
        residual = [finite(float(x[j]) - reconstructed[j], "Residual") for j in range(2)]
        rows.append(dict(id=ids[i], x=x.tolist(), centered=centered[i].tolist(), scores=z[:k], fullScores=z,
                         reconstructed=reconstructed, residual=residual, squaredError=energy(residual)))
    sse = 0.0
    for row in rows:
        sse = finite(sse + row["squaredError"], "Reconstruction SSE")
    return dict(basic, status="defined", covariance=[[a, b], [b, c]], axes=axes, eigenvalues=eigenvalues,
                totalVariance=total, ratios=ratios, retained=None if ratios is None else sum(ratios[:k]),
                repeated=repeated, nearRepeated=not repeated and abs(large - small) <= 64 * sys.float_info.epsilon * total,
                zeroVariance=total == 0, rows=rows, sse=sse, mse=sse / n, entryMse=sse / (2 * n))


if __name__ == "__main__":
    try:
        request = DEFAULT if sys.stdin.isatty() else json.load(sys.stdin)
        print(json.dumps(pca(request), allow_nan=False))
    except (ValueError, TypeError, OverflowError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        sys.exit(2)
