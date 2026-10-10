"""Independent oracle for the essential function families (chapter I.6; master plan §4 I.6, §9.4, §12.3; REF-1).

Deliberately NOT a transliteration of ``src/math/families/*.ts``. The TypeScript evaluates with IEEE doubles (``Math.exp``, ``Math.sin``, …)
and ``BigInt`` rationals; this oracle works in 90-digit ``decimal.Decimal`` and ``fractions.Fraction``:

  exp, ln      ``Decimal.exp`` / ``Decimal.ln`` (correctly rounded to 90 digits), then ONE rounding to a double
  sin, cos     a Taylor series written here, after reducing the argument modulo 2π with π from Machin's formula
               (π = 16·arctan(1/5) − 4·arctan(1/239), each arctan by its own series) — no library trigonometry is involved
  special      "which exact value is this?" is decided by matching the 90-digit value against a candidate table
  angles       (√6−√2)/4, 1/2, √2/2, √3/2, (√6+√2)/4 …; the reference angle, the arcsin and atan2 representatives are found by
               BRUTE FORCE (search every k·π/12 in range for the one with the same sine / the same cosine and sine), where the
               TypeScript uses modular arithmetic
  inverses     the round trips are judged by the TRUE error of the stored double (ln of the stored value, in 90 digits), not by
               running the same double computation again
  identities   each identity is evaluated in 90 digits and required to hold to 10⁻⁷⁰ (it always does: that is the mathematics);
               the TypeScript then only has to be within double rounding of those values

Every double-valued entry carries TWO references: ``atDouble`` — the correctly rounded value at the DOUBLES the TypeScript actually feeds to
the library (so the tolerance measures the library) — and the true value at the decimal input with ``bound``, the rounding error that feeding
a double instead of the decimal can cause (so the model is shown to be honest about its inputs).

Fixtures: ``fixtures/families.fixtures.json`` (inputs AND expected values) consumed by ``tests/unit/families.parity.test.ts``.

    python oracle/families_oracle.py --write     regenerate the fixture
    python oracle/families_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
from decimal import Decimal, getcontext, localcontext
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "families.fixtures.json"
SCHEMA = "book2.families.fixtures/1"

getcontext().prec = 90
getcontext().Emax = 10**7
getcontext().Emin = -(10**7)

D = Decimal
MINUS = "−"
EPS = 2.0**-52
DBL_MAX = D(sys.float_info.max)
DBL_MIN_NORMAL = D(sys.float_info.min)
HALF_MIN_SUBNORMAL = D(5e-324) / 2  # below this a positive real rounds to 0.0
TINY = D(10) ** -60  # "is zero" threshold for 90-digit values that are mathematically 0 or a tie


# ------------------------------------------------------------------------------------------------ high-precision primitives
def _arctan_inv(n: int) -> Decimal:
    """arctan(1/n) by its Maclaurin series (n ≥ 2)."""
    x = D(1) / D(n)
    x2 = x * x
    term, total, k = x, x, 0
    while abs(term) > D(10) ** -88:
        k += 1
        term = -term * x2
        total += term / (2 * k + 1)
    return total


PI = 16 * _arctan_inv(5) - 4 * _arctan_inv(239)
TWO_PI = 2 * PI


def _taylor_sin(r: Decimal) -> Decimal:
    term, total, k = r, r, 0
    r2 = r * r
    while abs(term) > D(10) ** -88:
        k += 1
        term = -term * r2 / ((2 * k) * (2 * k + 1))
        total += term
    return total


def _taylor_cos(r: Decimal) -> Decimal:
    term, total, k = D(1), D(1), 0
    r2 = r * r
    while abs(term) > D(10) ** -88:
        k += 1
        term = -term * r2 / ((2 * k - 1) * (2 * k))
        total += term
    return total


def _reduce(x: Decimal) -> Decimal:
    """x − 2π·round(x / 2π): an equivalent angle in [−π, π]."""
    return x - TWO_PI * (x / TWO_PI).to_integral_value()


def dsin(x: Decimal) -> Decimal:
    return _taylor_sin(_reduce(x))


def dcos(x: Decimal) -> Decimal:
    return _taylor_cos(_reduce(x))


def dexp(x: Decimal) -> Decimal:
    return x.exp()


def dln(x: Decimal) -> Decimal:
    return x.ln()


def dec(value) -> Decimal:
    """A JSON number as the exact decimal it was written as (floats go through their shortest repr, e.g. 0.3 → Decimal('0.3'))."""
    return D(repr(value)) if isinstance(value, float) else D(value)


def frac(value) -> Fraction:
    return Fraction(repr(value)) if isinstance(value, float) else Fraction(value)


def dbl(d: Decimal) -> float:
    """One correct rounding to a double; −0.0 is normalised to +0.0 (the TypeScript adds +0)."""
    return float(d) + 0.0


def snap(d: Decimal) -> float:
    """A 90-digit value that is mathematically 0 (it is below 10⁻⁶⁰ only through the series' truncation) as exactly 0.0, else its double."""
    return 0.0 if abs(d) < TINY else dbl(d)


def ulp(x: float) -> float:
    return math.ulp(x) if x != 0 else 5e-324


def frac_text(q: Fraction) -> str:
    return f"{q.numerator}/{q.denominator}" if q.denominator != 1 else str(q.numerator)


def check_places(value, places: int) -> None:
    assert frac(value) * 10**places == (frac(value) * 10**places).__floor__(), f"{value} has more than {places} places"


# ------------------------------------------------------------------------------------------------ comparison model
FAMILIES = ["linear", "square", "exp", "ln", "sin", "cos"]


def g_at(fam: str, u: Decimal) -> Decimal:
    return {"linear": lambda: u, "square": lambda: u * u, "exp": lambda: dexp(u), "ln": lambda: dln(u), "sin": lambda: dsin(u), "cos": lambda: dcos(u)}[fam]()


def g_derivative(fam: str, u: Decimal) -> Decimal:
    return {"linear": lambda: D(1), "square": lambda: 2 * u, "exp": lambda: dexp(u), "ln": lambda: D(1) / u, "sin": lambda: dcos(u), "cos": lambda: -dsin(u)}[fam]()


def compare_value(fam: str, a, h, x) -> dict:
    """The value of a·g(x − h) with u = x − h taken EXACTLY (Fraction), and how it should be classified."""
    qa, qh, qx = frac(a), frac(h), frac(x)
    qu = qx - qh
    if fam == "linear":
        return {"kind": "exact", "value": frac_text(qa * qu)}
    if fam == "square":
        return {"kind": "exact", "value": frac_text(qa * qu * qu)}
    if fam == "ln" and qu <= 0:
        return {"kind": "undefined"}
    # exact values (the only rational values among these functions at rational inputs; Lindemann–Weierstrass / Niven)
    if fam == "exp" and (qu == 0):
        return {"kind": "exact", "value": frac_text(qa)}
    if fam == "exp" and qa == 0:
        return {"kind": "exact", "value": "0"}
    if fam == "ln" and (qu == 1 or qa == 0):
        return {"kind": "exact", "value": "0"}
    if fam == "sin" and (qu == 0 or qa == 0):
        return {"kind": "exact", "value": "0"}
    if fam == "cos" and qu == 0:
        return {"kind": "exact", "value": frac_text(qa)}
    if fam == "cos" and qa == 0:
        return {"kind": "exact", "value": "0"}
    du, da = D(qu.numerator) / D(qu.denominator), D(qa.numerator) / D(qa.denominator)
    true = da * g_at(fam, du)
    if abs(true) > DBL_MAX:
        return {"kind": "overflow"}
    # what the library is asked: the doubles nearest to a and u
    fu, fa = D(float(du)), D(float(da))
    at_double = fa * g_at(fam, fu)
    # how much feeding the double u (instead of the exact decimal u) can move the result: |a·g'(u)|·ulp(u)/2, plus the same for a
    bound = abs(da * g_derivative(fam, du)) * D(ulp(float(du))) / 2 + abs(g_at(fam, du)) * D(ulp(float(da))) / 2
    return {"kind": "numeric", "value": dbl(true), "atDouble": dbl(at_double), "bound": dbl(bound)}


def compare_cases() -> list[dict]:
    rnd = random.Random(20260611)
    cases: list[dict] = []

    def add(tag: str, a, h, x):
        cases.append({"id": f"compare_{len(cases):03d}", "tags": [tag], "input": {"a": a, "h": h, "x": x}})

    for a in (1, -1, 0, 0.01, 2, -0.5):
        for h in (0, 1, -1, 0.3):
            for x in (0, 1, -1, 0.3, 2, 3.14, -2.5, 7.25):
                add("grid", a, h, x)
    add("exact-shift", 1, 0.1, 0.3)  # u = 0.2 exactly, not 0.19999999999999998
    add("exact-shift", 1, 0.2, 0.3)
    add("exact-shift", 1, 0.3, 0.6)
    add("ln-domain", 1, 0, 0)
    add("ln-domain", 1, 1, 1)
    add("ln-domain", 1, 1, 1.01)
    add("ln-domain", 2, -1, 0)
    add("exp-overflow-edge", 1, 0, 709.78)
    add("exp-overflow-edge", 1, 0, 709.79)
    add("exp-overflow-edge", 1, 0, 800)
    add("exp-overflow-edge", 0.01, 0, 713)
    add("exp-overflow-edge", -3, 0, 711)
    add("exp-overflow-edge", 0, 0, 800)
    add("exp-underflow", 1, 0, -800)
    add("exp-underflow", -1, 0, -800)
    add("exp-subnormal", 1, 0, -720)
    add("exp-subnormal", 1, 0, -745)
    add("large-trig", 1, 0, 100)
    add("large-trig", 1, 0, 500.5)
    add("large-trig", 2, 0.5, 799.99)
    add("large-trig", 1, 0, -314.16)
    add("a-zero", 0, 0.5, 2)
    add("tiny-a", 0.01, 0, 1)
    for _ in range(200):
        a = round(rnd.uniform(-5, 5), 2)
        h = round(rnd.uniform(-5, 5), 2)
        x = round(rnd.uniform(-12, 12), 2)
        add("random", a, h, x)
    return cases


def evaluate_compare(c: dict) -> dict:
    a, h, x = c["input"]["a"], c["input"]["h"], c["input"]["x"]
    for v in (a, h, x):
        check_places(v, 2)
    return {"u": frac_text(frac(x) - frac(h)), "values": {fam: compare_value(fam, a, h, x) for fam in FAMILIES}}


# ------------------------------------------------------------------------------------------------ powers (the "undo" stage)
def power_cases() -> list[dict]:
    xs = [-3, -2.5, -1, 0, 0.01, 0.25, 1, 1.44, 2, 2.25, 3, 4, 6.25, 9, 10, 12.1, 100]
    return [{"id": f"power_{i:02d}", "input": {"x": x}} for i, x in enumerate(xs)]


def exact_sqrt(q: Fraction) -> Fraction | None:
    """√q as a Fraction if it is rational, found with integer square roots of numerator and denominator."""
    if q < 0:
        return None
    n, d = math.isqrt(q.numerator), math.isqrt(q.denominator)
    return Fraction(n, d) if n * n == q.numerator and d * d == q.denominator else None


def evaluate_power(c: dict) -> dict:
    q = frac(c["input"]["x"])
    out = {"square": {"kind": "exact", "value": frac_text(q * q)}, "cube": {"kind": "exact", "value": frac_text(q * q * q)}}
    if q < 0:
        out["sqrt"] = {"kind": "undefined"}
    else:
        r = exact_sqrt(q)
        out["sqrt"] = {"kind": "exact", "value": frac_text(r)} if r is not None else {"kind": "numeric", "value": dbl((D(q.numerator) / D(q.denominator)).sqrt())}
    return out


# ------------------------------------------------------------------------------------------------ the rotating unit vector
def candidate_table() -> tuple[list[tuple[str, Decimal]], list[tuple[str, Decimal]]]:
    r2, r3, r6 = D(2).sqrt(), D(3).sqrt(), D(6).sqrt()
    pos = [("0", D(0)), ("(√6−√2)/4", (r6 - r2) / 4), ("1/2", D(1) / 2), ("√2/2", r2 / 2), ("√3/2", r3 / 2), ("(√6+√2)/4", (r6 + r2) / 4), ("1", D(1))]
    sq = [("0", D(0)), ("(2−√3)/4", (2 - r3) / 4), ("1/4", D(1) / 4), ("1/2", D(1) / 2), ("3/4", D(3) / 4), ("(2+√3)/4", (2 + r3) / 4), ("1", D(1))]
    signed = [(label, v) for label, v in pos] + [(MINUS + label, -v) for label, v in pos if v != 0]
    return signed, sq


SIGNED, SQUARES = candidate_table()


def label_of(value: Decimal, table: list[tuple[str, Decimal]]) -> str:
    hits = [label for label, v in table if abs(value - v) < TINY]
    assert len(hits) == 1, (value, hits)
    return hits[0]


def sign_of(value: Decimal) -> int:
    return 0 if abs(value) < TINY else (1 if value > 0 else -1)


def pi_multiple_text(k: int) -> str:
    q = Fraction(k, 12)
    if q == 0:
        return "0"
    n, d = abs(q.numerator), q.denominator
    return f"{MINUS if q < 0 else ''}{'' if n == 1 else n}π{'' if d == 1 else f'/{d}'}"


def circle_exact(k: int) -> dict:
    theta = D(k) * PI / 12
    s, c = dsin(theta), dcos(theta)
    sx, cx = sign_of(s), sign_of(c)
    if sx == 0:
        location = "+x" if cx > 0 else MINUS + "x"
    elif cx == 0:
        location = "+y" if sx > 0 else MINUS + "y"
    else:
        location = {(1, 1): "I", (-1, 1): "II", (-1, -1): "III", (1, -1): "IV"}[(cx, sx)]
    # reference angle: the unique r in 0..6 whose sine has the same magnitude (brute force)
    ref = [r for r in range(7) if abs(abs(dsin(D(r) * PI / 12)) - abs(s)) < TINY]
    assert len(ref) == 1, (k, ref)
    # arcsin(sin θ): the unique m in [−6, 6] with the same sine
    asin_rep = [m for m in range(-6, 7) if abs(dsin(D(m) * PI / 12) - s) < TINY]
    assert len(asin_rep) == 1, (k, asin_rep)
    # atan2(sin θ, cos θ): the unique m in (−12, 12] with the same cosine AND sine
    atan_rep = [m for m in range(-11, 13) if abs(dsin(D(m) * PI / 12) - s) < TINY and abs(dcos(D(m) * PI / 12) - c) < TINY]
    assert len(atan_rep) == 1, (k, atan_rep)
    assert abs(s * s + c * c - 1) < TINY
    return {
        "k": k,
        "sin": {"text": label_of(s, SIGNED), "numeric": snap(s)},
        "cos": {"text": label_of(c, SIGNED), "numeric": snap(c)},
        "sin2": {"text": label_of(s * s, SQUARES), "numeric": snap(s * s)},
        "cos2": {"text": label_of(c * c, SQUARES), "numeric": snap(c * c)},
        "location": location,
        "referenceIndex": ref[0],
        "arcsinRepresentative": asin_rep[0],
        "atan2Representative": atan_rep[0],
        "piMultiple": pi_multiple_text(k),
        "degrees": 15 * k,
        "returnsThetaArcsin": abs(k) <= 6,
        "returnsThetaAtan2": -12 < k <= 12,
    }


def free_radians() -> list[float]:
    rnd = random.Random(7)
    fixed = [0.0, 0.001, -0.001, 0.5, 0.524, 1.0, -1.0, 1.5, 1.57, 1.571, -1.571, 2.0, 3.0, 3.141, 3.142, -3.141, -3.142, 4.0, -4.0, 4.712, 5.0, 6.0, 6.283, -6.283, 0.785, 2.356, -2.356]
    rand = [round(rnd.uniform(-6.283, 6.283), 3) for _ in range(150)]
    return fixed + rand


def circle_free(r: float) -> dict:
    check_places(r, 3)
    exact_r = dec(r)
    s, c = dsin(exact_r), dcos(exact_r)
    fr = D(float(exact_r))  # the double the TypeScript passes to the library
    s_d, c_d = dsin(fr), dcos(fr)
    half_ulp = D(ulp(float(r))) / 2
    sx, cx = (0, 1) if r == 0 else (sign_of(s), sign_of(c))
    if r == 0:
        location = "+x"
    else:
        location = {(1, 1): "I", (-1, 1): "II", (-1, -1): "III", (1, -1): "IV"}[(cx, sx)]
    # reduced angle in [0, 2π)
    reduced = exact_r - TWO_PI * (exact_r / TWO_PI).to_integral_value(rounding="ROUND_FLOOR")
    # arcsin(sin θ) in [−π/2, π/2] and atan2(sin θ, cos θ) in (−π, π]: φ = θ reduced to (−π, π], then reflect
    phi = exact_r - TWO_PI * (exact_r / TWO_PI).to_integral_value()
    if phi <= -PI:
        phi += TWO_PI
    if phi > PI:
        phi -= TWO_PI
    asin_value = phi if abs(phi) <= PI / 2 else (PI - phi if phi > 0 else -PI - phi)
    atan_value = phi
    # the TypeScript takes asin of the DOUBLE sine: its rounding error is amplified by 1/|cos(asin_value)|
    cond = D(1) / max(abs(dcos(asin_value)), D(10) ** -9)
    return {
        "radians": r,
        "cos": {"value": dbl(c), "atDouble": dbl(c_d), "bound": dbl(abs(s) * half_ulp)},
        "sin": {"value": dbl(s), "atDouble": dbl(s_d), "bound": dbl(abs(c) * half_ulp)},
        "location": location,
        "reduced": dbl(reduced),
        "degrees": dbl(exact_r * 180 / PI),
        "arcsinOfSin": dbl(asin_value),
        "arcsinBound": dbl(8 * D(2) ** -53 * cond + 4 * D(ulp(dbl(asin_value)))),
        "atan2OfComponents": dbl(atan_value),
        "returnsThetaArcsin": bool(abs(exact_r) <= PI / 2),
        "returnsThetaAtan2": bool(-PI < exact_r <= PI),
        "pythagorean": 1,
    }


# ------------------------------------------------------------------------------------------------ inverse round trips
ROUNDTRIP_X = [-800, -745.14, -745.13, -745, -740, -720, -709, -700, -100, -10, -3, -1.5, -0.5, -0.01, 0, 0.01, 0.5, 1, 1.2, 1.5, 2, 2.25, 3, 4, 6.25, 10, 50, 100, 300, 700, 709, 709.78, 709.79, 710, 750, 800]
EXP_LIMITS = {"overflowAbove": dbl(dln(DBL_MAX)), "underflowBelow": dbl(dln(HALF_MIN_SUBNORMAL))}


def roundtrip_cases() -> list[dict]:
    out = []
    for family in ("exp", "square"):
        for order in ("forward-first", "inverse-first"):
            for x in ROUNDTRIP_X:
                out.append({"id": f"roundtrip_{family}_{order}_{x}", "input": {"family": family, "order": order, "x": x}})
    return out


def evaluate_roundtrip(c: dict) -> dict:
    family, order, x = c["input"]["family"], c["input"]["order"], c["input"]["x"]
    check_places(x, 2)
    q = frac(x)
    dx_exact = D(q.numerator) / D(q.denominator)
    dx = D(float(dx_exact))  # the double the TypeScript works with: the round trip is judged for THAT number
    if family == "square":
        if order == "forward-first":
            root = exact_sqrt(q * q)
            assert root == abs(q)
            return {"regime": "exact", "mathReturns": q >= 0, "cause": "ok" if q >= 0 else "sign-lost", "steps": [frac_text(q * q), frac_text(root)], "returned": q >= 0}
        if q < 0:
            return {"regime": "domain", "mathReturns": False, "cause": "domain", "steps": None, "returned": None}
        r = exact_sqrt(q)
        if r is not None:
            return {"regime": "exact", "mathReturns": True, "cause": "ok", "steps": [frac_text(r), frac_text(r * r)], "returned": True}
        root = dbl(dx.sqrt())
        stored = D(root)  # the double actually stored
        back_error = abs(stored * stored - dx)  # the TRUE error of squaring the stored double
        return {"regime": "irrational", "mathReturns": True, "cause": "rounding-or-ok", "steps": [root, dbl(stored * stored)], "returned": True,
                "exactError": dbl(back_error)}
    # exponential
    if order == "inverse-first":
        if q <= 0:
            return {"regime": "domain", "mathReturns": False, "cause": "domain", "steps": None, "returned": None}
        if q == 1:
            return {"regime": "exact", "mathReturns": True, "cause": "ok", "steps": ["0", "1"], "returned": True}
        l = dbl(dln(dx))
        stored = D(l)
        # TRUE error of exponentiating the stored double: |e^(stored) − x| = x·|e^(stored − ln x) − 1|
        err = abs(dexp(stored) - dx)
        return {"regime": "normal", "mathReturns": True, "cause": "rounding-or-ok", "steps": [l, dbl(dexp(stored))], "returned": True, "exactError": dbl(err)}
    if q == 0:
        return {"regime": "exact", "mathReturns": True, "cause": "ok", "steps": ["1", "0"], "returned": True}
    e = dexp(dx)
    if e > DBL_MAX:
        return {"regime": "overflow", "mathReturns": True, "cause": "overflow", "steps": None, "returned": False}
    if e < HALF_MIN_SUBNORMAL:
        return {"regime": "underflow", "mathReturns": True, "cause": "underflow", "steps": None, "returned": False}
    stored = D(dbl(e))  # the double that is actually stored
    back_true = dln(stored)  # ln of the stored double, in 90 digits
    err = abs(back_true - dx)
    subnormal = e < DBL_MIN_NORMAL
    tolerance = 8 * D(2) ** -52 * max(D(1), abs(dx))
    # "returned" is only asserted where the verdict is not borderline (the double ln may land a few ulps either side of the tolerance)
    if err <= tolerance / 4:
        verdict: bool | None = True
    elif err > 4 * tolerance:
        verdict = False
    else:
        verdict = None
    return {"regime": "subnormal" if subnormal else "normal", "mathReturns": True, "cause": "subnormal-or-rounding" if subnormal else "rounding-or-ok",
            "steps": [dbl(e), dbl(back_true)], "returned": verdict, "exactError": dbl(err)}


# ------------------------------------------------------------------------------------------------ exponential and logarithm bases
PRESET_BASE = {"half": Fraction(1, 2), "two": Fraction(2), "ten": Fraction(10), "e": None}
EXACT_POWER_LIMIT = 20  # the lesson shows b^n as an exact rational only for integer |n| ≤ 20 (a display policy, not mathematics)


def growth_cases() -> list[dict]:
    out = []
    xs = [-20, -3, -1, -0.5, 0, 0.01, 0.5, 1, 2, 3, 8, 10, 20, 21, 100, 4, 0.25, 5, 400]
    for preset in ("half", "two", "e", "ten"):
        for x in xs:
            out.append({"id": f"growth_{preset}_{x}", "input": {"preset": preset, "custom": 3, "x": x}})
    for custom in (1, 1.5, 3, 0.25, 0.01, 99.99, 1.01):
        for x in (-3, 0, 0.5, 1, 2, 4, 100, 5):
            out.append({"id": f"growth_custom_{custom}_{x}", "input": {"preset": "custom", "custom": custom, "x": x}})
    return out


def whole_log(base: Fraction, x: Fraction) -> int | None:
    """The integer n ≠ 0 with base**n == x, found by rounding a 90-digit logarithm and VERIFYING with Fractions."""
    if base <= 0 or base == 1 or x <= 0 or x == 1:
        return None
    guess = int(((dln(D(x.numerator) / D(x.denominator))) / dln(D(base.numerator) / D(base.denominator))).to_integral_value())
    return guess if guess != 0 and base**guess == x else None


def evaluate_growth(c: dict) -> dict:
    preset, custom, x = c["input"]["preset"], c["input"]["custom"], c["input"]["x"]
    check_places(x, 2)
    check_places(custom, 2)
    base_q = frac(custom) if preset == "custom" else PRESET_BASE[preset]
    is_e = preset == "e"
    db = D(1).exp() if is_e else D(base_q.numerator) / D(base_q.denominator)
    qx = frac(x)
    dx = D(qx.numerator) / D(qx.denominator)
    fb, fx = D(float(db)), D(float(dx))  # the doubles handed to the library
    out: dict = {"kind": "constant" if base_q == 1 else ("growth" if db > 1 else "decay")}
    # power b^x
    if base_q is not None and qx.denominator == 1 and abs(qx.numerator) <= EXACT_POWER_LIMIT:
        out["power"] = {"kind": "exact", "value": frac_text(base_q**qx.numerator)}
    elif is_e and qx == 0:
        out["power"] = {"kind": "exact", "value": "1"}
    else:
        true = dexp(dx * dln(db))
        if true > DBL_MAX:
            out["power"] = {"kind": "overflow"}
        else:
            at_double = dexp(fx * dln(fb))
            out["power"] = {"kind": "numeric", "value": dbl(true), "atDouble": dbl(at_double), "boundRelative": dbl(abs(dx) * D(2) ** -52 + D(2) ** -52)}
    # ln b
    out["lnBase"] = {"kind": "exact", "value": "1"} if is_e else ({"kind": "exact", "value": "0"} if base_q == 1 else {"kind": "numeric", "value": dbl(dln(fb))})
    # log_b x
    if base_q == 1:
        out["logAtX"] = {"kind": "undefined", "why": "base1"}
    elif qx <= 0:
        out["logAtX"] = {"kind": "undefined", "why": "x"}
    elif qx == 1:
        out["logAtX"] = {"kind": "exact", "value": "0"}
    else:
        n = whole_log(base_q, qx) if base_q is not None else None
        out["logAtX"] = {"kind": "exact", "value": str(n)} if n is not None else {"kind": "numeric", "value": dbl(dln(fx) / dln(fb))}
    # doubling / halving time
    if base_q == 1:
        out["period"] = {"kind": "none"}
    else:
        m = whole_log(Fraction(2), base_q) if base_q is not None else None  # base = 2^m ?
        if m is None and base_q is not None and base_q < 1:
            m = whole_log(Fraction(2), 1 / base_q)
            m = -m if m is not None else None
        # for base = 2^m the doubling time is exactly 1/|m|
        value = {"kind": "exact", "value": frac_text(Fraction(1, abs(m)))} if m is not None else {"kind": "numeric", "value": dbl(dln(D(2)) / abs(dln(fb)))}
        out["period"] = {"kind": "doubling" if db > 1 else "halving", "value": value}
    # bits and nats at x
    if qx <= 0:
        out["bits"] = {"kind": "undefined"}
        out["nats"] = {"kind": "undefined"}
    else:
        n2 = whole_log(Fraction(2), qx) if qx != 1 else 0
        out["bits"] = {"kind": "exact", "value": str(n2)} if n2 is not None else {"kind": "numeric", "value": dbl(dln(fx) / dln(D(2)))}
        out["nats"] = {"kind": "exact", "value": "0"} if qx == 1 else {"kind": "numeric", "value": dbl(dln(fx))}
    return out


# ------------------------------------------------------------------------------------------------ logarithm identities
def identity_cases() -> list[dict]:
    rnd = random.Random(424242)
    triples = [(6, 4, 3), (1, 1, 0), (2, 8, 1), (100, 1.01, 3), (0.01, 99.99, -5), (0.5, 0.25, 2.5), (7.77, 2, -4.5), (1, 5, 5), (50, 10, 0.5), (3, 1, 2),
               (0, 4, 3), (-1, 4, 3), (6, 0, 3), (6, -2, 3), (0, 0, 0), (-3, -3, 1), (99, 3, 400), (0.01, 4, 160), (1e-2, 10, -200), (100, 100, 5)]
    triples += [(round(rnd.uniform(0.01, 100), 2), round(rnd.uniform(0.01, 100), 2), round(rnd.uniform(-8, 8), 2)) for _ in range(150)]
    return [{"id": f"identity_{i:03d}", "input": {"a": a, "b": b, "k": k}} for i, (a, b, k) in enumerate(triples)]


def evaluate_identities(c: dict) -> dict:
    a, b, k = c["input"]["a"], c["input"]["b"], c["input"]["k"]
    for v in (a, b, k):
        check_places(v, 2)
    da, db, dk = dec(a), dec(b), dec(k)
    pos_a, pos_b = da > 0, db > 0
    out: dict = {}

    def usable(v: Decimal) -> bool:  # a value the doubles can hold as a normal number
        return DBL_MIN_NORMAL <= abs(v) <= DBL_MAX

    # product
    if pos_a and pos_b and usable(da * db):
        lhs, rhs = dln(da * db), dln(da) + dln(db)
        assert abs(lhs - rhs) < TINY
        out["product"] = {"status": "checked", "value": dbl(lhs), "logs": [dbl(dln(da)), dbl(dln(db))]}
    else:
        out["product"] = {"status": "undefined"}
    # power
    if pos_a:
        p = da**dk
        if usable(p):
            assert abs(dln(p) - dk * dln(da)) < TINY  # ln of the independently computed power a**k (Decimal's own pow) equals k·ln a
            out["power"] = {"status": "checked", "value": dbl(dk * dln(da)), "logs": [dbl(dln(da))]}
        else:
            out["power"] = {"status": "undefined"}
    else:
        out["power"] = {"status": "undefined"}
    # change of base: b^(ln a / ln b) = a
    if pos_a and pos_b and db != 1:
        q = dln(da) / dln(db)
        assert abs(db**q - da) < TINY * max(D(1), da)  # b ** q with Decimal's own pow, independent of exp/ln
        out["change-of-base"] = {"status": "checked", "value": dbl(da), "logs": [dbl(q)], "logA": dbl(dln(da))}
    else:
        out["change-of-base"] = {"status": "undefined"}
    # bits and nats
    if pos_a:
        lhs, rhs = da.log10() / D(2).log10(), dln(da) / dln(D(2))  # log₂ a through base-10 logarithms vs ln a / ln 2
        assert abs(lhs - rhs) < TINY
        out["bits-nats"] = {"status": "checked", "value": dbl(lhs), "logs": [dbl(dln(da))]}
    else:
        out["bits-nats"] = {"status": "undefined"}
    return out


# ------------------------------------------------------------------------------------------------ fixture
def build_fixture() -> dict:
    return {
        "schema": SCHEMA,
        "tolerance": {
            "unit": "ulps of the expected value (math.ulp) unless stated",
            "compareAtDouble": 4,
            "exactCircle": 2,
            "freeCircle": 2,
            "growthAtDouble": 8,
            "identityValueFactor": 8,
            "rationale": "The library functions (Math.exp, Math.log, Math.sin, Math.cos, Math.pow) are not required to be correctly rounded; 4–8 ulps leaves "
                         "headroom for other engines. `atDouble` is the correctly rounded value at the DOUBLES the TypeScript uses, so the first test "
                         "measures the library; `value` + `bound` is the true value at the decimal input, so the second shows that feeding a double "
                         "instead of the decimal is the only extra error. Exact values, kinds, locations, representatives and undefined/overflow "
                         "policies must match EXACTLY.",
        },
        "limits": EXP_LIMITS,
        "compare": [{**c, "expected": evaluate_compare(c)} for c in compare_cases()],
        "powers": [{**c, "expected": evaluate_power(c)} for c in power_cases()],
        "circleExact": [circle_exact(k) for k in range(-48, 49)],
        "circleFree": [circle_free(r) for r in free_radians()],
        "roundtrip": [{**c, "expected": evaluate_roundtrip(c)} for c in roundtrip_cases()],
        "growth": [{**c, "expected": evaluate_growth(c)} for c in growth_cases()],
        "identities": [{**c, "expected": evaluate_identities(c)} for c in identity_cases()],
    }


def render(fixture: dict) -> str:
    return json.dumps(fixture, indent=1, ensure_ascii=False) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/families.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/families.fixtures.json is stale or missing: run `python oracle/families_oracle.py --write`", file=sys.stderr)
        return 1
    print("families fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
