"""Independent integration oracle for III.12, III.13 and III.15.

Different algorithms from the browser (which sums panel by panel and integrates with exact antiderivatives):
  * Riemann/trapezoid sums of polynomial integrands use CLOSED-FORM power sums (Faulhaber via Bernoulli numbers): f(a + (i + c)dx) is expanded
    as a polynomial in i and every sum_{i<n} i^p is replaced by its formula — no panel loop;
  * exact definite integrals use SIMPSON's rule on each polynomial piece, which is exact for degree <= 3;
  * the accumulation F(x) = integral from a to x uses the same Simpson construction, and its one-sided slopes come from exact interpolation
    of secants on each side;
  * transcendental integrands use 60-digit Decimal panel sums and Decimal references (1 - cos 3, e - 1, 2/3).
Writes fixtures/integration.fixtures.json; `--check` fails when the committed fixture is stale.
"""
from decimal import Decimal as D, getcontext
from fractions import Fraction as F
from math import comb
from pathlib import Path
import json
import sys

getcontext().prec = 60
FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/integration.fixtures.json'
PI2 = 2 * D('3.14159265358979323846264338327950288419716939937510582097494459230781640628620899')


def fstr(q):
    return f'{q.numerator}' if q.denominator == 1 else f'{q.numerator}/{q.denominator}'


# ----------------------------------------------------------------------------------------- exact polynomial pieces
# Each integrand: list of (lo, hi, coefficients constant-first); None = unbounded. At a breakpoint the RIGHT piece applies.
PIECES = {
    'cubic': [(None, None, [F(0), F(-1), F(0), F(1, 4)])],
    'parabola': [(None, None, [F(4), F(0), F(-1)])],
    'linear': [(None, None, [F(-1), F(1)])],
    'square': [(None, None, [F(0), F(0), F(1)])],
    'signed': [(None, None, [F(0), F(-1), F(0), F(1)])],
    'step': [(None, F(1), [F(1)]), (F(1), None, [F(-1)])],
    'kink': [(None, F(1, 3), [F(1, 3), F(-1)]), (F(1, 3), None, [F(-1, 3), F(1)])],
}


def ev(c, x):
    return sum(ck * x ** k for k, ck in enumerate(c))


def value(name, x):
    for lo, hi, c in PIECES[name]:
        if (lo is None or x >= lo) and (hi is None or x < hi):
            return ev(c, x)
    raise ValueError


def simpson(c, a, b):
    return (b - a) / 6 * (ev(c, a) + 4 * ev(c, (a + b) / 2) + ev(c, b))


def integral(name, a, b):
    if a > b:
        return -integral(name, b, a)
    total = F(0)
    for lo, hi, c in PIECES[name]:
        L, H = max(a, lo) if lo is not None else a, min(b, hi) if hi is not None else b
        if L < H:
            total += simpson(c, L, H)
    return total


def bernoulli(m):
    B = [F(1)]
    for k in range(1, m + 1):
        B.append(-sum(comb(k + 1, j) * B[j] for j in range(k)) / (k + 1))
    return B                                   # B_1 = -1/2: sum_{i=0}^{n-1} i^p convention


BERN = bernoulli(8)


def power_sum(p, n):
    """sum_{i=0}^{n-1} i^p in closed form."""
    if p == 0:
        return F(n)
    return sum(comb(p + 1, j) * BERN[j] * F(n) ** (p + 1 - j) for j in range(p + 1)) / (p + 1)


def closed_form_sum(c, a, dx, n, shift):
    """sum_{i<n} p(a + (i + shift) dx) for polynomial p, by binomial expansion in i and Faulhaber sums."""
    total = F(0)
    base = a + shift * dx
    for k, ck in enumerate(c):                # (base + i dx)^k = sum_j C(k, j) base^(k-j) dx^j i^j
        for j in range(k + 1):
            total += ck * comb(k, j) * base ** (k - j) * dx ** j * power_sum(j, n)
    return total


