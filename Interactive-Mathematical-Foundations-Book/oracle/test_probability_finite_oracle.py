"""Hand-worked values, bounded exhaustive laws, fixture freshness, and all IV.1–IV.6 references.

Run with PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m unittest discover
-s oracle -p test_probability_finite_oracle.py -v. Missing chapter references
fail rather than silently skipping execution.
"""
from contextlib import redirect_stdout, redirect_stderr
from fractions import Fraction as F
from io import StringIO
from itertools import product
import json
from math import comb, perm
from pathlib import Path
import runpy
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import probability_finite_oracle as oracle


class FiniteTests(unittest.TestCase):
    def test_hand_worked_events_and_weighted_conditioning(self):
        self.assertEqual(oracle.finite([1] * 6, [1, 3, 5], [3, 4, 5]), {
            'massA': '1/2', 'massB': '1/2', 'intersection': '1/3', 'union': '2/3',
            'complement': '1/2', 'conditional': '2/3', 'independent': False,
        })
        self.assertEqual(oracle.finite([1, 2, 3, 4], [0, 2], [1, 2]), {
            'massA': '2/5', 'massB': '1/2', 'intersection': '3/10', 'union': '3/5',
            'complement': '3/5', 'conditional': '3/5', 'independent': False,
        })

    def test_exact_independence_and_disjoint_exception(self):
        self.assertTrue(oracle.finite([1] * 4, [0, 1], [0, 2])['independent'])
        self.assertFalse(oracle.finite([1, 3], [0], [1])['independent'])
        self.assertTrue(oracle.finite([1, 3], [], [1])['independent'])
        self.assertTrue(oracle.finite([0, 1, 2], [0], [1])['independent'])
        self.assertTrue(oracle.finite([1, 2, 3], [0, 1, 2], [1])['independent'])
        # A tiny positive discrepancy must not become independence by a float tolerance.
        self.assertFalse(oracle.finite([1000000, 1, 1], [1], [1, 2])['independent'])

    def test_impossible_condition_and_boundaries(self):
        self.assertEqual(oracle.finite([0, 1, 2], [0, 1], [0]), {
            'massA': '1/3', 'massB': '0/1', 'intersection': '0/1', 'union': '1/3',
            'complement': '2/3', 'conditional': None, 'independent': True,
        })
        self.assertEqual(oracle.finite([1], [0], [0]), {
            'massA': '1/1', 'massB': '1/1', 'intersection': '1/1', 'union': '1/1',
            'complement': '0/1', 'conditional': '1/1', 'independent': True,
        })
        self.assertIsNone(oracle.finite([1], [], [])['conditional'])

    def test_event_set_semantics_and_weight_scale(self):
        expected = oracle.finite([1, 2, 3], [0, 2], [2])
        self.assertEqual(oracle.finite([1, 2, 3], [2, 0, 0], [2, 2]), expected)
        self.assertEqual(oracle.finite([7, 14, 21], [0, 2], [2]), expected)

    def test_invalid_weights_and_indices(self):
        for weights in ([], [0], [0, 0], [-1, 2], [1, -1], [1.0], [True], ['1'], [None]):
            with self.subTest(weights=weights), self.assertRaises(ValueError):
                oracle.finite(weights, [], [])
        for event in ([-1], [2], [0.5], [True], ['0'], [None]):
            for a, b in ((event, []), ([], event)):
                with self.subTest(a=a, b=b), self.assertRaises(ValueError):
                    oracle.finite([1, 2], a, b)

    def test_exhaustive_small_weighted_spaces(self):
        # Every nonzero weight vector in {0,1,2}^n and every event pair for n=1..3.
        for n in range(1, 4):
            events = [tuple(i for i, included in enumerate(bits) if included)
                      for bits in product((False, True), repeat=n)]
            for weights in product(range(3), repeat=n):
                total = sum(weights)
                if not total:
                    continue
                for a, b in product(events, repeat=2):
                    e = oracle.finite(weights, a, b)
                    pa, pb, inter, union, complement = (F(e[k]) for k in
                        ('massA', 'massB', 'intersection', 'union', 'complement'))
                    self.assertEqual(pa, F(sum(w for i, w in enumerate(weights) if i in a), total))
                    self.assertEqual(pb, F(sum(w for i, w in enumerate(weights) if i in b), total))
                    self.assertEqual(inter, F(sum(w for i, w in enumerate(weights) if i in a and i in b), total))
                    self.assertEqual(union, pa + pb - inter)
                    self.assertEqual(pa + complement, 1)
                    self.assertTrue(0 <= inter <= min(pa, pb) <= union <= 1)
                    self.assertEqual(e['independent'], inter == pa * pb)
                    if not pb:
                        self.assertIsNone(e['conditional'])
                    else:
                        conditional = F(e['conditional'])
                        self.assertEqual(conditional * pb, inter)
                        self.assertTrue(0 <= conditional <= 1)
                        if e['independent']:
                            self.assertEqual(conditional, pa)
                    if not inter:
                        self.assertEqual(e['independent'], not pa or not pb)


