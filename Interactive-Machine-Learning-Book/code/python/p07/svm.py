"""Canonical bounded two-feature SVM, Python + NumPy. Owner executes checks.

X stores n×2 rows; y/alpha are serialized columns. No randomness. Hard margin
uses closest convex hulls; soft/kernel uses exact feasible pair dual steps.
"""
import json
from fractions import Fraction
import math
import sys
import numpy as np

EPS = 1e-9
KKT_TOL = 2e-5
GAP_TOL = 1e-5
MAX_STEPS = 1200


def real(v, lo=-math.inf, hi=math.inf):
    if isinstance(v, (bool, np.bool_)) or not isinstance(v, (int, float, np.integer, np.floating)):
        raise ValueError("Expected a finite real number, not a Boolean.")
    try:
        x = float(v)
    except (OverflowError, ValueError) as error:
        raise ValueError("Number cannot be represented in binary64.") from error
    if not math.isfinite(x) or not lo <= x <= hi:
        raise ValueError("Number outside the finite supported range.")
    return x


def finite(v):
    if not math.isfinite(v):
        raise ValueError("Computed arithmetic is not representable.")
    return v


def mul(a, b):
    v = finite(a * b)
    if a != 0 and b != 0 and v == 0:
        raise ValueError("Nonzero product underflows binary64.")
    return v


def dot(a, b):
    return finite(mul(a[0], b[0]) + mul(a[1], b[1]))


def sub(a, b):
    return [finite(a[0] - b[0]), finite(a[1] - b[1])]


def validate(s):
    if not isinstance(s, dict) or s.get("mode") not in ("hard", "soft", "kernel"):
        raise ValueError("Choose hard, soft or kernel mode.")
    points = s.get("points")
    if not isinstance(points, list) or not 2 <= len(points) <= 12:
        raise ValueError("Use 2–12 dense observations.")
    ids = set()
    for p in points:
        if not isinstance(p, dict) or not isinstance(p.get("id"), str) or not p["id"].strip() or p["id"] in ids:
            raise ValueError("Observations require unique nonempty IDs.")
        ids.add(p["id"])
        if not isinstance(p.get("x"), (list, tuple)) or len(p["x"]) != 2:
            raise ValueError("Each observation needs exactly two coordinates.")
        for x in p["x"]:
            real(x, -5, 5)
        if real(p.get("y")) not in (-1, 1):
            raise ValueError("Labels must be −1 or +1.")
    if len({p["y"] for p in points}) != 2:
        raise ValueError("Both labels are required.")
    real(s.get("C"), .01, 20)
    k = s.get("kernel")
    if not isinstance(k, dict) or k.get("kind") not in ("linear", "polynomial", "rbf"):
        raise ValueError("Unknown kernel.")
    real(k.get("gamma"), .05, 2)
    real(k.get("coef0"), 0, 2)
    d = real(k.get("degree"), 1, 4)
    if not d.is_integer():
        raise ValueError("Polynomial degree must be integral.")
    return dict(s, points=[dict(id=p["id"], x=[real(x) for x in p["x"]], y=real(p["y"])) for p in points],
                C=real(s["C"]), kernel=dict(k, gamma=real(k["gamma"]), coef0=real(k["coef0"]), degree=int(d)))


