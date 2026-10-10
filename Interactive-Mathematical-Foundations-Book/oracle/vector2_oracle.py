"""Independent oracle for the 2D vector model (master plan §9.3, §9.4, §12.3).

This file is deliberately NOT a transliteration of ``src/math/vector2``. It uses different algorithms:

  magnitude   correctly-rounded square root of the exact sum x² + y² (``decimal``, 80 digits), then
              cross-checked against ``math.hypot`` and, when installed, NumPy
  exact form  prime factorisation of the integer x² + y² (the TypeScript divides out p² for every p)
  direction   ``math.atan2`` after canonicalising −0, plus a reconstruction invariant
              (‖v‖·cos θ = x and ‖v‖·sin θ = y) that checks the angle is RIGHT, not merely consistent

Fixtures are written to ``fixtures/vector2.fixtures.json`` and consumed by the TypeScript tests. NumPy is a
cross-check only: it is asserted equal to the stdlib result but never changes what is written, so the
committed file is identical with or without NumPy.

    python oracle/vector2_oracle.py --write     regenerate the fixture file
    python oracle/vector2_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from decimal import Decimal, localcontext
from fractions import Fraction
from pathlib import Path

try:  # optional cross-check
    import numpy as np  # type: ignore
except ImportError:  # pragma: no cover - exercised when NumPy is absent
    np = None

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "vector2.fixtures.json"
SCHEMA = "book2.vector2.fixtures/1"
EXACT_LIMIT = 10**12  # must equal EXACT_RADICAND_LIMIT in src/math/vector2/exact.ts (asserted by the TS parity test)


# ----------------------------------------------------------------------------------------------------------
# Mathematics
# ----------------------------------------------------------------------------------------------------------
def magnitude_correctly_rounded(x: float, y: float) -> float:
    """sqrt(x² + y²), correctly rounded to IEEE-754 binary64 (``inf`` on overflow)."""
    with localcontext() as ctx:
        ctx.prec = 80
        ctx.Emax = 999999
        ctx.Emin = -999999
        total = Decimal(x) ** 2 + Decimal(y) ** 2  # Decimal(float) is exact
        return float(total.sqrt())


def factorise(n: int) -> dict[int, int]:
    """Prime factorisation by trial division (n ≥ 1)."""
    factors: dict[int, int] = {}
    p = 2
    while p * p <= n:
        while n % p == 0:
            factors[p] = factors.get(p, 0) + 1
            n //= p
        p += 1 if p == 2 else 2
    if n > 1:
        factors[n] = factors.get(n, 0) + 1
    return factors


def exact_magnitude(x: float, y: float) -> tuple[int, int] | None:
    """(a, b) with ‖(x, y)‖ = a·√b and b square-free — integers only; ``None`` if not exact-able."""
    if not (float(x).is_integer() and float(y).is_integer()):
        return None
    if abs(x) > 2**53 - 1 or abs(y) > 2**53 - 1:
        return None
    n = int(x) ** 2 + int(y) ** 2
    if n == 0:
        return (0, 1)
    if n > EXACT_LIMIT:
        return None
    a, b = 1, 1
    for prime, exponent in factorise(n).items():
        a *= prime ** (exponent // 2)
        b *= prime ** (exponent % 2)
    return (a, b)


def exact_text(a: int, b: int) -> tuple[str, str]:
    if b == 1:
        return (str(a), str(a))
    lead = "" if a == 1 else str(a)
    return (f"{lead}√{b}", f"{lead}\\sqrt{{{b}}}")


def direction(x: float, y: float) -> float | None:
    """atan2(y, x) in (−π, π]; ``None`` for the zero vector. −0 is canonicalised so the cut at −x is stable."""
    x, y = x + 0.0, y + 0.0  # −0.0 + 0.0 == +0.0
    if x == 0.0 and y == 0.0:
        return None
    return math.atan2(y, x)


def textbook_safe(x: float, y: float) -> bool:
    """True when sqrt(x*x + y*y) computed naively neither underflows nor overflows."""
    smallest_normal = 2.2250738585072014e-308
    squares = (x * x, y * y)
    total = squares[0] + squares[1]
    nonzero_ok = all(sq == 0.0 or sq >= smallest_normal for sq in squares) and (x == 0.0 or squares[0] > 0.0) and (y == 0.0 or squares[1] > 0.0)
    return nonzero_ok and math.isfinite(total)


def evaluate(x: float, y: float) -> dict:
    """The expected values for one input, with every independent cross-check asserted."""
    x, y = x + 0.0, y + 0.0
    mag = magnitude_correctly_rounded(x, y)
    expected: dict = {"isZero": x == 0.0 and y == 0.0}

    if math.isinf(mag):
        expected["magnitude"] = None
        expected["magnitudeStatus"] = "overflow"
    else:
        expected["magnitude"] = mag
        expected["magnitudeStatus"] = "finite"
        # cross-checks (different algorithms must agree to within 1 ulp)
        ulp = math.ulp(mag) if mag != 0 else 5e-324
        assert abs(math.hypot(x, y) - mag) <= ulp, ("hypot disagrees", x, y)
        if np is not None:
            # np.hypot rescales internally, like math.hypot, so it must agree everywhere.
            assert abs(float(np.hypot(x, y)) - mag) <= 2 * ulp, ("numpy hypot disagrees", x, y)
            # np.linalg.norm squares first, so it is only comparable where x² and y² neither under- nor overflow.
            # (Outside that range it is WRONG, e.g. norm([1e-200, 1e-200]) == 0.0 — see test_numpy_norm_caveat.)
            if textbook_safe(x, y):
                assert abs(float(np.linalg.norm(np.array([x, y]))) - mag) <= 2 * ulp, ("numpy norm disagrees", x, y)

    squared_exact = Fraction(x) ** 2 + Fraction(y) ** 2
    both_int = float(x).is_integer() and float(y).is_integer()
    expected["magnitudeSquaredExact"] = str(squared_exact) if both_int else None
    try:
        expected["magnitudeSquared"] = float(squared_exact)  # correctly rounded
    except OverflowError:
        expected["magnitudeSquared"] = None
        expected["magnitudeSquaredStatus"] = "overflow"

    theta = direction(x, y)
    expected["directionRadians"] = theta
    expected["directionDegrees"] = None if theta is None else math.degrees(theta)
    if theta is not None and math.isfinite(mag) and mag > 0:
        # reconstruction invariant: the angle must point at (x, y)
        assert abs(mag * math.cos(theta) - x) <= 1e-14 * mag, ("cos reconstruction", x, y)
        assert abs(mag * math.sin(theta) - y) <= 1e-14 * mag, ("sin reconstruction", x, y)
        if np is not None:
            assert float(np.arctan2(y, x)) == theta or abs(float(np.arctan2(y, x)) - theta) <= 2 * math.ulp(theta)

    exact = exact_magnitude(x, y)
    if exact is None:
        expected["exact"] = None
    else:
        text, tex = exact_text(*exact)
        expected["exact"] = {"coefficient": str(exact[0]), "radicand": str(exact[1]), "text": text, "tex": tex}
    return expected


# ----------------------------------------------------------------------------------------------------------
# Cases
# ----------------------------------------------------------------------------------------------------------
class Splitmix64:
    """Tiny deterministic generator so the fixture does not depend on any library's PRNG algorithm."""

    def __init__(self, seed: int) -> None:
        self.state = seed & 0xFFFFFFFFFFFFFFFF

    def next_u64(self) -> int:
        self.state = (self.state + 0x9E3779B97F4A7C15) & 0xFFFFFFFFFFFFFFFF
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & 0xFFFFFFFFFFFFFFFF
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & 0xFFFFFFFFFFFFFFFF
        return z ^ (z >> 31)

    def randint(self, low: int, high: int) -> int:
        return low + self.next_u64() % (high - low + 1)