class BayesTests(unittest.TestCase):
    def test_hand_worked_base_rate_and_negative_evidence(self):
        # Population 2000: A=20; positive A=18, positive not-A=99.
        self.assertEqual(oracle.bayes(1, 90, 5, 'positive'), {
            'evidence': '117/2000', 'posterior': '2/13',
            'joint': ['9/1000', '1/1000', '99/2000', '1881/2000'],
            'posteriorMass': ['2/13', '0/1', '11/13', '0/1'],
        })
        self.assertEqual(oracle.bayes(1, 90, 5, 'negative'), {
            'evidence': '1883/2000', 'posterior': '2/1883',
            'joint': ['1/1000', '9/1000', '1881/2000', '99/2000'],
            'posteriorMass': ['2/1883', '0/1', '1881/1883', '0/1'],
        })

    def test_hand_worked_rare_prior(self):
        # Population one million: 100 A, 99 true positives, 9999 false positives.
        self.assertEqual(oracle.bayes(0.01, 99, 1, 'positive'), {
            'evidence': '5049/500000', 'posterior': '1/102',
            'joint': ['99/1000000', '1/1000000', '9999/1000000', '989901/1000000'],
            'posteriorMass': ['1/102', '0/1', '101/102', '0/1'],
        })

    def test_percentage_text_exactness_and_rejection(self):
        for given, expected in ((0, '0/1'), (100, '1/1'), (0.01, '1/10000'),
                                (12.34, '617/5000'), (99.99, '9999/10000')):
            self.assertEqual(oracle.rational(oracle.percentage(given)), expected)
        self.assertNotEqual(oracle.percentage(0.01), F(0.01) / 100)
        for invalid in (-0.01, 100.01, 0.001, 12.345, float('nan'), float('inf'),
                        float('-inf'), True, '50', None):
            for args in ((invalid, 50, 50), (50, invalid, 50), (50, 50, invalid)):
                with self.subTest(args=args), self.assertRaises(ValueError):
                    oracle.bayes(*args, 'positive')
        for evidence in ('unknown', '', None, True):
            with self.assertRaises(ValueError):
                oracle.bayes(50, 50, 50, evidence)

    def test_impossible_evidence_and_prior_boundaries(self):
        self.assertEqual(oracle.bayes(50, 0, 0, 'positive'), {
            'evidence': '0/1', 'posterior': None,
            'joint': ['0/1', '1/2', '0/1', '1/2'], 'posteriorMass': None,
        })
        self.assertEqual(oracle.bayes(50, 100, 100, 'negative'), {
            'evidence': '0/1', 'posterior': None,
            'joint': ['0/1', '1/2', '0/1', '1/2'], 'posteriorMass': None,
        })
        self.assertIsNone(oracle.bayes(0, 100, 0, 'positive')['posterior'])
        self.assertIsNone(oracle.bayes(100, 0, 100, 'positive')['posterior'])
        self.assertEqual(oracle.bayes(0, 90, 5, 'positive')['posterior'], '0/1')
        self.assertEqual(oracle.bayes(100, 90, 5, 'positive')['posterior'], '1/1')
        self.assertEqual(oracle.bayes(20, 100, 0, 'positive')['posteriorMass'], ['1/1', '0/1', '0/1', '0/1'])

    def test_exhaustive_bounded_bayes_laws(self):
        percentages = (0, 0.01, 1, 12.34, 50, 99.99, 100)
        for prior, sensitivity, false_positive in product(percentages, repeat=3):
            p, s, f = (F(str(v)) / 100 for v in (prior, sensitivity, false_positive))
            positive = oracle.bayes(prior, sensitivity, false_positive, 'positive')
            negative = oracle.bayes(prior, sensitivity, false_positive, 'negative')
            self.assertEqual(F(positive['evidence']) + F(negative['evidence']), 1)
            self.assertEqual(negative['joint'], [positive['joint'][i] for i in (1, 0, 3, 2)])
            for evidence, result in (('positive', positive), ('negative', negative)):
                cells = list(map(F, result['joint']))
                e = F(result['evidence'])
                self.assertEqual(sum(cells), 1)
                self.assertTrue(all(0 <= cell <= 1 for cell in cells))
                self.assertEqual(cells[0] + cells[1], p)
                self.assertEqual(cells[2] + cells[3], 1 - p)
                likelihood_a, likelihood_not_a = (s, f) if evidence == 'positive' else (1 - s, 1 - f)
                self.assertEqual(cells[0], p * likelihood_a)
                self.assertEqual(cells[2], (1 - p) * likelihood_not_a)
                expected_e = p * s + (1 - p) * f
                self.assertEqual(e, expected_e if evidence == 'positive' else 1 - expected_e)
                if not e:
                    self.assertIsNone(result['posterior'])
                    self.assertIsNone(result['posteriorMass'])
                else:
                    mass = list(map(F, result['posteriorMass']))
                    self.assertEqual(sum(mass), 1)
                    self.assertEqual(mass[1::2], [0, 0])
                    self.assertEqual([m * e for m in mass], [cells[0], 0, cells[2], 0])
                    self.assertEqual(F(result['posterior']), mass[0])
                    self.assertTrue(all(0 <= m <= 1 for m in mass))


