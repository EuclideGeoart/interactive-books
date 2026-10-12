"""Independent Python oracle for M10 Block A only (VI.1--VI.4).

No TypeScript code or results are read. Polynomial loss, gradient and Hessian
use hand-derived closed forms over Fraction(str(value)), so decimal floats
are treated as decimal rationals, not as their binary expansions. Only log
loss uses Decimal at precision 60; its derivatives remain exact Fractions.

Fixture schema:
  policy: method, numerical rules, schema and tolerance in ulps.
  cases: {objective, point: [x, y], a?, center?, expected: {
    status: 'finite'|'domain'|'non-finite', loss: number|null,
    gradient: [gx, gy]|null, hessian: [[hxx, hxy], [hyx, hyy]]|null}}.
  a and center apply only to quadratic, with defaults 1 and 0.
  Quadratic requires finite a > 0 and finite center, both with at most two
  decimal places; rejected configuration raises ValueError, not a status.
  A finite absolute-value kink has a loss but null gradient and Hessian.
  Non-finite inputs or any unrepresentable defined output invalidate the
  whole result; domain and non-finite results have all three quantities null.
  Only log has a restricted domain (x > 0). Non-finite input takes precedence.
  descent: [{objective: 'quadratic', start: [x, y], eta, steps, expected:
    [{k, point: [fraction, fraction], loss: fraction,
      gradient: [fraction, fraction]}]}]. Fractions are reduced 'num/den'
  strings, including '0/1'; k includes the initial state and final iterate.

The local Hessian classifier is conservative: singular stationary Hessians
are inconclusive, and a local minimum never implies a global minimum.
--check (also the default) compares deterministic JSON without rewriting it;
--write generates fixtures/optimization_landscapes.fixtures.json from Python.
"""
import argparse
from decimal import Decimal, localcontext
from fractions import Fraction
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/optimization_landscapes.fixtures.json'
OBJECTIVES = ('quadratic', 'well', 'ridge', 'saddle', 'flat', 'degenerate',
              'cubic', 'absolute', 'log')
POLICY = {
    'method': 'Independent hand-derived closed forms over Fraction(str(value)); Decimal(60) for log loss; exact affine quadratic descent',
    'schema': {
        'cases': '{objective, point:[x,y], a?, center?, expected:{status,loss,gradient,hessian}}; inputs are JSON numbers',
        'quadratic': 'L=a*(x-center)^2/2+2*y^2; a defaults to 1 and must be finite and positive; center defaults to 0 and must be finite; both allow at most two decimal places; invalid configuration raises ValueError; other objectives ignore these options',
        'expected': 'status is finite, domain, or non-finite; loss is number|null, gradient [gx,gy]|null, Hessian [[hxx,hxy],[hyx,hyy]]|null',
        'descent': '{objective:quadratic,start:[x,y],eta,steps,expected:[{k,point:[fraction,fraction],loss:fraction,gradient:[fraction,fraction]}]}; reduced num/den strings include 0/1',
    },
    'finite': 'Only finite binary64 coordinates and outputs; any non-finite coordinate or defined output makes loss, gradient and Hessian all null; invalid quadratic configuration is rejected separately',
    'domain': 'log requires x>0; otherwise domain with all quantities null; non-finite inputs take precedence',
    'kink': 'absolute at x=0 has finite loss but null gradient and Hessian; no invented derivative or subgradient',
    'tolerance': {
        'ulps': 8,
        'scale': 'max(1, abs(expected)); bound = 8 * ulp(scale)',
        'rationale': 'Exact rational results are rounded only on export; allow a few browser arithmetic roundings and log evaluation error',
        'exact': 'Status, nulls, zero outputs and reduced descent fractions match exactly',
    },
}


