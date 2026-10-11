"""Independent multivariable oracle for III.7, III.8, III.9 and III.11.

Different algorithm from the browser (which differentiates polynomial terms with the power rule): every derivative here is the limit of exact
Fraction secants, obtained by Lagrange interpolation of m(h) at h = 0 through distinct nonzero steps (m(h) is a polynomial in h of degree below
the total degree). Second derivatives nest this construction; mixed partials are computed in both orders. Eigenvalues use 60-digit Decimal.
Writes fixtures/multivariable.fixtures.json; `--check` fails when the committed fixture is stale.
"""
from decimal import Decimal as D, getcontext
from fractions import Fraction as F
from pathlib import Path
import json
import sys

getcontext().prec = 60
FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/multivariable.fixtures.json'
STEPS = [F(1, 3), F(2, 3), F(1), F(4, 3), F(5, 3)]          # five nonzero steps: exact for total degree <= 5


def fstr(q):
    return f'{q.numerator}' if q.denominator == 1 else f'{q.numerator}/{q.denominator}'


def at_zero(points):
    total = F(0)
    for i, (hi, mi) in enumerate(points):
        w = F(1)
        for j, (hj, _) in enumerate(points):
            if i != j:
                w *= -hj / (hi - hj)
        total += w * mi
    return total


def directional(f, u):
    """Derivative of f along vector u, as a new function, by exact interpolation of secants."""
    return lambda x, y: at_zero([(h, (f(x + h * u[0], y + h * u[1]) - f(x, y)) / h) for h in STEPS])


SURFACES = {
    'bowl': lambda x, y: x * x + y * y,
    'elliptic': lambda x, y: x * x / 2 + 2 * y * y,
    'saddle': lambda x, y: x * x - y * y,
    'product': lambda x, y: x * y,
    'cap': lambda x, y: -x * x - y * y,
    'plane': lambda x, y: x + 2 * y,
    'double-well': lambda x, y: x ** 3 - 3 * x + y * y,
    'monkey': lambda x, y: x ** 3 - 3 * x * y * y,
    'quartic': lambda x, y: x ** 4 + y ** 4,
    'cubic-y': lambda x, y: x * x + y ** 3,
}
EX, EY = (F(1), F(0)), (F(0), F(1))
DIRECTIONS = [(F(3, 5), F(4, 5)), (F(-4, 5), F(3, 5)), (F(1), F(0)), (F(0), F(-1))]


def classify(fx, fy, fxx, fxy, fyy):
    if fx != 0 or fy != 0:
        return 'not-critical'
    det = fxx * fyy - fxy * fxy
    return 'saddle' if det < 0 else 'inconclusive' if det == 0 else ('minimum' if fxx > 0 else 'maximum')


def surface_case(name, x, y):
    f = SURFACES[name]; x, y = F(x), F(y)
    dx, dy = directional(f, EX), directional(f, EY)
    fx, fy = dx(x, y), dy(x, y)
    fxx, fyy = directional(dx, EX)(x, y), directional(dy, EY)(x, y)
    fxy, fyx = directional(dx, EY)(x, y), directional(dy, EX)(x, y)
    tr, det = fxx + fyy, fxx * fyy - fxy * fxy
    disc = D((tr * tr - 4 * det).numerator) / D((tr * tr - 4 * det).denominator)
    t = D(tr.numerator) / D(tr.denominator)
    eig = sorted([float((t + disc.sqrt()) / 2), float((t - disc.sqrt()) / 2)], reverse=True)
    return {'surface': name, 'x': fstr(x), 'y': fstr(y), 'f': fstr(f(x, y)), 'fx': fstr(fx), 'fy': fstr(fy),
            'fxx': fstr(fxx), 'fxy': fstr(fxy), 'fyx': fstr(fyx), 'fyy': fstr(fyy), 'class': classify(fx, fy, fxx, fxy, fyy), 'eigenvalues': eig,
            'directional': [fstr(directional(f, u)(x, y)) for u in DIRECTIONS]}


MAPS = {
    'square': [lambda x, y: x * x - y * y, lambda x, y: 2 * x * y],
    'shear': [lambda x, y: x + y * y / 2, lambda x, y: y],
    'linear': [lambda x, y: 2 * x + y, lambda x, y: x - y],
    'lift': [lambda x, y: x, lambda x, y: y, lambda x, y: x * y],
}


def map_case(name, x, y, dx_, dy_):
    comps = MAPS[name]; x, y, a, b = F(x), F(y), F(dx_), F(dy_)
    J = [[directional(c, EX)(x, y), directional(c, EY)(x, y)] for c in comps]
    Fp = [c(x, y) for c in comps]; Fq = [c(x + a, y + b) for c in comps]
    pred = [Fp[i] + J[i][0] * a + J[i][1] * b for i in range(len(comps))]
    err2 = sum((q - p) ** 2 for q, p in zip(Fq, pred))
    return {'map': name, 'x': fstr(x), 'y': fstr(y), 'dx': fstr(a), 'dy': fstr(b), 'J': [[fstr(v) for v in row] for row in J],
            'Fp': [fstr(v) for v in Fp], 'Fq': [fstr(v) for v in Fq], 'predicted': [fstr(v) for v in pred], 'errorSquared': fstr(err2),
            'det': fstr(J[0][0] * J[1][1] - J[0][1] * J[1][0]) if len(comps) == 2 else None}


def build():
    pts = ['-2', '-1', '-0.5', '0', '0.25', '1', '1.5']
    surf = [surface_case(n, x, y) for n in SURFACES for x in pts[::2] for y in pts[1::2]]
    surf += [surface_case(n, '0', '0') for n in SURFACES] + [surface_case('double-well', '1', '0'), surface_case('double-well', '-1', '0')]
    maps = [map_case(n, x, y, a, b) for n in MAPS for x, y in [('1', '0.5'), ('0', '0'), ('-1.5', '2')] for a, b in [('0.25', '0.25'), ('1', '-0.75'), ('0', '0')]]
    return {'method': 'exact Lagrange interpolation of Fraction secants at h = 0 (nested for second derivatives); Decimal(60) eigenvalues',
            'tolerance': 'derivatives, classifications and Jacobian quantities exact; eigenvalues within 8 ulps scaled by max(1, |trace|)', 'surfaces': surf, 'maps': maps}


def main():
    text = json.dumps(build(), indent=1) + '\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text() != text:
            raise SystemExit('multivariable fixture stale: run python oracle/multivariable_oracle.py')
        b = build(); print(f"multivariable: {len(b['surfaces'])} surface cases + {len(b['maps'])} Jacobian cases fresh")
    else:
        FIXTURE.write_text(text)


if __name__ == '__main__':
    main()
