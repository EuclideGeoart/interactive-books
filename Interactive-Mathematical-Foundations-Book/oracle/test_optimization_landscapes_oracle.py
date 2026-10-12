"""Literal, hand-worked checks for the independent M10 Block A oracle."""
from contextlib import redirect_stderr, redirect_stdout
from fractions import Fraction as F
from io import StringIO
import json
import math
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import optimization_landscapes_oracle as oracle


class OptimizationLandscapesOracleTests(unittest.TestCase):
    def test_polynomial_literals(self):
        # Each tuple was differentiated and evaluated by hand at (1/2, -1/4).
        cases = [
            ('quadratic', F(1, 4), (F(1, 2), F(-1)), ((1, 0), (0, 4))),
            ('well', F(5, 8), (F(-3, 2), F(-1, 2)), ((-1, 0), (0, 2))),
            ('ridge', F(-5, 16), (F(-1), F(1, 2)), ((-2, 0), (0, -2))),
            ('saddle', F(3, 16), (F(1), F(1, 2)), ((2, 0), (0, -2))),
            ('flat', F(17, 256), (F(1, 2), F(-1, 16)), ((3, 0), (0, F(3, 4)))),
            ('degenerate', F(3, 16), (F(3, 4), F(-1, 2)), ((3, 0), (0, 2))),
            ('cubic', F(-21, 16), (F(-9, 4), F(-1, 2)), ((3, 0), (0, 2))),
            ('absolute', F(9, 16), (F(1), F(-1, 2)), ((0, 0), (0, 2))),
        ]
        for objective, loss, gradient, hessian in cases:
            with self.subTest(objective=objective):
                actual = oracle.closed_form(objective, [0.5, -0.25])
                self.assertEqual(actual, (loss, gradient, hessian))
                values = [actual[0], *actual[1], *(v for row in actual[2] for v in row)]
                self.assertTrue(all(type(value) is F for value in values))

    def test_decimal_inputs_remain_exact_rationals(self):
        self.assertEqual(oracle.closed_form('quadratic', [0.1, 0.2]),
                         (F(17, 200), (F(1, 10), F(4, 5)), ((1, 0), (0, 4))))
        self.assertEqual(oracle.closed_form('quadratic', [0.5, -0.25], a=2, center=0.25),
                         (F(3, 16), (F(1, 2), F(-1)), ((2, 0), (0, 4))))
        self.assertEqual(oracle.evaluate('quadratic', [2, 1])['loss'], 4.0)
        self.assertEqual(oracle.evaluate('quadratic', [2, 1], a=0.25, center=0.5)['gradient'], [0.375, 4.0])
        self.assertEqual(oracle.closed_form('quadratic', [F(1, 3), F(-1, 7)])[0], F(85, 882))

    def test_hessian_classifications_are_local(self):
        cases = [
            ('quadratic', [0, 0], ((1, 0), (0, 4)), 'local-minimum'),
            ('well', [-1, 0], ((8, 0), (0, 2)), 'local-minimum'),
            ('well', [1, 0], ((8, 0), (0, 2)), 'local-minimum'),
            ('well', [0, 0], ((-4, 0), (0, 2)), 'saddle'),
            ('ridge', [0, 0], ((-2, 0), (0, -2)), 'local-maximum'),
            ('saddle', [0, 0], ((2, 0), (0, -2)), 'saddle'),
            ('flat', [0, 0], ((0, 0), (0, 0)), 'inconclusive'),
            ('degenerate', [0, 0], ((0, 0), (0, 2)), 'inconclusive'),
            ('cubic', [1, 0], ((6, 0), (0, 2)), 'local-minimum'),
            ('cubic', [-1, 0], ((-6, 0), (0, 2)), 'saddle'),
        ]
        for objective, point, hessian, classification in cases:
            with self.subTest(objective=objective, point=point):
                _, gradient, actual_hessian = oracle.closed_form(objective, point)
                self.assertEqual(gradient, (0, 0))
                self.assertEqual(actual_hessian, hessian)
                self.assertEqual(oracle.classify(gradient, actual_hessian), classification)
        _, gradient, hessian = oracle.closed_form('quadratic', [1, 0])
        self.assertEqual(oracle.classify(gradient, hessian), 'not-stationary')
        _, gradient, hessian = oracle.closed_form('quadratic', [0.25, 0], a=2, center=0.25)
        self.assertEqual(oracle.classify(gradient, hessian), 'local-minimum')
        # A cubic local minimum has a strictly lower value elsewhere.
        self.assertEqual(oracle.closed_form('cubic', [1, 0])[0], F(-2))
        self.assertEqual(oracle.closed_form('cubic', [-3, 0])[0], F(-18))
        self.assertLess(F(-18), F(-2))
        # Identical singular-Hessian verdicts can hide different behavior.
        self.assertEqual(oracle.closed_form('flat', [0.5, 0.5])[0], F(1, 8))
        self.assertEqual(oracle.closed_form('degenerate', [-0.5, 0])[0], F(-1, 8))
        self.assertEqual(oracle.closed_form('degenerate', [0.5, 0])[0], F(1, 8))

    def test_convexity_chord_and_derivative_claims(self):
        left, right, t = F(0), F(2), F(1, 4)
        at = (1 - t) * left + t * right
        loss_at = oracle.closed_form('quadratic', [at, 0])[0]
        chord = ((1 - t) * oracle.closed_form('quadratic', [left, 0])[0]
                 + t * oracle.closed_form('quadratic', [right, 0])[0])
        self.assertEqual((loss_at, chord), (F(1, 8), F(1, 2)))
        self.assertLessEqual(loss_at, chord)
        lp, gp, _ = oracle.closed_form('quadratic', [0.5, 0])
        lq, gq, _ = oracle.closed_form('quadratic', [2, 0])
        tangent = lp + gp[0] * (F(2) - F(1, 2))
        self.assertEqual((tangent, lq, gp[0], gq[0]), (F(7, 8), F(2), F(1, 2), F(2)))
        self.assertGreaterEqual(lq, tangent)
        self.assertLessEqual(gp[0], gq[0])
        # The well violates both the chord and first-order convex lower bound.
        l0, g0, _ = oracle.closed_form('well', [0, 0])
        l1, _, _ = oracle.closed_form('well', [1, 0])
        lm, _, _ = oracle.closed_form('well', [-1, 0])
        self.assertEqual((l0, l1, lm), (F(1), F(0), F(0)))
        self.assertGreater(l0, (lm + l1) / 2)
        self.assertLess(l1, l0 + g0[0])
        self.assertEqual(oracle.closed_form('well', [0.5, 0])[1][0], F(-3, 2))
        self.assertLess(F(-3, 2), g0[0])
        # Supported quadratics have positive Hessians; ridge is concave.
        self.assertEqual(oracle.closed_form('quadratic', [0, 0], a=0.25)[2], ((F(1, 4), 0), (0, 4)))
        ridge_left = oracle.closed_form('ridge', [-1, 0])[0]
        ridge_right = oracle.closed_form('ridge', [1, 0])[0]
        ridge_middle = oracle.closed_form('ridge', [0, 0])[0]
        self.assertEqual((ridge_left, ridge_middle, ridge_right), (F(-1), F(0), F(-1)))
        self.assertGreater(ridge_middle, (ridge_left + ridge_right) / 2)

    def test_hand_worked_exact_descent(self):
        states = oracle.quadratic_descent([2, 1], 0.25, 2)
        self.assertEqual(states, [
            {'k': 0, 'point': ['2/1', '1/1'], 'loss': '4/1', 'gradient': ['2/1', '4/1']},
            {'k': 1, 'point': ['3/2', '0/1'], 'loss': '9/8', 'gradient': ['3/2', '0/1']},
            {'k': 2, 'point': ['9/8', '0/1'], 'loss': '81/128', 'gradient': ['9/8', '0/1']},
        ])
        self.assertEqual([float(F(s['loss'])) for s in states], [4.0, 1.125, 0.6328125])
        self.assertEqual(oracle.quadratic_descent([2, 1], F(1, 4), 1, a=2, center=1)[1],
                         {'k': 1, 'point': ['3/2', '0/1'], 'loss': '1/4', 'gradient': ['1/1', '0/1']})
        for steps in (-1, 0.5, True):
            with self.subTest(steps=steps), self.assertRaises(ValueError):
                oracle.quadratic_descent([2, 1], 0.25, steps)
        for eta in (0, -0.25):
            with self.subTest(eta=eta), self.assertRaises(ValueError):
                oracle.quadratic_descent([2, 1], eta, 2)

    def test_log_literals_and_domain(self):
        self.assertEqual(oracle.evaluate('log', [1, 0.5]), {
            'status': 'finite', 'loss': 0.25, 'gradient': [-1.0, 1.0],
            'hessian': [[1.0, 0.0], [0.0, 2.0]],
        })
        half = oracle.evaluate('log', [0.5, 0])
        self.assertAlmostEqual(half['loss'], 0.6931471805599453, delta=math.ulp(1.0))
        self.assertEqual(half['gradient'], [-2.0, 0.0])
        self.assertEqual(half['hessian'], [[4.0, 0.0], [0.0, 2.0]])
        self.assertAlmostEqual(oracle.evaluate('log', [2, 0])['loss'], -0.6931471805599453,
                               delta=math.ulp(1.0))
        for x in (0, -0.0, -0.25, -2):
            with self.subTest(x=x):
                self.assertEqual(oracle.evaluate('log', [x, 1]), {
                    'status': 'domain', 'loss': None, 'gradient': None, 'hessian': None,
                })
        with self.assertRaisesRegex(ValueError, 'log requires'):
            oracle.closed_form('log', [0, 0])

    def test_absolute_kink_and_sided_derivatives(self):
        kink = oracle.evaluate('absolute', [0, 0.5])
        self.assertEqual(kink, {'status': 'finite', 'loss': 0.25, 'gradient': None, 'hessian': None})
        self.assertEqual(oracle.classify(kink['gradient'], kink['hessian']), 'undefined')
        for x, sign in ((-0.25, -1), (0.25, 1)):
            with self.subTest(x=x):
                self.assertEqual(oracle.evaluate('absolute', [x, 0.5]), {
                    'status': 'finite', 'loss': 0.5, 'gradient': [float(sign), 1.0],
                    'hessian': [[0.0, 0.0], [0.0, 2.0]],
                })
        origin = oracle.closed_form('absolute', [0, 0])[0]
        self.assertEqual((oracle.closed_form('absolute', [0.25, 0])[0] - origin) / F(1, 4), F(1))
        self.assertEqual((oracle.closed_form('absolute', [-0.25, 0])[0] - origin) / F(-1, 4), F(-1))

    def test_non_finite_policy_and_validation(self):
        invalid = {'status': 'non-finite', 'loss': None, 'gradient': None, 'hessian': None}
        for objective in oracle.OBJECTIVES:
            for value in (math.nan, math.inf, -math.inf):
                for point in ([value, 0], [0, value]):
                    with self.subTest(objective=objective, point=point):
                        self.assertEqual(oracle.evaluate(objective, point), invalid)
        for objective, point in (('flat', [1e80, 0]), ('quadratic', [2e154, 0]),
                                 ('cubic', [1e103, 0]), ('log', [1e-200, 0])):
            with self.subTest(objective=objective):
                self.assertEqual(oracle.evaluate(objective, point), invalid)
        self.assertEqual(oracle.evaluate('quadratic', [1e154, 0])['loss'], 5e307)
        self.assertEqual(oracle.evaluate('log', [-1, math.inf]), invalid)
        for objective, point, options in [('unknown', [0, 0], {}), ('flat', [0], {}),
                                          ('flat', [True, 0], {}), ('quadratic', [0, 0], {'a': 'bad'})]:
            with self.subTest(objective=objective, point=point), self.assertRaises(ValueError):
                oracle.evaluate(objective, point, **options)

    def test_rejected_quadratic_configurations(self):
        for options in ({'a': 0}, {'a': -1}, {'a': 0.125}, {'center': 0.125},
                        {'a': math.nan}, {'a': math.inf}, {'center': math.inf},
                        {'center': -math.inf}, {'a': True}):
            with self.subTest(options=options), self.assertRaises(ValueError):
                oracle.evaluate('quadratic', [0, 0], **options)
        # Validation is exact decimal arithmetic; 0.29 is not its binary fraction.
        self.assertEqual(oracle.closed_form('quadratic', [0, 0], a=0.29, center=0.01)[2][0][0], F(29, 100))

    def test_fixture_is_bounded_deterministic_and_finite_json(self):
        data = oracle.build_fixture()
        self.assertEqual(set(data), {'policy', 'cases', 'descent'})
        self.assertEqual(len(data['cases']), 110)
        self.assertEqual(len(data['descent']), 1)
        self.assertEqual({c['objective'] for c in data['cases']}, set(oracle.OBJECTIVES))
        self.assertEqual({c['expected']['status'] for c in data['cases']}, {'finite', 'domain', 'non-finite'})
        self.assertEqual(oracle.render(data), oracle.render(oracle.build_fixture()))
        self.assertEqual(json.loads(oracle.render(data)), data)
        for case in data['cases']:
            if case['objective'] == 'quadratic':
                self.assertIn(case.get('a', 1), (0.25, 0.5, 1, 2, 4))
                self.assertEqual((F(str(case.get('center', 0))) * 100).denominator, 1)
            expected = case['expected']
            values = [expected['loss']] + (expected['gradient'] or [])
            values += [v for row in expected['hessian'] or [] for v in row]
            self.assertTrue(all(v is None or math.isfinite(v) for v in values))
            if expected['status'] != 'finite':
                self.assertEqual(values, [None])
            if expected['hessian'] is not None:
                self.assertEqual(expected['hessian'][0][1], expected['hessian'][1][0])

    def test_committed_fixture_is_fresh(self):
        self.assertEqual(oracle.FIXTURE.read_text(encoding='utf-8'), oracle.render(oracle.build_fixture()))

    def test_check_rejects_missing_and_stale_without_rewriting(self):
        with TemporaryDirectory() as directory, patch.object(oracle, 'FIXTURE', Path(directory) / 'fixture.json'):
            with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertFalse(oracle.FIXTURE.exists())
                self.assertEqual(oracle.main(['--write']), 0)
                original = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 0)
                self.assertEqual(oracle.main([]), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)
                crlf = original.replace(b'\n', b'\r\n')
                oracle.FIXTURE.write_bytes(crlf)
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), crlf)
                stale = json.loads(original)
                stale['cases'][0]['expected']['loss'] = -999.0
                oracle.FIXTURE.write_text(oracle.render(stale), encoding='utf-8')
                stale_bytes = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), stale_bytes)
                self.assertEqual(oracle.main(['--write']), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)

    def test_all_block_a_reference_files_execute(self):
        # Use the same .venv interpreter as this suite, including NumPy support.
        for filename in (
            'optimization_landscapes.py', 'optimization_landscapes_numpy.py',
            'optimization_optima.py', 'optimization_optima_numpy.py',
            'optimization_convexity.py', 'optimization_convexity_numpy.py',
            'optimization_descent.py', 'optimization_descent_numpy.py',
        ):
            with self.subTest(filename=filename):
                result = subprocess.run([sys.executable, str(oracle.ROOT / 'code/python' / filename)],
                                        cwd=oracle.ROOT, capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