def riemann_exact(name, a, b, n, rule):
    dx = (b - a) / n
    if len(PIECES[name]) == 1:
        c = PIECES[name][0][2]
        left, right = closed_form_sum(c, a, dx, n, 0) * dx, closed_form_sum(c, a, dx, n, 1) * dx
        return {'left': left, 'right': right, 'midpoint': closed_form_sum(c, a, dx, n, F(1, 2)) * dx, 'trapezoid': (left + right) / 2}[rule]
    # Piecewise integrands (step, kink): independent direct evaluation of the piecewise definition.
    xs = [a + i * dx for i in range(n + 1)]
    if rule == 'left':
        return sum(value(name, x) for x in xs[:-1]) * dx
    if rule == 'right':
        return sum(value(name, x) for x in xs[1:]) * dx
    if rule == 'midpoint':
        return sum(value(name, (s + t) / 2) for s, t in zip(xs, xs[1:])) * dx
    return sum((value(name, s) + value(name, t)) / 2 for s, t in zip(xs, xs[1:])) * dx


def signed_parts(name, a, b):
    lo, hi = min(a, b), max(a, b)
    cuts = {lo, hi}
    for p in range(-48, 49):                   # rational candidates p/q, q <= 4, enough for the catalog's roots
        for q in (1, 2, 3, 4):
            x = F(p, q)
            if lo < x < hi and value(name, x) == 0:
                cuts.add(x)
    for blo, bhi, _ in PIECES[name]:
        for edge in (blo, bhi):
            if edge is not None and lo < edge < hi:
                cuts.add(edge)
    cuts = sorted(cuts)
    pos = neg = F(0)
    for s, t in zip(cuts, cuts[1:]):
        v = integral(name, s, t)
        if v > 0:
            pos += v
        else:
            neg += v
    return pos, neg


# ----------------------------------------------------------------------------------------- transcendental integrands (Decimal)
def dsin(x):
    x = D(x) % PI2; term = total = x; k = 1
    while abs(term) > D(10) ** -58:
        term = -term * x * x / ((2 * k) * (2 * k + 1)); total += term; k += 1
    return total


def dcos(x):
    x = D(x) % PI2; term = total = D(1); k = 1
    while abs(term) > D(10) ** -58:
        term = -term * x * x / ((2 * k - 1) * (2 * k)); total += term; k += 1
    return total


def dexp(x):
    x = D(x); term = total = D(1); k = 1
    while abs(term) > D(10) ** -58:
        term = term * x / k; total += term; k += 1
    return total


NUMERIC = {'sin': (dsin, lambda a, b: dcos(a) - dcos(b)), 'exp': (dexp, lambda a, b: dexp(b) - dexp(a)),
           'sqrt': (lambda x: D(x).sqrt(), lambda a, b: (D(2) / 3) * (D(b).sqrt() ** 3 - D(a).sqrt() ** 3))}


def riemann_decimal(name, a, b, n, rule):
    f = NUMERIC[name][0]; a, b = D(str(a)), D(str(b)); dx = (b - a) / n
    xs = [a + i * dx for i in range(n + 1)]
    s = {'left': sum(f(x) for x in xs[:-1]), 'right': sum(f(x) for x in xs[1:]), 'midpoint': sum(f((u + v) / 2) for u, v in zip(xs, xs[1:])),
         'trapezoid': sum((f(u) + f(v)) / 2 for u, v in zip(xs, xs[1:]))}[rule]
    return s * dx


# ----------------------------------------------------------------------------------------- accumulation slopes
def at_zero(points):
    total = F(0)
    for i, (hi, mi) in enumerate(points):
        w = F(1)
        for j, (hj, _) in enumerate(points):
            if i != j:
                w *= -hj / (hi - hj)
        total += w * mi
    return total


