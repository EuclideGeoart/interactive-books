"""Independent oracle for I.4: linear equations and inequalities, balanced operations, inequality reversal, extraneous roots of sqrt(x + p) = x + q,
the division fallacy, and the distributive law.

Deliberately NOT a transliteration of ``src/math/algebra/*.ts``:

  solution sets   the TypeScript divides by the x-coefficient and reverses the relation when it is negative. Here a side is a Python FUNCTION of x;
                  g(x) = L(x) - R(x) is probed at x = 0 and x = 1, the root is the SECANT root -g(0)/(g(1)-g(0)), and the direction of an inequality
                  is found by EVALUATING THE STATEMENT on either side of the root (and at the root, for open versus closed). No reversal rule is used.
                  Every set is then checked against a brute-force truth table over a grid of 241 rationals.
  operations      a side is a composed function (``lambda x: s(x) * k``); the new coefficients are read back by evaluating it at 0 and 1; the new
                  relation is the one (of "same" and "reversed") that keeps the TRUTH TABLE of the statement unchanged on the grid, which discovers
                  the reversal rule from data. Where the data cannot tell the two apart (a degenerate statement) the case is marked ``forced: false``.
  extraneous      60-digit ``decimal`` arithmetic: both roots of the squared equation from the quadratic formula, each substituted into the ORIGINAL
                  equation with a decimal square root and classified by whether +sqrt or -sqrt matches; exact forms by prime factorisation of the
                  discriminant (``quantity_oracle.real_root``); and a brute-force search of the original equation over a grid of half-integers.
                  The TypeScript decides the sign of u + v*sqrt(b) by comparing squares.
  fallacy         the solutions of x(x - c) = m(x - c) found by scanning a grid of quarters.
  distribute      the identity is decided by counting the agreeing integer points among 41 (a linear function that agrees with another at two
                  points is the same function; here it must agree at all or at none).

Fixture: ``fixtures/algebra.fixtures.json`` (inputs AND expected values), read by ``tests/unit/algebra.parity.test.ts``.

    python oracle/algebra_oracle.py --write     regenerate the fixture
    python oracle/algebra_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from quantity_oracle import Splitmix64, decimal_text, fraction_from_text, real_root  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "algebra.fixtures.json"
SCHEMA = "book2.algebra.fixtures/1"

F = Fraction
RELS = ("=", "<", "≤", ">", "≥")
REVERSED = {"=": "=", "<": ">", "≤": "≥", ">": "<", "≥": "≤"}
#: 241 exact test points: every quarter from -30 to 30
GRID = [F(k, 4) for k in range(-120, 121)]


def text_of(q: Fraction) -> str:
    """Exact value as "p/q" (or "p" when an integer)."""
    return str(q)


def holds(rel: str, u: Fraction, v: Fraction) -> bool:
    return {"=": u == v, "<": u < v, "≤": u <= v, ">": u > v, "≥": u >= v}[rel]


# ----------------------------------------------------------------------------------------------- sides as functions
def side(a: Fraction, b: Fraction):
    return lambda x: a * x + b


def coefficients(f) -> tuple[Fraction, Fraction]:
    """Read a·x + b back from a function that is known to be affine, by evaluating it at 0 and at 1."""
    b = f(F(0))
    return f(F(1)) - b, b


def statement_functions(spec: dict):
    return side(d(spec["a1"]), d(spec["b1"])), side(d(spec["a2"]), d(spec["b2"]))


def truth_table(rel: str, left, right) -> list[bool]:
    return [holds(rel, left(x), right(x)) for x in GRID]


# ----------------------------------------------------------------------------------------------- solution sets
def solution_set(left, rel: str, right) -> dict:
    """The solution set of ``left(x) rel right(x)`` found by probing g = left - right, never by a reversal rule."""
    def g(x):
        return left(x) - right(x)

    g0, g1 = g(F(0)), g(F(1))
    slope = g1 - g0
    if slope == 0:  # g is constant: the statement does not involve x
        return {"kind": "all"} if holds(rel, g0, F(0)) else {"kind": "none"}
    x0 = -g0 / slope  # the secant root: g(x0) = 0
    assert g(x0) == 0
    if rel == "=":
        found = {"kind": "point", "x": text_of(x0)}
    else:
        below = holds(rel, g(x0 - 1), F(0))
        above = holds(rel, g(x0 + 1), F(0))
        assert below != above, "an affine function with slope != 0 changes sign at its root"
        found = {"kind": "ray", "side": "below" if below else "above", "bound": text_of(x0), "closed": holds(rel, g(x0), F(0))}
    return found


def member(found: dict, x: Fraction) -> bool:
    if found["kind"] == "all":
        return True
    if found["kind"] == "none":
        return False
    if found["kind"] == "point":
        return x == F(found["x"])
    bound = F(found["bound"])
    inside = x < bound if found["side"] == "below" else x > bound
    return inside or (found["closed"] and x == bound)


def set_checked(left, rel: str, right) -> dict:
    """``solution_set`` plus the brute-force confirmation over the grid (and over the bound itself)."""
    found = solution_set(left, rel, right)
    probes = GRID + ([F(found["x"] if found["kind"] == "point" else found["bound"])] if found["kind"] in ("point", "ray") else [])
    for x in probes:
        assert member(found, x) == holds(rel, left(x), right(x)), (found, x)
    return found


def kind_of(rel: str, found: dict) -> str:
    if rel == "=":
        return {"all": "identity", "none": "contradiction", "point": "conditional-equation"}[found["kind"]]
    return {"all": "always-true", "none": "never-true", "ray": "conditional-inequality"}[found["kind"]]


def relation_after(rel: str, left, right, new_left, new_right) -> tuple[str, bool]:
    """The relation that keeps the truth table unchanged, and whether the data forces it (True) or both candidates would do (False)."""
    before = truth_table(rel, left, right)
    candidates = [r for r in dict.fromkeys((rel, REVERSED[rel])) if truth_table(r, new_left, new_right) == before]
    assert candidates, "no relation keeps the truth table: the operation is not a balanced one"
    return candidates[0], len(candidates) == 1


# ----------------------------------------------------------------------------------------------- statements and the solution path
def spec_text(a1: Fraction, b1: Fraction, rel: str, a2: Fraction, b2: Fraction) -> dict:
    return {"a1": text_of(a1), "b1": text_of(b1), "rel": rel, "a2": text_of(a2), "b2": text_of(b2)}


def statement_expected(spec: dict) -> dict:
    left, right = statement_functions(spec)
    rel = spec["rel"]
    found = set_checked(left, rel, right)
    a1, b1, a2, b2 = (d(spec[k]) for k in ("a1", "b1", "a2", "b2"))
    m = a1 - a2
    steps = int(a2 != 0) + int(b1 != 0) + int(m != 0 and m != 1)
    if m == 0:  # the work ends at "0 rel c"
        final = spec_text(F(0), F(0), rel, F(0), b2 - b1)
        assert set_checked(side(F(0), F(0)), rel, side(F(0), b2 - b1)) == found
    else:
        x0 = F(found["x"] if found["kind"] == "point" else found["bound"])
        # the relation of the final "x rel' x0": whichever of rel and its reverse describes the same set
        want = found
        options = [r for r in dict.fromkeys((rel, REVERSED[rel])) if set_checked(side(F(1), F(0)), r, side(F(0), x0)) == want]
        assert len(options) == 1, (spec, options)
        final = spec_text(F(1), F(0), options[0], F(0), x0)
    return {"set": found, "kind": kind_of(rel, found), "pathSteps": steps, "pathFinal": final}


# ----------------------------------------------------------------------------------------------- operations
OPS = ("add", "add-x", "scale", "divide")


def operation_expected(spec: dict, op: str, value: Fraction) -> dict:
    left, right = statement_functions(spec)
    rel = spec["rel"]
    if op in ("scale", "divide") and value == 0:
        # the naive result is 0 rel 0 on both sides: record what it does to the solution set
        before = set_checked(left, rel, right)
        naive = set_checked(side(F(0), F(0)), rel, side(F(0), F(0)))
        return {"accepted": False, "reason": "zero-multiply" if op == "scale" else "zero-divide", "changesSolutionSet": naive != before}
    if op == "add":
        wrap = lambda s: (lambda x: s(x) + value)  # noqa: E731
    elif op == "add-x":
        wrap = lambda s: (lambda x: s(x) + value * x)  # noqa: E731
    elif op == "scale":
        wrap = lambda s: (lambda x: s(x) * value)  # noqa: E731
    else:
        wrap = lambda s: (lambda x: s(x) / value)  # noqa: E731
    new_left, new_right = wrap(left), wrap(right)
    new_rel, forced = relation_after(rel, left, right, new_left, new_right)
    (na1, nb1), (na2, nb2) = coefficients(new_left), coefficients(new_right)
    before = set_checked(left, rel, right)
    after = set_checked(new_left, new_rel, new_right)
    assert before == after, "the balanced operation changed the solution set"
    reversed_ = new_rel != rel
    if op in ("scale", "divide") and rel != "=" and forced:
        assert reversed_ == (value < 0), "the data says the relation reverses exactly when the factor is negative"
    return {"accepted": True, "next": spec_text(na1, nb1, new_rel, na2, nb2), "reversed": reversed_, "forced": forced, "setBefore": before, "setAfter": after}


# ----------------------------------------------------------------------------------------------- the beam
def beam_expected(spec: dict, trial: Fraction) -> dict:
    left, right = statement_functions(spec)
    lv, rv = left(trial), right(trial)
    diff = lv - rv
    return {"left": text_of(lv), "right": text_of(rv), "diff": text_of(diff), "lower": "level" if diff == 0 else ("left" if diff > 0 else "right"),
            "holds": holds(spec["rel"], lv, rv)}


# ----------------------------------------------------------------------------------------------- reversal
def order_name(u: Fraction, v: Fraction) -> str:
    return "less" if u < v else ("greater" if u > v else "equal")


def reversal_expected(p: Fraction, q: Fraction, k: Fraction) -> dict:
    kp, kq = k * p, k * q
    before, after = order_name(p, q), order_name(kp, kq)
    # the second route: the sign of k*(p - q) is sign(k) * sign(p - q), so the order after is the order before multiplied by sign(k)
    sg = (k > 0) - (k < 0)
    sign_pq = (p > q) - (p < q)
    assert (kp > kq) - (kp < kq) == sg * sign_pq
    return {"kp": text_of(kp), "kq": text_of(kq), "before": before, "after": after, "rule": "keeps" if k > 0 else ("reverses" if k < 0 else "rejected"),
            "sameRelationHolds": after == before, "reversedRelationHolds": after == {"less": "greater", "greater": "less", "equal": "equal"}[before]}


# ----------------------------------------------------------------------------------------------- extraneous roots
getcontext().prec = 60
TOLERANCE_ROOT = Decimal(10) ** -40


def is_square_fraction(x: Fraction) -> Fraction | None:
    """The exact square root of a non-negative rational if it is rational, found with math.isqrt on numerator and denominator."""
    if x < 0:
        return None
    n, m = math.isqrt(x.numerator), math.isqrt(x.denominator)
    return F(n, m) if n * n == x.numerator and m * m == x.denominator else None


def extraneous_expected(p: int, q: int) -> dict:
    D = 4 * p - 4 * q + 1
    roots = []
    if D > 0:
        s = Decimal(D).sqrt()
        a, b = _split_square(D)
        for sgn in (-1, 1):
            x = (Decimal(1 - 2 * q) + sgn * s) / 2
            rhs = x + q
            radicand = x + p
            assert radicand >= 0 or abs(radicand) < TOLERANCE_ROOT
            assert abs(radicand - rhs * rhs) < TOLERANCE_ROOT, "the root satisfies the squared equation"
            lhs = radicand.sqrt() if radicand > 0 else Decimal(0)
            plus_ok = abs(lhs - rhs) < TOLERANCE_ROOT
            minus_ok = abs(-lhs - rhs) < TOLERANCE_ROOT
            assert plus_ok or minus_ok
            u, v = F(1 - 2 * q, 2), F(sgn * a, 2)
            if b == 1:
                u, v = u + v, F(0)
            roots.append({"u": text_of(u), "v": text_of(v), "b": b, "approx": float(x), "status": "valid" if plus_ok else "extraneous",
                          "solves": "both" if (plus_ok and minus_ok) else ("plus" if plus_ok else "minus")})
        assert Decimal(roots[0]["approx"]) < Decimal(roots[1]["approx"])
    # brute force on the ORIGINAL equation over half-integers: sqrt(x + p) = x + q with the exact rational square root
    found = []
    for k in range(-160, 161):
        x = F(k, 2)
        r = is_square_fraction(x + p)
        if r is not None and r == x + q:
            found.append(text_of(x))
    expected_rational = sorted(r["u"] for r in roots if r["status"] == "valid" and r["b"] == 1)
    assert sorted(found) == expected_rational, (p, q, found, expected_rational)
    valid = sum(r["status"] == "valid" for r in roots)
    return {"discriminant": D, "squared": {"linear": text_of(F(2 * q - 1)), "constant": text_of(F(q * q - p))}, "roots": roots,
            "validCount": valid, "extraneousCount": len(roots) - valid}


def _split_square(n: int) -> tuple[int, int]:
    """n = a*a*b with b square-free, by prime factorisation (not by the TypeScript's trial division of squares)."""
    r = real_root(F(n), 2)
    assert r["kind"] == "exact" and r["c"] == 1
    return int(r["a"]), int(r["b"])


# ----------------------------------------------------------------------------------------------- the division fallacy
def fallacy_expected(c: int, m: int) -> dict:
    lhs = lambda x: x * (x - c)  # noqa: E731
    rhs = lambda x: m * (x - c)  # noqa: E731
    solutions = [x for x in GRID if lhs(x) == rhs(x)]  # a scan of the grid: nothing is divided
    assert solutions == sorted({F(c), F(m)})
    return {"solutions": [text_of(x) for x in solutions], "afterDividing": text_of(F(m)), "lost": None if c == m else text_of(F(c)),
            "atC": [text_of(lhs(F(c))), text_of(rhs(F(c)))]}


# ----------------------------------------------------------------------------------------------- the distributive law
def distribute_expected(a: Fraction, b: Fraction, c: Fraction, x: Fraction, form: str) -> dict:
    product = a * (b * x + c)  # evaluated as written
    first = a * b * x
    second = a * c if form == "correct" else c
    expanded = first + second
    # identity or not, by counting agreeing integer points of a·(b·t + c) against the right-hand side
    agree = sum(a * (b * t + c) == a * b * t + (a * c if form == "correct" else c) for t in map(F, range(-20, 21)))
    kind = "identity" if agree == 41 else ("contradiction" if agree == 0 else "conditional-equation")
    assert kind != "conditional-equation", "two affine functions with the same slope agree everywhere or nowhere"
    return {"inner": text_of(b * x + c), "product": text_of(product), "firstTerm": text_of(first), "secondTerm": text_of(second),
            "expanded": text_of(expanded), "gap": text_of(product - expanded), "agreesHere": product == expanded, "kind": kind}


# ----------------------------------------------------------------------------------------------- cases
def d(text: str) -> Fraction:
    return fraction_from_text(text)


def spec_of(a1, b1, rel, a2, b2) -> dict:
    return {"a1": a1, "b1": b1, "rel": rel, "a2": a2, "b2": b2}


NAMED_STATEMENTS = [
    spec_of("3", "2", "=", "1", "10"), spec_of("2", "3", "=", "2", "7"), spec_of("2", "3", "=", "2", "3"), spec_of("4", "1", "=", "1", "3"),
    spec_of("5", "-1", "≥", "2", "8"), spec_of("-2", "4", "<", "1", "10"), spec_of("0.5", "1", "≤", "-0.25", "3"), spec_of("2", "1", "<", "2", "3"),
    spec_of("2", "3", "≤", "2", "1"), spec_of("2", "1", "≥", "2", "1"), spec_of("2", "1", ">", "2", "1"), spec_of("0", "5", "=", "0", "5"),
    spec_of("1", "0", "=", "0", "0"), spec_of("-1", "0", ">", "0", "3"), spec_of("0", "0", "<", "-3", "6"), spec_of("7", "-7", "=", "7", "-7"),
    spec_of("-3", "9", "≤", "-3", "9"), spec_of("1.5", "-2.25", ">", "-0.5", "4"), spec_of("0.01", "0.02", "=", "0.03", "0.04"),
]


def random_statement(rng: Splitmix64) -> dict:
    return spec_of(decimal_text(rng.randint(-600, 600), 2), decimal_text(rng.randint(-900, 900), 2), RELS[rng.randint(0, 4)],
                   decimal_text(rng.randint(-600, 600), 2), decimal_text(rng.randint(-900, 900), 2))


def statement_cases() -> list[dict]:
    cases = [{"id": f"named {i}", "tags": ["named"], "input": s} for i, s in enumerate(NAMED_STATEMENTS)]
    rng = Splitmix64(0xA16EB4A)
    for i in range(120):
        cases.append({"id": f"random {i}", "tags": ["random"], "input": random_statement(rng)})
    for i in range(40):  # equal x-coefficients: all-or-nothing statements
        s = random_statement(rng)
        s["a2"] = s["a1"]
        cases.append({"id": f"same-slope {i}", "tags": ["degenerate"], "input": s})
    for i in range(30):  # integer coefficients, so equations often have integer roots and the closed/open boundary is on the grid
        s = spec_of(str(rng.randint(-9, 9)), str(rng.randint(-9, 9)), RELS[rng.randint(0, 4)], str(rng.randint(-9, 9)), str(rng.randint(-9, 9)))
        cases.append({"id": f"integer {i}", "tags": ["integer"], "input": s})
    return [{**c, "expected": statement_expected(c["input"])} for c in cases]


def operation_cases() -> list[dict]:
    cases: list[dict] = []
    values = {"add": ["2", "-2", "0", "0.5", "-7.25"], "add-x": ["1", "-1", "3", "-0.5", "0"], "scale": ["2", "-1", "-3", "0.5", "-0.25", "0"],
              "divide": ["2", "-2", "4", "-0.5", "0"]}
    for i, spec in enumerate(NAMED_STATEMENTS):
        for op in OPS:
            for v in values[op]:
                cases.append({"id": f"named {i} {op} {v}", "tags": ["named"], "input": {"statement": spec, "op": op, "value": v}})
    rng = Splitmix64(0x0B5E55ED)
    for i in range(150):
        op = OPS[rng.randint(0, 3)]
        v = decimal_text(rng.randint(-900, 900), 2)
        cases.append({"id": f"random {i} {op} {v}", "tags": ["random"], "input": {"statement": random_statement(rng), "op": op, "value": v}})
    return [{**c, "expected": operation_expected(c["input"]["statement"], c["input"]["op"], d(c["input"]["value"]))} for c in cases]


def beam_cases() -> list[dict]:
    cases: list[dict] = []
    for i, spec in enumerate(NAMED_STATEMENTS):
        for t in ("0", "4", "-2", "2.5", "-0.75"):
            cases.append({"id": f"named {i} at {t}", "tags": ["named"], "input": {"statement": spec, "trial": t}})
    rng = Splitmix64(0xBEA3)
    for i in range(80):
        cases.append({"id": f"random {i}", "tags": ["random"], "input": {"statement": random_statement(rng), "trial": decimal_text(rng.randint(-1200, 1200), 2)}})
    return [{**c, "expected": beam_expected(c["input"]["statement"], d(c["input"]["trial"]))} for c in cases]


def reversal_cases() -> list[dict]:
    cases: list[dict] = []
    for p, q, k in [("-2", "3", "2"), ("-2", "3", "-2"), ("-2", "3", "0"), ("2", "2", "-3"), ("3", "-2", "-1"), ("1.5", "4", "-0.5"), ("-4", "-1", "-3"),
                    ("0", "5", "-1"), ("5", "0", "-1"), ("0.01", "0.02", "-0.01"), ("-3", "3", "1")]:
        cases.append({"id": f"named {p},{q},{k}", "tags": ["named"], "input": {"p": p, "q": q, "k": k}})
    rng = Splitmix64(0x4E7E55)
    for i in range(160):
        cases.append({"id": f"random {i}", "tags": ["random"], "input": {"p": decimal_text(rng.randint(-1000, 1000), 2), "q": decimal_text(rng.randint(-1000, 1000), 2),
                                                                         "k": decimal_text(rng.randint(-900, 900), 2)}})
    return [{**c, "expected": reversal_expected(d(c["input"]["p"]), d(c["input"]["q"]), d(c["input"]["k"]))} for c in cases]


def extraneous_cases() -> list[dict]:
    return [{"id": f"p={p} q={q}", "tags": ["grid"], "input": {"p": p, "q": q}, "expected": extraneous_expected(p, q)} for p in range(-6, 7) for q in range(-6, 7)]


def fallacy_cases() -> list[dict]:
    return [{"id": f"c={c} m={m}", "tags": ["grid"], "input": {"c": c, "m": m}, "expected": fallacy_expected(c, m)} for c in range(-6, 7) for m in range(-6, 7)]


def distribute_cases() -> list[dict]:
    cases: list[dict] = []
    for a, b, c, x in [("2", "3", "4", "5"), ("1", "3", "4", "5"), ("2", "3", "0", "5"), ("-2", "3", "-4", "2"), ("0.5", "-1.5", "2", "-4"), ("3", "0", "7", "9"),
                       ("0", "3", "4", "5"), ("-1", "-1", "-1", "-1")]:
        for form in ("correct", "slip"):
            cases.append({"id": f"named a={a} b={b} c={c} x={x} {form}", "tags": ["named"], "input": {"a": a, "b": b, "c": c, "x": x, "form": form}})
    rng = Splitmix64(0xD157)
    for i in range(160):
        cases.append({"id": f"random {i}", "tags": ["random"], "input": {"a": decimal_text(rng.randint(-400, 400), 2), "b": decimal_text(rng.randint(-400, 400), 2),
                                                                         "c": decimal_text(rng.randint(-400, 400), 2), "x": decimal_text(rng.randint(-1000, 1000), 2),
                                                                         "form": "correct" if i % 2 == 0 else "slip"}})
    return [{**c, "expected": distribute_expected(d(c["input"]["a"]), d(c["input"]["b"]), d(c["input"]["c"]), d(c["input"]["x"]), c["input"]["form"])} for c in cases]


def build_fixture() -> dict:
    return {
        "schema": SCHEMA,
        "generatedBy": "oracle/algebra_oracle.py",
        "conventions": {
            "numbers": "inputs are decimal STRINGS with at most two decimals and are read exactly (never through a float); exact values are written \"p/q\" or \"p\"",
            "statement": "a1*x + b1 REL a2*x + b2 with REL one of = < ≤ > ≥",
            "set": "none | all | {point, x} | {ray, side: below|above, bound, closed}; 'below' means every x under the bound",
            "operations": "add: both sides + value; add-x: both sides + value*x; scale: both sides * value; divide: both sides / value; scale/divide by 0 are rejected",
            "reversal": "an inequality's relation reverses exactly when the factor is negative; 'forced: false' marks a degenerate statement whose truth table cannot tell the two apart",
            "extraneous": "sqrt(x + p) = x + q; D = 4p - 4q + 1; roots x = u + v*sqrt(b) with b square-free (b = 1: rational); status valid when +sqrt(x + p) = x + q",
            "pathFinal": "the statement after the derived solution path (subtract a2*x, subtract b1, divide by a1 - a2 unless that is 0 or 1)",
        },
        "tolerance": {
            "unit": "absolute, on the decimal approximation of an irrational root",
            "approx": 1e-12,
            "rationale": "the TypeScript evaluates u + v*sqrt(b) in doubles (|value| <= ~12); the oracle evaluates the same root to 60 digits and rounds once. "
                         "Exact values, signs, relations, sets, classifications and counts must match EXACTLY.",
        },
        "statements": statement_cases(),
        "operations": operation_cases(),
        "beams": beam_cases(),
        "reversals": reversal_cases(),
        "extraneous": extraneous_cases(),
        "fallacies": fallacy_cases(),
        "distributions": distribute_cases(),
    }


def render(fixture: dict) -> str:
    """One case per line (compact), so the committed file stays small and a diff shows exactly which case changed."""
    lines = ["{"]
    keys = list(fixture)
    for i, key in enumerate(keys):
        value = fixture[key]
        comma = "," if i < len(keys) - 1 else ""
        if isinstance(value, list):
            lines.append(f' "{key}": [')
            lines.extend(f"  {json.dumps(item, ensure_ascii=False, separators=(',', ':'))}{',' if j < len(value) - 1 else ''}" for j, item in enumerate(value))
            lines.append(f" ]{comma}")
        else:
            lines.append(f' "{key}": {json.dumps(value, ensure_ascii=False)}{comma}')
    lines.append("}")
    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/algebra.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/algebra.fixtures.json is stale or missing: run `python oracle/algebra_oracle.py --write`", file=sys.stderr)
        return 1
    print("algebra fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
