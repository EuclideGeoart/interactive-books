"""Independent oracle for indexed sums and sigma notation (chapter I.8; master plan §4 I.8, §9.4, §12.3).

Deliberately NOT a transliteration of ``src/math/summation/*.ts``. The TypeScript carries BigInt fractions and builds a step-by-step trace.
This oracle uses different machinery:

  terms        the Python EXPRESSION for each term is actually evaluated (``eval``), so a division by zero, a list index past the end
               and a negative index are what Python itself does, not what a model says Python does
  sums         the built-in ``sum`` over ``range(m, n + 1)`` with ``fractions.Fraction``; partial sums by ``itertools.accumulate``
  closed forms the polynomial sequences via FAULHABER'S formula with Bernoulli numbers (a different route from the n(n+1)/2-style formulas
               the model uses), the alternating sequence by parity, the geometric sequence by telescoping (checked:
               (1 - r) * loop == r**m - r**(n + 1)), and r = 1 separately
  Gauss        ``zip`` of the term list with its reverse
  nested sums  the cells as a set, ordered by ``sorted`` with a key (no hand-written swapped loop bounds), summed with ``accumulate``
  loop forms   the five loops are WRITTEN AS PYTHON and executed with ``exec``, catching the real exceptions

Fixtures: ``fixtures/summation.fixtures.json`` (inputs AND expected values) consumed by ``tests/unit/summation.parity.test.ts``.

    python oracle/summation_oracle.py --write     regenerate the fixture
    python oracle/summation_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import itertools
import json
import random
import sys
from fractions import Fraction
from math import comb
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "summation.fixtures.json"
SCHEMA = "book2.summation.fixtures/1"

BOUND_MIN, BOUND_MAX = -5, 20


def fstr(x: Fraction) -> str:
    return f"{x.numerator}/{x.denominator}"


def frac(text) -> Fraction:
    return Fraction(str(text))


# ------------------------------------------------------------------------------------------------ the terms, as Python expressions
# `i` is the index, `r` the ratio, `a` the learner's zero-based list holding a_1, ..., a_len (so a[i - 1] is a_i).
EXPRESSIONS = {
    "identity": "Fraction(i)",
    "square": "Fraction(i) ** 2",
    "odd": "Fraction(2 * i - 1)",
    "reciprocal": "Fraction(1, i)",
    "alternating": "Fraction((-1) ** i)" ,
    "constant": "Fraction(3)",
    "pronic": "Fraction(i * (i + 1))",
    "geometric": "r ** i",
    "list": "a[i - 1]",
}
# The text the page shows for each expression (what SEQ_INFO.python must say).
PAGE_EXPRESSIONS = {
    "identity": "i", "square": "i ** 2", "odd": "2 * i - 1", "reciprocal": "Fraction(1, i)", "alternating": "(-1) ** i",
    "constant": "3", "pronic": "i * (i + 1)", "geometric": "r ** i", "list": "a[i - 1]",
}
FIXED = ["identity", "square", "odd", "reciprocal", "alternating", "constant", "pronic"]


def evaluate(seq: str, i: int, r: Fraction = Fraction(1, 2), a: list | None = None):
    """a_i by actually running the Python expression. Returns (value, None) or (None, name of the exception Python raised)."""
    scope = {"Fraction": Fraction, "i": i, "r": r, "a": a if a is not None else []}
    try:
        return eval(EXPRESSIONS[seq], {"__builtins__": {}}, scope), None  # noqa: S307 - fixed, local expressions
    except Exception as error:  # the point is to record WHICH error Python raises
        return None, type(error).__name__


def term_status(seq: str, i: int, r: Fraction, a: list[Fraction]) -> tuple[Fraction | None, str | None]:
    """The MATHEMATICAL term, and what Python does. For the list a_i exists only for 1 <= i <= len; a[i - 1] with i < 1 is a NEGATIVE
    index, which wraps silently (or raises IndexError if it reaches past the front)."""
    value, error = evaluate(seq, i, r, a)
    if seq == "list" and i < 1:
        return None, ("wraps" if error is None else error)
    if seq == "geometric" and i < 0 and r == 0:
        return None, error  # ZeroDivisionError from 0 ** -1
    return value, error


# ------------------------------------------------------------------------------------------------ Faulhaber (closed forms by a different route)
def bernoulli_plus(p: int) -> list[Fraction]:
    """B_0 .. B_p with the convention B_1 = +1/2 (the one that makes sum_{i=1}^{n} i^p = polynomial(n))."""
    b = [Fraction(0)] * (p + 1)
    b[0] = Fraction(1)
    for m in range(1, p + 1):
        b[m] = -sum(comb(m + 1, j) * b[j] for j in range(m)) / (m + 1)
    if p >= 1:
        b[1] = Fraction(1, 2)
    return b


def power_prefix(p: int, n: int) -> Fraction:
    """sum_{i=1}^{n} i**p as a polynomial in n, valid for every integer n (negative n too), by Faulhaber's formula."""
    b = bernoulli_plus(p)
    return sum(comb(p + 1, j) * b[j] * Fraction(n) ** (p + 1 - j) for j in range(p + 1)) / (p + 1)


