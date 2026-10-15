"""Independent exact rational affine sums and 80-digit Decimal sigmoid.

No imports of canonical code. Expectations use Fraction sums (including matrix
composition), not binary64 sequential reductions or NumPy product arrays.
"""
from decimal import Decimal, localcontext
from fractions import Fraction as F
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EPS = 2**-52


def phi(z, name):
    if name == "identity":
        return z
    if name == "relu":
        return max(F(0), z)
    with localcontext() as context:
        context.prec = 80
        value = Decimal(z.numerator) / Decimal(z.denominator)
        return F(Decimal(1) / (Decimal(1) + (-value).exp()))


def row(x, w, b):
    terms = [F(v) * F(c) for v, c in zip(x, w)]
    running = [sum(terms[:i+1], F(0)) for i in range(len(terms))]
    dot = sum(terms, F(0))
    return dict(products=terms, running=running, dot=dot, b=F(b), z=dot+F(b))


def floats(value):
    if isinstance(value, F):
        return float(value)
    if isinstance(value, list):
        return [floats(v) for v in value]
    if isinstance(value, dict):
        return {k: floats(v) for k, v in value.items()}
    return value


def exact_forward(s):
    x = [F(v) for v in s["x"]]
    d = len(x)
    if s["kind"] == "neuron":
        r = row(x, s["w"], s["b"])
        return floats(dict(kind="neuron", row=r, a=phi(r["z"], s["activation"]), shapes=dict(x=[d, 1], w=[d, 1], b=[1, 1], z=[1, 1], a=[1, 1])))
    W1, W2 = s["W1"], s["W2"]
    h, o = len(W1), len(W2)
    hidden = [row(x, w, b) for w, b in zip(W1, s["b1"])]
    a1 = [phi(r["z"], s["activation"]) for r in hidden]
    output = [row(a1, w, b) for w, b in zip(W2, s["b2"])]
    W = [[sum((F(W2[i][k])*F(W1[k][j]) for k in range(h)), F(0)) for j in range(d)] for i in range(o)]
    b = [sum((F(W2[i][k])*F(s["b1"][k]) for k in range(h)), F(s["b2"][i])) for i in range(o)]
    rows = [row(x, w, intercept) for w, intercept in zip(W, b)]
    collapse = dict(status="defined", W=W, b=b, rows=rows, difference=[r["z"]-c["z"] for r, c in zip(output, rows)])
    return floats(dict(kind="network", hidden=hidden, a1=a1, output=output, collapse=collapse,
                       shapes=dict(x=[d, 1], W1=[h, d], b1=[h, 1], z1=[h, 1], a1=[h, 1], W2=[o, h], b2=[o, 1], z2=[o, 1])))


def near(actual, expected, exact=False):
    if isinstance(expected, dict):
        assert isinstance(actual, dict)
        for k, value in expected.items():
            near(actual[k], value, exact)
    elif isinstance(expected, list):
        assert isinstance(actual, list) and len(actual) == len(expected)
        for a, e in zip(actual, expected):
            near(a, e, exact)
    elif isinstance(expected, (int, float)):
        assert isinstance(actual, (int, float)) and not isinstance(actual, bool) and math.isfinite(actual)
        if exact or expected == 0:
            assert actual == expected, (actual, expected)
        else:
            allowance = 32 * EPS * abs(expected)
            if abs(expected) >= 1e-8:
                allowance += 32 * EPS
            assert abs(actual - expected) <= allowance, (actual, expected, allowance)
    else:
        assert actual == expected