def kernel_value(a, b, k):
    """Validate both dense query vectors and all parameters before family dispatch."""
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)) or len(a) != 2 or len(b) != 2:
        raise ValueError("Kernel vectors need two dense coordinates.")
    a, b = [real(v, -6, 6) for v in a], [real(v, -6, 6) for v in b]
    if not isinstance(k, dict) or k.get("kind") not in ("linear", "polynomial", "rbf"):
        raise ValueError("Unknown kernel.")
    gamma, coef0, degree = real(k.get("gamma"), .05, 2), real(k.get("coef0"), 0, 2), real(k.get("degree"), 1, 4)
    if not degree.is_integer():
        raise ValueError("Polynomial degree must be integral.")
    k = dict(k, gamma=gamma, coef0=coef0, degree=int(degree))
    if k["kind"] == "linear":
        return dot(a, b)
    if k["kind"] == "polynomial":
        base = finite(mul(k["gamma"], dot(a, b)) + k["coef0"])
        result = 1.0
        for _ in range(k["degree"]):
            result = mul(result, base)
        return result
    delta = sub(a, b)
    value = math.exp(-mul(k["gamma"], dot(delta, delta)))
    if value == 0:
        raise ValueError("RBF similarity underflows binary64.")
    return finite(value)


def hinge(margin):
    m = real(margin)
    return {"loss": max(0, finite(1 - m)), "subgradient": -1 if m < 1 else 0}


def orientation(a, b, c):
    """Filtered sign, with exact fallback from original binary64 coordinates."""
    ux, uy = b[0] - a[0], b[1] - a[1]
    vx, vy = c[0] - a[0], c[1] - a[1]
    left, right = ux * vy, uy * vx
    determinant = left - right
    error = 8 * sys.float_info.epsilon * (abs(left) + abs(right))
    if abs(left) >= sys.float_info.min and abs(right) >= sys.float_info.min and abs(determinant) > error:
        return 1 if determinant > 0 else -1
    ax, ay, bx, by, cx, cy = (Fraction.from_float(float(v)) for p in (a, b, c) for v in p)
    exact = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    return (exact > 0) - (exact < 0)


def hull(points, label):
    indices = sorted((i for i, p in enumerate(points) if p["y"] == label), key=lambda i: tuple(points[i]["x"]))
    unique = []
    for i in indices:
        if not unique or points[i]["x"] != points[unique[-1]]["x"]:
            unique.append(i)
    def chain(seq):
        out = []
        for i in seq:
            while len(out) >= 2 and orientation(points[out[-2]]["x"], points[out[-1]]["x"], points[i]["x"]) <= 0:
                out.pop()
            out.append(i)
        return out
    return unique if len(unique) <= 2 else chain(unique)[:-1] + chain(unique[::-1])[:-1]


def edges(h):
    return [(i, h[(j + 1) % len(h)]) for j, i in enumerate(h)]


def inside(x, h, points):
    return len(h) >= 3 and all(orientation(points[i]["x"], points[j]["x"], x) >= 0 for i, j in edges(h))


def on_segment(x, a, b):
    return orientation(a, b, x) == 0 and all(min(a[j], b[j]) <= x[j] <= max(a[j], b[j]) for j in range(2))


def intersects(a, b, c, d):
    u, v = orientation(a, b, c), orientation(a, b, d)
    r, t = orientation(c, d, a), orientation(c, d, b)
    return ((u < 0 < v or v < 0 < u) and (r < 0 < t or t < 0 < r)) or any((on_segment(c, a, b), on_segment(d, a, b), on_segment(a, c, d), on_segment(b, c, d)))


def hard_fit(points):
    neg, pos = hull(points, -1), hull(points, 1)
    if any(inside(points[i]["x"], pos, points) for i in neg) or any(inside(points[i]["x"], neg, points) for i in pos):
        return None
    best = None
    for ni, nj in edges(neg):
        for pi, pj in edges(pos):
            a, b, c, d = [points[i]["x"] for i in (ni, nj, pi, pj)]
            if intersects(a, b, c, d):
                return None
            for source, i, j in ((ni, pi, pj), (nj, pi, pj), (pi, ni, nj), (pj, ni, nj)):
                x, u, v = points[source]["x"], points[i]["x"], points[j]["x"]
                delta = sub(v, u)
                length = dot(delta, delta)
                t = max(0, min(1, dot(sub(x, u), delta) / length)) if length else 0
                q = [finite(u[z] + mul(t, delta[z])) for z in range(2)]
                diff = sub(q, x)
                distance2 = dot(diff, diff)
                if best is None or distance2 < best[0]:
                    best = (distance2, source, i, j, t, q)
    distance2, source, i, j, t, q = best
    if distance2 == 0:
        raise ValueError("Closest hull distance is numerically unresolved.")
    mass = finite(2 / distance2)
    y = points[source]["y"]
    direction = sub(points[source]["x"], q) if y == 1 else sub(q, points[source]["x"])
    w = [mul(mass, d) for d in direction]
    midpoint = [finite((points[source]["x"][z] + q[z]) / 2) for z in range(2)]
    alpha = [0.0] * len(points)
    alpha[source] += mass
    alpha[i] += mul(mass, 1 - t)
    alpha[j] += mul(mass, t)
    return alpha, -dot(w, midpoint), w