def prefix(seq: str, k: int) -> Fraction | None:
    """S(k): the closed-form prefix sum, as a polynomial identity valid for ALL integers k."""
    if seq == "identity":
        return power_prefix(1, k)
    if seq == "square":
        return power_prefix(2, k)
    if seq == "odd":
        return 2 * power_prefix(1, k) - power_prefix(0, k)
    if seq == "pronic":
        return power_prefix(2, k) + power_prefix(1, k)
    if seq == "constant":
        return 3 * power_prefix(0, k)
    if seq == "alternating":
        return Fraction(-(k % 2))  # -1 for odd k (Python's % is non-negative for a positive modulus), 0 for even k
    return None


def closed_value(seq: str, r: Fraction, m: int, n: int) -> Fraction | None:
    if n < m - 1:
        return None  # the formula is not claimed for reversed bounds
    if seq == "geometric":
        if r == 1:
            return Fraction(n - m + 1)
        if r == 0 and m < 0:
            return None
        return (r**m - r ** (n + 1)) / (1 - r)
    hi, lo = prefix(seq, n), prefix(seq, m - 1)
    return None if hi is None or lo is None else hi - lo


# ------------------------------------------------------------------------------------------------ sums
def sum_case(seq: str, m: int, n: int, r: Fraction = Fraction(1, 2), a: list[Fraction] | None = None) -> dict:
    a = a if a is not None else []
    terms: list[str | None] = []
    status: list[str | None] = []
    values: list[Fraction] = []
    failure: dict | None = None
    for i in range(m, n + 1):
        value, error = term_status(seq, i, r, a)
        terms.append(None if value is None else fstr(value))
        status.append(error)
        if value is None:
            if failure is None:
                failure = {"i": i, "python": error}
        elif failure is None:
            values.append(value)
    partials = [Fraction(0), *itertools.accumulate(values)]
    total = None if failure else sum(values, Fraction(0))
    closed = closed_value(seq, r, m, n)
    if seq == "geometric" and r != 1 and failure is None and n >= m:
        assert (1 - r) * total == r**m - r ** (n + 1)  # the telescoping identity behind the closed form
    return {
        "seq": seq, "r": fstr(r), "list": [fstr(x) for x in a], "m": m, "n": n,
        "expected": {
            "count": max(0, n - m + 1),
            "empty": n < m,
            "terms": terms,
            "partials": [fstr(x) for x in partials],
            "failure": failure,
            "total": None if total is None else fstr(total),
            "closed": None if closed is None else fstr(closed),
            "closedMatches": None if (total is None or closed is None) else total == closed,
        },
    }


def sum_cases() -> list[dict]:
    ms = [-5, -2, 0, 1, 4, 9]
    ns = [-3, 0, 1, 3, 6, 11, 20]
    cases = []
    for seq in FIXED:
        for m in ms:
            for n in ns:
                cases.append(sum_case(seq, m, n))
        cases.append(sum_case(seq, 3, 2))   # empty
        cases.append(sum_case(seq, 4, 3))   # n = m - 1: empty, and the closed form still agrees
        cases.append(sum_case(seq, -5, 20))  # the widest window (26 terms)
    for r in ["1/2", "2", "-1", "1", "0", "3", "-2/3", "1/3", "5/4", "-1/2"]:
        for m, n in [(0, 4), (1, 5), (-2, 3), (3, 3), (-5, -1), (0, 12), (4, 2), (2, 1), (-3, 6), (0, 0)]:
            cases.append(sum_case("geometric", m, n, frac(r)))
    lists = [["3", "-1", "1/2", "4"], ["5"], ["1", "2", "3", "4", "5", "6", "7", "8"], ["-2", "0", "7/3"]]
    for lst in lists:
        a = [frac(x) for x in lst]
        for m, n in [(1, len(a)), (1, 1), (2, len(a)), (1, len(a) + 1), (0, 2), (-1, 3), (-5, 2), (3, 2), (len(a), len(a)), (len(a) + 1, len(a) + 2)]:
            cases.append(sum_case("list", m, n, a=a))
    return cases


