"""Independent oracle for the notation map (chapter I.9; master plan §4 I.9, §9.4, §12.3).

Deliberately NOT a transliteration of ``src/math/notation/*.ts``. The TypeScript computes a flattened position with strides, factors a square
root by prime exponents and keeps a 3-case loss in closed form. This oracle uses different machinery:

  shapes     a real NESTED LIST of the right shape whose entries count 0, 1, 2, ... in reading order (what ``np.arange(...).reshape(...)`` builds);
             the position of an entry is its place in ``itertools.product(range(n), range(d), ...)`` (the definition of row-major order),
             strides are measured as position differences, and what NumPy does with an index is what Python does with a list: ``IndexError`` past
             the end, silent wrap-around for a negative index
  products   the operands are lists of lists of ones and the product is computed by three nested loops, so the "inner dimensions must agree"
             rule is what the loops hit (a ValueError raised by the oracle's own multiply), and every entry of the product equals the inner size
  norms      Fractions with ``abs`` and ``max``; the l2 norm as sqrt(a/b) = sqrt(a*b)/b with the LARGEST square divisor found by scanning
             down from ``math.isqrt`` (a different route from the prime-factor count); doubles by ``math.hypot``
  arg min    a brute-force scan with ``min`` and ``list.index`` (which is what ``np.argmin`` does: the first minimum)
  expectation ``fractions.Fraction`` for the counts, ``sum`` for the expectation and a second route (sum of c*x over the total)
  gradient   the SAME IEEE-754 operations in the same order as the page (a*a + 3*b*b, then (f(a + h) - f(a)) / h); exact derivatives by Fraction

Fixtures: ``fixtures/notation.fixtures.json`` (inputs AND expected values) consumed by ``tests/unit/notation.parity.test.ts``.

    python oracle/notation_oracle.py --write     regenerate the fixture
    python oracle/notation_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import itertools
import json
import math
import random
import sys
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "notation.fixtures.json"
SCHEMA = "book2.notation.fixtures/1"


def fstr(x: Fraction) -> str:
    return f"{x.numerator}/{x.denominator}"


# ---------------------------------------------------------------------------------------------------------------- shapes
def build_nested(shape: tuple[int, ...]):
    """A nested list whose entries are 0, 1, 2, ... in reading order: np.arange(prod(shape)).reshape(shape) as plain lists."""
    counter = itertools.count()

    def make(level: int):
        if level == len(shape):
            return next(counter)
        return [make(level + 1) for _ in range(shape[level])]

    return make(0)


def read_nested(data, idx: tuple[int, ...]):
    """What indexing does: Python's own IndexError past the end, silent wrap-around for a negative index."""
    for i in idx:
        data = data[i]
    return data


def position_of(shape: tuple[int, ...], idx0: tuple[int, ...]) -> int:
    """The place of idx0 in the row-major enumeration of all indices (the definition of the flattened order)."""
    for position, candidate in enumerate(itertools.product(*[range(s) for s in shape])):
        if candidate == idx0:
            return position
    raise ValueError("index not in the shape")


def measured_strides(shape: tuple[int, ...]) -> list[int]:
    """The step each axis takes in the flattened array, measured as a difference of positions (1 for an axis of size 1 has no neighbour: product rule)."""
    out = []
    zero = (0,) * len(shape)
    for m, size in enumerate(shape):
        if size >= 2:
            unit = tuple(1 if k == m else 0 for k in range(len(shape)))
            out.append(position_of(shape, unit) - position_of(shape, zero))
        else:
            out.append(math.prod(shape[m + 1:]))
    return out


def tuple_text(shape: tuple[int, ...]) -> str:
    return str(tuple(shape))


