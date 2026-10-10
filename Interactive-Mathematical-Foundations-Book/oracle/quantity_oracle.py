"""Independent oracle for I.1: exact n-th roots in radical form, integer powers and their rules, units as exponent vectors, and the
square <-> root relationship (master plan §9.3, §12.3).

Deliberately NOT a transliteration of ``src/math/quantity/*.ts``:

  decimals    ``fractions.Fraction`` built from the DECIMAL STRING (never ``Fraction(float)``, which would capture the binary expansion)
  radicals    full prime FACTORISATION (trial division by small primes, Miller-Rabin + Pollard rho for the rest) of numerator and denominator
              SEPARATELY; each prime's exponent v in A = p/q is split as v = n*k + r with 0 <= r < n (floor division), so
              A**(1/n) = prod(l**k) * (prod(l**r))**(1/n). The TypeScript instead rationalises first (N = p*q**(n-1)) and strips n-th powers
              by trial division with a perfect-power test on the leftover.
  powers      ``Fraction ** int`` with the book's two conventions (0**0 and 0**negative undefined) applied explicitly
  rules       the four rules are tested on both sides by brute force over every base with one decimal in [-5, 5] and every exponent pair
  units       exponent TUPLES; a rule is allowed or not by enumerating the definition (add: equal tuples, sqrt: all even)
  approx      the n-th root of A to 60 digits by integer BISECTION on scaled integers, then rounded once to the nearest double

Fixture: ``fixtures/quantity.fixtures.json`` (inputs AND expected values), read by ``tests/unit/quantity.parity.test.ts``.

    python oracle/quantity_oracle.py --write     regenerate the fixture
    python oracle/quantity_oracle.py --check     fail if the committed file is stale (default)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT / "fixtures" / "quantity.fixtures.json"
SCHEMA = "book2.quantity.fixtures/1"
TRIAL_LIMIT = 100_000  # must equal TRIAL_LIMIT in src/math/quantity/root.ts: the exact form is attempted for N < TRIAL_LIMIT**(n+1)
getcontext().prec = 80


# ----------------------------------------------------------------------------------------------- number theory
SMALL_PRIMES = [p for p in range(2, 1000) if all(p % d for d in range(2, int(p ** 0.5) + 1))]
MR_BASES = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)  # deterministic for n < 3.3e24


def is_probable_prime(n: int) -> bool:
    if n < 2:
        return False
    for p in MR_BASES:
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for a in MR_BASES:
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def pollard_rho(n: int) -> int:
    """A non-trivial factor of the composite odd n. Fixed sequence of constants c = 1, 2, ... so the result is deterministic."""
    c = 1
    while True:
        x = y = 2
        d = 1
        while d == 1:
            x = (x * x + c) % n
            y = (y * y + c) % n
            y = (y * y + c) % n
            d = math.gcd(abs(x - y), n)
        if d != n:
            return d
        c += 1


def factorize(n: int) -> dict[int, int]:
    """{prime: exponent}; factorize(1) == {}."""
    if n < 1:
        raise ValueError("factorize needs n >= 1")
    out: dict[int, int] = {}
    for p in SMALL_PRIMES:
        if p * p > n:
            break
        while n % p == 0:
            out[p] = out.get(p, 0) + 1
            n //= p
    stack = [n] if n > 1 else []
    while stack:
        m = stack.pop()
        if m == 1:
            continue
        if is_probable_prime(m):
            out[m] = out.get(m, 0) + 1
            continue
        f = pollard_rho(m)
        stack.extend([f, m // f])
    return out


def iroot_bisect(m: int, n: int) -> int:
    """floor(m ** (1/n)) by binary search on integers (not Newton)."""
    lo, hi = 0, 1
    while hi ** n <= m:
        hi *= 2
    while lo < hi - 1:
        mid = (lo + hi) // 2
        if mid ** n <= m:
            lo = mid
        else:
            hi = mid
    return lo if m > 0 else 0


# ----------------------------------------------------------------------------------------------- roots
def fraction_from_text(text: str) -> Fraction:
    """Exact value of a decimal string such as '-2.5' (or 'p/q'). Never goes through a float."""
    return Fraction(text.replace("−", "-"))


def real_root(A: Fraction, n: int) -> dict:
    """The real n-th root of A (principal for even n) as a*b**(1/n)/c in lowest terms with b free of n-th powers, or an 'undefined' marker."""
    if A < 0 and n % 2 == 0:
        return {"kind": "undefined"}
    if A == 0:
        return {"kind": "exact", "a": 0, "b": 1, "c": 1, "approx": 0.0}
    sign = -1 if A < 0 else 1
    mag = abs(A)
    exps: dict[int, int] = {}
    for prime, e in factorize(mag.numerator).items():
        exps[prime] = exps.get(prime, 0) + e
    for prime, e in factorize(mag.denominator).items():
        exps[prime] = exps.get(prime, 0) - e
    coefficient = Fraction(1)
    radicand = 1
    for prime, v in exps.items():
        k, r = divmod(v, n)  # floor division: v = n*k + r, 0 <= r < n (also for negative v)
        coefficient *= Fraction(prime) ** k
        radicand *= prime ** r
    coefficient *= sign
    # verification by exact arithmetic: (coefficient)**n * radicand == A
    assert coefficient ** n * radicand == A, (A, n)
    assert all(e < n for e in factorize(radicand).values()), "radicand is not n-th-power-free"
    return {"kind": "exact", "a": coefficient.numerator, "b": radicand, "c": coefficient.denominator, "approx": nth_root_double(A, n)}


def nth_root_double(A: Fraction, n: int) -> float:
    """The real n-th root of A to ~60 significant digits (integer bisection on a scaled integer), rounded once to a double."""
    sign = -1 if A < 0 else 1
    mag = abs(A)
    digits = 60
    scaled = (mag.numerator * 10 ** (n * digits)) // mag.denominator  # floor(mag * 10^(n*digits))
    root = iroot_bisect(scaled, n)
    return sign * float(Decimal(root).scaleb(-digits))


def root_case_expected(A: Fraction, n: int) -> dict:
    too_big = False
    if A != 0:
        mag = abs(A)
        too_big = mag.numerator * mag.denominator ** (n - 1) >= TRIAL_LIMIT ** (n + 1)
    r = real_root(A, n)
    if r["kind"] == "undefined":
        return {"kind": "undefined"}
    if too_big and r["b"] != 1:  # a perfect n-th power (b == 1) is always exact: the TypeScript recognises it before it factors anything
        return {"kind": "numeric", "approx": r["approx"]}
    return {"kind": "exact", "a": str(r["a"]), "b": str(r["b"]), "c": str(r["c"]), "rational": r["b"] == 1, "approx": r["approx"]}


# ----------------------------------------------------------------------------------------------- powers and rules
def power_expected(base: Fraction, k: int) -> dict:
    """base**k, with the book's conventions: 0**0 and 0**(negative) are UNDEFINED."""
    if base == 0 and k <= 0:
        return {"kind": "undefined"}
    v = base ** k
    return {"kind": "value", "num": str(v.numerator), "den": str(v.denominator)}


