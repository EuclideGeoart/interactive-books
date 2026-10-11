"""Independent derivative oracle for Part III (III.3–III.6, III.14).

Different algorithms from the browser:
  * exact secants use Fraction arithmetic directly on f(x+h) and f(x);
  * a polynomial's derivative is NOT taken from the power rule: the quotient m(h) is a polynomial in h of degree < deg f, so it is
    recovered by exact Lagrange interpolation through distinct nonzero steps and evaluated at h = 0;
  * transcendental values come from 60-digit Decimal Taylor series, never from libm;
  * one-sided behaviour at corners/jumps/vertical tangents is classified from exact or high-precision secants on each side.
Writes fixtures/derivatives.fixtures.json; `--check` fails when the committed fixture is stale.
"""
from decimal import Decimal as D, getcontext
from fractions import Fraction as F
from pathlib import Path
import json
import sys

getcontext().prec = 60
FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/derivatives.fixtures.json'


# ----------------------------------------------------------------------------------------- high-precision elementary functions
def dsin(x):
    x = D(x); term = x; total = x; k = 1
    while abs(term) > D(10) ** -58:
        term = -term * x * x / ((2 * k) * (2 * k + 1)); total += term; k += 1
    return total


def dcos(x):
    x = D(x); term = D(1); total = D(1); k = 1
    while abs(term) > D(10) ** -58:
        term = -term * x * x / ((2 * k - 1) * (2 * k)); total += term; k += 1
    return total


def dexp(x):
    x = D(x); term = D(1); total = D(1); k = 1
    while abs(term) > D(10) ** -58:
        term = term * x / k; total += term; k += 1
    return total


def dcbrt(x):
    x = D(x)
    if x == 0:
        return D(0)
    s = -1 if x < 0 else 1
    y = abs(x) ** (D(1) / D(3))
    return s * y


def fr(text):
    return F(text)


def fstr(q):
    return f'{q.numerator}' if q.denominator == 1 else f'{q.numerator}/{q.denominator}'


# ----------------------------------------------------------------------------------------- III.3 catalog, written independently
def cubic(x):
    return x ** 3 / 6 - x


def absolute(x):
    return abs(x)


def jump(x):
    return F(-1) if x < 0 else F(1)


EXACT = {'cubic': cubic, 'abs': absolute, 'jump': jump}


def lagrange_at_zero(points):
    """Value at 0 of the interpolating polynomial through (h_i, m_i)."""
    total = F(0)
    for i, (hi, mi) in enumerate(points):
        w = F(1)
        for j, (hj, _) in enumerate(points):
            if i != j:
                w *= (0 - hj) / (hi - hj)
        total += w * mi
    return total


def exact_side(f, x, side):
    """One-sided slope limit of an exact piecewise-polynomial function, from exact secants on that side."""
    s = 1 if side == 'right' else -1
    steps = [s * F(1, 2 ** k) for k in range(10, 14)]
    ms = [(f(x + h) - f(x)) / h for h in steps]
    # A jump makes |m(h)| grow like 1/|h|; a polynomial piece makes the 4 secants lie on a polynomial of degree <= 2 in h.
    if abs(ms[-1]) > 2 ** 12:
        return {'kind': 'none'}
    return {'kind': 'finite', 'exact': fstr(lagrange_at_zero(list(zip(steps, ms))[:3]))}