def shape_case(kind: str, n: int, d: int, B: int, T: int, i: int, j: int, k: int) -> dict:
    shape = {"scalar": (), "vector": (d,), "matrix": (n, d), "tensor": (B, T, d)}[kind]
    chosen = {"scalar": (), "vector": (j,), "matrix": (i, j), "tensor": (i, j, k)}[kind]
    idx0 = tuple(v - 1 for v in chosen)
    data = build_nested(shape)
    if any(v >= s for v, s in zip(idx0, shape)):
        outcome = "IndexError"
    elif any(v < 0 for v in idx0):
        outcome = "wraps"
    else:
        outcome = "value"
    valid = all(1 <= v <= s for v, s in zip(chosen, shape))
    expected: dict = {"shape": tuple_text(shape), "count": math.prod(shape), "valid": valid, "outcome": outcome, "strides": measured_strides(shape) if shape else []}
    # what Python itself does with the NumPy-style index (the check that the claim "IndexError / silent wrap" is Python's, not ours)
    try:
        value = read_nested(data, idx0) if shape else None
        python_outcome = "value" if outcome == "value" else "wraps"
    except IndexError:
        value = None
        python_outcome = "IndexError"
    assert python_outcome == outcome, (kind, shape, chosen)
    if valid:
        offset = position_of(shape, idx0) if shape else None
        assert shape == () or value == offset  # the entry at an index holds its own position, as in np.arange
        expected["offset"] = offset
    else:
        expected["offset"] = None
    expected["idx0"] = list(idx0)
    slices: list[list[str]] = []
    if valid and kind == "matrix":
        slices = [["row", tuple_text((len(data[i - 1]),))], ["column", tuple_text((len([r[j - 1] for r in data]),))]]
    if valid and kind == "tensor":
        slab = data[i - 1]
        slices = [["example", tuple_text((len(slab), len(slab[0])))], ["position", tuple_text((len(slab[j - 1]),))]]
    expected["slices"] = slices
    return {"kind": kind, "n": n, "d": d, "B": B, "T": T, "i": i, "j": j, "k": k, "expected": expected}


def build_shapes() -> list[dict]:
    cases = [shape_case("scalar", 1, 1, 1, 1, 1, 1, 1)]
    for d in range(1, 9):
        for j in range(0, d + 2):
            cases.append(shape_case("vector", 1, d, 1, 1, 1, j, 1))
    for n in range(1, 6):
        for d in range(1, 6):
            for i in range(0, n + 2):
                for j in range(0, d + 2):
                    cases.append(shape_case("matrix", n, d, 1, 1, i, j, 1))
    rng = random.Random(9001)
    for B in range(1, 5):
        for T in range(1, 5):
            for d in range(1, 5):
                for _ in range(6):
                    cases.append(shape_case("tensor", 1, d, B, T, rng.randint(0, B + 1), rng.randint(0, T + 1), rng.randint(0, d + 1)))
    # the largest object, every corner
    for i in (1, 8):
        for j in (1, 8):
            for k in (1, 8):
                cases.append(shape_case("tensor", 1, 8, 8, 8, i, j, k))
    return cases


# ---------------------------------------------------------------------------------------------------------------- products
def ones(rows: int, cols: int) -> list[list[int]]:
    return [[1] * cols for _ in range(rows)]


def multiply(A: list[list[int]], Bm: list[list[int]]) -> list[list[int]]:
    """Three nested loops; the shape rule is whatever these loops hit."""
    if len(A[0]) != len(Bm):
        raise ValueError(f"inner dimensions differ: {len(A[0])} and {len(Bm)}")
    out = [[0] * len(Bm[0]) for _ in range(len(A))]
    for r in range(len(A)):
        for c in range(len(Bm[0])):
            for t in range(len(Bm)):
                out[r][c] += A[r][t] * Bm[t][c]
    return out


def transpose(A: list[list[int]]) -> list[list[int]]:
    return [list(col) for col in zip(*A)]


def algebra_case(op: str, n: int, d: int, p: int, q: int) -> dict:
    X = ones(n, d)
    result: list[list[int]] | None
    try:
        if op == "matvec":
            result = multiply(X, ones(p, 1))  # w as a column; the result is a column of n entries
        elif op == "matmul":
            result = multiply(X, ones(p, q))
        elif op == "transpose":
            result = transpose(X)
        else:
            result = multiply(transpose(X), X)
        error = None
    except ValueError as exc:
        result, error = None, str(exc)
    expected: dict = {"valid": result is not None, "reason": error}
    if result is not None:
        rows, cols = len(result), len(result[0])
        shape = (rows,) if op == "matvec" else (rows, cols)
        expected["result"] = list(shape)
        expected["resultTuple"] = tuple_text(shape)
        inner = {"matvec": d, "matmul": d, "transpose": 1, "gram": n}[op]
        expected["entries"] = sorted({v for row in result for v in row}) if op != "transpose" else [1]
        assert op == "transpose" or expected["entries"] == [inner]  # a product of all-ones matrices has the inner dimension in every entry
    else:
        expected["result"] = None
        expected["resultTuple"] = None
        expected["entries"] = []
    return {"op": op, "n": n, "d": d, "p": p, "q": q, "expected": expected}


