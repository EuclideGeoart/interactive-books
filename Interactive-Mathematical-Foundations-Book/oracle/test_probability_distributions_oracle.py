"""Handwork, independent integration/convolution, bounded laws and reference execution.

Run with PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m unittest discover
-s oracle -p test_probability_distributions_oracle.py -v. Missing references fail.
"""
from contextlib import redirect_stdout, redirect_stderr
from fractions import Fraction as F
from io import StringIO
from itertools import product
import json
import math
from pathlib import Path
import runpy
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import probability_distributions_oracle as oracle


def simpson(lower, upper, steps=4096):
    """Independent integration of the standard normal PDF, without erfc/CDF calls."""
    h = (upper - lower) / steps
    def density(x):
        return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)
    return h / 3 * math.fsum([density(lower), density(upper)] +
                            [(4 if i % 2 else 2) * density(lower + i * h)
                             for i in range(1, steps)])


class BinomialTests(unittest.TestCase):
    def test_hand_worked_small_distributions(self):
        self.assertEqual(oracle.binomial(2, 50, 1), {
            'pmf': ['1/4', '1/2', '1/4'], 'selected': '1/2', 'mean': '1/1', 'variance': '1/2',
        })
        self.assertEqual(oracle.binomial(3, 25, 2), {
            'pmf': ['27/64', '27/64', '9/64', '1/64'], 'selected': '9/64',
            'mean': '3/4', 'variance': '9/16',
        })
        self.assertEqual(oracle.binomial(1, 12.34, 1), {
            'pmf': ['4383/5000', '617/5000'], 'selected': '617/5000',
            'mean': '617/5000', 'variance': '2704311/25000000',
        })
        self.assertEqual(oracle.binomial(10, 50, 5)['selected'], '63/256')
        self.assertEqual(oracle.binomial(30, 50, 15)['selected'], '9694845/67108864')

    def test_zero_trials_and_degenerate_probabilities(self):
        for p in (0, 0.01, 50, 100):
            for k in (-1, 0, 1, 31):
                result = oracle.binomial(0, p, k)
                self.assertEqual(result, {'pmf': ['1/1'], 'selected': '1/1' if k == 0 else '0/1',
                                          'mean': '0/1', 'variance': '0/1'})
        for n, p in product(range(31), (0, 100)):
            result = oracle.binomial(n, p, n)
            self.assertEqual(result['variance'], '0/1')
            self.assertEqual(result['pmf'], ['1/1' if j == (n if p else 0) else '0/1'
                                             for j in range(n + 1)])
            for k in (-1, n + 1, 31):
                self.assertEqual(oracle.binomial(n, p, k)['selected'], '0/1')

    def test_bounded_sweep_against_independent_convolution(self):
        # Repeated Bernoulli convolution independently checks both oracle branches.
        for percentage in (0, 0.01, 12.34, 25, 50, 99.99, 100):
            p = F(str(percentage)) / 100
            pmf = [F(1)]
            for n in range(31):
                result = oracle.binomial(n, percentage, n // 2)
                actual = list(map(F, result['pmf']))
                self.assertEqual(actual, pmf)
                self.assertEqual(sum(actual), 1)
                self.assertTrue(all(0 <= mass <= 1 for mass in actual))
                self.assertEqual(F(result['selected']), pmf[n // 2])
                self.assertEqual(F(result['mean']), n * p)
                self.assertEqual(F(result['variance']), n * p * (1 - p))
                next_pmf = [F(0)] * (n + 2)
                for j, mass in enumerate(pmf):
                    next_pmf[j] += (1 - p) * mass
                    next_pmf[j + 1] += p * mass
                pmf = next_pmf

    def test_reflection_and_small_enumeration_against_comb(self):
        for n, p in product(range(9), (0, 12.34, 50, 100)):
            result = oracle.binomial(n, p, 0)
            q = F(str(p)) / 100
            self.assertEqual(list(map(F, result['pmf'])),
                             [math.comb(n, k) * q ** k * (1 - q) ** (n - k) for k in range(n + 1)])
        for n in (1, 8, 9, 30):
            self.assertEqual(oracle.binomial(n, 25, 0)['pmf'],
                             oracle.binomial(n, 75, 0)['pmf'][::-1])

    def test_invalid_inputs(self):
        for n, k in ((-1, 0), (31, 0), (2.0, 0), (True, 0), (2, -2), (2, 32),
                     (2, 1.0), (2, True), (None, 0), (2, '1')):
            with self.subTest(n=n, k=k), self.assertRaises(ValueError):
                oracle.binomial(n, 50, k)
        for p in (-0.01, 100.01, 0.001, 12.345, float('nan'), float('inf'),
                  float('-inf'), True, '50', None):
            with self.subTest(p=p), self.assertRaises(ValueError):
                oracle.binomial(2, p, 1)


class UniformTests(unittest.TestCase):
    def test_hand_worked_intervals_and_decimal_inputs(self):
        self.assertEqual(oracle.uniform(-2, 4, -3, 1), {
            'density': '1/6', 'probability': '1/2', 'lowerCDF': '0/1', 'upperCDF': '1/2',
        })
        self.assertEqual(oracle.uniform(-1.25, 2.75, -0.5, 1.25), {
            'density': '1/4', 'probability': '7/16', 'lowerCDF': '3/16', 'upperCDF': '5/8',
        })
        self.assertEqual(oracle.uniform(0.01, 0.02, 0.01, 0.02), {
            'density': '100/1', 'probability': '1/1', 'lowerCDF': '0/1', 'upperCDF': '1/1',
        })

    def test_points_outside_and_overlap(self):
        for lo, hi, expected in ((-2, -1, '0/1'), (2, 3, '0/1'), (-1, 2, '1/1'),
                                 (-1, 0.5, '1/2'), (0.5, 2, '1/2'), (0, 1, '1/1')):
            self.assertEqual(oracle.uniform(0, 1, lo, hi)['probability'], expected)
        for x in (-1, 0, 0.5, 1, 2):
            result = oracle.uniform(0, 1, x, x)
            self.assertEqual(result['probability'], '0/1')
            self.assertEqual(result['lowerCDF'], result['upperCDF'])

    def test_bounded_sweep_cdf_laws_and_additivity(self):
        for a, b in ((0, 1), (-2, 4), (-1.25, 2.75), (0.01, 0.02)):
            points = sorted(set((a, b, -3, -1, 0, 0.01, 0.02, 0.5, 1, 3, 5)))
            cdfs = [F(oracle.uniform(a, b, x, x)['lowerCDF']) for x in points]
            self.assertEqual(cdfs, sorted(cdfs))
            for i, lo in enumerate(points):
                for j in range(i, len(points)):
                    hi = points[j]
                    result = oracle.uniform(a, b, lo, hi)
                    probability = F(result['probability'])
                    self.assertEqual(probability, cdfs[j] - cdfs[i])
                    self.assertTrue(0 <= probability <= 1)
                    self.assertEqual(F(result['density']) * (F(str(b)) - F(str(a))), 1)
                    mid = points[(i + j) // 2]
                    self.assertEqual(probability, F(oracle.uniform(a, b, lo, mid)['probability']) +
                                     F(oracle.uniform(a, b, mid, hi)['probability']))

    def test_invalid_inputs(self):
        for args in ((1, 1, 0, 1), (2, 1, 0, 1), (0, 1, 2, 1)):
            with self.assertRaises(ValueError):
                oracle.uniform(*args)
        for position, invalid in product(range(4), (float('nan'), float('inf'), float('-inf'),
                                                     0.001, True, '0', None)):
            args = [0, 1, 0, 1]
            args[position] = invalid
            with self.subTest(args=args), self.assertRaises(ValueError):
                oracle.uniform(*args)


class NormalTests(unittest.TestCase):
    def test_literal_standard_normal_handwork(self):
        result = oracle.normal(0, 1, -1, 1)
        self.assertAlmostEqual(result['probability'], 0.6826894921370859, delta=2e-9)
        self.assertAlmostEqual(result['lowerCDF'], 0.15865525393145707, delta=1e-9)
        self.assertAlmostEqual(result['upperCDF'], 0.8413447460685429, delta=1e-9)
        self.assertAlmostEqual(result['densityAtMean'], 0.3989422804014327, delta=1e-15)
        for x, cdf in ((0, 0.5), (2, 0.9772498680518208), (3, 0.9986501019683699),
                       (-5, 2.866515718791933e-7), (-8, 6.220960574271784e-16)):
            self.assertAlmostEqual(oracle.normal(0, 1, x, x)['lowerCDF'], cdf, delta=1e-15)
        tail = oracle.normal(0, 1, 8, 9)['probability']
        self.assertAlmostEqual(tail, 6.21983198586583e-16, delta=1e-28)
        self.assertGreater(tail, 0)

    def test_independent_simpson_cdfs_and_intervals(self):
        for case in oracle.build_fixture()['normal']:
            mean, sigma, lo, hi = (case[k] for k in ('mean', 'sigma', 'lower', 'upper'))
            zlo, zhi = (lo - mean) / sigma, (hi - mean) / sigma
            result = case['expected']
            for key, z in (('lowerCDF', zlo), ('upperCDF', zhi)):
                self.assertAlmostEqual(result[key], simpson(-12, z), delta=1e-9)
            self.assertAlmostEqual(result['probability'], simpson(zlo, zhi), delta=2e-9)
            self.assertAlmostEqual(result['densityAtMean'] * sigma, 0.3989422804014327, delta=1e-15)
        for lo, hi in ((5, 6), (8, 9), (-9, -8)):
            integrated = simpson(lo, hi)
            self.assertAlmostEqual(oracle.normal(0, 1, lo, hi)['probability'], integrated,
                                   delta=integrated * 1e-10)

    def test_bounded_cdf_monotonicity_symmetry_and_additivity(self):
        points = [i / 4 for i in range(-40, 41)]
        cdfs = [oracle.normal(0, 1, z, z)['lowerCDF'] for z in points]
        self.assertEqual(cdfs, sorted(cdfs))
        self.assertTrue(all(0 <= cdf <= 1 for cdf in cdfs))
        for z, cdf in zip(points, cdfs):
            self.assertAlmostEqual(cdf + oracle.normal(0, 1, -z, -z)['lowerCDF'], 1, delta=1e-15)
            self.assertEqual(oracle.normal(0, 1, z, z)['probability'], 0)
            if z >= 0:
                self.assertAlmostEqual(oracle.normal(0, 1, -z, z)['probability'], 2 * cdf - 1, delta=1e-15)
        for lo, mid, hi in ((-3, 0, 2), (5, 5.5, 6), (-9, -8.5, -8)):
            whole = oracle.normal(0, 1, lo, hi)['probability']
            pieces = sum(oracle.normal(0, 1, a, b)['probability'] for a, b in ((lo, mid), (mid, hi)))
            reflected = oracle.normal(0, 1, -hi, -lo)['probability']
            self.assertAlmostEqual(whole, pieces, delta=1e-15)
            self.assertAlmostEqual(whole, reflected, delta=max(whole * 1e-12, 1e-28))

    def test_invalid_inputs(self):
        for args in ((0, 0, -1, 1), (0, -1, -1, 1), (0, 1, 1, -1)):
            with self.assertRaises(ValueError):
                oracle.normal(*args)
        for position, invalid in product(range(4), (float('nan'), float('inf'), float('-inf'), True, '0', None)):
            args = [0, 1, -1, 1]
            args[position] = invalid
            with self.subTest(args=args), self.assertRaises(ValueError):
                oracle.normal(*args)


class FixtureTests(unittest.TestCase):
    def test_schema_and_canonical_serialization(self):
        data = oracle.build_fixture()
        self.assertEqual(set(data), {'policy', 'binomial', 'uniform', 'normal'})
        self.assertEqual([len(data[k]) for k in ('binomial', 'uniform', 'normal')], [308, 31, 45])
        self.assertEqual(data['policy']['cdfAbsoluteTolerance'], 1e-9)
        self.assertEqual(data['policy']['intervalAbsoluteTolerance'], 2e-9)
        for family, inputs, fields in (
            ('binomial', {'n', 'p', 'k'}, {'pmf', 'selected', 'mean', 'variance'}),
            ('uniform', {'a', 'b', 'lower', 'upper'}, {'density', 'probability', 'lowerCDF', 'upperCDF'}),
            ('normal', {'mean', 'sigma', 'lower', 'upper'}, {'probability', 'lowerCDF', 'upperCDF', 'densityAtMean'}),
        ):
            for case in data[family]:
                self.assertEqual(set(case), inputs | {'expected'})
                self.assertEqual(set(case['expected']), fields)
                for value in case['expected'].values():
                    for item in value if isinstance(value, list) else [value]:
                        if family == 'normal':
                            self.assertIs(type(item), float)
                            self.assertTrue(math.isfinite(item))
                        else:
                            self.assertRegex(item, r'^-?\d+/[1-9]\d*$')
                            self.assertEqual(item, oracle.rational(F(item)))
        self.assertEqual(json.loads(oracle.render(data)), data)
        self.assertEqual(oracle.render(data), oracle.render(oracle.build_fixture()))
        self.assertEqual(oracle.FIXTURE.read_text(encoding='utf-8'), oracle.render(data))

    def test_missing_stale_and_default_check_without_rewriting(self):
        with TemporaryDirectory() as directory, patch.object(oracle, 'FIXTURE', Path(directory) / 'fixture.json'):
            with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertFalse(oracle.FIXTURE.exists())
                self.assertEqual(oracle.main(['--write']), 0)
                original = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 0)
                self.assertEqual(oracle.main([]), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)
                data = json.loads(original)
                data['normal'][0]['expected']['probability'] = 0
                oracle.FIXTURE.write_text(oracle.render(data), encoding='utf-8')
                stale = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), stale)
                self.assertEqual(oracle.main(['--write']), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)


class ReferenceCodeTests(unittest.TestCase):
    def test_distribution_chapter_references_execute(self):
        root = oracle.ROOT / 'code/python'
        for filename in (
            'probability_representations.py', 'probability_representations_numpy.py',
            'probability_binomial.py', 'probability_binomial_numpy.py',
            'probability_continuous.py', 'probability_continuous_numpy.py',
        ):
            with self.subTest(filename=filename), redirect_stdout(StringIO()):
                runpy.run_path(str(root / filename), run_name='__main__')


if __name__ == '__main__':
    unittest.main()