def build_cases() -> list[dict]:
    named: list[tuple[str, list[str], float, float]] = [
        ("canonical_3_2", ["plan-9.4", "plan-15.3", "irrational-exact"], 3, 2),
        ("pythagorean_3_4", ["exact-integer"], 3, 4),
        ("diagonal_1_1", ["exact-irrational"], 1, 1),
        ("zero", ["zero-vector", "plan-15.4"], 0, 0),
        ("negative_zero_both", ["zero-vector", "negative-zero"], -0.0, -0.0),
        ("negative_zero_x", ["zero-vector", "negative-zero"], -0.0, 0),
        ("axis_pos_x", ["axis"], 5, 0),
        ("axis_pos_y", ["axis"], 0, 5),
        ("axis_neg_x", ["axis", "branch-cut"], -5, 0),
        ("axis_neg_y", ["axis"], 0, -5),
        ("branch_cut_negative_zero_y", ["axis", "branch-cut", "negative-zero"], -1, -0.0),
        ("quadrant_1", ["quadrant"], 3, 2),
        ("quadrant_2", ["quadrant"], -3, 2),
        ("quadrant_3", ["quadrant"], -3, -2),
        ("quadrant_4", ["quadrant"], 3, -2),
        ("exact_2_2", ["exact-irrational"], 2, 2),
        ("exact_4_4", ["exact-irrational"], 4, 4),
        ("exact_1_2", ["exact-irrational"], 1, 2),
        ("exact_3_6", ["exact-irrational"], 3, 6),
        ("exact_7_1", ["exact-irrational"], 7, 1),
        ("exact_12_16", ["exact-integer"], 12, 16),
        ("exact_6_0", ["exact-integer", "axis"], 6, 0),
        ("exact_999999_0", ["exact-integer", "large"], 999999, 0),
        ("exact_limit_exceeded", ["exact-not-attempted", "large"], 1000000, 1000000),
        ("decimal_half_half", ["numeric-only"], 0.5, 0.5),
        ("decimal_2_5_6", ["numeric-only"], 2.5, 6),
        ("decimal_0_1_0_2", ["numeric-only"], 0.1, 0.2),
        ("decimal_neg_2_3_1_1", ["numeric-only"], -2.3, 1.1),
        ("tiny_1e-200", ["tiny", "underflow-in-square"], 1e-200, 1e-200),
        ("tiny_asymmetric", ["tiny", "underflow-in-square"], 1e-160, 3e-160),
        ("tiny_subnormal", ["tiny", "subnormal"], 5e-324, 5e-324),
        ("large_1e154", ["large"], 1e154, 1e154),
        ("large_square_overflows", ["large", "overflow-in-square"], 1.5e154, 1.5e154),
        ("large_1e200", ["large", "overflow-in-square"], 1e200, 1e200),
        ("large_max_axis", ["large", "axis"], 1.7976931348623157e308, 0),
        ("large_magnitude_overflows", ["large", "overflow-in-magnitude"], 1.7976931348623157e308, 1.7976931348623157e308),
    ]
    cases = [{"id": cid, "tags": tags, "input": {"x": x, "y": y}} for cid, tags, x, y in named]
    for x in range(-3, 4):
        for y in range(-3, 4):
            cases.append({"id": f"grid_{x}_{y}", "tags": ["grid"], "input": {"x": x, "y": y}})
    rng = Splitmix64(20261010)
    for i in range(100):
        cases.append({"id": f"random_int_{i:03d}", "tags": ["random", "integer"], "input": {"x": rng.randint(-12, 12), "y": rng.randint(-12, 12)}})
    for i in range(100):
        cases.append({"id": f"random_dec_{i:03d}", "tags": ["random", "decimal"], "input": {"x": rng.randint(-60, 60) / 10, "y": rng.randint(-60, 60) / 10}})
    return cases