class CountingTests(unittest.TestCase):
    def test_hand_worked_selections(self):
        for ordered, replacement, expected in (
            (True, True, {'count': 4, 'examples': [[0, 0], [0, 1], [1, 0], [1, 1]]}),
            (True, False, {'count': 2, 'examples': [[0, 1], [1, 0]]}),
            (False, True, {'count': 3, 'examples': [[0, 0], [0, 1], [1, 1]]}),
            (False, False, {'count': 1, 'examples': [[0, 1]]}),
        ):
            self.assertEqual(oracle.counting(2, 2, ordered, replacement), expected)
        self.assertEqual(oracle.counting(8, 4, True, True)['count'], 4096)
        self.assertEqual(oracle.counting(8, 4, True, False)['count'], 1680)
        self.assertEqual(oracle.counting(8, 4, False, True)['count'], 330)
        self.assertEqual(oracle.counting(8, 4, False, False)['count'], 70)
        for ordered, replacement in product((False, True), repeat=2):
            self.assertEqual(oracle.counting(3, 0, ordered, replacement), {'count': 1, 'examples': [[]]})

    def test_exhaustive_bounded_counts_and_examples(self):
        # Closed-form counts and raw ordered sequences are independent checks of itertools modes.
        for n, k, ordered, replacement in product(range(2, 9), range(5), (False, True), (False, True)):
            if not replacement and k > n:
                with self.assertRaises(ValueError):
                    oracle.counting(n, k, ordered, replacement)
                continue
            e = oracle.counting(n, k, ordered, replacement)
            expected_count = (n ** k if replacement else perm(n, k)) if ordered else comb(n + k - 1, k) if replacement else comb(n, k)
            self.assertEqual(e['count'], expected_count)
            sequences = [seq for seq in product(range(n), repeat=k) if replacement or len(set(seq)) == k]
            expected = sorted(set(sequences if ordered else (tuple(sorted(seq)) for seq in sequences)))
            self.assertEqual(len(expected), expected_count)
            self.assertEqual(e['examples'], [list(seq) for seq in expected[:12]])
            self.assertEqual(set(e), {'count', 'examples'})

    def test_unordered_replacement_does_not_imply_uniform_probability(self):
        multiplicity = {}
        for seq in product(range(2), repeat=2):
            multiset = tuple(sorted(seq))
            multiplicity[multiset] = multiplicity.get(multiset, 0) + 1
        self.assertEqual(multiplicity, {(0, 0): 1, (0, 1): 2, (1, 1): 1})
        self.assertNotIn('probability', oracle.counting(2, 2, False, True))

    def test_invalid_parameters(self):
        for n, k in ((1, 0), (9, 0), (2, -1), (8, 5), (2.0, 1), (2, 1.0), (True, 1), (2, True)):
            with self.assertRaises(ValueError):
                oracle.counting(n, k, True, True)
        for ordered, replacement in ((1, True), (True, 0), ('yes', False), (False, None)):
            with self.assertRaises(ValueError):
                oracle.counting(2, 1, ordered, replacement)