def side_slope(name, a, x, side):
    s = 1 if side == 'right' else -1
    steps = [s * F(1, 2 ** k) for k in range(10, 15)]
    return at_zero([(h, (integral(name, a, x + h) - integral(name, a, x)) / h) for h in steps])


def accumulation_case(name, a, x):
    a, x = F(a), F(x)
    left, right = side_slope(name, a, x, 'left'), side_slope(name, a, x, 'right')
    return {'fn': name, 'a': fstr(a), 'x': fstr(x), 'F': fstr(integral(name, a, x)), 'left': fstr(left), 'right': fstr(right), 'f': fstr(value(name, x))}


def build():
    riem = []
    for name, (a, b) in [('cubic', ('-2', '3')), ('parabola', ('-2', '2')), ('linear', ('0', '2')), ('cubic', ('3', '-2')), ('signed', ('-1', '2')), ('step', ('-1', '2')), ('kink', ('0', '1')), ('square', ('0', '1'))]:
        A, B = F(a), F(b)
        pos, neg = signed_parts(name, A, B)
        sums = {rule: {str(n): fstr(riemann_exact(name, A, B, n, rule)) for n in (1, 2, 3, 4, 8, 10, 16, 64)} for rule in ('left', 'right', 'midpoint', 'trapezoid')}
        riem.append({'fn': name, 'a': a, 'b': b, 'integral': fstr(integral(name, A, B)), 'positive': fstr(pos), 'negative': fstr(neg), 'sums': sums})
    numeric = []
    for name, (a, b) in [('sin', (0, 3)), ('exp', (0, 1)), ('sqrt', (0, 1))]:
        ref = NUMERIC[name][1](D(a), D(b))
        numeric.append({'fn': name, 'a': str(a), 'b': str(b), 'reference': float(ref),
                        'sums': {rule: {str(n): float(riemann_decimal(name, a, b, n, rule)) for n in (1, 4, 12, 64, 256)} for rule in ('left', 'right', 'midpoint', 'trapezoid')}})
    quad = []
    for name, (a, b) in [('square', ('0', '1')), ('signed', ('-1', '2')), ('kink', ('0', '1'))]:
        A, B = F(a), F(b); I = integral(name, A, B)
        quad.append({'fn': name, 'errors': {rule: [fstr(riemann_exact(name, A, B, 2 ** k, rule) - I) for k in range(11)] for rule in ('left', 'right', 'midpoint', 'trapezoid')}})
    for name, (a, b) in [('sin', (0, 3)), ('sqrt', (0, 1))]:
        ref = NUMERIC[name][1](D(a), D(b))
        quad.append({'fn': name, 'errors': {rule: [float(abs(riemann_decimal(name, a, b, 2 ** k, rule) - ref)) for k in range(11)] for rule in ('trapezoid', 'midpoint')}})
    acc = [accumulation_case(n, a, x) for n in ('cubic', 'linear', 'parabola', 'step') for a in ('-2', '0', '1') for x in ('-1', '0.5', '1', '2.25')]
    return {'method': 'Faulhaber closed-form power sums; Simpson (exact to degree 3) for integrals and accumulation; interpolated one-sided secant slopes; Decimal(60) for sin/exp/sqrt',
            'tolerance': 'exact values must match exactly; binary64 sums within 4 (n + 2) eps max|f| |b - a| of the Decimal sum (summation rounding)', 'riemann': riem, 'numeric': numeric, 'quadrature': quad, 'accumulation': acc}


def main():
    text = json.dumps(build(), indent=1) + '\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text() != text:
            raise SystemExit('integration fixture stale: run python oracle/integration_oracle.py')
        b = build(); print(f"integration: {len(b['riemann'])} exact integrands x 32 sums, {len(b['numeric'])} Decimal integrands, {len(b['accumulation'])} accumulation cases fresh")
    else:
        FIXTURE.write_text(text)


if __name__ == '__main__':
    main()
