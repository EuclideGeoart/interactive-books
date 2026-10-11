"""Independent exact oracle for M8 Block A (IV.1–IV.6).

Uses Python sets, Fraction(str(value)), and exhaustive itertools enumeration;
no TypeScript outputs are read. Regenerate with --write; --check (the default)
compares deterministic JSON byte for byte without rewriting the fixture.
"""
import argparse
from fractions import Fraction
from itertools import combinations, combinations_with_replacement, permutations, product
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/probability_finite.fixtures.json'
POLICY = {
    'method': 'Independent Python Fraction, set operations and itertools enumeration',
    'rational': 'Reduced num/den, including 0/1 and 1/1',
    'finite': 'Nonempty nonnegative integer weights with positive sum; normalize by sum',
    'events': 'Zero-based outcome indices; duplicates denote the same set member',
    'complement': 'Complement of A in the full sample space',
    'conditional': 'P(A|B); null exactly when P(B)=0',
    'independent': 'Exact P(A intersection B)=P(A)P(B), including zero-mass events',
    'percentages': 'Numbers in [0,100], at most two decimal places; Fraction(str(value))/100',
    'joint': ['A&E', 'A&notE', 'notA&E', 'notA&notE'],
    'posteriorMass': 'Four cells in joint order, conditioned on selected evidence E; non-E cells zero; null if impossible',
    'counting': 'n=2..8, k=0..4; k<=n without replacement; zero-based lexicographic tuples',
    'exampleLimit': 12,
    'unorderedReplacement': 'Counts multisets only; no claim that multisets are equiprobable',
}


def rational(value):
    return f'{value.numerator}/{value.denominator}'


def finite(weights, a, b):
    if not weights or any(type(w) is not int or w < 0 for w in weights) or sum(weights) == 0:
        raise ValueError('weights must be nonempty nonnegative integers with positive total')
    for event in (a, b):
        if any(type(i) is not int or not 0 <= i < len(weights) for i in event):
            raise ValueError('event indices must be integers in the sample space')
    a, b = set(a), set(b)
    universe = set(range(len(weights)))
    total = sum(weights)

    def mass(event):
        return Fraction(sum(weights[i] for i in event), total)

    pa, pb, intersection = mass(a), mass(b), mass(a & b)
    return {
        'massA': rational(pa), 'massB': rational(pb),
        'intersection': rational(intersection), 'union': rational(mass(a | b)),
        'complement': rational(mass(universe - a)),
        'conditional': rational(intersection / pb) if pb else None,
        'independent': intersection == pa * pb,
    }


def percentage(value):
    if type(value) not in (int, float):
        raise ValueError('percentages must be finite numbers in [0,100] with at most two decimal places')
    try:
        number = Fraction(str(value))
    except ValueError:
        raise ValueError('percentages must be finite numbers') from None
    if not 0 <= number <= 100 or (number * 100).denominator != 1:
        raise ValueError('percentages must be in [0,100] with at most two decimal places')
    return number / 100


def bayes(prior, sensitivity, false_positive, evidence):
    p, s, f = map(percentage, (prior, sensitivity, false_positive))
    if evidence not in ('positive', 'negative'):
        raise ValueError('evidence must be positive or negative')
    likelihood_a, likelihood_not_a = (s, f) if evidence == 'positive' else (1 - s, 1 - f)
    cells = [p * likelihood_a, p * (1 - likelihood_a),
             (1 - p) * likelihood_not_a, (1 - p) * (1 - likelihood_not_a)]
    evidence_mass = cells[0] + cells[2]
    posterior_mass = [cells[0] / evidence_mass, Fraction(0), cells[2] / evidence_mass, Fraction(0)] if evidence_mass else None
    return {
        'evidence': rational(evidence_mass),
        'posterior': rational(cells[0] / evidence_mass) if evidence_mass else None,
        'joint': list(map(rational, cells)),
        'posteriorMass': list(map(rational, posterior_mass)) if posterior_mass is not None else None,
    }


def counting(n, k, ordered, replacement):
    if type(n) is not int or type(k) is not int or not 2 <= n <= 8 or not 0 <= k <= 4:
        raise ValueError('counting requires integer n=2..8 and k=0..4')
    if type(ordered) is not bool or type(replacement) is not bool:
        raise ValueError('ordered and replacement must be booleans')
    if not replacement and k > n:
        raise ValueError('k cannot exceed n without replacement')
    if ordered:
        outcomes = product(range(n), repeat=k) if replacement else permutations(range(n), k)
    else:
        outcomes = combinations_with_replacement(range(n), k) if replacement else combinations(range(n), k)
    count, examples = 0, []
    for outcome in outcomes:
        count += 1
        if len(examples) < POLICY['exampleLimit']:
            examples.append(list(outcome))
    return {'count': count, 'examples': examples}


def build_fixture():
    finite_inputs = [
        ([1] * 6, [1, 3, 5], [3, 4, 5]),
        ([1, 2, 3, 4], [0, 2], [1, 2]),
        ([1, 1, 1, 1], [0, 1], [0, 2]),
        ([0, 1, 2], [0], [1]),
        ([0, 1, 2], [0, 1], [0]),
        ([1, 3], [0], [1]),
        ([1, 3], [], [0, 1]),
        ([1], [0], [0]),
        ([1, 2, 3], [0, 0, 2], [2, 2]),
        ([1000000, 1, 1], [1], [1, 2]),
    ]
    events = [list(event) for k in range(4) for event in combinations(range(3), k)]
    for weights in ([1, 2, 3], [0, 1, 3]):
        finite_inputs.extend((weights, a, b) for a, b in product(events, repeat=2))
    finite_cases = [dict(weights=w, a=a, b=b, expected=finite(w, a, b)) for w, a, b in finite_inputs]
    bayes_inputs = list(product((0, 0.01, 1, 50, 100), (0, 50, 100), (0, 1, 100), ('positive', 'negative')))
    for p, s, f in ((1, 90, 5), (0.01, 99, 1), (12.34, 98.76, 0.12),
                    (20, 75, 25), (99.99, 0.01, 99.99)):
        bayes_inputs.extend((p, s, f, e) for e in ('positive', 'negative'))
    bayes_cases = [dict(prior=p, sensitivity=s, falsePositive=f, evidence=e, expected=bayes(p, s, f, e))
                   for p, s, f, e in bayes_inputs]
    counting_cases = [dict(n=n, k=k, ordered=o, replacement=r, expected=counting(n, k, o, r))
                      for n, k, o, r in product(range(2, 9), range(5), (False, True), (False, True))
                      if r or k <= n]
    return dict(policy=POLICY, finite=finite_cases, bayes=bayes_cases, counting=counting_cases)


def render(data):
    return json.dumps(data, indent=2, ensure_ascii=False) + '\n'


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
        print('probability_finite fixture stale or missing; run python oracle/probability_finite_oracle.py --write', file=sys.stderr)
        return 1
    counts = ', '.join(f'{len(data[family])} {family}' for family in ('finite', 'bayes', 'counting'))
    print(f'probability_finite: {counts}; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
