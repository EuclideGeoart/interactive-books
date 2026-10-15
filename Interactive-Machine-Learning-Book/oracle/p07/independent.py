"""Owner-only independent checks: active-set QP, eigvalsh and analytic anchors.

No pair-coordinate optimizer or hull solver is imported into the oracle.
The canonical module is loaded only to exercise and challenge its public API.
"""
from itertools import combinations, product
from fractions import Fraction
from pathlib import Path
import importlib.util
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("canonical_svm", ROOT / "code/python/p07/svm.py")
canonical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(canonical)


def near(actual, expected, atol=2e-10, rtol=2e-10):
    np.testing.assert_allclose(actual, expected, atol=atol, rtol=rtol)


def gram(request):
    X = np.asarray([p["x"] for p in request["points"]], dtype=float)
    k = request["kernel"]
    kind = k["kind"] if request["mode"] == "kernel" else "linear"
    if kind == "linear":
        K = X @ X.T
    elif kind == "polynomial":
        K = (k["gamma"] * (X @ X.T) + k["coef0"]) ** int(k["degree"])
    else:
        D = X[:, None, :] - X[None, :, :]
        K = np.exp(-k["gamma"] * np.einsum("ijk,ijk->ij", D, D))
    near(K, K.T, atol=0, rtol=0)
    assert np.min(np.linalg.eigvalsh(K)) >= -2e-10 * (1 + np.linalg.norm(K, 2)), "Gram violates PSD"
    return K


def active_dual(request):
    """Exhaust all lower/free/upper sets (n<=6); solve stationary systems.

This is independent of coordinate ascent. Least squares handles singular
free blocks; degenerate optima also appear on enumerated boundary faces.
"""
    K = gram(request)
    y = np.asarray([p["y"] for p in request["points"]], dtype=float)
    n, C = len(y), request["C"]
    assert n <= 6, "Owner oracle is bounded to six rows"
    Q = y[:, None] * K * y[None, :]
    best = None
    for tags in product((0, 1, 2), repeat=n):
        free = np.flatnonzero(np.asarray(tags) == 1)
        fixed = np.flatnonzero(np.asarray(tags) != 1)
        a = np.asarray([C if tag == 2 else 0 for tag in tags], dtype=float)
        if len(free):
            matrix = np.block([[Q[np.ix_(free, free)], y[free, None]], [y[None, free], np.zeros((1, 1))]])
            rhs = np.r_[np.ones(len(free)) - Q[np.ix_(free, fixed)] @ a[fixed], -y[fixed] @ a[fixed]]
            answer, _, _, _ = np.linalg.lstsq(matrix, rhs, rcond=None)
            if np.max(np.abs(matrix @ answer - rhs)) > 2e-8:
                continue
            a[free] = answer[:-1]
        if abs(y @ a) > 2e-8 or np.min(a) < -2e-8 or np.max(a) > C + 2e-8:
            continue
        value = float(np.sum(a) - .5 * a @ Q @ a)
        if best is None or value > best[0]:
            best = value, a
    assert best is not None
    return best


def exact_hard_feasibility(request):
    """Fraction Fourier–Motzkin, independent of hulls and floating KKT solves.

    A contradiction carries nonnegative original-constraint multipliers.
    This exact oracle is deliberately bounded to at most six observations.
    """
    points = request["points"]
    if not 2 <= len(points) <= 6:
        raise ValueError("Exact feasibility oracle supports 2–6 rows.")
    original = []
    rows = []
    for i, p in enumerate(points):
        y = Fraction.from_float(float(p["y"]))
        coefficients = tuple(y * Fraction.from_float(float(v)) for v in p["x"]) + (y,)
        original.append(coefficients)
        proof = tuple(Fraction(int(i == j)) for j in range(len(points)))
        rows.append((coefficients, Fraction(1), proof))
    for remaining in range(3, -1, -1):
        for coefficients, rhs, proof in rows:
            if not any(coefficients) and rhs > 0:
                assert all(v >= 0 for v in proof)
                assert all(sum(proof[i] * original[i][j] for i in range(len(points))) == 0 for j in range(3))
                assert sum(proof) == rhs
                return dict(feasible=False, multipliers=proof, contradiction=rhs)
        if remaining == 0:
            return dict(feasible=True, multipliers=None, contradiction=None)
        positive = [row for row in rows if row[0][0] > 0]
        negative = [row for row in rows if row[0][0] < 0]
        reduced = [(c[1:], rhs, proof) for c, rhs, proof in rows if c[0] == 0]
        for pc, pr, pp in positive:
            for nc, nr, np_ in negative:
                coefficients = tuple(pv / pc[0] - nv / nc[0] for pv, nv in zip(pc[1:], nc[1:]))
                rhs = pr / pc[0] - nr / nc[0]
                proof = tuple(pv / pc[0] - nv / nc[0] for pv, nv in zip(pp, np_))
                reduced.append((coefficients, rhs, proof))
        if len(reduced) > 4096:
            raise ValueError("Exact feasibility elimination cap; no certificate issued.")
        rows = reduced


