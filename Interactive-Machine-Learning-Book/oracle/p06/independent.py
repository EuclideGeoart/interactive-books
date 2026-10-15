"""Fraction covariance plus LAPACK SVD/eigh: independent of analytic 2×2 runtime.

Repeated spectra compare subspace identities and optimal SSE, never a unique axis.
"""
from fractions import Fraction
import importlib.util
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("p06_canonical", ROOT / "code/python/p06/pca.py")
canonical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(canonical)
ATOL, RTOL = 2e-12, 2e-12


def independent(request):
    k = float(request["k"])  # interpret configuration as binary64 before either integer use
    X = [[Fraction(float(v)) for v in p["x"]] for p in request["points"]]
    n = len(X)
    mu = [sum(x[j] for x in X) / n for j in range(2)]
    D = [[x[j] - mu[j] for j in range(2)] for x in X]
    divisor = n - 1 if request["normalization"] == "sample" else n
    result = dict(mean=[float(v) for v in mu], centered=np.asarray(D, dtype=float), divisor=divisor, k=k)
    if divisor == 0:
        return dict(result, status="undefined")
    C = np.asarray([[float(sum(x[j] * x[h] for x in D) / divisor) for h in range(2)] for j in range(2)])
    # full_matrices supplies a complete two-direction basis even for one observation.
    _, sigma, VT = np.linalg.svd(result["centered"], full_matrices=True)
    lambdas = np.zeros(2)
    lambdas[:len(sigma)] = sigma ** 2 / divisor
    eigh_values, eigh_vectors = np.linalg.eigh(C)
    return dict(result, status="defined", covariance=C, eigenvalues=lambdas, axes=VT.T,
                eighValues=eigh_values[::-1], eighAxes=eigh_vectors[:, ::-1],
                sse=float(sum(sigma[int(k):] ** 2)))


def near(actual, expected, atol=ATOL, rtol=RTOL):
    np.testing.assert_allclose(actual, expected, atol=atol, rtol=rtol)


def verify(request):
    actual = canonical.pca(request)  # genuine canonical invocation, not a fixture surrogate
    reference = independent(request)
    assert actual["status"] == reference["status"]
    near(actual["mean"], reference["mean"])
    near(actual["centered"], reference["centered"])
    if actual["status"] == "undefined":
        assert "covariance" not in actual and "sse" not in actual
        return actual
    C = reference["covariance"]
    near(actual["covariance"], C)
    near(actual["eigenvalues"], reference["eigenvalues"])
    near(actual["eigenvalues"], reference["eighValues"])
    V = np.asarray(actual["axes"]).T
    near(V.T @ V, np.eye(2))
    near(C @ V, V @ np.diag(actual["eigenvalues"]))
    assert actual["eigenvalues"][0] >= actual["eigenvalues"][1] >= 0
    near(sum(actual["eigenvalues"]), np.trace(C))
    k = int(reference["k"])
    D = reference["centered"]
    near([r["scores"] for r in actual["rows"]], D @ V[:, :k])
    reconstructed = D @ V[:, :k] @ V[:, :k].T + reference["mean"]
    near([r["reconstructed"] for r in actual["rows"]], reconstructed)
    residual = np.asarray([p["x"] for p in request["points"]], dtype=np.float64) - reconstructed
    near([r["residual"] for r in actual["rows"]], residual)
    near(actual["sse"], reference["sse"])
    near(actual["mse"], actual["sse"] / len(D))
    near(actual["entryMse"], actual["sse"] / D.size)
    near(actual["sse"], actual["divisor"] * sum(actual["eigenvalues"][k:]))
    # Compare projectors only for a separated eigenvalue: signs cannot affect vv^T.
    gap = reference["eigenvalues"][0] - reference["eigenvalues"][1]
    if gap > 1e-10 * max(1, reference["eigenvalues"][0]):
        for basis in (reference["axes"], reference["eighAxes"]):
            near(np.outer(V[:, 0], V[:, 0]), np.outer(basis[:, 0], basis[:, 0]))
    if actual["totalVariance"] == 0:
        assert actual["ratios"] is None and actual["retained"] is None
    else:
        near(actual["ratios"], reference["eigenvalues"] / sum(reference["eigenvalues"]))
        near(actual["retained"], sum(actual["ratios"][:k]))
    return actual
