"""Independent oracle for I.2: points and coordinates, the distance between two points, the midpoint, and the image-array (row, col) convention.

Deliberately NOT a transliteration of ``src/math/coordinates/*.ts``:

  quadrants   a LOOKUP in a table keyed by the pair of signs ((+,+) -> I, (-,+) -> II, (-,-) -> III, (+,-) -> IV); any zero sign is an axis or the
              origin and is in no quadrant. The TypeScript branches on the signs.
  distances   squared distance as a ``fractions.Fraction`` built from the DECIMAL STRINGS; the root by prime FACTORISATION of numerator and
              denominator (``quantity_oracle.real_root``), not by the TypeScript's rationalise-then-trial-divide. Each distance is also checked
              against ``math.dist`` / ``math.hypot`` on the doubles (to 1e-12), and the distance to an axis is checked as sqrt(y*y) = |y|.
  taxicab     |dx| + |dy|; the identity taxicab^2 = d^2 + 2|dx||dy| is asserted for every case while building the fixture.
  pixels      a labelled array: M[y][x] holds a unique id, the image is the array flipped upside down (``M[::-1]``, what ``np.flipud`` does), and
              (row, col) and the flat index are FOUND by searching for the id. The TypeScript uses the formula row = H - 1 - y.
  midpoints   the average of exact fractions (a midpoint of two 2-decimal numbers can have three decimals; it is exact either way).

Fixture: ``fixtures/coordinates.fixtures.json`` (inputs AND expected values), read by ``tests/unit/coordinates.parity.test.ts``.

    python oracle/coordinates_oracle.py --write     regenerate the fixture
    python oracle/coordinates_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from quantity_oracle import Splitmix64, decimal_text, fraction_from_text, real_root, root_case_expected  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "coordinates.fixtures.json"
SCHEMA = "book2.coordinates.fixtures/1"

F = Fraction


def text_of(q: Fraction) -> str:
    """Exact value as "p/q" (or "p" when an integer)."""
    return str(q)


# ----------------------------------------------------------------------------------------------- points and quadrants
QUADRANT_BY_SIGNS = {(1, 1): "Q1", (-1, 1): "Q2", (-1, -1): "Q3", (1, -1): "Q4"}


def sign(q: Fraction) -> int:
    return (q > 0) - (q < 0)


def position(x: Fraction, y: Fraction) -> str:
    signs = (sign(x), sign(y))
    if signs in QUADRANT_BY_SIGNS:
        return QUADRANT_BY_SIGNS[signs]
    if signs == (0, 0):
        return "origin"
    return "axis-x" if signs[1] == 0 else "axis-y"


def distance_expected(dist_sq: Fraction, float_pair: tuple[float, float]) -> dict:
    """The exact radical of the distance, cross-checked against the doubles."""
    expected = root_case_expected(dist_sq, 2)
    assert expected["kind"] == "exact", dist_sq  # every case here is far inside the factoring guard
    reference = math.hypot(*float_pair)
    assert abs(reference - expected["approx"]) <= 1e-12 * max(1.0, reference), (dist_sq, reference, expected["approx"])
    return expected


def point_expected(x: Fraction, y: Fraction) -> dict:
    d2 = x * x + y * y
    # the distance to the x-axis is the length of the shortest segment to it: sqrt(y*y), which must be |y| exactly
    for coord in (x, y):
        r = real_root(coord * coord, 2)
        assert r["b"] == 1 and F(r["a"], r["c"]) == abs(coord), coord
    return {
        "position": position(x, y),
        "distToYAxis": text_of(abs(x)),
        "distToXAxis": text_of(abs(y)),
        "distSq": text_of(d2),
        "distance": distance_expected(d2, (float(x), float(y))),
    }


# ----------------------------------------------------------------------------------------------- number line
def line_expected(a: Fraction, b: Fraction) -> dict:
    forward = b - a
    via_zero = abs(a) + abs(b)
    assert via_zero >= abs(forward)  # the triangle inequality on the line
    return {
        "forward": text_of(forward),
        "backward": text_of(a - b),
        "distance": text_of(abs(forward)),
        "midpoint": text_of((a + b) / 2),
        "order": "a-left" if a < b else ("a-right" if a > b else "same"),
        "viaZero": text_of(via_zero),
        "viaZeroEqualsDistance": via_zero == abs(forward),
        "sameSide": a * b > 0,
    }


# ----------------------------------------------------------------------------------------------- segments
def segment_expected(ax: Fraction, ay: Fraction, bx: Fraction, by: Fraction) -> dict:
    dx, dy = bx - ax, by - ay
    d2 = dx * dx + dy * dy
    taxicab = abs(dx) + abs(dy)
    # taxicab^2 = d^2 + 2|dx||dy|, exactly; it exceeds the squared distance unless a leg is zero
    assert taxicab * taxicab == d2 + 2 * abs(dx) * abs(dy)
    # the reverse displacement is the negative, the distance is unchanged
    assert (ax - bx, ay - by) == (-dx, -dy)
    kind = "coincident" if dx == 0 and dy == 0 else "horizontal" if dy == 0 else "vertical" if dx == 0 else "oblique"
    dist = distance_expected(d2, (float(bx) - float(ax), float(by) - float(ay)))
    assert math.isclose(math.dist((float(ax), float(ay)), (float(bx), float(by))), dist["approx"], rel_tol=1e-12, abs_tol=1e-12)
    return {
        "dx": text_of(dx), "dy": text_of(dy), "rdx": text_of(-dx), "rdy": text_of(-dy),
        "distSq": text_of(d2),
        "distance": dist,
        "midpoint": [text_of((ax + bx) / 2), text_of((ay + by) / 2)],
        "taxicab": text_of(taxicab),
        "crossTerm": text_of(2 * abs(dx) * abs(dy)),
        "kind": kind,
        "taxicabEqualsDistance": dx == 0 or dy == 0,
    }


# ----------------------------------------------------------------------------------------------- pixels
def pixel_expected(w: int, h: int, x: int, y: int) -> dict:
    """Find (row, col) by LOOKING for the pixel in a labelled array, instead of applying the formula."""
    ids = iter(range(w * h))
    math_array = [[next(ids) for _ in range(w)] for _ in range(h)]  # math_array[y][x]: row y counted from the BOTTOM
    target = math_array[y][x]
    image = math_array[::-1]  # the screen: the same array flipped upside down (np.flipud)
    hits = [(r, c) for r, line in enumerate(image) for c, value in enumerate(line) if value == target]
    assert len(hits) == 1
    (row, col), = hits
    flat = [value for line in image for value in line]
    index = flat.index(target)
    # the off-by-one slip H - y and the swapped img[x, y]: is the (wrong) index at least a legal one?
    naive_row = h - y
    return {
        "row": row, "col": col, "index": index,
        "naiveRow": naive_row, "naiveRowInRange": 0 <= naive_row < h,
        "swappedInRange": x < h and y < w,
    }


# ----------------------------------------------------------------------------------------------- cases
def d(text: str) -> Fraction:
    return fraction_from_text(text)


def random_decimal(rng: Splitmix64, limit_units: int = 700) -> str:
    return decimal_text(rng.randint(-limit_units, limit_units), 2)


def point_cases() -> list[dict]:
    cases: list[dict] = []
    named = [("3", "4"), ("-3", "-4"), ("0", "0"), ("0", "-4"), ("5", "0"), ("-6", "0"), ("0", "7"), ("1", "1"), ("-1", "2"), ("3", "-4"),
             ("0.5", "-1.5"), ("0.1", "0.7"), ("-0.01", "0.01"), ("7", "7"), ("-7", "-7"), ("6", "8"), ("-2", "1"), ("0.01", "0"), ("0", "-0.01"),
             ("2.5", "6"), ("-1.2", "0.9"), ("0.3", "0.4")]
    for x, y in named:
        cases.append({"id": f"named {x},{y}", "tags": ["named"], "input": {"x": x, "y": y}})
    for xi in range(-7, 8):
        for yi in range(-7, 8):
            cases.append({"id": f"grid {xi},{yi}", "tags": ["grid"], "input": {"x": str(xi), "y": str(yi)}})
    rng = Splitmix64(0x1D2C0DE)
    for i in range(150):
        cases.append({"id": f"random {i}", "tags": ["random"], "input": {"x": random_decimal(rng), "y": random_decimal(rng)}})
    for i in range(30):  # points on the axes with a random decimal coordinate
        value = random_decimal(rng)
        cases.append({"id": f"x-axis {i}", "tags": ["axis"], "input": {"x": value, "y": "0"}})
        cases.append({"id": f"y-axis {i}", "tags": ["axis"], "input": {"x": "0", "y": value}})
    return [{**c, "expected": point_expected(d(c["input"]["x"]), d(c["input"]["y"]))} for c in cases]


def line_cases() -> list[dict]:
    cases: list[dict] = []
    for a, b in [("-3", "5"), ("5", "-3"), ("2", "7"), ("7", "2"), ("-6", "-2"), ("4", "4"), ("0", "-4"), ("-4", "0"), ("0", "0"), ("0.5", "-1.5"),
                 ("-0.25", "0.75"), ("1.2", "1.2"), ("-7", "7"), ("3.33", "-6.66")]:
        cases.append({"id": f"named {a},{b}", "tags": ["named"], "input": {"a": a, "b": b}})
    for ai in range(-4, 5):
        for bi in range(-4, 5):
            cases.append({"id": f"grid {ai},{bi}", "tags": ["grid"], "input": {"a": str(ai), "b": str(bi)}})
    rng = Splitmix64(0x11E5)
    for i in range(120):
        cases.append({"id": f"random {i}", "tags": ["random"], "input": {"a": random_decimal(rng), "b": random_decimal(rng)}})
    return [{**c, "expected": line_expected(d(c["input"]["a"]), d(c["input"]["b"]))} for c in cases]


def segment_cases() -> list[dict]:
    cases: list[dict] = []
    named = [("1", "2", "4", "6"), ("4", "6", "1", "2"), ("-2", "1", "4", "-3"), ("-1", "2", "3", "-4"), ("0.5", "-1.5", "-2", "2"), ("0", "0", "3", "4"),
             ("2", "3", "2", "3"), ("1", "1", "1", "6"), ("-4", "2", "3", "2"), ("0.1", "0.7", "0.5", "0.5"), ("-7", "-7", "7", "7"), ("0", "0", "0", "0"),
             ("1.25", "-0.5", "-3.75", "4.5"), ("0.01", "0.01", "0.02", "0.02"), ("-5", "-5", "-5", "5"), ("-3", "-4", "0", "0")]
    for ax, ay, bx, by in named:
        cases.append({"id": f"named ({ax},{ay})-({bx},{by})", "tags": ["named"], "input": {"ax": ax, "ay": ay, "bx": bx, "by": by}})
    rng = Splitmix64(0x5E6)
    for i in range(240):
        ax, ay, bx, by = (random_decimal(rng, 700) for _ in range(4))
        tag = "random"
        if i % 8 == 3:
            bx, tag = ax, "vertical"
        elif i % 8 == 5:
            by, tag = ay, "horizontal"
        elif i % 16 == 7:
            bx, by, tag = ax, ay, "coincident"
        cases.append({"id": f"{tag} {i}", "tags": [tag], "input": {"ax": ax, "ay": ay, "bx": bx, "by": by}})
    return [{**c, "expected": segment_expected(*(d(c["input"][k]) for k in ("ax", "ay", "bx", "by")))} for c in cases]


def pixel_cases() -> list[dict]:
    cases: list[dict] = []
    for w, h in [(2, 2), (3, 2), (2, 3), (4, 3), (3, 4), (5, 5)]:  # exhaustive
        for y in range(h):
            for x in range(w):
                cases.append({"id": f"{w}x{h} ({x},{y})", "tags": ["exhaustive"], "input": {"w": w, "h": h, "x": x, "y": y}})
    for w, h in [(10, 7), (7, 10), (10, 10), (8, 5)]:  # corners and a pseudo-random sample
        rng = Splitmix64(w * 100 + h)
        spots = {(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)} | {(rng.randint(0, w - 1), rng.randint(0, h - 1)) for _ in range(12)}
        for x, y in sorted(spots):
            cases.append({"id": f"{w}x{h} ({x},{y})", "tags": ["sample"], "input": {"w": w, "h": h, "x": x, "y": y}})
    return [{**c, "expected": pixel_expected(**c["input"])} for c in cases]


def build_fixture() -> dict:
    return {
        "schema": SCHEMA,
        "generatedBy": "oracle/coordinates_oracle.py",
        "conventions": {
            "coordinates": "inputs are decimal STRINGS with at most two decimals and are read exactly (never through a float); exact values are written \"p/q\" or \"p\"",
            "quadrants": "Q1 x>0,y>0; Q2 x<0,y>0; Q3 x<0,y<0; Q4 x>0,y<0; a point with a zero coordinate is 'axis-x' (y=0, x!=0), 'axis-y' (x=0, y!=0) or 'origin' and is in NO quadrant",
            "distances": "distToYAxis = |x|, distToXAxis = |y|; distance = sqrt(dx^2+dy^2) as a*b^(1/2)/c with b square-free (gcd(a,c)=1, c>0)",
            "pixels": "img[row, col] with row 0 at the top: col = x, row = H-1-y, index = row*W+col; (x, y) is the lattice point at the centre of the pixel cell",
        },
        "tolerance": {
            "unit": "ulps of the expected double (math.ulp)",
            "approxSqrt": 1,
            "rationale": "Math.sqrt is correctly rounded from the nearest double to the squared distance (<= 1 ulp from the true root). Exact forms, positions, "
                         "differences, midpoints, taxicab values and pixel indices must match EXACTLY.",
        },
        "points": point_cases(),
        "lines": line_cases(),
        "segments": segment_cases(),
        "pixels": pixel_cases(),
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
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/coordinates.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/coordinates.fixtures.json is stale or missing: run `python oracle/coordinates_oracle.py --write`", file=sys.stderr)
        return 1
    print("coordinates fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