class FixtureTests(unittest.TestCase):
    def test_schema_and_exact_rational_serialization(self):
        data = oracle.build_fixture()
        self.assertEqual(set(data), {'policy', 'finite', 'bayes', 'counting'})
        self.assertEqual([len(data[key]) for key in ('finite', 'bayes', 'counting')], [138, 100, 134])
        self.assertEqual(oracle.render(data), oracle.render(oracle.build_fixture()))
        for family in ('finite', 'bayes'):
            for case in data[family]:
                for value in case['expected'].values():
                    for text in value if isinstance(value, list) else [value]:
                        if text is None or type(text) is bool:
                            continue
                        self.assertRegex(text, r'^\d+/[1-9]\d*$')
                        self.assertEqual(text, oracle.rational(F(text)))
        self.assertEqual(json.loads(oracle.render(data)), data)

    def test_committed_fixture_is_fresh(self):
        self.assertEqual(oracle.FIXTURE.read_text(encoding='utf-8'), oracle.render(oracle.build_fixture()))

    def test_check_detects_missing_and_stale_without_rewriting(self):
        with TemporaryDirectory() as directory, patch.object(oracle, 'FIXTURE', Path(directory) / 'fixture.json'):
            with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertFalse(oracle.FIXTURE.exists())
                self.assertEqual(oracle.main(['--write']), 0)
                original = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 0)
                self.assertEqual(oracle.main([]), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)
                mutated = json.loads(original)
                mutated['finite'][0]['expected']['massA'] = '0/1'
                oracle.FIXTURE.write_text(oracle.render(mutated), encoding='utf-8')
                stale = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), stale)
                self.assertEqual(oracle.main(['--write']), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)


class ReferenceCodeTests(unittest.TestCase):
    def test_all_block_a_chapter_references_execute(self):
        root = oracle.ROOT / 'code/python'
        for filename in (
            'probability_experiments.py', 'probability_experiments_numpy.py',
            'probability_events.py', 'probability_events_numpy.py',
            'probability_counting.py', 'probability_counting_numpy.py',
            'probability_conditional.py', 'probability_conditional_numpy.py',
            'probability_independence.py', 'probability_independence_numpy.py',
            'probability_bayes.py', 'probability_bayes_numpy.py',
        ):
            with self.subTest(filename=filename), redirect_stdout(StringIO()):
                runpy.run_path(str(root / filename), run_name='__main__')


if __name__ == '__main__':
    unittest.main()
