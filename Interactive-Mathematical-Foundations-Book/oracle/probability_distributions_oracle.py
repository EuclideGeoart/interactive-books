"""Independent Block B binomial, uniform and normal distribution oracle.

Uses exact Fraction arithmetic, exhaustive binary sequences for n<=8, direct
math.comb for larger n, and math.erfc rather than browser Simpson integration.
--write regenerates JSON; --check (default) checks deterministic freshness.
"""
import argparse
from fractions import Fraction
from itertools import product
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/probability_distributions.fixtures.json'
POLICY = {
    'method': 'Independent Fraction and itertools for n<=8; math.comb for n>8; normal math.erfc',
    'rational': 'Reduced num/den, including 0/1 and 1/1',
    'binomial': 'Integer n=0..30, k=-1..31; impossible k has mass 0; n=0 has mass 1 at k=0',
    'percentages': 'Finite numbers in [0,100], at most two decimals; Fraction(str(p))/100',
    'pmf': 'Array indexed by k=0..n; p=0 and p=100 include all degenerate boundaries',
    'uniform': 'Finite numeric endpoints with at most two decimals; bounded support [a,b], a<b, lower<=upper',
    'density': 'Uniform density on support is 1/(b-a); single points have probability zero',
    'normal': 'Finite mean and interval endpoints, positive finite sigma, lower<=upper; erfc CDF and survival differences in positive tails',
    'cdfAbsoluteTolerance': 1e-9,
    'intervalAbsoluteTolerance': 2e-9,
}


def rational(value):
    return f'{value.numerator}/{value.denominator}'


def finite_number(value):
    if type(value) not in (int, float):
        raise ValueError('expected a finite number')
    try:
        if math.isfinite(value):
            return value
    except OverflowError:
        pass
    raise ValueError('expected a finite number')


def decimal(value):
    number = Fraction(str(finite_number(value)))
    if (number * 100).denominator != 1:
        raise ValueError('expected at most two decimal places')
    return number


def binomial(n, p, k):
    if type(n) is not int or not 0 <= n <= 30 or type(k) is not int or not -1 <= k <= 31:
        raise ValueError('binomial requires integer n=0..30 and k=-1..31')
    p = decimal(p) / 100
    if not 0 <= p <= 1:
        raise ValueError('p must be a percentage in [0,100]')
    if n <= 8:
        pmf = [Fraction(0) for _ in range(n + 1)]
        for outcome in product((0, 1), repeat=n):
            mass = math.prod(p if bit else 1 - p for bit in outcome)
            pmf[sum(outcome)] += mass
    else:
        pmf = [math.comb(n, j) * p ** j * (1 - p) ** (n - j) for j in range(n + 1)]
    mean = sum(j * mass for j, mass in enumerate(pmf))
    variance = sum((j - mean) ** 2 * mass for j, mass in enumerate(pmf))
    return {
        'pmf': list(map(rational, pmf)),
        'selected': rational(pmf[k] if 0 <= k <= n else Fraction(0)),
        'mean': rational(mean), 'variance': rational(variance),
    }


def uniform(a, b, lower, upper):
    a, b, lower, upper = map(decimal, (a, b, lower, upper))
    if a >= b or lower > upper:
        raise ValueError('uniform requires a<b and lower<=upper')

    def cdf(x):
        return min(Fraction(1), max(Fraction(0), (x - a) / (b - a)))

    return {
        'density': rational(1 / (b - a)),
        'probability': rational(max(Fraction(0), min(b, upper) - max(a, lower)) / (b - a)),
        'lowerCDF': rational(cdf(lower)), 'upperCDF': rational(cdf(upper)),
    }


def normal(mean, sigma, lower, upper):
    mean, sigma, lower, upper = map(finite_number, (mean, sigma, lower, upper))
    if sigma <= 0 or lower > upper:
        raise ValueError('normal requires positive sigma and lower<=upper')
    lo, hi = ((x - mean) / sigma / math.sqrt(2) for x in (lower, upper))
    lower_cdf, upper_cdf = (math.erfc(-z) / 2 for z in (lo, hi))
    # Survival subtraction preserves small positive-tail intervals when CDFs round to 1.
    probability = (math.erfc(lo) - math.erfc(hi)) / 2 if lo >= 0 else upper_cdf - lower_cdf
    density = (1 / sigma) / math.sqrt(2 * math.pi)
    if not math.isfinite(density):
        raise ValueError('sigma is too small to represent its density')
    return {
        'probability': probability, 'lowerCDF': lower_cdf,
        'upperCDF': upper_cdf, 'densityAtMean': density,
    }


def build_fixture():
    binomial_inputs = [(n, p, k)
                       for n, p in product((0, 1, 2, 5, 8, 10, 20, 30), (0, 0.01, 12.34, 25, 50, 99.99, 100))
                       for k in sorted(set((-1, 0, n // 2, n, n + 1, 31)))]
    uniform_inputs = [(a, b, lower, upper)
                      for a, b in ((0, 1), (-2, 4), (-1.25, 2.75), (0.01, 0.02))
                      for lower, upper in ((a - 1, a), (b, b + 1), (a - 1, b + 1), (a, b),
                                           (a, a), (b, b))]
    # Decimal literals avoid binary arithmetic artifacts at the input boundary.
    uniform_inputs.extend(((0, 10, 2, 7), (-2, 4, -3, 1), (-2, 4, 1, 5),
                           (-1.25, 2.75, -0.50, 1.25),
                           (0, 1, -2, -1), (0, 1, 2, 3), (0, 1, 0.5, 0.5)))
    normal_inputs = [(mean, sigma, mean + sigma * lo, mean + sigma * hi)
                     for mean, sigma in ((0, 1), (3, 2), (-2.5, 0.5))
                     for lo, hi in ((-1, 1), (-2, 2), (-3, 3), (-8, 8), (-1, 0), (0, 1),
                                    (-6, -5), (5, 6), (-9, -8), (8, 9), (-0.01, 0.01),
                                    (0, 0), (-1, -1), (1, 1), (-4, 2))]
    return {
        'policy': POLICY,
        'binomial': [dict(n=n, p=p, k=k, expected=binomial(n, p, k)) for n, p, k in binomial_inputs],
        'uniform': [dict(a=a, b=b, lower=lo, upper=hi, expected=uniform(a, b, lo, hi))
                    for a, b, lo, hi in uniform_inputs],
        'normal': [dict(mean=m, sigma=s, lower=lo, upper=hi, expected=normal(m, s, lo, hi))
                   for m, s, lo, hi in normal_inputs],
    }


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
        print('probability_distributions fixture stale or missing; run python oracle/probability_distributions_oracle.py --write', file=sys.stderr)
        return 1
    counts = ', '.join(f'{len(data[key])} {key}' for key in ('binomial', 'uniform', 'normal'))
    print(f'probability_distributions: {counts}; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
