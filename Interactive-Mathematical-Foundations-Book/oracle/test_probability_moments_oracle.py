"""Literal handwork, exact algebraic sweeps, fixture checks and reference execution.

Run with PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m unittest discover
-s oracle -p test_probability_moments_oracle.py -v. Missing references fail.
"""
from contextlib import redirect_stdout, redirect_stderr
from fractions import Fraction as F
from io import StringIO
from itertools import product
import json
from pathlib import Path
import runpy
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import probability_moments_oracle as oracle


class MomentsTests(unittest.TestCase):
    def test_canonical_handwork_and_affine_transform(self):
        self.assertEqual(oracle.moments([1, 2, 1], [-2, 0, 4], -2, 3), {
            'mean': '1/2', 'secondMoment': '5/1', 'variance': '19/4',
            'scaledMean': '2/1', 'scaledVariance': '19/1',
            'distribution': [{'value': '-2/1', 'mass': '1/4'}, {'value': '0/1', 'mass': '1/2'},
                             {'value': '4/1', 'mass': '1/4'}],
        })
        self.assertEqual(oracle.moments([1] * 6, [0, 0, 1, 1, 2, 2]), {
            'mean': '1/1', 'secondMoment': '5/3', 'variance': '2/3',
            'scaledMean': '1/1', 'scaledVariance': '2/3',
            'distribution': [{'value': '0/1', 'mass': '1/3'}, {'value': '1/1', 'mass': '1/3'},
                             {'value': '2/1', 'mass': '1/3'}],
        })
        self.assertEqual(oracle.moments([1] * 6, [1, 2, 3, 4, 5, 6])['variance'], '35/12')

    def test_decimal_handwork_and_merged_sorted_distribution(self):
        self.assertEqual(oracle.moments([1, 3], [0.01, 0.02], 0.5, -1.25), {
            'mean': '7/400', 'secondMoment': '13/40000', 'variance': '3/160000',
            'scaledMean': '-993/800', 'scaledVariance': '3/640000',
            'distribution': [{'value': '1/100', 'mass': '1/4'}, {'value': '1/50', 'mass': '3/4'}],
        })
        result = oracle.moments([3, 1, 2, 0], [2, -1.25, 2, 100])
        self.assertEqual(result['distribution'], [{'value': '-5/4', 'mass': '1/6'},
                                                 {'value': '2/1', 'mass': '5/6'}])
        self.assertEqual(result['mean'], '35/24')
        self.assertEqual(result['variance'], '845/576')
        # Distinct decimal outcomes stay distinct, regardless of floating tolerance.
        self.assertEqual(len(oracle.moments([1, 1], [0.01, 0.02])['distribution']), 2)

    def test_degenerate_and_zero_mass_outcomes(self):
        for weights, values, mean in (([1], [-1.25], '-5/4'), ([0, 1, 0], [-100, 2.5, 100], '5/2'),
                                       ([1, 2, 3], [4, 4, 4], '4/1')):
            result = oracle.moments(weights, values, 0, 3)
            self.assertEqual(result['mean'], mean)
            self.assertEqual(result['variance'], '0/1')
            self.assertEqual(result['scaledMean'], '3/1')
            self.assertEqual(result['scaledVariance'], '0/1')
            self.assertEqual(result['distribution'], [{'value': mean, 'mass': '1/1'}])
        result = oracle.moments([1, 2, 1], [-2, 0, 4], 0, -1.25)
        self.assertEqual(result['scaledMean'], '-5/4')
        self.assertEqual(result['scaledVariance'], '0/1')
        self.assertEqual(result['variance'], '19/4')

    def test_normalization_order_and_repeated_values(self):
        expected = oracle.moments([1, 2, 1], [-2, 0, 4], -2, 3)
        self.assertEqual(oracle.moments([7, 14, 7], [-2, 0, 4], -2, 3), expected)
        self.assertEqual(oracle.moments([1, 1, 2], [4, -2, 0], -2, 3), expected)
        self.assertEqual(oracle.moments([1, 1, 1, 1], [-2, 0, 0, 4], -2, 3), expected)
        self.assertEqual(oracle.moments([0, 1, 2, 1], [100, -2, 0, 4], -2, 3), expected)

    def test_invalid_weights_values_and_transforms(self):
        for weights in ([], [0], [0, 0], [-1, 2], [1, -1], [1.0], [True], ['1'], [None], [float('inf')]):
            with self.subTest(weights=weights), self.assertRaises(ValueError):
                oracle.moments(weights, [0] * len(weights))
        for values in ([], [0], [0, 1, 2]):
            with self.subTest(values=values), self.assertRaises(ValueError):
                oracle.moments([1, 1], values)
        for invalid in (float('nan'), float('inf'), float('-inf'), True, '1', None, 0.001, 12.345):
            with self.subTest(value=invalid), self.assertRaises(ValueError):
                oracle.moments([1, 1], [0, invalid])
            # Zero weight does not excuse a nonfinite or malformed input value.
            with self.subTest(zero_mass_value=invalid), self.assertRaises(ValueError):
                oracle.moments([1, 0], [0, invalid])
        for invalid in (float('nan'), float('inf'), float('-inf'), True, '1', None):
            for scale, shift in ((invalid, 0), (1, invalid)):
                with self.subTest(scale=scale, shift=shift), self.assertRaises(ValueError):
                    oracle.moments([1], [0], scale, shift)
        # Only values have a two-decimal restriction; transforms remain exact decimal numbers.
        self.assertEqual(oracle.moments([1], [1], 0.001, 0.0001)['scaledMean'], '11/10000')

    def test_bounded_algebraic_sweep_with_pairwise_variance(self):
        for n in range(1, 4):
            for weights in product(range(3), repeat=n):
                total = sum(weights)
                if not total:
                    continue
                for values in product((-2, 0, 4), repeat=n):
                    masses = [F(w, total) for w in weights]
                    expected_mean = sum(m * x for m, x in zip(masses, values))
                    expected_second = sum(m * x * x for m, x in zip(masses, values))
                    # Independent pairwise-distance identity, without centering at a computed mean.
                    expected_variance = sum(F(wi * wj, 2 * total ** 2) * (xi - xj) ** 2
                                            for wi, xi in zip(weights, values)
                                            for wj, xj in zip(weights, values))
                    distribution = [{'value': f'{x}/1', 'mass': oracle.rational(sum(
                        m for m, v in zip(masses, values) if v == x))}
                                    for x in sorted(set(values))
                                    if any(w and v == x for w, v in zip(weights, values))]
                    for scale, shift in ((-2, 3), (0, -1), (0.5, -1.25), (1, 0)):
                        result = oracle.moments(weights, values, scale, shift)
                        mean, variance = F(result['mean']), F(result['variance'])
                        self.assertEqual(mean, expected_mean)
                        self.assertEqual(F(result['secondMoment']), expected_second)
                        self.assertEqual(variance, expected_variance)
                        self.assertEqual(variance, expected_second - mean ** 2)
                        self.assertGreaterEqual(variance, 0)
                        self.assertEqual(F(result['scaledMean']), F(str(scale)) * mean + F(str(shift)))
                        self.assertEqual(F(result['scaledVariance']), F(str(scale)) ** 2 * variance)
                        self.assertEqual(result['distribution'], distribution)
                        self.assertEqual(sum(F(cell['mass']) for cell in distribution), 1)
                        self.assertTrue(min(values) <= mean <= max(values))