def hard_primal(request):
    """Independent active primal constraints: enumerate faces and KKT solves.

Regularizer diag(1,1,0) retains the unpenalized intercept. No hull method.
"""
    X = np.asarray([p["x"] for p in request["points"]], dtype=float)
    y = np.asarray([p["y"] for p in request["points"]], dtype=float)
    A = y[:, None] * np.column_stack([X, np.ones(len(y))])
    H = np.diag([1., 1., 0.])
    best = None
    for count in range(2, min(3, len(y)) + 1):
        for subset in combinations(range(len(y)), count):
            B = A[list(subset)]
            matrix = np.block([[H, -B.T], [B, np.zeros((count, count))]])
            rhs = np.r_[np.zeros(3), np.ones(count)]
            answer, _, _, _ = np.linalg.lstsq(matrix, rhs, rcond=None)
            if np.max(np.abs(matrix @ answer - rhs)) > 2e-9:
                continue
            theta, alpha = answer[:3], answer[3:]
            if np.min(alpha) < -2e-9 or np.min(A @ theta) < 1 - 2e-9:
                continue
            value = float(.5 * theta @ H @ theta)
            if best is None or value < best[0]:
                best = value, theta
    return best


def verify(request):
    # Normalize once to match the API's binary64 interpretation, including NumPy scalars.
    s = canonical.validate(request)
    feasibility = exact_hard_feasibility(s) if s["mode"] == "hard" else None
    expected = hard_primal(s) if feasibility is not None and feasibility["feasible"] else None
    try:
        result = canonical.svm(s)
    except ValueError:
        if feasibility is not None and feasibility["feasible"] and expected is None:
            return None  # Exact feasibility is known; floating fit is unavailable.
        raise
    K = gram(s)
    near(result["gram"], K)
    if s["mode"] == "hard":
        if not feasibility["feasible"]:
            assert result["status"] == "infeasible", result
            assert result["w"] is None and result["rows"] == []
            return result
        assert result["status"] != "infeasible", result
        if expected is None:
            assert result["status"] == "failed", result
            return result
        assert result["status"] == "solved", result
        near(result["primal"], expected[0])
        near(result["w"], expected[1][:2])
        near(result["b"], expected[1][2])
    else:
        assert result["status"] == "approximate", result
        optimum, _ = active_dual(s)
        near(result["dual"], optimum, atol=1e-5, rtol=1e-5)
    y = np.asarray([p["y"] for p in s["points"]], dtype=float)
    alpha = np.asarray(result["alpha"])
    beta = alpha * y
    scores = K @ beta + result["b"]
    margins = y * scores
    hinges = np.maximum(0, 1 - margins)
    norm2 = float(beta @ K @ beta)
    near(result["norm2"], norm2)
    near([r["score"] for r in result["rows"]], scores)
    near([r["hinge"] for r in result["rows"]], hinges)
    near(result["primal"], .5 * norm2 + (0 if s["mode"] == "hard" else s["C"] * np.sum(hinges)))
    near(result["dual"], np.sum(alpha) - .5 * norm2)
    assert abs(y @ alpha) <= 1e-7 and np.min(alpha) >= -1e-9
    if s["mode"] != "hard":
        assert np.max(alpha) <= s["C"] + 1e-9
    assert result["kkt"] <= 2e-5
    assert abs(result["gap"]) <= 1e-5 * (1 + result["primal"])
    if result["w"] is not None and norm2 > 0:
        near([r["signedDistance"] for r in result["rows"]], scores / np.sqrt(norm2))
    else:
        assert all(r["signedDistance"] is None for r in result["rows"])
    return result