def secant_case(fn, x, h):
    x, h = fr(x), fr(h)
    out = {'fn': fn, 'x': fstr(x), 'h': fstr(h)}
    if h == 0:
        out['secant'] = {'kind': 'undefined', 'reason': 'division by zero'}
    elif fn in EXACT:
        f = EXACT[fn]
        out['secant'] = {'kind': 'value', 'exact': fstr((f(x + h) - f(x)) / h)}
    else:
        f = {'sin': dsin, 'cbrt': dcbrt, 'sqrt': lambda t: D(t).sqrt()}[fn]
        if fn == 'sqrt' and (x < 0 or x + h < 0):
            out['secant'] = {'kind': 'undefined', 'reason': 'outside the domain'}
        else:
            xd, hd = D(x.numerator) / D(x.denominator), D(h.numerator) / D(h.denominator)
            v1, v0 = f(xd + hd), f(xd)
            out['secant'] = {'kind': 'value', 'value': float((v1 - v0) / hd), 'scale': float((abs(v1) + abs(v0)) / abs(hd))}
    # analytic one-sided slopes
    if fn in EXACT:
        f = EXACT[fn]
        left, right = exact_side(f, x, 'left'), exact_side(f, x, 'right')
    elif fn == 'sin':
        v = float(dcos(D(x.numerator) / D(x.denominator)))
        left = right = {'kind': 'finite', 'value': v}
    elif fn == 'cbrt':
        if x == 0:
            left = right = {'kind': 'infinite', 'sign': 1}
        else:
            c = dcbrt(D(x.numerator) / D(x.denominator))
            left = right = {'kind': 'finite', 'value': float(1 / (3 * c * c))}
    else:  # sqrt
        if x == 0:
            left, right = {'kind': 'none'}, {'kind': 'infinite', 'sign': 1}
        else:
            v = float(1 / (2 * (D(x.numerator) / D(x.denominator)).sqrt()))
            left = right = {'kind': 'finite', 'value': v}
    out['left'], out['right'] = left, right
    same = left == right and left['kind'] == 'finite'
    out['derivative'] = left if same else {'kind': 'undefined'}
    return out


def secant_cases():
    inputs = []
    for x in ['-2', '-1.5', '-0.75', '0', '0.5', '1', '1.25', '2.5']:
        for h in ['1', '0.5', '-0.25', '0.01', '-2', '0']:
            inputs.append(('cubic', x, h))
    for x in ['-1', '0', '0.5']:
        for h in ['1', '-1', '0.25', '-0.25']:
            inputs += [('abs', x, h), ('jump', x, h)]
    for x in ['-1', '0', '0.25', '1.5']:
        for h in ['1', '-0.5', '0.01']:
            inputs += [('cbrt', x, h), ('sin', x, h)]
    for x in ['0', '0.25', '1']:
        for h in ['1', '0.5', '-0.25']:
            inputs.append(('sqrt', x, h))
    return [secant_case(*case) for case in inputs]


# ----------------------------------------------------------------------------------------- III.4 linear model
def derivative_by_interpolation(f, x, degree):
    """Exact derivative of a polynomial-valued f: m(h) has degree < `degree`; interpolate it at h = 0 through `degree` nonzero steps."""
    steps = [F(k, 7) for k in range(1, degree + 1)]
    return lagrange_at_zero([(h, (f(x + h) - f(x)) / h) for h in steps])


def linear_case(fn, x0, dx):
    x0, dx = fr(x0), fr(dx)
    if fn == 'cubic':
        slope = derivative_by_interpolation(cubic, x0, 3)
        model = cubic(x0) + slope * dx
        return {'fn': fn, 'x0': fstr(x0), 'dx': fstr(dx), 'slope': fstr(slope), 'linear': fstr(model), 'error': fstr(cubic(x0 + dx) - model)}
    xd, dd = D(x0.numerator) / D(x0.denominator), D(dx.numerator) / D(dx.denominator)
    f, fp = {'sin': (dsin, dcos), 'exp': (dexp, dexp)}[fn]
    model = f(xd) + fp(xd) * dd
    return {'fn': fn, 'x0': fstr(x0), 'dx': fstr(dx), 'slope': float(fp(xd)), 'linear': float(model), 'error': float(f(xd + dd) - model),
            'scale': float(abs(f(xd + dd)) + abs(f(xd)) + abs(fp(xd) * dd))}


def linear_cases():
    out = [linear_case('cubic', x0, dx) for x0 in ['-2', '-0.5', '0', '1', '1.75'] for dx in ['1', '-0.5', '0.25', '2.5', '0']]
    out += [linear_case(fn, x0, dx) for fn in ['sin', 'exp'] for x0 in ['0', '0.5', '-1.25'] for dx in ['1', '-0.25', '0.01']]
    return out


