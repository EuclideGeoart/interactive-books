"""Independent oracle for I.5: functions as input -> transformation -> output, domains, images, preimages, composition and inverses.

Deliberately NOT a transliteration of ``src/math/functions/*.ts``:

  machines       a rule is a Python FUNCTION of x written the way a reader writes it (``lambda x: (x - a) ** 2``). Where the function is not defined
                 the Python operation raises (``ZeroDivisionError``, ``ValueError``). The TypeScript instead keeps a list of operations and refuses
                 an input at the operation that cannot accept it.
  values         a tiny ``Surd`` class (u + v*sqrt(b), b square-free by TRIAL DIVISION here, not by the TypeScript's factor loop). Every result is
                 cross-checked against the same lambda evaluated in 60-digit ``Decimal`` arithmetic; a disagreement beyond 1e-50 aborts the build.
  domains        found BY LOOKING: the function is evaluated on a grid of eighths in [-12, 12] and the pattern of "defined / raises" is read off
                 (everything, a ray, or everything but one point). The edge of a ray is located by bisection between a point where the function
                 raises and one where it does not, and whether the edge itself belongs is decided by evaluating there. The TypeScript instead
                 pulls the allowed set back through the operations (a backward computation with no sampling).
  preimages      found BY SCANNING: f(x) - h is evaluated on a grid of eighths in [-40, 40]; exact zeros are roots, a sign change between two
                 neighbouring defined points brackets a root (refined by bisection), and intervals touching a point where f raises are skipped
                 (so a pole is never mistaken for a root). The TypeScript solves each rule algebraically.
  images         a rule's image is the set of h that have a preimage; the fixture records the preimage count for 19 values of h per rule, and
                 "injective" / "onto" are the claims "never more than one" / "always at least one" on that table.
  composition    f o g is literally ``lambda x: f(g(x))`` and the Python exception decides where it is undefined.

Fixture: ``fixtures/functions.fixtures.json`` (inputs AND expected values), read by ``tests/unit/functions.parity.test.ts``.

    python oracle/functions_oracle.py --write     regenerate the fixture
    python oracle/functions_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path

getcontext().prec = 60

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "functions.fixtures.json"
SCHEMA = "book2.functions.fixtures/1"
F = Fraction

#: eighths in [-12, 12]: contains every multiple of 1/2 an exceptional point can be (a, -a, 1/2, 0)
DOMAIN_GRID = [F(k, 8) for k in range(-96, 97)]
#: eighths in [-40, 40]
SCAN_GRID = [F(k, 8) for k in range(-320, 321)]
#: 19 heights: -4 ... 4 in halves, and plus/minus a quarter
HEIGHTS = sorted({F(k, 2) for k in range(-8, 9)} | {F(1, 4), F(-1, 4)})
TOLERANCE = 1e-12


# ----------------------------------------------------------------------------------------------- exact values u + v*sqrt(b)
def squarefree_split(n: int) -> tuple[int, int]:
    """n = s*s*b with b square-free, by trial division (n >= 1)."""
    s, b, p = 1, 1, 2
    while p * p <= n:
        e = 0
        while n % p == 0:
            n //= p
            e += 1
        s *= p ** (e // 2)
        b *= p ** (e % 2)
        p += 1
    return s, b * n


class NotAttempted(Exception):
    """The square root of a number that already contains a radical: the exact form is not attempted, a decimal is."""


class Surd:
    """u + v*sqrt(b) with Fraction u, v and b a square-free integer; b = 1 means v = 0 and the number is rational."""

    __slots__ = ("u", "v", "b")

    def __init__(self, u, v=0, b=1):
        u, v = F(u), F(v)
        if b == 1 or v == 0:
            u, v, b = (u + v if b == 1 else u), F(0), 1
        self.u, self.v, self.b = u, v, b

    # arithmetic -------------------------------------------------------------------------
    def _coerce(self, other):
        if isinstance(other, Surd):
            return other
        if isinstance(other, (int, Fraction)):
            return Surd(other)
        return NotImplemented

    def __add__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        assert self.b == o.b or self.v == 0 or o.v == 0, "two different radicals never meet in this chapter"
        return Surd(self.u + o.u, self.v + o.v, self.b if self.v != 0 else o.b)

    __radd__ = __add__

    def __neg__(self):
        return Surd(-self.u, -self.v, self.b)

    def __sub__(self, other):
        o = self._coerce(other)
        return o if o is NotImplemented else self + (-o)

    def __rsub__(self, other):
        o = self._coerce(other)
        return o if o is NotImplemented else o + (-self)

    def __mul__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        b = self.b if self.v != 0 else o.b
        assert self.b == o.b or self.v == 0 or o.v == 0
        return Surd(self.u * o.u + self.v * o.v * b, self.u * o.v + self.v * o.u, b)

    __rmul__ = __mul__

    def __pow__(self, k: int):
        assert isinstance(k, int) and k >= 0
        out = Surd(1)
        for _ in range(k):
            out = out * self
        return out

    def __truediv__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        if o.sign() == 0:
            raise ZeroDivisionError("division by zero")
        # multiply by the conjugate: 1/(p + q sqrt b) = (p - q sqrt b)/(p^2 - q^2 b)
        norm = o.u * o.u - o.v * o.v * o.b
        inverse = Surd(o.u / norm, -o.v / norm, o.b)
        return self * inverse

    def __rtruediv__(self, other):
        o = self._coerce(other)
        return o if o is NotImplemented else o / self

    # sign and value ---------------------------------------------------------------------
    def dec(self) -> Decimal:
        return Decimal(self.u.numerator) / Decimal(self.u.denominator) + Decimal(self.v.numerator) / Decimal(self.v.denominator) * Decimal(self.b).sqrt()

    def sign(self) -> int:
        if self.v == 0:
            return (self.u > 0) - (self.u < 0)
        d = self.dec()  # a non-zero surd is never within 1e-50 of 0 for the sizes in this chapter
        assert abs(d) > Decimal("1e-40")
        return 1 if d > 0 else -1

    def __abs__(self):
        return -self if self.sign() < 0 else self

    def is_rational(self) -> bool:
        return self.v == 0

    def __eq__(self, other):
        o = self._coerce(other)
        return o is not NotImplemented and (self.u, self.v, self.b) == (o.u, o.v, o.b)

    def __hash__(self):
        return hash((self.u, self.v, self.b))


def sqrt(v: Surd) -> Surd:
    """Square root of a Surd: exact when the number is rational, otherwise ``NotAttempted``. Raises ValueError for a negative number."""
    if v.sign() < 0:
        raise ValueError("square root of a negative number")
    if not v.is_rational():
        raise NotAttempted()
    q = v.u
    if q == 0:
        return Surd(0)
    # sqrt(p/q) = sqrt(p*q) / q  and  p*q = s*s*b with b square-free
    s, b = squarefree_split(q.numerator * q.denominator)
    return Surd(0, F(s, q.denominator), b) if b != 1 else Surd(F(s, q.denominator))


def msqrt(v):
    """sqrt for a Surd (exact path) or a Decimal (60-digit cross-check path)."""
    if isinstance(v, Surd):
        return sqrt(v)
    if v < 0:
        raise ValueError("square root of a negative number")
    return v.sqrt()


def run_exact(f, x: Fraction):
    """Evaluate on the exact type: ('exact', Surd) | ('approx', Decimal) | ('undefined', None)."""
    try:
        return ("exact", f(Surd(x)))
    except (ZeroDivisionError, ValueError):
        return ("undefined", None)
    except NotAttempted:
        # the exact form is not attempted, the decimal is: run the whole function in 60-digit arithmetic
        value = decimal_value(f, x)
        return ("undefined", None) if value is None else ("approx", value)


def decimal_value(f, x: Fraction):
    """The same function on 60-digit decimals (None where it raises). Independent of Surd."""
    try:
        return Decimal(f(Decimal(x.numerator) / Decimal(x.denominator)))
    except (ZeroDivisionError, ValueError, ArithmeticError):
        return None


def text_of(q: Fraction) -> str:
    return str(q)


def encode(result) -> dict:
    kind, value = result
    if kind == "undefined":
        return {"status": "undefined"}
    if kind == "approx":
        return {"status": "approx", "approx": float(value)}
    return {"status": "exact", "u": text_of(value.u), "v": text_of(value.v), "b": value.b, "approx": float(value.dec())}


def checked(f, x: Fraction):
    """Exact result, verified against the decimal evaluation of the same function."""
    result = run_exact(f, x)
    dv = decimal_value(f, x)
    kind, value = result
    if kind == "undefined":
        assert dv is None, f"exact path says undefined but decimal path gives {dv} at {x}"
    else:
        assert dv is not None, f"exact path gives a value but decimal path raises at {x}"
        got = value.dec() if kind == "exact" else value
        assert abs(got - dv) < Decimal("1e-50"), f"exact {got} vs decimal {dv} at {x}"
    return result


# ----------------------------------------------------------------------------------------------- the machines
def rule_function(rule: str, a: int):
    """The rule as the reader writes it. ``a`` stays an int so the same lambda runs on Surd and on Decimal."""
    return {
        "line": lambda x: a * x,
        "stretch": lambda x: a * x ** 2,
        "shift": lambda x: (x - a) ** 2,
        "root": lambda x: msqrt(x + a),
        "pole": lambda x: 1 / (x - a),
        "abs": lambda x: abs(x - a),
    }[rule]


RULES = ("line", "stretch", "shift", "root", "pole", "abs")

FN = {
    "lin": lambda x: 2 * x - 1,
    "sq": lambda x: x ** 2,
    "rt": lambda x: msqrt(x),
    "rec": lambda x: 1 / x,
}
FNS = tuple(FN)


def compose(f: str, g: str):
    return lambda x: FN[f](FN[g](x))


# ----------------------------------------------------------------------------------------------- evaluations
def evaluation_inputs() -> list[Fraction]:
    xs = [F(k) for k in range(-6, 7)]
    xs += [F(-5, 2), F(-3, 2), F(-1, 2), F(1, 2), F(3, 2), F(5, 2), F(1, 4), F(-1, 4), F(137, 100), F(-5, 100), F(-239, 100)]
    return xs


def evaluation_cases() -> list[dict]:
    cases = []
    for rule in RULES:
        for a in range(-5, 6):
            f = rule_function(rule, a)
            for x in evaluation_inputs():
                cases.append({"id": f"{rule}.{a}.{x}", "input": {"rule": rule, "a": a, "x": text_of(x)}, "expected": encode(checked(f, x))})
    return cases


def composition_cases() -> list[dict]:
    cases = []
    xs = [F(k, 2) for k in range(-8, 9)] + [F(1, 4), F(-1, 4), F(3, 100), F(-137, 100)]
    for f in FNS:
        for g in FNS:
            fg, gf = compose(f, g), compose(g, f)
            for x in xs:
                a, b = checked(fg, x), checked(gf, x)
                same = a[0] == "exact" and b[0] == "exact" and a[1] == b[1]
                cases.append({"id": f"{f}.{g}.{x}", "input": {"f": f, "g": g, "x": text_of(x)}, "expected": {"fg": encode(a), "gf": encode(b), "same": same}})
    return cases


# ----------------------------------------------------------------------------------------------- domains by looking
def defined_at(f, x: Fraction) -> bool:
    try:
        f(Surd(x))
        return True
    except (ZeroDivisionError, ValueError):
        return False
    except NotAttempted:
        return decimal_value(f, x) is not None


def describe_domain(f) -> dict:
    flags = [defined_at(f, x) for x in DOMAIN_GRID]
    if all(flags):
        return {"kind": "all"}
    undefined = [x for x, ok in zip(DOMAIN_GRID, flags) if not ok]
    if len(undefined) == 1:
        return {"kind": "except", "point": text_of(undefined[0])}
    first_true = flags.index(True)
    if not any(flags[:first_true]) and all(flags[first_true:]):
        return {"kind": "ray", "side": "above", "bound": _edge(f, DOMAIN_GRID[first_true - 1], DOMAIN_GRID[first_true])}
    raise AssertionError("domain pattern outside the vocabulary of this oracle")


def _edge(f, no: Fraction, yes: Fraction) -> dict:
    """Locate the edge of a ray between a point where f raises and one where it does not; decide by evaluation whether the edge belongs."""
    for _ in range(60):
        mid = (no + yes) / 2
        if defined_at(f, mid):
            yes = mid
        else:
            no = mid
    edge = ((no + yes) / 2).limit_denominator(1000)
    return {"at": text_of(edge), "closed": defined_at(f, edge)}


def domain_cases() -> list[dict]:
    cases = []
    for rule in RULES:
        for a in range(-5, 6):
            cases.append({"id": f"rule.{rule}.{a}", "input": {"rule": rule, "a": a}, "expected": describe_domain(rule_function(rule, a))})
    for f in FNS:
        for g in FNS:
            cases.append({"id": f"pair.{f}.{g}", "input": {"f": f, "g": g}, "expected": describe_domain(compose(f, g))})
    return cases


# ----------------------------------------------------------------------------------------------- preimages by scanning
def scan_values(f) -> list:
    """f on the scan grid: a Surd, or None where f raises. (The rules of the table never leave the exact type.)"""
    out = []
    for x in SCAN_GRID:
        kind, value = run_exact(f, x)
        assert kind != "approx"
        out.append(None if kind == "undefined" else value)
    return out


def preimage_scan(f, values: list, h: Fraction) -> dict:
    """Roots of f(x) = h: exact zeros, and a sign change between two neighbouring defined points brackets a root (refined by bisection).
    Intervals that touch a point where f raises are never examined, so a pole cannot masquerade as a root."""
    roots: list[float] = []
    zeros = 0
    defined = 0
    diffs = [None if v is None else v - h for v in values]
    for i, x in enumerate(SCAN_GRID):
        d = diffs[i]
        if d is None:
            continue
        defined += 1
        if d.sign() == 0:
            zeros += 1
            roots.append(float(x))
        nxt = diffs[i + 1] if i + 1 < len(SCAN_GRID) else None
        if nxt is not None and d.sign() != 0 and nxt.sign() != 0 and d.sign() != nxt.sign():
            lo, hi = x, SCAN_GRID[i + 1]
            slo = d.sign()
            for _ in range(80):
                mid = (lo + hi) / 2
                s_mid = (f(Surd(mid)) - h).sign()
                if s_mid == 0:
                    lo = hi = mid
                    break
                if s_mid == slo:
                    lo = mid
                else:
                    hi = mid
            roots.append(float((lo + hi) / 2))
    if zeros == defined and defined > 0:
        return {"count": "all", "points": []}
    roots.sort()
    return {"count": len(roots), "points": [round(r, 9) for r in roots]}


def preimage_cases() -> list[dict]:
    cases = []
    for rule in RULES:
        for a in range(-5, 6):
            f = rule_function(rule, a)
            values = scan_values(f)
            for h in HEIGHTS:
                cases.append({"id": f"{rule}.{a}.{h}", "input": {"rule": rule, "a": a, "h": text_of(h)}, "expected": preimage_scan(f, values, h)})
    return cases


def property_cases(preimages: list[dict]) -> list[dict]:
    by_rule: dict[tuple[str, int], list] = {}
    for case in preimages:
        inp = case["input"]
        by_rule.setdefault((inp["rule"], inp["a"]), []).append(case["expected"]["count"])
    out = []
    for (rule, a), counts in by_rule.items():
        numeric = [99 if c == "all" else c for c in counts]
        out.append({
            "id": f"{rule}.{a}", "input": {"rule": rule, "a": a},
            "expected": {"injective": max(numeric) <= 1, "onto": min(numeric) >= 1},
        })
    return out


# ----------------------------------------------------------------------------------------------- inverses
def inverse_cases() -> list[dict]:
    """Round trips and twins decided by calling the machine and its inverse, nothing else."""
    inverse = {"lin": lambda y: (y + 1) / 2, "sq": lambda y: msqrt(y), "rt": lambda y: y ** 2, "rec": lambda y: 1 / y}
    cases = []
    for fn in FNS:
        for restrict in (False, True):
            for k in range(-16, 17):
                x = F(k, 4)
                kind, y = checked(FN[fn], x)
                in_domain = kind != "undefined" and not (fn == "sq" and restrict and x < 0)
                has_inverse = fn != "sq" or restrict
                expected = {"inDomain": in_domain, "hasInverse": has_inverse, "roundTrip": False, "twin": None}
                if in_domain and has_inverse:
                    try:
                        back = inverse[fn](y)
                        expected["roundTrip"] = isinstance(back, Surd) and back == Surd(x)
                    except (ZeroDivisionError, ValueError, NotAttempted):
                        expected["roundTrip"] = False
                if fn == "sq" and not restrict and x != 0:
                    expected["twin"] = text_of(-x)
                    assert FN["sq"](Surd(-x)) == y  # the twin really has the same output
                cases.append({"id": f"{fn}.{'r' if restrict else 'u'}.{x}", "input": {"fn": fn, "restrict": restrict, "x": text_of(x)}, "expected": expected})
    return cases


# ----------------------------------------------------------------------------------------------- the fixture
def build_fixture() -> dict:
    preimages = preimage_cases()
    return {
        "schema": SCHEMA,
        "generatedBy": "oracle/functions_oracle.py",
        "conventions": {
            "numbers": "inputs are decimal or p/q STRINGS read exactly; exact values are written \"p/q\" or \"p\"; a value is exact {u, v, b} meaning u + v*sqrt(b), b square-free (b = 1: rational), "
                       "approx (the exact form of a root of a number containing a radical is not attempted) or undefined",
            "rules": "line a*x | stretch a*x^2 | shift (x - a)^2 | root sqrt(x + a) | pole 1/(x - a) | abs |x - a|; catalogue lin 2x - 1 | sq x^2 | rt sqrt(x) | rec 1/x",
            "domain": "all | {except, point} | {ray, side: above, bound: {at, closed}} (read off a grid of eighths in [-12, 12], the edge located by bisection)",
            "preimages": "count and roots (doubles, 9 decimals) of f(x) = h found by scanning eighths in [-40, 40]; count 'all' when f is constantly h",
            "properties": "injective: never more than one preimage and onto: always at least one, over the 19 heights of the preimage table",
            "inverses": "roundTrip: g(f(x)) = x exactly with g the formula inverse (sq only when restricted to x >= 0); twin: the other input with the same output (sq, unrestricted)",
        },
        "tolerance": {
            "unit": "absolute, on the decimal approximation of an irrational value, and on the roots found by bisection",
            "approx": TOLERANCE,
            "rationale": "the TypeScript evaluates u + v*sqrt(b) in doubles (|value| <= ~100); the oracle evaluates the same function to 60 digits and rounds once. "
                         "Exact values, undefined / defined, domains, preimage counts, injective and onto must match EXACTLY.",
        },
        "evaluations": evaluation_cases(),
        "compositions": composition_cases(),
        "domains": domain_cases(),
        "preimages": preimages,
        "properties": property_cases(preimages),
        "inverses": inverse_cases(),
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
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/functions.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/functions.fixtures.json is stale or missing: run `python oracle/functions_oracle.py --write`", file=sys.stderr)
        return 1
    print("functions fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