def build_algebra() -> list[dict]:
    cases = []
    for n, d, p in itertools.product(range(1, 6), repeat=3):
        cases.append(algebra_case("matvec", n, d, p, 1))
    for n, d, p, q in itertools.product(range(1, 5), repeat=4):
        cases.append(algebra_case("matmul", n, d, p, q))
    for n, d in itertools.product(range(1, 9), repeat=2):
        cases.append(algebra_case("transpose", n, d, 1, 1))
        cases.append(algebra_case("gram", n, d, 1, 1))
    return cases


# ---------------------------------------------------------------------------------------------------------------- norms
def decimal_fraction(v: float) -> Fraction:
    return Fraction(str(v))


def radical(r: Fraction) -> tuple[Fraction, int]:
    """sqrt(r) = coef * sqrt(radicand), radicand square-free: sqrt(a/b) = sqrt(a*b)/b, then the LARGEST square divisor of a*b, scanning down from isqrt."""
    if r == 0:
        return Fraction(0), 1
    m = r.numerator * r.denominator
    s = math.isqrt(m)
    while s > 1 and m % (s * s) != 0:
        s -= 1
    return Fraction(s, r.denominator), m // (s * s)


def norms_case(x: list[Fraction]) -> dict:
    absolute = [abs(v) for v in x]
    l1 = sum(absolute, Fraction(0))
    linf = max(absolute)
    sq = sum((v * v for v in x), Fraction(0))
    coef, radicand = radical(sq)
    # the radical really squares back to the sum of squares
    assert coef * coef * radicand == sq
    approx = float(coef) * math.sqrt(radicand)
    hyp = math.hypot(*[float(v) for v in x])
    assert abs(approx - hyp) <= 1e-12 * max(1.0, hyp)
    rational_l2 = radicand == 1
    equalities = []
    if rational_l2 and coef == linf:
        equalities.append("inf=2")
    if rational_l2 and coef == l1:
        equalities.append("2=1")
    if l1 == linf:
        equalities.append("inf=1")
    return {
        "x": [fstr(v) for v in x],
        "expected": {
            "zero": all(v == 0 for v in x), "l1": fstr(l1), "linf": fstr(linf), "l2squared": fstr(sq), "l2coef": fstr(coef), "l2radicand": radicand,
            "l2double": approx, "hypot": hyp,
            "chain": {"infLeL2": linf * linf <= sq, "l2LeL1": sq <= l1 * l1, "l1LeDInf": l1 <= len(x) * linf},
            "equalities": sorted(equalities),
        },
    }


def build_norms() -> list[dict]:
    grid = [Fraction(k, 2) for k in range(-8, 9)]
    cases = [norms_case([a, b]) for a in grid for b in grid]
    rng = random.Random(4242)
    for length in (1, 3, 4, 5):
        for _ in range(40):
            cases.append(norms_case([Fraction(rng.randint(-40, 40), rng.choice([1, 2, 3, 4, 5, 8, 10])) for _ in range(length)]))
    return cases


# ---------------------------------------------------------------------------------------------------------------- arg min
GRID = list(range(-4, 5))


def loss_value(kind: str, c: int, b: int, t: int) -> int:
    if kind == "bowl":
        return (t - c) ** 2 + b
    if kind == "two-wells":
        return ((t - c) ** 2 - 1) ** 2 + b
    return max(abs(t - c) - 1, 0) ** 2 + b


def argmin_case(kind: str, c: int, b: int) -> dict:
    losses = [loss_value(kind, c, b, t) for t in GRID]
    lowest = min(losses)
    minimisers = [t for t, v in zip(GRID, losses) if v == lowest]
    position = losses.index(lowest)
    return {"kind": kind, "c": c, "b": b, "expected": {"losses": losses, "min": lowest, "argmin": minimisers, "npIndex": position, "npTheta": GRID[position]}}


def build_argmin() -> list[dict]:
    return [argmin_case(kind, c, b) for kind in ("bowl", "two-wells", "flat-bottom") for c in range(-3, 4) for b in range(0, 7)]


# ---------------------------------------------------------------------------------------------------------------- expectation
OUTCOMES = {"die": [1, 2, 3, 4, 5, 6], "rating": [0, 1, 2, 3, 4], "payoff": [-1, 0, 2]}