def build_fixture() -> dict:
    cases = []
    for case in build_cases():
        x, y = case["input"]["x"], case["input"]["y"]
        cases.append({**case, "expected": evaluate(x, y)})
    return {
        "schema": SCHEMA,
        "generatedBy": "oracle/vector2_oracle.py",
        "conventions": {
            "coordinates": "+x right, +y up",
            "angle": "radians in (-pi, pi]; the zero vector has no direction (null)",
            "negativeZero": "-0 components are canonicalised to +0 before evaluation",
            "exact": "||v|| = coefficient * sqrt(radicand), radicand square-free; integer components only",
        },
        "exactRadicandLimit": str(EXACT_LIMIT),
        "tolerance": {
            "unit": "ulps of the expected value (math.ulp); the smallest subnormal spacing is used at 0",
            "magnitude": 4,
            "magnitudeSquared": 4,
            "directionRadians": 4,
            "directionDegrees": 8,
            "rationale": "Math.hypot, Math.atan2 and libm need not be correctly rounded and may differ in the last bits; "
                         "x*x + y*y rounds up to three times. Observed maxima against this oracle on Node 24 / V8: "
                         "magnitude 2, magnitudeSquared 1, directionRadians 1, directionDegrees 3 ulps; the tolerances leave headroom "
                         "for other engines yet stay ~1e-15 relative. These are test tolerances, not mathematical equalities (plan §10.4). "
                         "Exact forms and zero/undefined policies must match EXACTLY.",
        },
        "cases": cases,
    }


def render(fixture: dict) -> str:
    return json.dumps(fixture, indent=1, ensure_ascii=False) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/vector2.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        # Keep the fixture LF on every platform (Windows text mode would write CRLF).
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes; NumPy cross-check: {'on' if np else 'off'})")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/vector2.fixtures.json is stale or missing: run `python oracle/vector2_oracle.py --write`", file=sys.stderr)
        return 1
    print(f"fixture is fresh (NumPy cross-check: {'on' if np else 'off'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
