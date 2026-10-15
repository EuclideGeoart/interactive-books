"""III-40–41: inspected binary64 forward passes, without fitting or thresholds.

Vectors are columns stored as flat lists; NumPy constructs d×1 columns. Each
row's products are accumulated left to right to match the visible trace.
"""
import json
import math
import sys

import numpy as np


def finite(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be a finite number")
    try:
        value = float(value)
    except (OverflowError, ValueError) as error:
        raise ValueError(f"{label} is not representable in binary64") from error
    if not math.isfinite(value):
        raise ValueError(f"{label} must be finite; arithmetic overflow is rejected")
    return value


def vector(value, label):
    if not isinstance(value, list) or not value:
        raise ValueError(f"{label} must be a nonempty dense column stored as a flat list")
    return [finite(v, f"{label}[{i}]") for i, v in enumerate(value)]


def matrix(value, label):
    if not isinstance(value, list) or not value:
        raise ValueError(f"{label} must be a nonempty matrix")
    rows = [vector(row, f"{label}[{i}]") for i, row in enumerate(value)]
    if any(len(row) != len(rows[0]) for row in rows):
        raise ValueError(f"{label} must be rectangular")
    return rows


def activation(phi):
    if not isinstance(phi, str) or phi not in ("identity", "relu", "sigmoid"):
        raise ValueError("Choose identity, relu or sigmoid")


def activate(z, phi):
    z = finite(z, "Preactivation")
    activation(phi)
    if phi == "identity":
        return z
    if phi == "relu":
        return max(0.0, z)
    # This exponential cannot overflow. Tails may round to exactly zero or one.
    e = math.exp(-abs(z))
    return 1 / (1 + e) if z >= 0 else e / (1 + e)


def affine(x, W, b):
    column = np.array(x, dtype=np.float64).reshape(-1, 1)
    weights = np.array(W, dtype=np.float64)
    try:
        with np.errstate(over="raise", invalid="raise", under="ignore"):
            terms = weights * column.T
    except FloatingPointError as error:
        raise ValueError("Product arithmetic overflow") from error
    rows = []
    for i, terms_row in enumerate(terms):
        products = [finite(float(p), "Product") for p in terms_row]
        if any(w != 0 and v != 0 and p == 0 for w, v, p in zip(W[i], x, products)):
            raise ValueError("A nonzero product underflowed to zero. Rescale the inputs.")
        dot, running = 0.0, []
        for p in products:
            dot = finite(dot + p, "Running sum")
            running.append(dot)
        rows.append(dict(products=products, running=running, dot=dot, b=b[i], z=finite(dot + b[i], "Bias addition")))
    return rows


def forward(request):
    if not isinstance(request, dict) or request.get("kind") not in ("neuron", "network"):
        raise ValueError("Expected a neuron or network request")
    x = vector(request.get("x"), "x")
    phi = request.get("activation")
    activation(phi)
    d = len(x)
    if request["kind"] == "neuron":
        w, b = vector(request.get("w"), "w"), finite(request.get("b"), "b")
        if len(w) != d:
            raise ValueError("w and x must both have shape d × 1")
        row = affine(x, [w], [b])[0]
        return dict(kind="neuron", row=row, a=activate(row["z"], phi), shapes=dict(x=[d, 1], w=[d, 1], b=[1, 1], z=[1, 1], a=[1, 1]))
    W1, b1 = matrix(request.get("W1"), "W1"), vector(request.get("b1"), "b1")
    W2, b2 = matrix(request.get("W2"), "W2"), vector(request.get("b2"), "b2")
    h, o = len(W1), len(W2)
    if len(W1[0]) != d or len(b1) != h or len(W2[0]) != h or len(b2) != o:
        raise ValueError("Require x d × 1, W1 h × d, b1 h × 1, W2 o × h, b2 o × 1")
    hidden = affine(x, W1, b1)
    a1 = [activate(row["z"], phi) for row in hidden]
    output = affine(a1, W2, b2)
    try:
        W = [[affine([row[j] for row in W1], [weights], [0])[0]["z"] for j in range(d)] for weights in W2]
        b = [row["z"] for row in affine(b1, W2, b2)]
        rows = affine(x, W, b)
        difference = [finite(row["z"] - collapsed["z"], "Collapse difference") for row, collapsed in zip(output, rows)]
        collapse = dict(status="defined", W=W, b=b, rows=rows, difference=difference)
    except ValueError as error:
        collapse = dict(status="unrepresentable", reason=str(error))
    return dict(kind="network", hidden=hidden, a1=a1, output=output, collapse=collapse,
                shapes=dict(x=[d, 1], W1=[h, d], b1=[h, 1], z1=[h, 1], a1=[h, 1], W2=[o, h], b2=[o, 1], z2=[o, 1]))


if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    request = json.loads(raw) if raw else dict(kind="neuron", x=[2, -1], w=[0.5, 2], b=0.25, activation="relu")
    try:
        print(json.dumps(forward(request), allow_nan=False))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