def pw(base: Fraction, k: int):
    """Fraction or None."""
    if base == 0 and k <= 0:
        return None
    return base ** k


def rules_expected(base: Fraction, m: int, n: int) -> list[dict]:
    """For each rule: whether both sides are defined ('applies') and, if so, whether they are equal."""
    bm, bn = pw(base, m), pw(base, n)
    out = []

    def rec(rule: str, left, right):
        applies = left is not None and right is not None
        out.append({"id": rule, "applies": applies, "equal": bool(applies and left == right)})

    rec("product", None if bm is None or bn is None else bm * bn, pw(base, m + n))
    rec("power-of-power", None if bm is None else pw(bm, n), pw(base, m * n))
    rec("zero", pw(base, 0), Fraction(1))
    pn = pw(base, n)
    rec("negative", pw(base, -n), None if pn is None or pn == 0 else 1 / pn)
    return out


# ----------------------------------------------------------------------------------------------- units
UNIT_SYMBOLS = {0: "m", 1: "s", 2: "kg"}
PRINT_ORDER = (2, 0, 1)  # kg, m, s


def unit_string(dim: tuple[int, int, int]) -> str:
    sup = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
    top, bottom = [], []
    for i in PRINT_ORDER:
        e = dim[i]
        token = UNIT_SYMBOLS[i] + ("" if abs(e) == 1 else str(abs(e)).translate(sup))
        if e > 0:
            top.append(token)
        elif e < 0:
            bottom.append(token)
    if not top and not bottom:
        return ""
    numerator = "·".join(top) if top else "1"
    if not bottom:
        return numerator
    return numerator + "/" + ("(" + "·".join(bottom) + ")" if len(bottom) > 1 else bottom[0])