class FixtureTests(unittest.TestCase):
    def test_schema_exact_rationals_and_all_case_identities(self):
        data = oracle.build_fixture()
        self.assertEqual(set(data), {'policy', 'cases'})
        self.assertEqual(len(data['cases']), 144)
        for case in data['cases']:
            self.assertEqual(set(case), {'weights', 'values', 'scale', 'shift', 'expected'})
            expected = case['expected']
            self.assertEqual(set(expected), {'mean', 'secondMoment', 'variance', 'scaledMean',
                                             'scaledVariance', 'distribution'})
            strings = [expected[key] for key in ('mean', 'secondMoment', 'variance', 'scaledMean', 'scaledVariance')]
            for cell in expected['distribution']:
                self.assertEqual(set(cell), {'value', 'mass'})
                strings.extend(cell.values())
            for text in strings:
                self.assertRegex(text, r'^-?\d+/[1-9]\d*$')
                self.assertEqual(text, oracle.rational(F(text)))
            cells = expected['distribution']
            values = [F(cell['value']) for cell in cells]
            self.assertEqual(values, sorted(set(values)))
            self.assertTrue(all(F(cell['mass']) > 0 for cell in cells))
            self.assertEqual(sum(F(cell['mass']) for cell in cells), 1)
            mean = sum(F(cell['value']) * F(cell['mass']) for cell in cells)
            second = sum(F(cell['value']) ** 2 * F(cell['mass']) for cell in cells)
            self.assertEqual(F(expected['mean']), mean)
            self.assertEqual(F(expected['secondMoment']), second)
            self.assertEqual(F(expected['variance']), second - mean ** 2)
            self.assertEqual(F(expected['scaledMean']), F(str(case['scale'])) * mean + F(str(case['shift'])))
            self.assertEqual(F(expected['scaledVariance']), F(str(case['scale'])) ** 2 * (second - mean ** 2))
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
                data['cases'][0]['expected']['variance'] = '0/1'
                oracle.FIXTURE.write_text(oracle.render(data), encoding='utf-8')
                stale = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), stale)
                self.assertEqual(oracle.main(['--write']), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)


class ReferenceCodeTests(unittest.TestCase):
    def test_moments_chapter_references_execute(self):
        root = oracle.ROOT / 'code/python'
        for filename in (
            'probability_variables.py', 'probability_variables_numpy.py',
            'probability_expectation.py', 'probability_expectation_numpy.py',
            'probability_variance.py', 'probability_variance_numpy.py',
        ):
            with self.subTest(filename=filename), redirect_stdout(StringIO()):
                runpy.run_path(str(root / filename), run_name='__main__')


if __name__ == '__main__':
    unittest.main()