def quadratic_config(a, center):
    """Match the configuration boundary, independently of browser Rational."""
    if any(type(value) not in (int, float, Fraction) for value in (a, center)):
        raise ValueError('quadratic options must be numbers')
    try:
        if not all(math.isfinite(value) for value in (a, center)):
            raise ValueError('quadratic options must be finite')
    except OverflowError:
        raise ValueError('quadratic options must be finite') from None
    a, center = Fraction(str(a)), Fraction(str(center))
    if a <= 0 or any((100 * value).denominator != 1 for value in (a, center)):
        raise ValueError('quadratic requires a > 0 and options with at most two decimal places')
    return a, center


def closed_form(objective, point, a=1, center=0):
    """Return (loss, gradient, Hessian) without binary64 arithmetic."""
    x, y = (Fraction(str(value)) for value in point)
    zero, two = Fraction(0), Fraction(2)
    if objective == 'quadratic':
        a, center = quadratic_config(a, center)
        return (a * (x - center) ** 2 / 2 + 2 * y ** 2,
                (a * (x - center), 4 * y), ((a, zero), (zero, 2 * two)))
    if objective == 'well':
        return ((x ** 2 - 1) ** 2 + y ** 2,
                (4 * x * (x ** 2 - 1), 2 * y),
                ((12 * x ** 2 - 4, zero), (zero, two)))
    if objective == 'ridge':
        return (-x ** 2 - y ** 2, (-2 * x, -2 * y),
                ((-two, zero), (zero, -two)))
    if objective == 'saddle':
        return (x ** 2 - y ** 2, (2 * x, -2 * y),
                ((two, zero), (zero, -two)))
    if objective == 'flat':
        return (x ** 4 + y ** 4, (4 * x ** 3, 4 * y ** 3),
                ((12 * x ** 2, zero), (zero, 12 * y ** 2)))
    if objective == 'degenerate':
        return (x ** 3 + y ** 2, (3 * x ** 2, 2 * y),
                ((6 * x, zero), (zero, two)))
    if objective == 'cubic':
        return (x ** 3 - 3 * x + y ** 2, (3 * x ** 2 - 3, 2 * y),
                ((6 * x, zero), (zero, two)))
    if objective == 'absolute':
        loss = abs(x) + y ** 2
        if x == 0:
            return loss, None, None
        return (loss, (Fraction(1 if x > 0 else -1), 2 * y),
                ((zero, zero), (zero, two)))
    if objective == 'log':
        if x <= 0:
            raise ValueError('log requires x > 0')
        with localcontext() as context:
            context.prec = 60
            dx = Decimal(x.numerator) / Decimal(x.denominator)
            yy = y ** 2
            loss = -dx.ln() + Decimal(yy.numerator) / Decimal(yy.denominator)
        return loss, (-1 / x, 2 * y), ((1 / x ** 2, zero), (zero, two))
    raise ValueError(f'unknown objective: {objective}')


def evaluate(objective, point, a=1, center=0):
    """Export one result under the documented finite-only numerical policy."""
    if objective not in OBJECTIVES:
        raise ValueError(f'unknown objective: {objective}')
    if not isinstance(point, (list, tuple)) or len(point) != 2:
        raise ValueError('point must contain exactly two numbers')
    if objective == 'quadratic':
        a, center = quadratic_config(a, center)
    if any(type(value) not in (int, float, Fraction) for value in point):
        raise ValueError('coordinates must be numbers')
    invalid = {'status': 'non-finite', 'loss': None, 'gradient': None, 'hessian': None}
    try:
        if not all(math.isfinite(value) for value in point):
            return invalid
        if objective == 'log' and Fraction(str(point[0])) <= 0:
            return dict(invalid, status='domain')
        loss, gradient, hessian = closed_form(objective, point, a, center)
        loss = float(loss)
        gradient = [float(value) for value in gradient] if gradient is not None else None
        hessian = [[float(value) for value in row] for row in hessian] if hessian is not None else None
        outputs = [loss] + (gradient or []) + [value for row in hessian or [] for value in row]
        if not all(math.isfinite(value) for value in outputs):
            return invalid
    except OverflowError:
        return invalid
    return {'status': 'finite', 'loss': loss, 'gradient': gradient, 'hessian': hessian}