def soft_fit(points, K, C):
    n = len(points)
    y = [p["y"] for p in points]
    alpha, g = [0.0] * n, [0.0] * n
    iterations = 0
    for step in range(MAX_STEPS):
        best = None
        for i in range(n):
            for j in range(i + 1, n):
                di, dj = y[i], -y[j]
                li, ui = (-alpha[i], C - alpha[i]) if di == 1 else (alpha[i] - C, alpha[i])
                lj, uj = (-alpha[j], C - alpha[j]) if dj == 1 else (alpha[j] - C, alpha[j])
                lo, hi = max(li, lj), min(ui, uj)
                if hi <= lo:
                    continue
                slope = finite(y[i] - y[j] - (g[i] - g[j]))
                curvature = finite(K[i][i] + K[j][j] - 2 * K[i][j])
                if curvature < -1e-10:
                    raise ValueError("Kernel curvature contradicts PSD within the numerical allowance.")
                candidates = [lo, hi] if curvature <= 0 else [max(lo, min(hi, slope / curvature))]
                for t in candidates:
                    gain = finite(mul(slope, t) - .5 * mul(curvature, mul(t, t)))
                    if gain > 1e-12 and (best is None or gain > best[0]):
                        best = (gain, i, j, t)
        if best is None:
            break
        _, i, j, t = best
        alpha[i] = finite(alpha[i] + y[i] * t)
        alpha[j] = finite(alpha[j] - y[j] * t)
        for z in range(n):
            g[z] = finite(g[z] + mul(t, K[z][i] - K[z][j]))
        iterations = step + 1
    # Reconstruct instead of letting accumulated gradient rounding own diagnostics.
    g = [finite(sum(mul(alpha[j] * y[j], K[i][j]) for j in range(n))) for i in range(n)]
    free = [y[i] - g[i] for i in range(n) if EPS < alpha[i] < C - EPS]
    if free:
        b = finite(sum(free) / len(free))
    else:
        lower, upper = -math.inf, math.inf
        for i in range(n):
            target = y[i] - g[i]
            if (y[i] == 1 and alpha[i] <= EPS) or (y[i] == -1 and alpha[i] >= C - EPS):
                lower = max(lower, target)
            else:
                upper = min(upper, target)
        b = finite((lower + upper) / 2)
    return alpha, b, iterations


