"""Independent oracle for sets, intervals, products and relations (chapter I.7; master plan §4 I.7, §9.4, §12.3; REF-1).

Deliberately NOT a transliteration of ``src/math/sets/*.ts``. The TypeScript stores finite sets as bit masks, normalises interval lists by
sorting and merging, and finds relation properties with early-exit loops. This oracle uses different machinery:

  finite sets   Python's built-in ``frozenset`` operators (``|  &  -  ^``) on the actual elements, with the universe as an explicit set
  intervals     an ELEMENTARY-CELL decomposition. The distinct endpoints e1 < … < em of every interval involved cut the line into
                (−∞,e1), {e1}, (e1,e2), {e2}, …, {em}, (em,∞). Membership is constant on each cell, so it is decided at ONE representative
                (the endpoint itself, or the midpoint of an open cell), straight from the raw inequalities. The result of any operation is
                the union of the cells where the Boolean formula is true; maximal runs of consecutive included cells are the pieces.
                No sorting-and-merging of intervals, no case analysis on open/closed endpoints.
  endpoints     ``fractions.Fraction`` built from decimal TEXT (``Fraction('0.1')`` is exactly 1/10; ``Fraction(0.1)`` would be the double
                0.1000000000000000055511151231257827…, which is the pitfall the chapter teaches), written in the fixture as "num/den"
  products      ``itertools.product``
  relations     reflexive / symmetric / antisymmetric / transitive by ``all(...)`` over the full definition (every triple, no early
                witness search); equivalence classes by grouping elements on the frozenset of their related elements; functions by counting

Fixtures: ``fixtures/sets.fixtures.json`` (inputs AND expected values) consumed by ``tests/unit/sets.parity.test.ts``.

    python oracle/sets_oracle.py --write     regenerate the fixture
    python oracle/sets_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import itertools
import json
import random
import sys
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "sets.fixtures.json"
SCHEMA = "book2.sets.fixtures/1"

MINUS = "−"
UNIVERSE = frozenset(range(1, 13))
SIX = frozenset(range(1, 7))


# ------------------------------------------------------------------------------------------------ finite sets
def finite_case(a: frozenset[int], b: frozenset[int]) -> dict:
    union, inter = a | b, a & b
    return {
        "a": sorted(a),
        "b": sorted(b),
        "expected": {
            "union": sorted(union),
            "intersection": sorted(inter),
            "aMinusB": sorted(a - b),
            "bMinusA": sorted(b - a),
            "symmetric": sorted(a ^ b),
            "complementA": sorted(UNIVERSE - a),
            "complementB": sorted(UNIVERSE - b),
            "onlyA": sorted(a - b),
            "both": sorted(inter),
            "onlyB": sorted(b - a),
            "neither": sorted(UNIVERSE - union),
            "subsetAB": a <= b,
            "subsetBA": b <= a,
            "properSubsetAB": a < b,
            "properSubsetBA": b < a,
            "equal": a == b,
            "disjoint": a.isdisjoint(b),
            "witnessAB": min(a - b) if a - b else None,
            "witnessBA": min(b - a) if b - a else None,
            "inclusionExclusion": len(union) == len(a) + len(b) - len(inter),
            "deMorganFirst": (UNIVERSE - union) == (UNIVERSE - a) & (UNIVERSE - b),
            "deMorganSecond": (UNIVERSE - inter) == (UNIVERSE - a) | (UNIVERSE - b),
        },
    }


def finite_cases() -> list[dict]:
    rng = random.Random(7)
    hand = [
        (range(1, 6), range(4, 8)),          # the chapter's canonical state
        ((), ()),                           # both empty
        ((), range(1, 13)),                 # ∅ and the whole universe
        (range(1, 13), range(1, 13)),       # equal, whole universe
        ((2, 3), (1, 2, 3, 4)),             # proper subset
        ((1, 3, 5, 7, 9, 11), (2, 4, 6, 8, 10, 12)),  # disjoint, complementary
        ((5,), (5,)),                       # equal singletons
        ((1, 2, 3), (3, 4)),
    ]
    cases = [finite_case(frozenset(a), frozenset(b)) for a, b in hand]
    for _ in range(60):
        a = frozenset(i for i in range(1, 13) if rng.random() < 0.45)
        b = frozenset(i for i in range(1, 13) if rng.random() < 0.45)
        cases.append(finite_case(a, b))
    return cases


# ------------------------------------------------------------------------------------------------ fractions
def frac(text: str | int) -> Fraction:
    """A rational from decimal TEXT (never from a float)."""
    return Fraction(str(text))


def fstr(x: Fraction) -> str:
    return f"{x.numerator}/{x.denominator}"


def display(x: Fraction) -> str:
    """How the chapter writes an endpoint: an integer, a terminating decimal with at most six places, otherwise p/q."""
    sign = MINUS if x < 0 else ""
    a = abs(x)
    if a.denominator == 1:
        return f"{sign}{a.numerator}"
    if 10**6 % a.denominator == 0:
        digits = a * 10**6
        whole, rest = divmod(int(digits), 10**6)
        tail = str(rest).rjust(6, "0").rstrip("0")
        return f"{sign}{whole}.{tail}" if tail else f"{sign}{whole}"
    return f"{sign}{a.numerator}/{a.denominator}"


# ------------------------------------------------------------------------------------------------ intervals via elementary cells
# A specification is a dict {"lo": Fraction|None, "hi": Fraction|None, "loClosed": bool, "hiClosed": bool}; None is an infinite end.
def raw_member(spec: dict, x: Fraction) -> bool:
    """x ∈ spec, straight from the inequalities (an infinite end never excludes anything)."""
    lo, hi = spec["lo"], spec["hi"]
    above = lo is None or (x >= lo if spec["loClosed"] else x > lo)
    below = hi is None or (x <= hi if spec["hiClosed"] else x < hi)
    return above and below


def cells(endpoints: list[Fraction]):
    """The elementary cells in order, each as (lo, hi, loClosed, hiClosed, representative)."""
    pts = sorted(set(endpoints))
    if not pts:
        yield (None, None, False, False, Fraction(0))
        return
    yield (None, pts[0], False, False, pts[0] - 1)
    for i, e in enumerate(pts):
        yield (e, e, True, True, e)
        if i + 1 < len(pts):
            yield (e, pts[i + 1], False, False, (e + pts[i + 1]) / 2)
    yield (pts[-1], None, False, False, pts[-1] + 1)


def pieces_where(formula, specs: list[dict]) -> list[dict]:
    """The set {x : formula(raw_member(s, x) for s in specs)} as a list of pieces, found cell by cell."""
    ends = [s[k] for s in specs for k in ("lo", "hi") if s[k] is not None]
    run = None
    out: list[dict] = []
    for lo, hi, lc, hc, rep in cells(ends):
        inside = formula(*[raw_member(s, rep) for s in specs])
        if inside:
            if run is None:
                run = {"lo": lo, "loClosed": lc if lo is not None else False}
            run["hi"] = hi
            run["hiClosed"] = hc if hi is not None else False
        elif run is not None:
            out.append(run)
            run = None
    if run is not None:
        out.append(run)
    return out


def encode_piece(p: dict) -> dict:
    return {"lo": None if p["lo"] is None else fstr(p["lo"]), "hi": None if p["hi"] is None else fstr(p["hi"]), "loClosed": p["loClosed"], "hiClosed": p["hiClosed"]}


def encode_spec(s: dict) -> dict:
    return encode_piece(s)


def piece_text(p: dict) -> str:
    lo, hi = p["lo"], p["hi"]
    if lo is None and hi is None:
        return "ℝ"
    if lo is not None and hi is not None and lo == hi:
        return "{" + display(lo) + "}"
    left = "[" if p["loClosed"] else "("
    right = "]" if p["hiClosed"] else ")"
    return f"{left}{'−∞' if lo is None else display(lo)}, {'∞' if hi is None else display(hi)}{right}"


def set_text(pieces: list[dict]) -> str:
    return "∅" if not pieces else " ∪ ".join(piece_text(p) for p in pieces)


def spec(lo, hi, lc: bool, hc: bool) -> dict:
    return {"lo": None if lo is None else frac(lo), "hi": None if hi is None else frac(hi), "loClosed": lc, "hiClosed": hc}


OPS = {
    "union": lambda a, b: a or b,
    "intersection": lambda a, b: a and b,
    "a-minus-b": lambda a, b: a and not b,
    "complement-a": lambda a, b: not a,
}


def interval_case(name: str, a: dict, b: dict) -> dict:
    expected = {}
    for op, formula in OPS.items():
        pieces = pieces_where(formula, [a, b])
        expected[op] = {"pieces": [encode_piece(p) for p in pieces], "text": set_text(pieces)}
    # The set denoted by each specification on its own (empty when the ends are reversed or the same number is excluded).
    own = {key: pieces_where(lambda m: m, [s]) for key, s in (("a", a), ("b", b))}
    expected["a"] = {"pieces": [encode_piece(p) for p in own["a"]], "text": set_text(own["a"])}
    expected["b"] = {"pieces": [encode_piece(p) for p in own["b"]], "text": set_text(own["b"])}
    expected["complement-b"] = (lambda pc: {"pieces": [encode_piece(p) for p in pc], "text": set_text(pc)})(pieces_where(lambda m: not m, [b]))
    expected["emptyA"] = not own["a"]
    expected["emptyB"] = not own["b"]
    return {"id": name, "a": encode_spec(a), "b": encode_spec(b), "expected": expected}


def interval_cases() -> list[dict]:
    cases = [
        # the adjacency table
        interval_case("(0,1) and (1,2)", spec(0, 1, False, False), spec(1, 2, False, False)),
        interval_case("[0,1) and (1,2]", spec(0, 1, True, False), spec(1, 2, False, True)),
        interval_case("[0,1] and (1,2)", spec(0, 1, True, True), spec(1, 2, False, False)),
        interval_case("[0,1) and [1,2]", spec(0, 1, True, False), spec(1, 2, True, True)),
        interval_case("[0,1] and [1,2]", spec(0, 1, True, True), spec(1, 2, True, True)),
        interval_case("(0,1] and [1,2)", spec(0, 1, False, True), spec(1, 2, True, False)),
        # a single point, the rays, the whole line, the empty set
        interval_case("{1} and (0,2)", spec(1, 1, True, True), spec(0, 2, False, False)),
        interval_case("rays", spec(None, 1, False, False), spec(1, None, False, False)),
        interval_case("rays closed at 1", spec(None, 1, False, True), spec(1, None, True, False)),
        interval_case("whole line and a segment", spec(None, None, False, False), spec(-2, 3, True, False)),
        # reversed ends and the excluded point: empty, not rejected
        interval_case("reversed and a segment", spec(3, 1, True, True), spec(0, 5, False, False)),
        interval_case("(1,1] and [1,1]", spec(1, 1, False, True), spec(1, 1, True, True)),
        # decimal endpoints: 0.1 is exactly 1/10, and 0.1 + 0.2 = 0.3 exactly
        interval_case("decimals", spec("0.1", "0.3", True, True), spec("0.2", "0.5", False, True)),
        interval_case("negative decimals", spec("-2.75", "0.05", False, True), spec("-1.5", "2.25", True, False)),
        interval_case("thirds", spec("1/3", "2/3", True, False), spec("0.5", "1", False, True)),
        # nested and identical
        interval_case("nested", spec(0, 10, True, True), spec(2, 3, False, False)),
        interval_case("identical", spec(2, 4, False, True), spec(2, 4, False, True)),
    ]
    rng = random.Random(11)
    ends = [None, "-2", "-1", "-0.5", "0", "0.1", "1/3", "1", "2", "2.5"]
    n = 0
    while n < 80:
        lo, hi = rng.choice(ends), rng.choice(ends)
        lo2, hi2 = rng.choice(ends), rng.choice(ends)
        a = spec(lo, hi, rng.random() < 0.5, rng.random() < 0.5)
        b = spec(lo2, hi2, rng.random() < 0.5, rng.random() < 0.5)
        cases.append(interval_case(f"random {n}", a, b))
        n += 1
    return cases


def membership_cases() -> list[dict]:
    """Points tested against a union of two specifications: member or not, decided from the raw inequalities."""
    out = []
    pairs = [
        (spec(0, 1, False, False), spec(1, 2, False, False)),
        (spec(0, 1, True, True), spec(2, 3, True, False)),
        (spec("0.1", "0.3", True, True), spec(None, "-1", False, True)),
        (spec(1, 1, True, True), spec(5, None, False, False)),
        (spec(3, 1, True, True), spec(0, 0, True, True)),
    ]
    points = ["-3", "-1", "-0.5", "0", "0.1", "0.2", "0.3", "1/3", "0.5", "1", "1.5", "2", "2.5", "3", "5", "100"]
    for i, (a, b) in enumerate(pairs):
        for x in points:
            xv = frac(x)
            out.append({"id": f"pair {i} at {x}", "a": encode_spec(a), "b": encode_spec(b), "x": fstr(xv),
                        "inA": raw_member(a, xv), "inB": raw_member(b, xv), "inUnion": raw_member(a, xv) or raw_member(b, xv),
                        "inIntersection": raw_member(a, xv) and raw_member(b, xv)})
    return out


def float_pitfall() -> dict:
    """0.1 + 0.2 in doubles versus exactly (the chapter's warning about testing closed endpoints with floats)."""
    d = 0.1 + 0.2
    exact = frac("0.1") + frac("0.2")
    return {
        "doubleSum": d,
        "doubleSumEqualsPointThree": d == 0.3,
        "doubleOfPointOneIsExactly": fstr(Fraction(0.1)),
        "exactSum": fstr(exact),
        "exactSumEqualsThreeTenths": exact == frac("0.3"),
        "closedIntervalContainsDoubleSum": 0.3 <= d <= 0.3,
        "closedIntervalContainsExactSum": raw_member(spec("0.3", "0.3", True, True), exact),
    }


# ------------------------------------------------------------------------------------------------ products
def product_case(a: frozenset[int], b: frozenset[int]) -> dict:
    ab = list(itertools.product(sorted(a), sorted(b)))  # (a, b) with a ∈ A, b ∈ B
    ba = list(itertools.product(sorted(b), sorted(a)))  # first coordinate from B
    return {
        "a": sorted(a),
        "b": sorted(b),
        "expected": {
            "count": len(ab),
            "pairs": sorted([list(p) for p in ab]),
            "reversed": sorted([list(p) for p in ba]),
            "commutes": set(ab) == set(ba),
            "theorem": a == b or not a or not b,
            "witnessExists": bool(set(ab) - set(ba)),
        },
    }


def product_cases() -> list[dict]:
    rng = random.Random(31)
    hand = [((1, 2, 3), (3, 4)), ((), (1, 2)), ((), ()), ((1,), (2,)), ((1, 2), (1, 2)), ((1, 2, 3, 4, 5, 6), (1, 2, 3, 4, 5, 6)), ((2,), (2,))]
    cases = [product_case(frozenset(a), frozenset(b)) for a, b in hand]
    for _ in range(40):
        a = frozenset(i for i in range(1, 7) if rng.random() < 0.5)
        b = frozenset(i for i in range(1, 7) if rng.random() < 0.5)
        cases.append(product_case(a, b))
    return cases


# ------------------------------------------------------------------------------------------------ relations
PRESET_RULES = {
    "less": lambda a, b: a < b,
    "at-most": lambda a, b: a <= b,
    "equal": lambda a, b: a == b,
    "divides": lambda a, b: b % a == 0,
    "same-parity": lambda a, b: (a - b) % 2 == 0,
    "empty": lambda a, b: False,
    "all": lambda a, b: True,
}


def relation_case(name: str, n: int, k: int, pairs: set[tuple[int, int]], preset: str | None = None) -> dict:
    A = range(1, n + 1)
    # every preset whose rule gives exactly these pairs (on tiny sets several coincide, e.g. "less" and "empty" on {1})
    matching = [name_ for name_, rule in PRESET_RULES.items() if pairs == {(a, b) for a in range(1, n + 1) for b in range(1, k + 1) if rule(a, b)}]
    exp: dict = {"size": len(pairs), "presets": matching, "pairs": sorted([list(p) for p in pairs])}
    images = {a: sorted(b for b in range(1, k + 1) if (a, b) in pairs) for a in A}
    exp["isFunction"] = all(len(v) == 1 for v in images.values())
    bad = [a for a in A if len(images[a]) != 1]
    exp["functionFailure"] = None if not bad else {"a": bad[0], "kind": "none" if not images[bad[0]] else "many", "images": images[bad[0]]}
    if n == k:
        reflexive = all((a, a) in pairs for a in A)
        symmetric = all(((y, x) in pairs) for (x, y) in pairs)
        antisymmetric = all(not ((x, y) in pairs and (y, x) in pairs) or x == y for x in A for y in A)
        transitive = all(((x, z) in pairs) for x in A for y in A for z in A if (x, y) in pairs and (y, z) in pairs)
        equivalence = reflexive and symmetric and transitive
        exp.update({"reflexive": reflexive, "symmetric": symmetric, "antisymmetric": antisymmetric, "transitive": transitive, "equivalence": equivalence})
        if equivalence:
            groups: dict[frozenset[int], list[int]] = {}
            for a in A:
                groups.setdefault(frozenset(b for b in A if (a, b) in pairs), []).append(a)
            exp["classes"] = sorted(groups.values())
        else:
            exp["classes"] = None
    else:
        exp.update({"reflexive": None, "symmetric": None, "antisymmetric": None, "transitive": None, "equivalence": None, "classes": None})
    return {"id": name, "n": n, "k": k, "pairs": sorted([list(p) for p in pairs]), "expected": exp}


def relation_cases() -> list[dict]:
    cases = []
    for preset, rule in PRESET_RULES.items():
        for n in range(1, 7):
            pairs = {(a, b) for a in range(1, n + 1) for b in range(1, n + 1) if rule(a, b)}
            cases.append(relation_case(f"{preset} on {n}", n, n, pairs))
    rng = random.Random(41)
    for i in range(70):
        n = rng.randint(1, 6)
        k = n if rng.random() < 0.7 else rng.randint(1, 6)
        density = rng.choice([0.15, 0.3, 0.5, 0.8])
        pairs = {(a, b) for a in range(1, n + 1) for b in range(1, k + 1) if rng.random() < density}
        # random relations are rarely equivalences; build some on purpose from a partition
        if i % 5 == 0 and n == k:
            cut = [rng.randint(0, 2) for _ in range(n)]
            pairs = {(a, b) for a in range(1, n + 1) for b in range(1, n + 1) if cut[a - 1] == cut[b - 1]}
        cases.append(relation_case(f"random {i}", n, k, pairs))
    return cases


# ------------------------------------------------------------------------------------------------ fixture
def build_fixture() -> dict:
    return {
        "schema": SCHEMA,
        "universe": sorted(UNIVERSE),
        "finite": finite_cases(),
        "intervals": interval_cases(),
        "membership": membership_cases(),
        "floatPitfall": float_pitfall(),
        "products": product_cases(),
        "relations": relation_cases(),
    }


def render(fixture: dict) -> str:
    return json.dumps(fixture, indent=1, ensure_ascii=False) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/sets.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/sets.fixtures.json is stale or missing: run `python oracle/sets_oracle.py --write`", file=sys.stderr)
        return 1
    print("sets fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