def prefix_cases() -> list[dict]:
    return [{"seq": s, "k": k, "value": fstr(prefix(s, k))} for s in ["identity", "square", "odd", "alternating", "constant", "pronic"] for k in range(-30, 31)]


# ------------------------------------------------------------------------------------------------ Gauss pairing
def gauss_case(seq: str, m: int, n: int) -> dict:
    values = [evaluate(seq, i)[0] for i in range(m, n + 1)]
    half = len(values) // 2
    pairs = list(zip(range(m, m + half), values[:half], range(n, n - half, -1), reversed(values[-half:] if half else [])))
    sums = [fstr(x + y) for (_, x, _, y) in pairs]
    middle = (m + half, values[half]) if len(values) % 2 == 1 else None
    pair_sum = fstr(pairs[0][1] + pairs[0][3]) if pairs else "0/1"
    total = sum(values, Fraction(0))
    return {
        "seq": seq, "m": m, "n": n,
        "expected": {
            "pairs": [[lo, hi, s] for (lo, _, hi, _), s in zip(pairs, sums)],
            "pairSum": pair_sum,
            "allEqual": len(set(sums)) <= 1,
            "middle": None if middle is None else [middle[0], fstr(middle[1])],
            "total": fstr(total),
            "totalByGauss": fstr(len(pairs) * (pairs[0][1] + pairs[0][3]) + (middle[1] if middle else 0)) if pairs else fstr(total),
        },
    }


def gauss_cases() -> list[dict]:
    return [gauss_case(seq, m, n) for seq in ["identity", "odd", "constant"] for m in (-5, -2, 0, 1, 3, 10) for n in (0, 1, 2, 5, 6, 12, 20) if n >= m]


# ------------------------------------------------------------------------------------------------ linearity and shift
def identity_case(m: int, n: int, c: int, k: int) -> dict:
    rng = range(m, n + 1)
    lhs = sum(Fraction(c * i + i * i) for i in rng)
    sum_a = sum(Fraction(i) for i in rng)
    sum_b = sum(Fraction(i * i) for i in rng)
    shifted = sum(Fraction((j - k) ** 2) for j in range(m + k, n + k + 1))
    wrong = sum(Fraction(j * j) for j in range(m + k, n + k + 1))
    return {
        "m": m, "n": n, "c": c, "k": k,
        "expected": {
            "lhs": fstr(lhs), "rhs": fstr(c * sum_a + sum_b), "sumA": fstr(sum_a), "sumB": fstr(sum_b), "linearHolds": lhs == c * sum_a + sum_b,
            "original": fstr(sum_b), "shifted": fstr(shifted), "shiftHolds": shifted == sum_b,
            "wrong": fstr(wrong), "wrongDifference": fstr(wrong - sum_b), "wrongHolds": wrong == sum_b,
        },
    }


def identity_cases() -> list[dict]:
    rng = random.Random(17)
    cases = [identity_case(1, 3, 1, 2), identity_case(-3, -1, 1, 4), identity_case(1, 4, 2, 0), identity_case(3, 2, 0, 0), identity_case(-5, 20, 5, -5)]
    for _ in range(280):
        m = rng.randint(BOUND_MIN, 10)
        n = rng.randint(max(BOUND_MIN, m - 1), min(BOUND_MAX, m + 14))
        cases.append(identity_case(m, n, rng.randint(-5, 5), rng.randint(-5, 5)))
    return cases


# ------------------------------------------------------------------------------------------------ the five loops, written as Python and run
VARIANT_SOURCE = {
    "correct": "acc = 0\nfor i in range(m, n + 1):\n    acc += f(i)\n",
    "stop-excluded": "acc = 0\nfor i in range(m, n):\n    acc += f(i)\n",
    "start-shifted": "acc = 0\nfor i in range(m - 1, n):\n    acc += f(i)\n",
    "list-unshifted": "acc = 0\nfor i in range(m, n + 1):\n    acc += a[i]\n",
    "list-shifted": "acc = 0\nfor i in range(m, n + 1):\n    acc += a[i - 1]\n",
}


