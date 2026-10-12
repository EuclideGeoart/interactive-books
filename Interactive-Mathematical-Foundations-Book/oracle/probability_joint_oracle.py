"""Independent Fraction oracle for Block C joint tables; default --check is read-only."""
import argparse
from fractions import Fraction as F
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/probability_joint.fixtures.json'
POLICY = {
    'weights': 'Nine row-major integer weights in [0,1000000], positive total, openly normalized',
    'coordinates': 'Rows U and columns V each [-1,0,1]; X=xScale*U+xShift, Y=yScale*V+yShift',
    'parameters': 'Finite numeric scales/shifts bounded by 1000000 with at most two decimal places',
    'exact': 'Reduced num/den strings; centered moments independently checked against second moments',
    'conditional': 'Rows describe V given U; columns describe U given V; null for zero primitive marginal',
    'independence': 'Independence of transformed X,Y, hence true if either scale is zero',
    'correlation': 'Binary64 covariance/sqrt(varX*varY); null if either variance is zero; scaled tolerance 2e-12',
}


def rational(value):
    return f'{value.numerator}/{value.denominator}'


def decimal(value):
    if type(value) not in (int, float) or abs(value) > 1000000 or not math.isfinite(value):
        raise ValueError('expected a bounded finite numeric parameter')
    result = F(str(value))
    if (100 * result).denominator != 1:
        raise ValueError('parameters require at most two decimal places')
    return result


def joint(weights, xScale=1, yScale=1, xShift=0, yShift=0):
    if not isinstance(weights, (list, tuple)) or len(weights) != 9 or any(type(w) is not int or not 0 <= w <= 1000000 for w in weights) or not sum(weights):
        raise ValueError('expected nine bounded nonnegative integer weights with positive total')
    sx, sy, tx, ty = map(decimal, (xScale, yScale, xShift, yShift))
    mass = [F(w, sum(weights)) for w in weights]
    rows = [sum(mass[3*i:3*i+3]) for i in range(3)]
    cols = [sum(mass[j::3]) for j in range(3)]
    xs, ys = [sx*i+tx for i in (-1, 0, 1)], [sy*j+ty for j in (-1, 0, 1)]
    mx, my = sum(p*x for p, x in zip(rows, xs)), sum(p*y for p, y in zip(cols, ys))
    ex2, ey2 = sum(p*x*x for p, x in zip(rows, xs)), sum(p*y*y for p, y in zip(cols, ys))
    vx, vy = sum(p*(x-mx)**2 for p, x in zip(rows, xs)), sum(p*(y-my)**2 for p, y in zip(cols, ys))
    cov = sum(mass[3*i+j]*(xs[i]-mx)*(ys[j]-my) for i in range(3) for j in range(3))
    exy = sum(mass[3*i+j]*xs[i]*ys[j] for i in range(3) for j in range(3))
    assert vx == ex2-mx*mx and vy == ey2-my*my and cov == exy-mx*my
    assert cov*cov <= vx*vy
    # Group transformed coordinates independently, including collapsed constant coordinates.
    grouped = {}
    px, py = {}, {}
    for i in range(3):
        for j in range(3):
            p = mass[3*i+j]
            grouped[xs[i], ys[j]] = grouped.get((xs[i], ys[j]), F(0)) + p
            px[xs[i]] = px.get(xs[i], F(0)) + p
            py[ys[j]] = py.get(ys[j], F(0)) + p
    independent = all(grouped.get((x,y), F(0)) == p*q for x,p in px.items() for y,q in py.items())
    return {
        'joint': list(map(rational, mass)), 'rowMass': list(map(rational, rows)), 'colMass': list(map(rational, cols)),
        'conditionalRows': [[rational(mass[3*i+j]/rows[i]) for j in range(3)] if rows[i] else None for i in range(3)],
        'conditionalCols': [[rational(mass[3*i+j]/cols[j]) for i in range(3)] if cols[j] else None for j in range(3)],
        'xValues': list(map(rational, xs)), 'yValues': list(map(rational, ys)),
        'meanX': rational(mx), 'meanY': rational(my), 'secondX': rational(ex2), 'secondY': rational(ey2),
        'varX': rational(vx), 'varY': rational(vy), 'crossMoment': rational(exy), 'covariance': rational(cov),
        'correlation': float(cov)/math.sqrt(float(vx)*float(vy)) if vx and vy else None,
        'independent': independent,
    }


def build_fixture():
    tables = [
        [1,1,0,1,2,1,0,1,1], [1,2,1,2,4,2,1,2,1], [1,0,0,0,1,0,0,0,1],
        [0,0,1,0,1,0,1,0,0], [0,0,1,0,1,0,0,0,1], [0,0,0,1,2,3,1,0,1],
        [0,0,0,1,2,1,0,0,0], [1000000,0,1,0,1,0,1,0,1000000],
    ]
    transforms = [(1,1,0,0), (-1,1,0,0), (2,-3,1.25,-2.5), (0,1,2,0),
                  (1,0,0,-1.25), (0,0,0,0), (0.01,-0.02,0.03,-0.04), (1000000,-1000000,1000000,-1000000)]
    cases = [dict(weights=w, xScale=sx, yScale=sy, xShift=tx, yShift=ty,
                  expected=joint(w,sx,sy,tx,ty)) for w in tables for sx,sy,tx,ty in transforms]
    for k in range(48):
        w = [((k+3)*(j+1)**2+5*j+k*k) % 11 for j in range(9)]
        sx,sy,tx,ty = transforms[k % len(transforms)]
        cases.append(dict(weights=w,xScale=sx,yScale=sy,xShift=tx,yShift=ty,expected=joint(w,sx,sy,tx,ty)))
    return dict(policy=POLICY, cases=cases)


def render(data):
    return json.dumps(data, indent=2, allow_nan=False) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args(argv)
    data = build_fixture()
    expected = render(data)
    if args.write:
        with FIXTURE.open('w', encoding='utf-8', newline='\n') as handle:
            handle.write(expected)
    elif not FIXTURE.exists() or FIXTURE.read_text(encoding='utf-8') != expected:
        print('probability_joint fixture stale or missing; run oracle/probability_joint_oracle.py --write', file=sys.stderr)
        return 1
    print(f'probability_joint: {len(data["cases"])} cases; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