def svm(request):
    s = validate(request)
    points, C = s["points"], s["C"]
    n = len(points)
    k = s["kernel"] if s["mode"] == "kernel" else dict(s["kernel"], kind="linear")
    K = np.array([[kernel_value(a["x"], b["x"], k) for b in points] for a in points], dtype=float).tolist()
    if s["mode"] == "hard":
        fitted = hard_fit(points)
        if fitted is None:
            return dict(status="infeasible", reason="Class convex hulls intersect; hard-margin constraints are infeasible.", gram=K, rows=[], alpha=[], w=None, b=None, norm2=None, halfMargin=None, primal=None, dual=None, gap=None, kkt=None, equality=None, bounds=None, iterations=0)
        alpha, b, w = fitted
        iterations = 0
    else:
        alpha, b, iterations = soft_fit(points, K, C)
        w = [finite(sum(mul(alpha[i] * p["y"], p["x"][z]) for i, p in enumerate(points))) for z in range(2)] if k["kind"] == "linear" else None
    scores = [finite(sum(mul(alpha[j] * points[j]["y"], K[i][j]) for j in range(n)) + b) for i in range(n)]
    norm2 = finite(sum(mul(alpha[i] * points[i]["y"], finite(scores[i] - b)) for i in range(n)))
    if norm2 < 0:
        raise ValueError("Computed feature norm is negative; numerical fit unavailable.")
    norm = math.sqrt(norm2)
    rows, residual = [], 0.0
    for i, p in enumerate(points):
        margin = mul(p["y"], scores[i])
        xi = max(0, finite(1 - margin))
        bound = s["mode"] != "hard" and alpha[i] >= C - EPS
        r = max(0, 1 - margin) if alpha[i] <= EPS else max(0, margin - 1) if bound else abs(margin - 1)
        residual = max(residual, r)
        rows.append(dict(id=p["id"], score=scores[i], decision=1 if scores[i] > 0 else -1 if scores[i] < 0 else 0, margin=margin, slack=xi, hinge=xi, signedDistance=finite(scores[i] / norm) if w is not None and norm > 0 else None, support=alpha[i] > EPS, onMargin=abs(margin - 1) <= KKT_TOL, alpha=alpha[i]))
    primal = finite(.5 * norm2 + (0 if s["mode"] == "hard" else C * sum(r["hinge"] for r in rows)))
    dual = finite(sum(alpha) - .5 * norm2)
    gap = finite(primal - dual)
    equality = abs(finite(sum(alpha[i] * p["y"] for i, p in enumerate(points))))
    bounds = max([0] + [-a for a in alpha] + ([] if s["mode"] == "hard" else [a - C for a in alpha]))
    feasible = s["mode"] != "hard" or max(r["slack"] for r in rows) <= KKT_TOL
    good = feasible and residual <= KKT_TOL and abs(gap) <= GAP_TOL * (1 + primal) and equality <= 1e-7 and bounds <= EPS
    return dict(status=("solved" if s["mode"] == "hard" else "approximate") if good else "failed", reason="Hard fit certified within displayed diagnostics." if good and s["mode"] == "hard" else "Approximate dual fit; inspect KKT and primal–dual gap." if good else "Diagnostic failure or iteration cap; no fitted boundary is displayed.", gram=K, rows=rows, alpha=alpha, w=w, b=b, norm2=norm2, halfMargin=finite(1 / norm) if norm > 0 else None, primal=primal, dual=dual, gap=gap, kkt=residual, equality=equality, bounds=bounds, iterations=iterations)


def decision(request, result, x):
    """Actual kernel decision; never input-space distance for nonlinear kernels."""
    s = validate(request)
    if result.get("status") not in ("solved", "approximate") or result.get("b") is None or len(result.get("alpha", [])) != len(s["points"]):
        raise ValueError("A successful fit is required for a decision.")
    k = s["kernel"] if s["mode"] == "kernel" else dict(s["kernel"], kind="linear")
    return finite(sum(mul(real(a) * p["y"], kernel_value(p["x"], x, k)) for a, p in zip(result["alpha"], s["points"])) + real(result["b"]))


DEFAULT = dict(mode="hard", C=1, kernel=dict(kind="linear", gamma=1, coef0=1, degree=2), points=[dict(id="a", x=[-1, 0], y=-1), dict(id="b", x=[1, 0], y=1)])

if __name__ == "__main__":
    try:
        raw = sys.stdin.read()
        print(json.dumps(svm(json.loads(raw) if raw.strip() else DEFAULT), allow_nan=False))
    except (ValueError, TypeError, KeyError, OverflowError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        sys.exit(2)