def variant_case(seq: str, m: int, n: int) -> dict:
    def f(i: int):
        value, error = evaluate(seq, i)
        if error:
            raise {"ZeroDivisionError": ZeroDivisionError}.get(error, ArithmeticError)(error)
        return value

    a = []
    for i in range(1, n + 1):
        a.append(f(i))  # the zero-based list a = [a_1, ..., a_n]
    out = {}
    for vid, source in VARIANT_SOURCE.items():
        scope = {"f": f, "a": a, "m": m, "n": n, "Fraction": Fraction}
        try:
            exec(compile(source, f"<{vid}>", "exec"), {"__builtins__": {"range": range}}, scope)  # noqa: S102 - fixed, local source
            out[vid] = {"total": fstr(scope["acc"]), "error": None}
        except Exception as error:
            out[vid] = {"total": None, "error": type(error).__name__}
    base = Fraction(out["correct"]["total"])
    for vid, v in out.items():
        v["difference"] = None if v["total"] is None else fstr(Fraction(v["total"]) - base)
    return {"seq": seq, "m": m, "n": n, "expected": {"correct": out["correct"]["total"], "variants": out}}


def variant_cases() -> list[dict]:
    return [variant_case(seq, m, n) for seq in FIXED for m in (1, 2, 5, 12) for n in (1, 3, 5, 8, 12)]


# ------------------------------------------------------------------------------------------------ nested sums
TABLE = [[2, -1, 0, 3, 1], [1, 4, -2, 1, 0], [0, 5, 1, -3, 2], [3, 2, 2, 1, -1], [-2, 0, 4, 1, 1]]


def nested_entry(rule: str, i: int, j: int) -> int:
    return {"product": i * j, "sum": i + j, "table": TABLE[i - 1][j - 1]}[rule]


def nested_case(kind: str, rule: str, order: str, n: int, k: int) -> dict:
    cols = n if kind == "triangular" else k
    cells = {(i, j) for i in range(1, n + 1) for j in range(1, cols + 1) if kind == "rectangular" or j <= i}
    ordered = sorted(cells) if order == "rows-first" else sorted(cells, key=lambda c: (c[1], c[0]))
    values = [nested_entry(rule, i, j) for i, j in ordered]
    partials = [0, *itertools.accumulate(values)]
    row_sums = [sum(nested_entry(rule, i, j) for (ii, j) in cells if ii == i) for i in range(1, n + 1)]
    col_sums = [sum(nested_entry(rule, i, j) for (i, jj) in cells if jj == j) for j in range(1, cols + 1)]
    closed = None
    if kind == "rectangular" and rule == "product":
        closed = sum(range(1, n + 1)) * sum(range(1, cols + 1))
    if kind == "rectangular" and rule == "sum":
        closed = cols * sum(range(1, n + 1)) + n * sum(range(1, cols + 1))
    swap = None
    if kind == "triangular":
        wrong = sum(nested_entry(rule, i, j) for i in range(1, n + 1) for j in range(1, n + 1) if i <= j)  # the cells of the OTHER triangle
        swap = {"cells": sum(1 for i in range(1, n + 1) for j in range(1, n + 1) if i <= j), "total": wrong, "differs": wrong != partials[-1]}
    assert sum(row_sums) == sum(col_sums) == partials[-1] == sum(nested_entry(rule, i, j) for i, j in cells)
    return {
        "kind": kind, "rule": rule, "order": order, "n": n, "k": k,
        "expected": {"cols": cols, "cells": [list(c) for c in ordered], "cellCount": len(cells), "partials": partials, "total": partials[-1], "rowSums": row_sums, "colSums": col_sums, "swapMistake": swap, "closed": closed},
    }


def nested_cases() -> list[dict]:
    return [nested_case(kind, rule, order, n, k) for kind in ("rectangular", "triangular") for rule in ("product", "sum", "table") for order in ("rows-first", "columns-first") for n in range(1, 6) for k in range(1, 6)]


# ------------------------------------------------------------------------------------------------ fixture
def build_fixture() -> dict:
    return {
        "schema": SCHEMA,
        "expressions": PAGE_EXPRESSIONS,
        "sums": sum_cases(),
        "prefix": prefix_cases(),
        "gauss": gauss_cases(),
        "identities": identity_cases(),
        "variants": variant_cases(),
        "nested": nested_cases(),
    }


def render(fixture: dict) -> str:
    """One case per line (compact), so the diff of a regenerated fixture is readable and the file stays small."""
    lines = ["{", f'"schema": {json.dumps(fixture["schema"])},', f'"expressions": {json.dumps(fixture["expressions"], ensure_ascii=False)},']
    keys = [k for k in fixture if k not in ("schema", "expressions")]
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
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/summation.fixtures.json")
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
        print("fixtures/summation.fixtures.json is stale or missing: run `python oracle/summation_oracle.py --write`", file=sys.stderr)
        return 1
    print("summation fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
