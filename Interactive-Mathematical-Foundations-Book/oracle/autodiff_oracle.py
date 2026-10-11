"""Independent automatic-differentiation oracle for III.10.

The graphs are re-written here as ordinary Python programs (not as node lists). Gradients come from FORWARD-mode dual numbers over Fraction
(exact for rational operations) and, for sin, over 60-digit Decimal with Taylor series. The browser computes the same quantities by REVERSE-mode
adjoint accumulation on its graph, so agreement checks two different algorithms. Per-edge contributions for the shared-input and repeated-input
graphs are produced by a separate explicit tape. Undefined values (division by zero) are recorded as null and must stay undefined.
Writes fixtures/autodiff.fixtures.json; `--check` fails when the committed fixture is stale.
"""
from decimal import Decimal as D, getcontext
from fractions import Fraction as F
from pathlib import Path
import json
import sys

getcontext().prec = 60
FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/autodiff.fixtures.json'
PI2 = 2 * D('3.14159265358979323846264338327950288419716939937510582097494459230781640628620899')


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


def to_d(v):
    return D(v.numerator) / D(v.denominator) if isinstance(v, F) else v


def lift(*vs):
    """Exact Fractions stay exact; once a Decimal (from sin) is involved, everything becomes 60-digit Decimal."""
    return vs if not any(isinstance(v, D) for v in vs) else tuple(to_d(v) for v in vs)


class Dual:
    def __init__(self, a, b=0):
        self.a, self.b = a, b

    def _w(self, o):
        return o if isinstance(o, Dual) else Dual(o)

    def __add__(self, o):
        o = self._w(o); a1, a2, b1, b2 = lift(self.a, o.a, self.b, o.b); return Dual(a1 + a2, b1 + b2)
    __radd__ = __add__

    def __sub__(self, o):
        o = self._w(o); a1, a2, b1, b2 = lift(self.a, o.a, self.b, o.b); return Dual(a1 - a2, b1 - b2)

    def __mul__(self, o):
        o = self._w(o); a1, a2, b1, b2 = lift(self.a, o.a, self.b, o.b); return Dual(a1 * a2, a1 * b2 + b1 * a2)
    __rmul__ = __mul__

    def __truediv__(self, o):
        o = self._w(o)
        if o.a == 0:
            raise ZeroDivisionError
        a1, a2, b1, b2 = lift(self.a, o.a, self.b, o.b)
        return Dual(a1 / a2, (b1 * a2 - a1 * b2) / (a2 * a2))


def sin(v):
    return Dual(dsin(to_d(v.a)), dcos(to_d(v.a)) * to_d(v.b))


PROGRAMS = {
    'shared-input': (['x', 'y'], lambda x, y: [(x + y) * x]),
    'sin-product': (['x', 'y'], lambda x, y: [x * y + sin(x)]),
    'scalar-loss': (['a', 'b', 'c'], lambda a, b, c: [(a * b + c) * (a * b + c)]),
    'many-outputs': (['t'], lambda t: [t * t, t * t * t, sin(t)]),
    'quotient': (['x', 'y'], lambda x, y: [x / (x - y)]),
    'square': (['x'], lambda x: [x * x]),
}


def out(v):
    return {'exact': (f'{v.numerator}' if v.denominator == 1 else f'{v.numerator}/{v.denominator}')} if isinstance(v, F) else {'value': float(v)}


def case(gid, values):
    names, prog = PROGRAMS[gid]
    vals = [F(v) for v in values]
    try:
        primal = prog(*[Dual(v) for v in vals])
    except ZeroDivisionError:
        return {'graph': gid, 'inputs': values, 'outputs': None, 'jacobian': None}
    jac = []
    for k in range(len(names)):
        tangents = prog(*[Dual(v, F(1) if i == k else F(0)) for i, v in enumerate(vals)])
        jac.append([t.b for t in tangents])
    # transpose: rows = outputs, columns = inputs
    rows = [[out(jac[k][j]) for k in range(len(names))] for j in range(len(primal))]
    return {'graph': gid, 'inputs': values, 'outputs': [out(p.a) for p in primal], 'jacobian': rows}


def tape_contributions(x, y):
    """Explicit tape for z = (x + y) * x: each (from, to, contribution) recorded during the backward sweep."""
    u = x + y
    adj = {'z': F(1), 'u': F(0), 'x': F(0), 'y': F(0)}
    contributions = []
    for node, edges in [('z', [('u', x), ('x', u)]), ('u', [('x', F(1)), ('y', F(1))])]:
        for arg, local in edges:
            amount = adj[node] * local; adj[arg] += amount; contributions.append([arg, node, str(amount)])
    return contributions, str(adj['x']), str(adj['y'])


def build():
    grid2 = [['2', '3'], ['-1', '0.5'], ['0', '0'], ['1.5', '-2'], ['-3.5', '4'], ['0.5', '0.5']]
    cases = [case(g, v) for g in ['shared-input', 'sin-product', 'quotient'] for v in grid2]
    cases += [case('scalar-loss', v) for v in [['1', '2', '-1'], ['0', '0', '0'], ['-1.5', '2.5', '3'], ['4', '-4', '0.5']]]
    cases += [case(g, [v]) for g in ['many-outputs', 'square'] for v in ['1.5', '0', '-2', '3.5']]
    tapes = []
    for x, y in [('2', '3'), ('-1', '0.5'), ('0', '4')]:
        c, ax, ay = tape_contributions(F(x), F(y)); tapes.append({'x': x, 'y': y, 'contributions': c, 'adjoint_x': ax, 'adjoint_y': ay})
    return {'method': 'forward-mode dual numbers over Fraction (Decimal(60) Taylor series for sin); explicit tape for shared-input contributions',
            'tolerance': 'rational outputs and derivatives exact; sin-dependent values within 8 ulps of the 60-digit reference', 'cases': cases, 'tapes': tapes}


def main():
    text = json.dumps(build(), indent=1) + '\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text() != text:
            raise SystemExit('autodiff fixture stale: run python oracle/autodiff_oracle.py')
        b = build(); print(f"autodiff: {len(b['cases'])} graph cases + {len(b['tapes'])} tapes fresh")
    else:
        FIXTURE.write_text(text)


if __name__ == '__main__':
    main()
