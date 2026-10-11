"""Independent exact Block B oracle for finite random variables and moments.

Weights are normalized by their total; repeated values merge into a sorted
pushforward distribution. Variance uses centered squared deviations and is
checked independently against E(X²)-E(X)². --check is the default; --write
regenerates the deterministic fixture. No browser/TypeScript output is read.
"""
import argparse
from fractions import Fraction
from itertools import product
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/probability_moments.fixtures.json'
POLICY = {
    'method': 'Independent exact Fraction weighted sums; centered variance checked against second moment identity',
    'rational': 'Reduced num/den, including 0/1 and 1/1',
    'weights': 'Nonempty nonnegative integers with positive sum; openly normalized by total',
    'values': 'One finite numeric value per weight, at most two decimal places; Fraction(str(value))',
    'transform': 'Y=scale*X+shift; finite numeric scale and shift converted by Fraction(str(value))',
    'distribution': 'Original X values merged exactly, sorted ascending; zero-mass values omitted',
    'variance': 'Population variance: sum(w*(x-mean)^2)/sum(w), not sample variance',
}


def rational(value):
    return f'{value.numerator}/{value.denominator}'


def number(value):
    if type(value) not in (int, float):
        raise ValueError('expected a finite number')
    try:
        if math.isfinite(value):
            return Fraction(str(value))
    except OverflowError:
        pass
    raise ValueError('expected a finite number')


def moments(weights, values, scale=1, shift=0):
    if not weights or any(type(w) is not int or w < 0 for w in weights) or sum(weights) == 0:
        raise ValueError('weights must be nonempty nonnegative integers with positive total')
    if len(values) != len(weights):
        raise ValueError('values must have one entry per weight')
    values = list(map(number, values))
    if any((x * 100).denominator != 1 for x in values):
        raise ValueError('values must have at most two decimal places')
    scale, shift = map(number, (scale, shift))
    total = sum(weights)
    mean = sum(w * x for w, x in zip(weights, values)) / total
    second = sum(w * x ** 2 for w, x in zip(weights, values)) / total
    variance = sum(w * (x - mean) ** 2 for w, x in zip(weights, values)) / total
    assert variance == second - mean ** 2
    transformed = [scale * x + shift for x in values]
    scaled_mean = sum(w * y for w, y in zip(weights, transformed)) / total
    scaled_variance = sum(w * (y - scaled_mean) ** 2 for w, y in zip(weights, transformed)) / total
    assert scaled_mean == scale * mean + shift
    assert scaled_variance == scale ** 2 * variance
    masses = {}
    for w, x in zip(weights, values):
        if w:
            masses[x] = masses.get(x, Fraction(0)) + Fraction(w, total)
    return {
        'mean': rational(mean), 'secondMoment': rational(second), 'variance': rational(variance),
        'scaledMean': rational(scaled_mean), 'scaledVariance': rational(scaled_variance),
        'distribution': [dict(value=rational(x), mass=rational(masses[x])) for x in sorted(masses)],
    }


def build_fixture():
    inputs = [
        ([1, 2, 1], [-2, 0, 4]),
        ([1] * 6, [0, 0, 1, 1, 2, 2]),
        ([1] * 6, [1, 2, 3, 4, 5, 6]),
        ([0, 1, 0], [-100, 2.5, 100]),
        ([1], [-1.25]),
        ([1, 2, 3], [4, 4, 4]),
        ([3, 1, 2, 0], [2, -1.25, 2, 100]),
        ([1, 3], [0.01, 0.02]),
        ([1, 1], [-0.01, 0.01]),
        ([1000000, 1], [-2, 4]),
    ]
    inputs.extend((list(w), [-2, 0, 4]) for w in product(range(3), repeat=3) if sum(w))
    cases = [dict(weights=w, values=v, scale=s, shift=t, expected=moments(w, v, s, t))
             for w, v in inputs for s, t in ((1, 0), (0, 3), (-2, 3), (0.5, -1.25))]
    return dict(policy=POLICY, cases=cases)


def render(data):
    return json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true', help='regenerate the deterministic fixture')
    mode.add_argument('--check', action='store_true', help='check fixture freshness (default)')
    args = parser.parse_args(argv)
    data = build_fixture()
    expected = render(data)
    if args.write:
        with FIXTURE.open('w', encoding='utf-8', newline='\n') as handle:
            handle.write(expected)
    elif not FIXTURE.exists() or FIXTURE.read_text(encoding='utf-8') != expected:
        print('probability_moments fixture stale or missing; run python oracle/probability_moments_oracle.py --write', file=sys.stderr)
        return 1
    print(f'probability_moments: {len(data["cases"])} cases; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