def classify(gradient, hessian):
    """Exact local Hessian test; no assertion about global optimality."""
    if gradient is None or hessian is None:
        return 'undefined'
    if any(gradient):
        return 'not-stationary'
    determinant = hessian[0][0] * hessian[1][1] - hessian[0][1] * hessian[1][0]
    if determinant < 0:
        return 'saddle'
    if determinant == 0:
        return 'inconclusive'
    return 'local-minimum' if hessian[0][0] > 0 else 'local-maximum'


def fraction_text(value):
    return f'{value.numerator}/{value.denominator}'


def quadratic_descent(start, eta, steps, a=1, center=0):
    """Exact rational trace using x'=(1-eta*a)*x+eta*a*center, y'=(1-4*eta)*y."""
    if type(steps) is not int or steps < 0:
        raise ValueError('steps must be a nonnegative integer')
    x, y = (Fraction(str(value)) for value in start)
    eta = Fraction(str(eta))
    a, center = quadratic_config(a, center)
    if eta <= 0:
        raise ValueError('eta must be positive')
    states = []
    for k in range(steps + 1):
        loss, gradient, _ = closed_form('quadratic', (x, y), a, center)
        states.append({'k': k, 'point': [fraction_text(x), fraction_text(y)],
                       'loss': fraction_text(loss),
                       'gradient': [fraction_text(value) for value in gradient]})
        x, y = (1 - eta * a) * x + eta * a * center, (1 - 4 * eta) * y
    return states


def build_fixture():
    points = [(-2, -0.75), (-1, 0), (-0.5, 0.25), (0, 0), (0.1, -0.2),
              (0.25, 1.5), (0.5, -0.5), (1, 0), (1.25, 0.75), (2, -1)]
    inputs = [dict(objective=objective, point=list(point))
              for objective in OBJECTIVES for point in points]
    inputs.extend(dict(objective='quadratic', point=point, a=a, center=center)
                  for point, a, center in [
                      ([2, 1], 0.25, 1), ([0, 0], 0.5, 0), ([1, 0], 4, 1),
                      ([0.1, -0.2], 0.5, -0.25), ([-1.25, 0.5], 2, -1.25),
                      ([0.125, -0.25], 0.25, 0.1), ([2, -1], 1, 0.75),
                      ([0.5, 0.25], 4, 2),
                  ])
    inputs.extend([
        dict(objective='flat', point=[1e80, 0]),
        dict(objective='flat', point=[0, 1e80]),
        dict(objective='quadratic', point=[1e154, 0]),
        dict(objective='quadratic', point=[2e154, 0]),
        dict(objective='quadratic', point=[1e308, 0]),
        dict(objective='quadratic', point=[0, 1e154]),
        dict(objective='cubic', point=[1e103, 0]),
        dict(objective='log', point=[1e-200, 0]),
        dict(objective='log', point=[1e-154, 0.5]),
        dict(objective='log', point=[0.001, -0.25]),
        dict(objective='log', point=[0, 1]),
        dict(objective='absolute', point=[0, 0.5]),
    ])
    cases = [dict(case, expected=evaluate(**case)) for case in inputs]
    descent = [dict(objective='quadratic', start=[2, 1], eta=0.25, steps=2,
                    expected=quadratic_descent([2, 1], 0.25, 2))]
    return {'policy': POLICY, 'cases': cases, 'descent': descent}


def render(data):
    return json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true', help='generate the fixture from Python')
    mode.add_argument('--check', action='store_true', help='check freshness without writing (default)')
    args = parser.parse_args(argv)
    data = build_fixture()
    expected = render(data)
    if args.write:
        with FIXTURE.open('w', encoding='utf-8', newline='\n') as handle:
            handle.write(expected)
    elif not FIXTURE.exists() or FIXTURE.read_bytes() != expected.encode('utf-8'):
        print('optimization_landscapes fixture stale or missing; run python oracle/optimization_landscapes_oracle.py --write', file=sys.stderr)
        return 1
    print(f'optimization_landscapes: {len(data["cases"])} cases + {len(data["descent"])} exact descent trace; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
