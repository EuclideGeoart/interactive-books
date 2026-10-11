"""II.1–II.7 oracle: Fraction polarization, elimination, and Decimal square roots.

Expected exact values do not pass through binary64. Cross/dot values come from
shoelace area and polarization, unlike the browser's component products.
NumPy is never used to produce the fixture.
"""
from decimal import Decimal, localcontext
from fractions import Fraction as F
from pathlib import Path
import argparse
import json
import math
import random


def q(x):
    return F(str(x))


def sq(v):
    return sum(x ** 2 for x in v)


def inner(u, v):
    return (sq(tuple(x + y for x, y in zip(u, v))) - sq(u) - sq(v)) / 2


def dec(x):
    return Decimal(x.numerator) / Decimal(x.denominator)


def norm(v):
    with localcontext() as ctx:
        ctx.prec = 160
        return float(dec(sq(v)).sqrt())


def normalize(v):
    if not any(v):
        return None
    with localcontext() as ctx:
        ctx.prec = 160
        h = dec(sq(v)).sqrt()
        return [float(dec(x) / h) for x in v]


def coordinates(u, v, p):
    """Exact row elimination, not the browser's two Cramer quotients."""
    rows = [[u[i], v[i], p[i]] for i in range(2)]
    if not rows[0][0]:
        rows.reverse()
    if not rows[0][0]:
        return None
    factor = rows[1][0] / rows[0][0]
    rows[1] = [y - factor * x for x, y in zip(rows[0], rows[1])]
    if not rows[1][1]:
        return None
    b = rows[1][2] / rows[1][1]
    a = (rows[0][2] - rows[0][1] * b) / rows[0][0]
    return [a, b]


def expected(data):
    u, v, p = (tuple(map(q, data[key])) for key in ('u', 'v', 'p'))
    k, a, b = (q(data[key]) for key in ('k', 'a', 'b'))
    # Shoelace area of the polygon 0,u,u+v,v gives the signed determinant.
    polygon = [(F(0), F(0)), u, tuple(x+y for x, y in zip(u, v)), v]
    det = sum(x*y2 - y*x2 for (x, y), (x2, y2) in zip(polygon, polygon[1:] + polygon[:1])) / 2
    product = inner(u, v)
    rank = 2 if det else 1 if any(u) or any(v) else 0
    coords = coordinates(u, v, p)
    if rank == 2:
        reachable = True
    else:
        axis = u if any(u) else v
        reachable = (axis[0]*p[1] == axis[1]*p[0]) if any(axis) else not any(p)
    out = dict(sum=[x+y for x, y in zip(u, v)], difference=[y-x for x, y in zip(u, v)],
               scaled=[k*x for x in v], normSq=sq(v), norm=norm(v), unit=normalize(v),
               l1=sum(abs(x) for x in v), linf=max(map(abs, v)), dot=product, det=det,
               combination=[a*x+b*y for x, y in zip(u, v)], rank=rank, coords=coords, reachable=reachable)
    if any(u) and any(v):
        with localcontext() as ctx:
            ctx.prec = 160
            out['cosine'] = float(dec(product) / (dec(sq(u))*dec(sq(v))).sqrt())
        out['angle'] = math.atan2(float(abs(det)), float(product))
    else:
        out['cosine'] = out['angle'] = None
    if any(u):
        factor = product / sq(u)
        projected = [factor*x for x in u]
        residual = [y-x for y, x in zip(v, projected)]
        with localcontext() as ctx:
            ctx.prec = 160
            signed = float(dec(product) / dec(sq(u)).sqrt())
        out['projection'] = dict(factor=factor, vector=projected, residual=residual,
                                 residualDot=inner(residual, u), distance=norm(residual), signed=signed)
    else:
        out['projection'] = None
    return out


def serial(value):
    if isinstance(value, F):
        return str(value)
    if isinstance(value, dict):
        return {k: serial(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serial(v) for v in value]
    return value


def fixture():
    rng = random.Random(60107)
    data = []
    pairs = [([2, 1], [1, 2]), ([0, 0], [0, 0]), ([1, 1], [2, 2]),
             ([2, 1], [-1, 2]), ([0, 0], [3, 4]), ([0, 2], [3, 0]),
             ([3, 2.99], [3.01, 3]), ([0.1, 0.2], [0.2, 0.4]),
             ([0.01, 0], [0, 0.01]), ([4, 4], [-4, -4])]
    pairs += [([rng.randint(-400, 400)/100 for _ in range(2)], [rng.randint(-400, 400)/100 for _ in range(2)]) for _ in range(120)]
    for i, (u, v) in enumerate(pairs):
        item = dict(u=u, v=v, k=[-2, 0, 0.5, 1, 2][i % 5], a=rng.randint(-200, 200)/100,
                    b=rng.randint(-200, 200)/100, p=[3, 0] if i < 10 else [rng.randint(-400, 400)/100 for _ in range(2)])
        data.append(dict(input=item, expected=serial(expected(item))))
    numeric = []
    for v in [[0, 0], [3, 4], [1.7e308, 1.7e308], [1e-300, -1e-300], [5e-324, 5e-324], [1e308, 1e-308]]:
        numeric.append(dict(input=v, unit=normalize(tuple(F.from_float(float(x)) for x in v))))
    return dict(policy='Exact fractions match exactly. Numeric results: 16 ulps or 16 eps relative, absolute floor 1e-15 only for angles/cosines near zero. Decimal oracle precision 160.', cases=data, numeric=numeric)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / 'fixtures/linear-algebra.fixtures.json'
    content = json.dumps(fixture(), indent=2, allow_nan=False) + '\n'
    if args.check:
        if not target.exists() or target.read_text() != content:
            raise SystemExit('linear-algebra.fixtures.json is stale')
        print('linear algebra: 130 exact cases + 6 numerical cases fresh')
    else:
        target.write_text(content)