# ----------------------------------------------------------------------------------------- III.5 rules
def rule_case(mode, a, b, c, x):
    a, b, c, x = fr(a), fr(b), fr(c), fr(x)
    u = lambda t: a * t + b
    v = lambda t: t * t + c
    out = {'mode': mode, 'a': fstr(a), 'b': fstr(b), 'c': fstr(c), 'x': fstr(x)}
    if mode == 'sum':
        out['derivative'] = fstr(derivative_by_interpolation(lambda t: u(t) + v(t), x, 2))
    elif mode == 'product':
        out['derivative'] = fstr(derivative_by_interpolation(lambda t: u(t) * v(t), x, 3))
    elif v(x) == 0:
        out['derivative'] = None
    else:
        # [q(x+h) - q(x)]/h = N(h)/(h D(h)) with N(h) = u(x+h)v(x) - u(x)v(x+h), N(0) = 0; N(h)/h is a polynomial of degree <= 2.
        nh = lambda h: (u(x + h) * v(x) - u(x) * v(x + h)) / h
        out['derivative'] = fstr(lagrange_at_zero([(h, nh(h)) for h in (F(1, 3), F(2, 3), F(1))]) / (v(x) * v(x)))
    return out


def rule_cases():
    out = []
    for mode in ['sum', 'product', 'quotient']:
        for a, b in [('1', '1'), ('-1', '0.5'), ('2.5', '-3'), ('0', '2')]:
            for c in ['1', '-1', '0', '-2.25']:
                for x in ['-2', '-1', '0', '1', '1.5']:
                    out.append(rule_case(mode, a, b, c, x))
    return out


# ----------------------------------------------------------------------------------------- III.6 chain
INNER_EXACT = {'square': lambda t: t * t / 2 - 1, 'linear': lambda t: 2 * t - 1}
OUTER_EXACT = {'cube': lambda t: t ** 3 / 4}
INNER_DEC = {'square': lambda t: t * t / 2 - 1, 'linear': lambda t: 2 * t - 1, 'sin': dsin}
OUTER_DEC = {'cube': lambda t: t ** 3 / 4, 'sin': dsin, 'exp': dexp}


def chain_case(inner, outer, x):
    x = fr(x)
    out = {'inner': inner, 'outer': outer, 'x': fstr(x)}
    if inner in INNER_EXACT and outer in OUTER_EXACT:
        g, f = INNER_EXACT[inner], OUTER_EXACT[outer]
        out['u'] = fstr(g(x)); out['derivative'] = fstr(derivative_by_interpolation(lambda t: f(g(t)), x, 6))
    else:
        g, f = INNER_DEC[inner], OUTER_DEC[outer]
        xd, h = D(x.numerator) / D(x.denominator), D(10) ** -25
        out['u'] = float(g(xd)); out['derivative'] = float((f(g(xd + h)) - f(g(xd - h))) / (2 * h))   # error ~ h**2 = 1e-50
    return out


def chain_cases():
    return [chain_case(i, o, x) for i in ['square', 'linear', 'sin'] for o in ['cube', 'sin', 'exp'] for x in ['-2', '-0.75', '0', '0.5', '2']]


def build():
    return {
        'method': 'Fraction secants; derivative by exact Lagrange interpolation of m(h) at h = 0; Decimal(60) Taylor series for sin/cos/exp; '
                  'one-sided classification from exact secants on each side',
        'tolerance': 'exact strings must match exactly; binary64 secants within 8 * 2^-52 * (|f(x+h)| + |f(x)|)/|h| (rounding of two values, '
                     'one subtraction, one division); binary64 derivatives within 4 ulps of the 60-digit reference',
        'secant': secant_cases(),
        'linear': linear_cases(),
        'rules': rule_cases(),
        'chain': chain_cases(),
    }


def main():
    text = json.dumps(build(), indent=1) + '\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text() != text:
            raise SystemExit('derivatives fixture stale: run python oracle/derivatives_oracle.py')
        b = build(); print(f"derivatives: {sum(len(v) for v in b.values() if isinstance(v, list))} cases fresh (secant, linear, rules, chain)")
    else:
        FIXTURE.write_text(text)


if __name__ == '__main__':
    main()
