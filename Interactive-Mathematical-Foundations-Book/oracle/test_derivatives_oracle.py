from fractions import Fraction as F
from pathlib import Path
import math
import runpy
import unittest

import numpy as np

from derivatives_oracle import build, chain_case, fd_case, dcos, dexp, dsin, linear_case, rule_case, secant_case

CODE = Path(__file__).resolve().parents[1] / 'code/python'


class DerivativeOracleTests(unittest.TestCase):
    def test_hand_worked_secants(self):
        # x**3/6 - x at x = 1: m(h) = -1/2 + h/2 + h**2/6
        self.assertEqual(secant_case('cubic', '1', '1')['secant'], {'kind': 'value', 'exact': '1/6'})
        self.assertEqual(secant_case('cubic', '1', '0.5')['secant']['exact'], '-5/24')
        self.assertEqual(secant_case('cubic', '1', '1')['derivative'], {'kind': 'finite', 'exact': '-1/2'})
        self.assertEqual(secant_case('cubic', '0', '0')['secant']['kind'], 'undefined')

    def test_nonsmooth_literals(self):
        c = secant_case('abs', '0', '1')
        self.assertEqual((c['left'], c['right'], c['derivative']), ({'kind': 'finite', 'exact': '-1'}, {'kind': 'finite', 'exact': '1'}, {'kind': 'undefined'}))
        j = secant_case('jump', '0', '1')
        self.assertEqual((j['left']['kind'], j['right'], j['derivative']['kind']), ('none', {'kind': 'finite', 'exact': '0'}, 'undefined'))
        self.assertEqual(secant_case('cbrt', '0', '1')['left'], {'kind': 'infinite', 'sign': 1})
        s = secant_case('sqrt', '0', '1')
        self.assertEqual((s['left']['kind'], s['right']['kind']), ('none', 'infinite'))

    def test_series_against_known_constants(self):
        self.assertAlmostEqual(float(dsin(1)), 0.8414709848078965, places=15)
        self.assertAlmostEqual(float(dcos(0)), 1.0, places=15)
        self.assertAlmostEqual(float(dexp(1)), math.e, places=15)

    def test_numpy_cross_check(self):
        for c in build()['secant']:
            if c['fn'] == 'sin' and c['secant']['kind'] == 'value':
                x, h = float(F(c['x'])), float(F(c['h']))
                self.assertLess(abs((np.sin(x + h) - np.sin(x)) / h - c['secant']['value']), 1e-12 / abs(h) + 1e-15)

    def test_linear_rules_chain_literals(self):
        self.assertEqual(linear_case('cubic', '1', '1'), {'fn': 'cubic', 'x0': '1', 'dx': '1', 'slope': '-1/2', 'linear': '-4/3', 'error': '2/3'})
        self.assertEqual(linear_case('cubic', '1', '0.5')['error'], '7/48')
        self.assertEqual(rule_case('product', '1', '1', '1', '1')['derivative'], '6')
        self.assertEqual(rule_case('quotient', '1', '1', '1', '1')['derivative'], '-1/2')
        self.assertIsNone(rule_case('quotient', '1', '1', '-1', '1')['derivative'])
        self.assertEqual(chain_case('square', 'cube', '2'), {'inner': 'square', 'outer': 'cube', 'x': '2', 'u': '1', 'derivative': '3/2'})
        self.assertAlmostEqual(chain_case('sin', 'exp', '1')['derivative'], math.exp(math.sin(1)) * math.cos(1), places=14)

    def test_finite_difference_regimes(self):
        c = fd_case('sin', '1')
        self.assertAlmostEqual(c['reference'], math.cos(1), places=15)
        errs = [abs(r['forward'] - c['reference']) for r in c['rows']]
        best = min(range(16), key=lambda i: errs[i])
        self.assertTrue(5 <= best + 1 <= 10)                         # best forward step near sqrt(eps)
        self.assertLess(abs(c['rows'][0]['forward'] - c['reference']), 0.05)
        self.assertGreater(errs[13], 100 * errs[best])
        for r in c['rows']:
            self.assertLessEqual(abs(r['forward'] - c['reference']), r['budgetForward'])
            self.assertLessEqual(abs(r['centered'] - c['reference']), r['budgetCentered'])
        self.assertEqual(fd_case('cubic', '1.5')['reference'], 0.125)

    def test_references(self):
        for name in ['calculus_secant.py', 'calculus_secant_numpy.py', 'calculus_linear_model.py', 'calculus_linear_model_numpy.py',
                     'calculus_rules.py', 'calculus_rules_numpy.py', 'calculus_chain.py', 'calculus_chain_numpy.py',
                     'calculus_finite_difference.py', 'calculus_finite_difference_numpy.py']:
            runpy.run_path(str(CODE / name))


if __name__ == '__main__':
    unittest.main()