def unit_expected(op: str, a: tuple[Fraction, tuple[int, int, int]], b: tuple[Fraction, tuple[int, int, int]]) -> dict:
    (va, da), (vb, db) = a, b
    if op in ("add", "subtract"):
        if da != db:
            return {"ok": False}
        v = va + vb if op == "add" else va - vb
        return {"ok": True, "kind": "rational", "num": str(v.numerator), "den": str(v.denominator), "dim": list(da), "unit": unit_string(da)}
    if op == "multiply":
        v, d = va * vb, tuple(x + y for x, y in zip(da, db))
        return {"ok": True, "kind": "rational", "num": str(v.numerator), "den": str(v.denominator), "dim": list(d), "unit": unit_string(d)}
    if op == "divide":
        if vb == 0:
            return {"ok": False}
        v, d = va / vb, tuple(x - y for x, y in zip(da, db))
        return {"ok": True, "kind": "rational", "num": str(v.numerator), "den": str(v.denominator), "dim": list(d), "unit": unit_string(d)}
    if op == "square":
        p = pw(va, 2)
        d = tuple(2 * x for x in da)
        return {"ok": True, "kind": "rational", "num": str(p.numerator), "den": str(p.denominator), "dim": list(d), "unit": unit_string(d)}
    if op == "root":
        if va < 0 or any(e % 2 for e in da):
            return {"ok": False}
        r = real_root(va, 2)
        d = tuple(e // 2 for e in da)
        if r["b"] == 1:
            v = Fraction(r["a"], r["c"])
            return {"ok": True, "kind": "rational", "num": str(v.numerator), "den": str(v.denominator), "dim": list(d), "unit": unit_string(d)}
        return {"ok": True, "kind": "root", "a": str(r["a"]), "b": str(r["b"]), "c": str(r["c"]), "approx": r["approx"], "dim": list(d), "unit": unit_string(d)}
    raise ValueError(op)


# ----------------------------------------------------------------------------------------------- squares (the hero)
def square_expected(mode: str, value: Fraction) -> dict:
    if mode == "side":
        sq = value * value
        r = real_root(sq, 2)  # root of the SQUARE, not of the side
        root_value = Fraction(r["a"], r["c"])
        assert r["b"] == 1 and root_value == abs(value)  # sqrt(q^2) = |q|, for every real q
        return {"square": [str(sq.numerator), str(sq.denominator)], "rootOfSquare": [str(root_value.numerator), str(root_value.denominator)], "signLost": value < 0}
    r = real_root(value, 2)
    if r["kind"] == "undefined":
        return {"kind": "undefined", "solutions": 0}
    back = Fraction(r["a"]) ** 2 * r["b"] / Fraction(r["c"]) ** 2
    assert back == value  # (sqrt(A))^2 = A exactly
    return {"kind": "exact", "a": str(r["a"]), "b": str(r["b"]), "c": str(r["c"]), "roundTrip": True, "solutions": 1 if value == 0 else 2}


# ----------------------------------------------------------------------------------------------- cases
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


def decimal_text(units: int, places: int) -> str:
    """`units / 10**places` written as a plain decimal string (no float involved)."""
    sign = "-" if units < 0 else ""
    digits = str(abs(units)).rjust(places + 1, "0")
    return f"{sign}{digits[:len(digits) - places]}.{digits[len(digits) - places:]}" if places else f"{sign}{digits}"


def root_cases() -> list[dict]:
    texts: list[tuple[str, list[str], str, int]] = []
    named = [
        ("12", 2), ("72", 2), ("8/9", 2), ("1/4", 2), ("1/2", 2), ("13", 2), ("0", 2), ("2.25", 2), ("0.01", 2), ("0.08", 2), ("143.99", 2),
        ("9", 2), ("1", 2), ("2", 2), ("-4", 2), ("-0.01", 2), ("-8", 3), ("24", 3), ("1/8", 3), ("27/8", 3), ("-24", 3), ("16", 3), ("-1", 3),
        ("16", 4), ("48", 4), ("-16", 4), ("81", 4), ("32", 5), ("-32", 5), ("1/32", 5), ("64", 3), ("1/2", 3), ("0", 3), ("0", 5),
    ]
    for t, n in named:
        texts.append((f"named_{t.replace('/', 'over').replace('.', 'p').replace('-', 'neg')}_n{n}", ["named"], t, n))
    for k in range(0, 201):
        texts.append((f"int_{k}_n2", ["integer", "n2"], str(k), 2))
    for k in range(1, 1000, 7):
        texts.append((f"dec2_{k}_n2", ["decimal", "n2"], decimal_text(k, 2), 2))
    for k in range(-300, 301, 13):
        texts.append((f"squareof_{k}", ["square-of-decimal"], decimal_text(k * k, 4), 2))  # (k/100)^2 = k^2 / 10^4
    for n in (3, 4, 5):
        for k in range(-130, 131, 3):
            texts.append((f"int_{k}_n{n}", ["integer", f"n{n}"], str(k), n))
    rng = Splitmix64(20261101)
    for i in range(60):
        n = rng.randint(2, 5)
        texts.append((f"random_{i:03d}", ["random"], decimal_text(rng.randint(-20000, 40000), 2), n))
    for i in range(24):
        texts.append((f"six_decimals_{i:03d}", ["six-decimals", "n2"], decimal_text(rng.randint(1, 144_000_000), 6), 2))
    texts.append(("six_decimals_max", ["six-decimals", "n2"], "143.999999", 2))
    texts.append(("six_decimals_min", ["six-decimals", "n2"], "0.000001", 2))
    texts.append(("six_decimals_square", ["six-decimals", "n2"], "0.999999000001", 2))  # (0.999999)^2: a perfect square of a 6-decimal number
    texts.append(("beyond_guard", ["beyond-guard", "n2"], str(10 ** 15 + 3), 2))
    return [{"id": cid, "tags": tags, "input": {"A": t, "n": n}} for cid, tags, t, n in texts]


def power_cases() -> list[dict]:
    cases = []
    for tenths in range(-50, 51, 3):
        base = decimal_text(tenths, 1)
        for k in range(-3, 7):
            cases.append({"id": f"pow_{base}_{k}", "input": {"base": base, "k": k}})
    return cases


def rule_cases() -> list[dict]:
    cases = []
    for tenths in (-50, -15, -10, -5, -1, 0, 1, 3, 5, 10, 25, 50):
        base = decimal_text(tenths, 1)
        for m in (-3, -1, 0, 1, 2, 6):
            for n in (-3, -1, 0, 1, 3, 6):
                cases.append({"id": f"rule_{base}_{m}_{n}", "input": {"base": base, "m": m, "n": n}})
    return cases


def unit_cases() -> list[dict]:
    dims = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), (2, 0, 0), (1, -1, 0), (1, -2, 1), (4, -2, 0), (3, 0, 0)]
    rng = Splitmix64(20261102)
    cases = []
    for op in ("add", "subtract", "multiply", "divide", "square", "root"):
        for da in dims:
            for db in dims:
                va, vb = decimal_text(rng.randint(-120, 120), 1), decimal_text(rng.randint(-120, 120), 1)
                cases.append({"id": f"unit_{op}_{'.'.join(map(str, da))}_{'.'.join(map(str, db))}", "input": {"op": op, "a": {"value": va, "dim": list(da)}, "b": {"value": vb, "dim": list(db)}}})
                if op in ("square", "root"):
                    break  # b is ignored by the unary operations
    cases.append({"id": "unit_root_9_m2", "input": {"op": "root", "a": {"value": "9", "dim": [2, 0, 0]}, "b": {"value": "1", "dim": [0, 0, 0]}}})
    cases.append({"id": "unit_root_9_m", "input": {"op": "root", "a": {"value": "9", "dim": [1, 0, 0]}, "b": {"value": "1", "dim": [0, 0, 0]}}})
    cases.append({"id": "unit_root_2_m2", "input": {"op": "root", "a": {"value": "2", "dim": [2, 0, 0]}, "b": {"value": "1", "dim": [0, 0, 0]}}})
    cases.append({"id": "unit_div_zero", "input": {"op": "divide", "a": {"value": "3", "dim": [1, 0, 0]}, "b": {"value": "0", "dim": [1, 0, 0]}}})
    return cases