def expect_case(kind: str, counts: list[int]) -> dict:
    values = OUTCOMES[kind]
    total = sum(counts)
    expected: dict = {"values": values, "counts": counts, "total": total}
    if total == 0:
        try:
            Fraction(counts[0], total)
        except ZeroDivisionError:
            expected.update({"defined": False, "error": "ZeroDivisionError", "p": [], "sumP": None, "expectation": None, "weightedMean": None, "modes": [], "isOutcome": None})
        return {"set": kind, "counts": counts, "expected": expected}
    p = [Fraction(c, total) for c in counts]
    e = sum(pi * x for pi, x in zip(p, values))
    mean = Fraction(sum(c * x for c, x in zip(counts, values)), total)
    assert e == mean and sum(p) == 1
    top = max(counts)
    expected.update({
        "defined": True, "error": None, "p": [fstr(x) for x in p], "sumP": fstr(sum(p)), "expectation": fstr(e), "weightedMean": fstr(mean),
        "modes": [x for x, c in zip(values, counts) if c == top], "isOutcome": e in set(values),
    })
    return {"set": kind, "counts": counts, "expected": expected}


def build_expect() -> list[dict]:
    rng = random.Random(777)
    cases = []
    for kind, values in OUTCOMES.items():
        k = len(values)
        cases.append(expect_case(kind, [0] * k))
        cases.append(expect_case(kind, [1] * k))
        for hot in range(k):
            cases.append(expect_case(kind, [99 if m == hot else 0 for m in range(k)]))
            cases.append(expect_case(kind, [1 if m == hot else 0 for m in range(k)]))
        for _ in range(120):
            cases.append(expect_case(kind, [rng.choice([0, 0, 1, 2, 3, 5, 10, 33, 99]) for _ in range(k)]))
    cases.append(expect_case("die", [1, 2, 3, 4, 5, 6]))
    cases.append(expect_case("payoff", [3, 1, 1]))
    return cases


# ---------------------------------------------------------------------------------------------------------------- gradient
STEP_LITERALS = {1: 1e-1, 3: 1e-3, 6: 1e-6, 9: 1e-9, 13: 1e-13}


def gradient_case(t1: float, t2: float, e: int) -> dict:
    a, b = t1, t2
    h = STEP_LITERALS[e]
    f0 = a * a + 3 * b * b
    est1 = ((a + h) * (a + h) + 3 * b * b - f0) / h
    est2 = (a * a + 3 * (b + h) * (b + h) - f0) / h
    fa, fb = Fraction(str(t1)), Fraction(str(t2))
    g1, g2 = 2 * fa, 6 * fb
    return {
        "t1": t1, "t2": t2, "e": e,
        "expected": {
            "f": fstr(fa * fa + 3 * fb * fb), "grad": [fstr(g1), fstr(g2)], "stationary": g1 == 0 and g2 == 0, "h": h,
            "estimate": [est1, est2], "error": [est1 - float(g1), est2 - float(g2)], "shape": "(2,)",
        },
    }


def build_gradient() -> list[dict]:
    grid = [float(k) for k in range(-4, 5)] + [-3.5, -1.5, -0.5, 0.5, 1.5, 3.5]
    cases = [gradient_case(a, b, e) for a in grid[:9] for b in grid[:9] for e in STEP_LITERALS]
    cases += [gradient_case(a, b, e) for a in grid[9:] for b in grid[9:] for e in STEP_LITERALS]
    for a, b in [(0.1, 0.3), (-0.7, 2.25), (3.14, -1.41), (1.25, 0.05)]:
        cases.extend(gradient_case(a, b, e) for e in STEP_LITERALS)
    return cases


# ---------------------------------------------------------------------------------------------------------------- the fixture
def build_fixture() -> dict:
    return {
        "schema": SCHEMA,
        "shapes": build_shapes(),
        "algebra": build_algebra(),
        "norms": build_norms(),
        "argmin": build_argmin(),
        "expect": build_expect(),
        "gradient": build_gradient(),
    }


def render(fixture: dict) -> str:
    """One case per line (compact), so the diff of a regenerated fixture is readable and the file stays small."""
    lines = ["{", f'"schema": {json.dumps(fixture["schema"])},']
    keys = [k for k in fixture if k != "schema"]
    for index, key in enumerate(keys):
        lines.append(f'"{key}": [')
        rows = [json.dumps(case, ensure_ascii=False, separators=(",", ":")) for case in fixture[key]]
        lines.append(",\n".join(rows))
        lines.append("]" + ("," if index < len(keys) - 1 else ""))
    lines.append("}")
    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/notation.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    json.loads(text)  # the hand-assembled layout must still be valid JSON
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/notation.fixtures.json is stale or missing: run `python oracle/notation_oracle.py --write`", file=sys.stderr)
        return 1
    print("notation fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
