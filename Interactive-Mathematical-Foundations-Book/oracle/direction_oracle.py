"""Independent oracle for direction (naive atan versus atan2) and for point/displacement arithmetic
(master plan §9.3, §9.4, §12.3; REF-1).

Deliberately NOT a transliteration of ``src/math/vector2/direction.ts`` / ``placement.ts``:

  location     classified with ``cmath.phase`` and the signs of the components (the TypeScript uses an if-chain)
  naive angle  ``math.atan`` of the EXACT rational y/x (``fractions.Fraction``) rounded once to a double
  correction   found NUMERICALLY, as ``round((atan2 − atan)/π)`` — the TypeScript decides it from the signs of x and y.
               Both must agree, and the assertion below checks the numeric one against an independent sign rule
  placement    exact decimal arithmetic (``decimal.Decimal`` on each double's shortest repr), not floating point

Fixtures: ``fixtures/vector2-direction.fixtures.json`` (inputs AND expected values) consumed by the TypeScript tests.

    python oracle/direction_oracle.py --write     regenerate the fixture
    python oracle/direction_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import cmath
import json
import math
import sys
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "vector2-direction.fixtures.json"
SCHEMA = "book2.vector2.direction.fixtures/1"
DECIMALS = 9  # must equal DECIMALS in src/math/vector2/placement.ts


def location(x: float, y: float) -> str:
    """'origin', a quadrant 'I'..'IV', or an axis '+x' '−x' '+y' '−y' (U+2212 as in the TypeScript)."""
    if x == 0 and y == 0:
        return "origin"
    if y == 0:
        return "+x" if x > 0 else "−x"
    if x == 0:
        return "+y" if y > 0 else "−y"
    # a sign table (the TypeScript uses an if-chain; the angle itself is checked separately)
    return {(1, 1): "I", (-1, 1): "II", (-1, -1): "III", (1, -1): "IV"}[(int(math.copysign(1, x)), int(math.copysign(1, y)))]


def ratio_exact(x: float, y: float) -> float | None:
    """y/x — the exact rational, rounded once. ``None`` when x = 0 (undefined). ±inf if the quotient overflows a double."""
    if x == 0:
        return None
    q = Fraction(y) / Fraction(x)
    try:
        r = float(q)
    except OverflowError:
        r = math.inf if q > 0 else -math.inf
    return r + 0.0


def evaluate_direction(x: float, y: float) -> dict:
    x, y = x + 0.0, y + 0.0  # −0.0 → +0.0
    loc = location(x, y)
    expected: dict = {"location": loc, "mirror": {"x": -x + 0.0, "y": -y + 0.0}}
    theta = None if loc == "origin" else math.atan2(y, x)
    expected["atan2Radians"] = theta
    if theta is not None:
        # the angle must point at (x, y): same sign pattern and the same slope
        assert math.copysign(1, math.cos(theta)) == math.copysign(1, x) or x == 0 or abs(math.cos(theta)) < 1e-300, (x, y)
        try:
            assert cmath.phase(complex(x, y)) == theta, ("cmath disagrees", x, y)
        except OverflowError:  # cmath.phase overflows for some extreme components; math.atan2 does not
            pass
    ratio = ratio_exact(x, y)
    # JSON has no Infinity: an overflowing quotient is written as the string "Infinity" / "-Infinity"
    expected["ratio"] = ("Infinity" if ratio > 0 else "-Infinity") if ratio is not None and math.isinf(ratio) else ratio
    if ratio is None:
        expected.update({"naiveRadians": None, "halfTurns": None, "naiveIsCorrect": None})
        return expected
    naive = math.atan(ratio) + 0.0
    expected["naiveRadians"] = naive
    # numeric correction versus the independent sign rule
    k_numeric = round((theta - naive) / math.pi)
    k_rule = 0 if x > 0 else (1 if y >= 0 else -1)
    assert k_numeric == k_rule, ("correction disagrees", x, y, k_numeric, k_rule)
    assert abs(theta - (naive + k_numeric * math.pi)) <= 4 * math.ulp(max(abs(theta), 1e-300)) + 1e-300, ("not atan + k·pi", x, y)
    assert -math.pi / 2 <= naive <= math.pi / 2
    expected["halfTurns"] = k_numeric
    expected["naiveIsCorrect"] = k_numeric == 0
    return expected


def dec(v: float) -> Decimal:
    return Decimal(repr(float(v)))


def evaluate_placement(tx: float, ty: float, vx: float, vy: float) -> dict:
    """Tip = tail + v, and measured v = tip − tail, in exact decimal arithmetic rounded to DECIMALS places."""
    q = Decimal(1).scaleb(-DECIMALS)
    tip = ((dec(tx) + dec(vx)).quantize(q), (dec(ty) + dec(vy)).quantize(q))
    measured = ((tip[0] - dec(tx)).quantize(q), (tip[1] - dec(ty)).quantize(q))
    return {
        "tip": {"x": float(tip[0]) + 0.0, "y": float(tip[1]) + 0.0},
        "measured": {"x": float(measured[0]) + 0.0, "y": float(measured[1]) + 0.0},
    }


class Splitmix64:
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


def direction_cases() -> list[dict]:
    named = [
        ("canonical_3_2", ["plan-15.3", "quadrant"], 3, 2),
        ("quadrant_2", ["quadrant"], -3, 2),
        ("quadrant_3", ["quadrant"], -3, -2),
        ("quadrant_4", ["quadrant"], 3, -2),
        ("zero", ["zero-vector"], 0, 0),
        ("negative_zero_both", ["zero-vector", "negative-zero"], -0.0, -0.0),
        ("axis_pos_x", ["axis"], 5, 0),
        ("axis_neg_x", ["axis", "branch-cut"], -5, 0),
        ("axis_neg_x_negative_zero_y", ["axis", "branch-cut", "negative-zero"], -5, -0.0),
        ("axis_pos_y", ["axis", "ratio-undefined"], 0, 5),
        ("axis_neg_y", ["axis", "ratio-undefined"], 0, -5),
        ("axis_pos_y_negative_zero_x", ["axis", "ratio-undefined", "negative-zero"], -0.0, 5),
        ("tiny_equal", ["tiny"], 1e-200, 1e-200),
        ("tiny_third_quadrant", ["tiny"], -1e-200, -1e-200),
        ("tiny_x_small_ratio_huge", ["tiny", "ratio-overflows"], 1e-300, 1e300),
        ("large_equal", ["large"], 1e200, 1e200),
        ("large_second_quadrant", ["large"], -1e200, 1e200),
        ("ratio_underflows", ["ratio-underflows"], 1e300, 1e-300),
    ]
    cases = [{"id": cid, "tags": tags, "input": {"x": x, "y": y}} for cid, tags, x, y in named]
    for x in range(-4, 5):
        for y in range(-4, 5):
            cases.append({"id": f"grid_{x}_{y}", "tags": ["grid"], "input": {"x": x, "y": y}})
    rng = Splitmix64(20261011)
    for i in range(100):
        cases.append({"id": f"random_dec_{i:03d}", "tags": ["random", "decimal"], "input": {"x": rng.randint(-60, 60) / 10, "y": rng.randint(-60, 60) / 10}})
    return cases


def placement_cases() -> list[dict]:
    named = [
        ("canonical_origin_tail", [], 0, 0, 3, 2),
        ("shifted_tail", [], 1, -1, 3, 2),
        ("negative_tail", [], -2, -1, 3, 2),
        ("decimal_2_3_plus_0_1", ["decimal"], 2.3, 0, 0.1, 0),
        ("decimal_0_1_plus_0_2", ["decimal"], 0.1, 0.2, 0.2, 0.1),
        ("negative_zero_result", ["negative-zero"], -3, 2, 3, -2),
        ("zero_vector", ["zero-vector"], 4, -4, 0, 0),
    ]
    cases = [{"id": cid, "tags": tags, "input": {"tx": tx, "ty": ty, "vx": vx, "vy": vy}} for cid, tags, tx, ty, vx, vy in named]
    rng = Splitmix64(20261012)
    for i in range(100):
        cases.append({"id": f"random_{i:03d}", "tags": ["random"], "input": {
            "tx": rng.randint(-40, 40) / 10, "ty": rng.randint(-40, 40) / 10, "vx": rng.randint(-40, 40) / 10, "vy": rng.randint(-40, 40) / 10}})
    return cases


def build_fixture() -> dict:
    return {
        "schema": SCHEMA,
        "generatedBy": "oracle/direction_oracle.py",
        "conventions": {
            "ratio": "y/x as one correctly rounded division; null when x = 0 (undefined, not +-Infinity)",
            "naive": "atan(y/x) in (-pi/2, pi/2); null when the ratio is undefined",
            "halfTurns": "atan2 = atan + halfTurns*pi with halfTurns in {-1, 0, 1}; x>0: 0, x<0 and y>=0: +1, x<0 and y<0: -1; null when x = 0",
            "location": "origin | I | II | III | IV | +x | −x | +y | −y",
            "placement": f"tip = tail + v and measured = tip - tail in exact decimal arithmetic rounded to {DECIMALS} places",
        },
        "tolerance": {
            "unit": "ulps of the expected value (math.ulp)",
            "ratio": 0,
            "naiveRadians": 4,
            "atan2Radians": 4,
            "placement": 0,
            "rationale": "y/x is one correctly rounded division in both languages (0 ulps). Math.atan and Math.atan2 need not be correctly "
                         "rounded; the tolerance leaves headroom for other engines. Locations, halfTurns, null/undefined policies and "
                         "placement sums must match EXACTLY.",
        },
        "direction": [{**c, "expected": evaluate_direction(c["input"]["x"], c["input"]["y"])} for c in direction_cases()],
        "placement": [{**c, "expected": evaluate_placement(**c["input"])} for c in placement_cases()],
    }


def render(fixture: dict) -> str:
    return json.dumps(fixture, indent=1, ensure_ascii=False) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/vector2-direction.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/vector2-direction.fixtures.json is stale or missing: run `python oracle/direction_oracle.py --write`", file=sys.stderr)
        return 1
    print("direction fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