def square_cases() -> list[dict]:
    cases = []
    for k in range(-600, 601, 7):
        cases.append({"id": f"side_{k}", "input": {"mode": "side", "value": decimal_text(k, 2)}})
    for k in range(-400, 3601, 29):
        cases.append({"id": f"area_{k}", "input": {"mode": "area", "value": decimal_text(k, 2)}})
    for t in ("0.1", "-3", "3", "0.01", "-0.01", "5.99"):
        cases.append({"id": f"side_named_{t}", "input": {"mode": "side", "value": t}})
    for t in ("2", "12", "0.25", "0.5", "-4", "0", "36"):
        cases.append({"id": f"area_named_{t}", "input": {"mode": "area", "value": t}})
    return cases


def build_fixture() -> dict:
    def unit_args(c):
        i = c["input"]
        return i["op"], (fraction_from_text(i["a"]["value"]), tuple(i["a"]["dim"])), (fraction_from_text(i["b"]["value"]), tuple(i["b"]["dim"]))

    return {
        "schema": SCHEMA,
        "generatedBy": "oracle/quantity_oracle.py",
        "conventions": {
            "decimals": "inputs are decimal STRINGS and are read exactly (never through a float)",
            "roots": "real n-th root of A (principal root for even n) as a*b^(1/n)/c, gcd(a,c)=1, c>0, b free of n-th powers; a<0 only for odd n and A<0; 'undefined' for A<0 and even n; "
                     f"'numeric' (exact form not attempted) when p*q^(n-1) >= {TRIAL_LIMIT}^(n+1) for |A|=p/q in lowest terms, unless |A| is a perfect n-th power (always exact)",
            "powers": "integer exponents; 0^0 and 0^(negative) are undefined by the book's convention",
            "rules": "a rule 'applies' when both of its sides are defined; whenever it applies the two sides are exactly equal",
            "units": "dimension = exponents of (metre, second, kilogram); add/subtract need equal tuples; sqrt needs a value >= 0 and all-even exponents",
        },
        "tolerance": {
            "unit": "ulps of the expected double (math.ulp)",
            "approxRootN2": 1,
            "approxRootN3Plus": 8,
            "rationale": "Math.sqrt is correctly rounded from the nearest double to A (<= 1 ulp from the true root). Math.cbrt / Math.pow(x, 1/n) are not correctly "
                         "rounded and 1/n is inexact, so n >= 3 gets headroom. Exact forms (a, b, c), undefined/numeric policies, power values, rule outcomes and unit strings must match EXACTLY.",
        },
        "roots": [{**c, "expected": root_case_expected(fraction_from_text(c["input"]["A"]), c["input"]["n"])} for c in root_cases()],
        "powers": [{**c, "expected": power_expected(fraction_from_text(c["input"]["base"]), c["input"]["k"])} for c in power_cases()],
        "rules": [{**c, "expected": rules_expected(fraction_from_text(c["input"]["base"]), c["input"]["m"], c["input"]["n"])} for c in rule_cases()],
        "units": [{**c, "expected": unit_expected(*unit_args(c))} for c in unit_cases()],
        "squares": [{**c, "expected": square_expected(c["input"]["mode"], fraction_from_text(c["input"]["value"]))} for c in square_cases()],
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
    mode.add_argument("--write", action="store_true", help="regenerate fixtures/quantity.fixtures.json")
    mode.add_argument("--check", action="store_true", help="fail if the committed fixture is stale (default)")
    args = parser.parse_args(argv)
    text = render(build_fixture())
    if args.write:
        with FIXTURE_PATH.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(text)} bytes)")
        return 0
    if not FIXTURE_PATH.exists() or FIXTURE_PATH.read_text(encoding="utf-8") != text:
        print("fixtures/quantity.fixtures.json is stale or missing: run `python oracle/quantity_oracle.py --write`", file=sys.stderr)
        return 1
    print("quantity fixture is fresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
